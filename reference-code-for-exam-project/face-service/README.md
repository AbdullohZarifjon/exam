# On-prem Face Service

Self-hosted InsightFace (Buffalo_S, CPU) + FAISS HNSW index. All inference stays
on the university LAN — no image leaves the building.

## Run

```
docker compose up face-service
# or locally:
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## API

- `GET /health` — model + count
- `POST /embed {imageBase64}` → `{embedding, quality, model}`
- `POST /enroll {studentId, embedding}` → `{ok}`
- `POST /identify {embedding}` → `{studentId, score, gap, model}` (cosine-style)
- `DELETE /student/:id`

Thresholds live in backend env (`FACE_MATCH_THRESHOLD`, `FACE_GAP_THRESHOLD`);
service just returns scores. Backend enforces strict block.
