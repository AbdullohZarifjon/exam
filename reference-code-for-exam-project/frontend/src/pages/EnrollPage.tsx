import { useState } from "react";
import { FaceCapture } from "../features/face/components/FaceCapture";
import { SearchableSelect } from "../features/face/components/SearchableSelect";
import { processUploadedFiles, type UploadedFile } from "../features/face/components/FaceUpload";
import { useEnroll } from "../features/face/hooks/face.hooks";
import { useStudents } from "../features/students/hooks/students.hooks";
import { Button, Spinner } from "../shared/ui";
import { Card, CardHeader } from "../shared/ui";
import { Camera, UploadSimple, Files, Warning } from "@phosphor-icons/react";
import { isApiError } from "../shared/api";
import { cn } from "../shared/lib/cn";

type Mode = "camera" | "bulk";

type BulkRow = { file: UploadedFile; status: "pending" | "ok" | "error"; detail?: string; studentLabel?: string };

export function EnrollPage() {
  const { data, isLoading, error } = useStudents("", 1, 5000);
  const enroll = useEnroll();
  const [mode, setMode] = useState<Mode>("camera");
  const [selected, setSelected] = useState<string>("");
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);


  const [bulkFiles, setBulkFiles] = useState<UploadedFile[]>([]);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkConsent, setBulkConsent] = useState(false);

  const students = data?.data.items ?? [];
  const studentByCode = new Map(students.map((s) => [s.studentCode.toUpperCase(), s]));
  const selectedStudent = students.find((s) => s.id === selected) ?? null;

  const guard = () => {
    if (!selected) { setMessage("Pick a student first."); return false; }
    if (!consent) { setMessage("Confirm the consent checkbox first."); return false; }
    return true;
  };

  const handleEnroll = (studentId: string, imageBase64: string, done?: () => void) => {
    enroll.mutate(
      { studentId, imageBase64 },
      {
        onSuccess: (res) => { setMessage(`Enrolled. Quality ${(res.data as { quality: number }).quality?.toFixed(2) ?? ""} · model ${(res.data as { model: string }).model ?? ""}`); done?.(); },
        onError: (err) => setMessage(isApiError(err) ? err.message : "Enrollment failed."),
      }
    );
  };

  const onBulkPick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const processed = await processUploadedFiles(files);
    setBulkFiles((prev) => [...prev, ...processed]);
    setBulkRows((prev) => [...prev, ...processed.map((f) => ({ file: f, status: "pending" as const }))]);
  };

  const faceEnrollOnce = async (studentId: string, imageBase64: string) => {
    const { faceApi } = await import("../features/face/api/face.api");
    await faceApi.enroll(studentId, imageBase64);
  };

  const runBulk = async () => {
    if (!bulkConsent) { setMessage("Confirm the consent checkbox first."); return; }
    if (bulkFiles.length === 0) { setMessage("Add photos first."); return; }
    setBulkBusy(true);
    const rows: BulkRow[] = [...bulkRows];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const stem = row.file.name.replace(/\.[^.]+$/, "").trim().toUpperCase();
      const student = studentByCode.get(stem);
      if (!student) { rows[i] = { ...row, status: "error", detail: "No student with code " + stem }; continue; }
      try {
        await faceEnrollOnce(student.id, row.file.imageBase64);
        rows[i] = { ...row, status: "ok", detail: student.fullName, studentLabel: student.studentCode };
      } catch (e) {
        rows[i] = { ...row, status: "error", detail: isApiError(e) ? e.message : "Failed", studentLabel: student.studentCode };
      }
      setBulkRows([...rows]);
    }
    setBulkBusy(false);
    const ok = rows.filter((r) => r.status === "ok").length;
    setMessage(`Bulk done: ${ok}/${rows.length} enrolled.`);
  };

  const studentOptions = students.map((s) => ({
    value: s.id,
    label: s.fullName,
    sublabel: s.studentCode,
    badge: s.isLookalike ? "Look-alike" : (s.faceStatus ?? "Not enrolled"),
    badgeTone: (s.isLookalike ? "amber" : (s.faceStatus === "enrolled" ? "emerald" : "slate")) as "amber" | "emerald" | "slate",
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">Staff desk</p>
        <h1 className="mt-2 text-[28px] font-bold tracking-tight">Face enrollment</h1>
        <p className="mt-1 text-sm text-text-muted">Supervised, in-room. One clear photo is enough.</p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{isApiError(error) ? error.message : "Could not load students"}</p>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => setMode("camera")} className={cn("cursor-pointer rounded-full px-4 py-2 text-xs font-medium transition-colors", mode === "camera" ? "bg-navy-900 text-white" : "border border-border-strong bg-white text-[#475A82] hover:bg-accent-soft/50")}>
              <span className="inline-flex items-center gap-1.5"><Camera size={13} weight="bold" />Camera</span>
            </button>
            <button type="button" onClick={() => setMode("bulk")} className={cn("cursor-pointer rounded-full px-4 py-2 text-xs font-medium transition-colors", mode === "bulk" ? "bg-navy-900 text-white" : "border border-border-strong bg-white text-[#475A82] hover:bg-accent-soft/50")}>
              <span className="inline-flex items-center gap-1.5"><Files size={13} weight="bold" />Bulk upload</span>
            </button>
          </div>

          {mode === "bulk" ? (
            <Card>
              <CardHeader title="Bulk upload" subtitle="Mass enrollment by filename." />
              <p className="mb-4 text-xs leading-5 text-text-muted">Name each file with the student code, e.g. <span className="font-mono">STU-2026-00001.jpg</span>. Photos enroll one by one — no student needs to be picked first.</p>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border-strong bg-bg p-8 text-center transition-colors hover:border-navy-600">
                <UploadSimple size={28} weight="duotone" className="text-[#8A9BB8]" />
                <span className="mt-2 text-sm font-medium text-navy-800">Drop photos or click to browse</span>
                <span className="text-xs text-text-muted">JPG/PNG · multiple · filename = student code</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => void onBulkPick(e.target.files)} />
              </label>
              <label className="mt-4 flex cursor-pointer items-start gap-2 text-xs leading-5 text-navy-700">
                <input type="checkbox" checked={bulkConsent} onChange={(e) => setBulkConsent(e.target.checked)} className="mt-0.5 accent-[#1E3A8A]" />
                All pictured students consent to face template + photo storage. Kept on university servers until revoked.
              </label>
              {bulkRows.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {bulkRows.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-2xl border border-border p-2">
                      <img src={r.file.objectUrl} alt={r.file.name} className="h-12 w-12 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{r.file.name}</p>
                        <p className="truncate text-[11px] text-text-muted">{r.studentLabel ?? r.detail ?? "Waiting…"}</p>
                      </div>
                      <span className={r.status === "ok" ? "text-xs font-semibold text-emerald-700" : r.status === "error" ? "text-xs font-semibold text-red-700" : "text-xs text-[#8A9BB8]"}>
                        {r.status === "ok" ? "Enrolled ✓" : r.status === "error" ? "Failed" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
              <Button className="mt-4 w-full" size="lg" disabled={bulkBusy || bulkFiles.length === 0} onClick={() => void runBulk()}>
                {bulkBusy ? <Spinner className="h-3.5 w-3.5" /> : null}Enroll {bulkFiles.length} photo{bulkFiles.length === 1 ? "" : "s"}
              </Button>
              {message ? <p className="mt-3 rounded-2xl border border-border bg-bg p-3 text-center text-xs">{message}</p> : null}
            </Card>
          ) : (
            <div className="grid items-start gap-5 md:grid-cols-[1fr_320px]">
              <Card>
                <SearchableSelect
                  label="Student"
                  options={studentOptions}
                  value={selected}
                  onChange={(v) => { setSelected(v); setMessage(null); }}
                  placeholder="Search name or STU- code…"
                  emptyText="No students match this search."
                />
                {selectedStudent ? (
                  <div className="mt-3 flex items-start gap-3 rounded-2xl bg-bg px-3.5 py-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
                      {selectedStudent.fullName.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-navy-900">{selectedStudent.fullName}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-text-muted">{selectedStudent.studentCode}</p>
                      {selectedStudent.isLookalike ? (
                        <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                          <Warning size={12} weight="bold" /> Look-alike pair — uses admin verification at the kiosk.
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 self-center rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-navy-700 ring-1 ring-border">
                      Face: {selectedStudent.faceStatus ?? "not enrolled"}
                    </span>
                  </div>
                ) : null}
                <label className="mt-4 flex cursor-pointer items-start gap-2 text-xs leading-5 text-navy-700">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-[#1E3A8A]" />
                  Student consents to face template + photo storage. Kept on university servers until revoked.
                </label>
              </Card>

              <Card>
                <CardHeader title="Capture face" subtitle="Centered face, good light." />
                <FaceCapture
                  busy={enroll.isPending}
                  onCapture={(imageBase64) => {
                    if (!guard()) return;
                    handleEnroll(selected, imageBase64);
                  }}
                />
                {message ? <p className="mt-3 rounded-2xl border border-border bg-bg p-3 text-center text-xs">{message}</p> : null}
                {enroll.data ? <p className="mt-2 text-center text-[11px] text-text-muted">Done. Student can now use the kiosk.</p> : null}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
