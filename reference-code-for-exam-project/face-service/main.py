"""
On-prem face service: InsightFace embedding + FAISS 1:N gallery.

Scale design (45k students)
----------------------------
The gallery is `faiss.IndexIDMap2(faiss.IndexFlatIP(512))`:

- IndexFlatIP = EXACT inner-product search. Embeddings are L2-normalized,
  so inner product == cosine similarity. No approximate-nearest-neighbor
  error, deterministic top-1/top-2 (the backend gates on score AND gap).
- IDMap2 stores a stable int64 label per student, which gives us real
  `remove_ids` / replace semantics (plain HNSW has no remove at all).
- At 45k x 512 floats the brute-force scan is ~23M multiply-adds done in
  native (SIMD/BLAS) code — single-digit milliseconds. RAM: ~90 MB.
  If the gallery ever grows to ~500k+, swap the base index for
  IndexHNSWFlat / IndexIVFFlat behind the same IDMap2 wrapper; the
  endpoint contract does not change.

Source of truth & drift
-----------------------
MongoDB (backend) is the source of truth for embeddings. This index is a
derived, rebuildable cache: the backend calls POST /rebuild on startup
with every enrolled embedding, so a lost/corrupt index file, a rejected
enroll, or a delete that raced a restart can never permanently drift.
Re-enroll = remove old vector + add new one (same label lifecycle);
delete = remove_ids. Both persist the index file afterwards.

Threading: FastAPI runs sync endpoints in a thread pool, so every index
mutation/search is guarded by one lock.
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
import base64, io, os, json, threading
from PIL import Image
import faiss
from insightface.app import FaceAnalysis

app = FastAPI(title="On-prem Face Service", version="1.1.0")

MODEL = os.getenv("FACE_MODEL", "buffalo_s")

print(f"Loading InsightFace {MODEL} (CPU)...")
face_app = FaceAnalysis(name=MODEL)
face_app.prepare(ctx_id=-1, det_size=(640, 640))

DIM = 512
index_file = "/data/faiss.index" if os.path.isdir("/data") else "faiss.index"
labels_file = "/data/face_labels.json" if os.path.isdir("/data") else "face_labels.json"

_lock = threading.Lock()

def _new_index():
    return faiss.IndexIDMap2(faiss.IndexFlatIP(DIM))

index = _new_index()
# label (int64) <-> studentId (str). Labels are never reused while the
# index lives; _next_label only moves forward within a process.
label_to_student: dict[int, str] = {}
student_to_label: dict[str, int] = {}
_next_label = 0

def _persist_locked():
    try:
        faiss.write_index(index, index_file)
        with open(labels_file, "w") as f:
            json.dump({"next": _next_label, "map": label_to_student}, f)
    except Exception as e:
        print(f"index persist failed: {e}")

def _load():
    global index, label_to_student, student_to_label, _next_label
    if not (os.path.exists(index_file) and os.path.exists(labels_file)):
        return
    try:
        loaded = faiss.read_index(index_file)
        if loaded.d != DIM or loaded.ntotal == 0:
            print("persisted index incompatible/empty — starting fresh (backend will rebuild)")
            return
        with open(labels_file) as f:
            saved = json.load(f)
        new_map = {int(k): str(v) for k, v in saved.get("map", {}).items()}
        if len(new_map) != loaded.ntotal:
            print("persisted labels/index count mismatch — starting fresh (backend will rebuild)")
            return
        index = loaded
        label_to_student = new_map
        student_to_label = {v: k for k, v in new_map.items()}
        _next_label = int(saved.get("next", (max(new_map) + 1) if new_map else 0))
        print(f"Loaded index with {index.ntotal} faces")
    except Exception as e:
        print(f"index load failed (starting fresh, backend will rebuild): {e}")

_load()

def _normalize(emb: np.ndarray) -> np.ndarray:
    """Force L2-normalization so IndexFlatIP scores are true cosines."""
    emb = emb.astype("float32", copy=False)
    n = float(np.linalg.norm(emb))
    if n == 0:
        raise HTTPException(400, "Zero-norm embedding")
    return emb / n

def _add_locked(student_id: str, emb: np.ndarray) -> None:
    """Insert or replace one student's vector. Caller holds _lock."""
    global _next_label
    emb = _normalize(emb).reshape(1, -1)
    old_label = student_to_label.get(student_id)
    if old_label is not None:
        # Replace: drop the stale vector first, keep the same label so
        # the mapping stays stable.
        index.remove_ids(faiss.IDSelectorBatch(np.array([old_label], dtype="int64")))
        index.add_with_ids(emb, np.array([old_label], dtype="int64"))
        return
    label = _next_label
    _next_label += 1
    index.add_with_ids(emb, np.array([label], dtype="int64"))
    label_to_student[label] = student_id
    student_to_label[student_id] = label

class EmbedReq(BaseModel):
    imageBase64: str
class IdentifyReq(BaseModel):
    embedding: list[float]
class EnrollReq(BaseModel):
    studentId: str
    embedding: list[float]
class RebuildReq(BaseModel):
    items: list[EnrollReq]

def _embed_from_base64(b64: str):
    try:
        raw = base64.b64decode(b64.split(",")[-1])
    except Exception:
        raise HTTPException(400, "Invalid imageBase64")
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    arr = np.array(img)[:, :, ::-1]  # RGB -> BGR
    faces = face_app.get(arr)
    if not faces:
        raise HTTPException(400, "No face detected")
    # Best (largest) face
    face_count = len(faces)
    faces = sorted(faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]), reverse=True)
    f = faces[0]
    emb = f.normed_embedding.astype("float32")
    area = (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1])
    quality = float(min(1.0, area / (img.size[0]*img.size[1]) * 4))
    return emb, quality, MODEL, face_count

@app.get("/health")
def health():
    with _lock:
        return {"ok": True, "model": MODEL, "count": int(index.ntotal)}

@app.post("/embed")
def embed(req: EmbedReq):
    emb, quality, model, face_count = _embed_from_base64(req.imageBase64)
    # faceCount lets the backend enforce single-face enrollment photos.
    return {"embedding": emb.tolist(), "quality": quality, "model": model, "faceCount": face_count}

@app.post("/enroll")
def enroll(req: EnrollReq):
    """Insert OR replace a student's embedding (re-enrollment is safe)."""
    emb = np.array(req.embedding, dtype="float32")
    if emb.shape != (DIM,):
        raise HTTPException(400, f"Expected dim {DIM}")
    with _lock:
        _add_locked(req.studentId, emb)
        _persist_locked()
    return {"ok": True}

@app.post("/rebuild")
def rebuild(req: RebuildReq):
    """Full rebuild from Mongo truth (called by the backend on startup)."""
    global index, label_to_student, student_to_label, _next_label
    vectors = []
    labels = []
    new_map: dict[int, str] = {}
    seen: set[str] = set()
    for item in req.items:
        if item.studentId in seen:
            continue
        emb = np.array(item.embedding, dtype="float32")
        if emb.shape != (DIM,):
            continue
        seen.add(item.studentId)
        label = len(new_map)
        new_map[label] = item.studentId
        vectors.append(_normalize(emb))
        labels.append(label)
    with _lock:
        index = _new_index()
        label_to_student = new_map
        student_to_label = {v: k for k, v in new_map.items()}
        _next_label = len(new_map)
        if vectors:
            index.add_with_ids(
                np.stack(vectors).astype("float32"),
                np.array(labels, dtype="int64"),
            )
        _persist_locked()
        return {"ok": True, "count": int(index.ntotal)}

@app.delete("/student/{student_id}")
def remove(student_id: str):
    """Remove one student without touching anyone else's vector."""
    with _lock:
        label = student_to_label.pop(student_id, None)
        if label is not None:
            label_to_student.pop(label, None)
            index.remove_ids(faiss.IDSelectorBatch(np.array([label], dtype="int64")))
            _persist_locked()
    return {"ok": True}

@app.post("/identify")
def identify(req: IdentifyReq):
    """Top-5 candidate search (Stage 1 of the cascade).

    Returns every candidate above nothing in particular — the backend
    applies score/gap/ambiguity gates. Top-5 (not just top-2) so the
    backend can detect look-alike clusters: 2+ distinct students above
    threshold means the scan is ambiguous even if top1-top2 looks fine.
    """
    emb = np.array(req.embedding, dtype="float32")
    if emb.shape != (DIM,):
        raise HTTPException(400, f"Expected dim {DIM}")
    emb = _normalize(emb).reshape(1, -1)
    with _lock:
        count = int(index.ntotal)
        if count == 0:
            return {"studentId": None, "score": 0.0, "gap": 0.0, "model": MODEL, "count": 0, "candidates": []}
        k = min(5, count)
        scores, labels = index.search(emb, k)
        # IndexFlatIP scores are inner products == cosines (normalized).
        candidates = [
            {"studentId": label_to_student.get(int(labels[0][i])), "score": float(scores[0][i])}
            for i in range(k)
            if int(labels[0][i]) >= 0
        ]
        s1 = candidates[0]["score"] if candidates else 0.0
        s2 = candidates[1]["score"] if len(candidates) > 1 else -1.0
        return {
            "studentId": candidates[0]["studentId"] if candidates else None,
            "score": s1,
            "gap": s1 - s2,
            "model": MODEL,
            "count": count,
            "candidates": candidates,
        }

# ---- Stage 2 rerank: independent second recognition model ----
# Embeddings from different models live in different spaces and can
# NEVER be compared cross-model. So rerank is pairwise verification:
# probe + enrollment photo are both embedded with the second model
# (GlintR100 from the antelopev2 pack — a different recognition
# backbone than buffalo_s's w600k_mbf) and compared. Detection reuses
# the main buffalo_s app; only the recognition step is independent,
# which is exactly the ensemble value. Loaded lazily; if unavailable,
# verify-pair reports it and the backend falls back to strict
# Stage-1 gates + desk referral.
import zipfile
from insightface.model_zoo import get_model as _get_model

RERANK_MODEL_FILE = os.getenv(
    "FACE_RERANK_MODEL_FILE",
    os.path.expanduser("~/.insightface/models/antelopev2/glintr100.onnx"),
)
_rerank_rec = None
_rerank_failed = False

def _get_rerank_rec():
    global _rerank_rec, _rerank_failed
    if _rerank_rec is not None:
        return _rerank_rec
    if _rerank_failed:
        return None
    try:
        if not os.path.exists(RERANK_MODEL_FILE):
            # FaceAnalysis downloads the pack zip but does not always
            # extract it; extract manually if needed.
            zip_path = RERANK_MODEL_FILE.replace("glintr100.onnx", "") + ".zip"
            models_dir = os.path.expanduser("~/.insightface/models")
            if os.path.exists(zip_path):
                zipfile.ZipFile(zip_path).extractall(models_dir)
        if not os.path.exists(RERANK_MODEL_FILE):
            # The pack zip nests one level deeper on some downloads
            # (models/antelopev2/antelopev2/glintr100.onnx) — find it.
            models_dir = os.path.expanduser("~/.insightface/models")
            for dirpath, _dirs, files in os.walk(models_dir):
                if "glintr100.onnx" in files:
                    globals()["RERANK_MODEL_FILE"] = os.path.join(dirpath, "glintr100.onnx")
                    break
        if not os.path.exists(RERANK_MODEL_FILE):
            # Last resort: let InsightFace fetch the pack, then retry.
            try:
                FaceAnalysis(name="antelopev2")
            except Exception:
                pass
        rec = _get_model(RERANK_MODEL_FILE)
        rec.prepare(ctx_id=-1)
        _rerank_rec = rec
        print("Rerank model loaded: glintr100 (antelopev2)")
        return _rerank_rec
    except Exception as e:
        print(f"rerank model unavailable: {e}")
        _rerank_failed = True
        return None

def _embed_with_rerank(b64: str):
    """Detect with the main app, embed with GlintR100. None if no face."""
    rec = _get_rerank_rec()
    if rec is None:
        return None
    raw = base64.b64decode(b64.split(",")[-1])
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    arr = np.array(img)[:, :, ::-1]  # RGB -> BGR
    faces = face_app.get(arr)
    if not faces:
        return None
    faces = sorted(faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]), reverse=True)
    emb = rec.get(arr, faces[0])
    return None if emb is None else emb.astype("float32")

class VerifyPairReq(BaseModel):
    probeImageBase64: str
    galleryImageBase64: str

@app.post("/verify-pair")
def verify_pair(req: VerifyPairReq):
    """Stage-2 pairwise verification with the independent second model."""
    if _get_rerank_rec() is None:
        return {"available": False, "score": None, "model": "glintr100"}
    try:
        e1 = _embed_with_rerank(req.probeImageBase64)
        e2 = _embed_with_rerank(req.galleryImageBase64)
        if e1 is None or e2 is None:
            return {"available": True, "score": None, "model": "glintr100"}
        n1, n2 = float(np.linalg.norm(e1)), float(np.linalg.norm(e2))
        if n1 == 0 or n2 == 0:
            return {"available": True, "score": None, "model": "glintr100"}
        return {"available": True, "score": float(np.dot(e1, e2) / (n1 * n2)), "model": "glintr100"}
    except Exception as e:
        print(f"verify-pair failed: {e}")
        return {"available": False, "score": None, "model": "glintr100"}
