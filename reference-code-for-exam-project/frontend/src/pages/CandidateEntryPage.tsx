import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { Clock, ListChecks, ArrowsClockwise, ShieldCheck, ArrowRight, GraduationCap } from "@phosphor-icons/react";
import { Button, Input, Modal, Spinner, StatusBadge } from "../shared/ui";
import { ROUTES } from "../shared/config/routes";
import { isApiError } from "../shared/api";
import { useExams } from "../features/exams/hooks/exams.hooks";
import { FaceCapture } from "../features/face/components/FaceCapture";
import { faceApi } from "../features/face/api/face.api";
import { client } from "../shared/api";
import { useIdentify } from "../features/face/hooks/face.hooks";
import { useScrollReveal } from "../shared/lib/gsap-hooks";
import type { Exam } from "../features/exams/model/exam.types";
import { formatRelative } from "../shared/lib/format";

/**
 * Kiosk home — functional app UI. Direct exam list, no filters, no marketing.
 */

export function CandidateEntryPage() {
  const [pick, setPick] = useState<Exam | null>(null);
  const { data, isLoading, error } = useExams("published");
  const listRef = useScrollReveal<HTMLDivElement>([data?.data?.length]);

  const exams = data?.data ?? [];

  return (
    <main className="w-full max-w-full overflow-x-hidden">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-end px-6">
          <Link to={ROUTES.HOME} className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-navy-900 shadow-sm ring-1 ring-border"><GraduationCap size={20} weight="fill" /></div>
            <div className="leading-tight">
              <p className="text-[15px] font-bold tracking-tight text-navy-900">Bilim</p>
              <p className="text-[11px] text-text-muted">Kiosk</p>
            </div>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] px-6 pb-14 pt-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold leading-tight tracking-tight text-navy-900">Exams</h1>
            <p className="mt-1 text-[13px] text-text-muted">Choose an exam to begin. You will be asked to look at the camera to confirm your identity.</p>
          </div>
          <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-text-muted">{exams.length} exam{exams.length === 1 ? "" : "s"}</span>
        </div>

        <div ref={listRef}>
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-[#8A9BB8]"><Spinner /></div>
          ) : error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">Could not load exams. Check connection and try again.</p>
          ) : exams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-14 text-center">
              <p className="text-sm font-semibold text-navy-900">No exams available</p>
              <p className="mt-1 text-xs text-text-muted">There are no published exams right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" style={{ gridAutoFlow: "dense" }}>
              {exams.map((exam) => (
                <ExamCard key={exam.id} exam={exam} onStart={() => setPick(exam)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {pick ? <FaceGateModal exam={pick} onClose={() => setPick(null)} /> : null}
    </main>
  );
}

function ExamCard({ exam, onStart }: { exam: Exam; onStart: () => void }) {
  return (
    <div data-reveal className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-navy-900/8 hover:border-accent/25">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-[16px] font-bold leading-tight tracking-tight text-navy-900">{exam.title}</h3>
        <StatusBadge status={exam.status} />
      </div>
      {exam.description ? <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-text-muted">{exam.description}</p> : null}
      <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-[11px] text-text-muted">
        <span className="inline-flex items-center gap-1.5"><Clock size={12} weight="bold" />{exam.timerMinutes} min</span>
        <span className="inline-flex items-center gap-1.5"><ListChecks size={12} weight="bold" />{exam.questionsToServe} questions</span>
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#8A9BB8]">Updated {formatRelative(exam.updatedAt)}</span>
        <Button onClick={onStart} size="md">Start <ArrowRight size={13} weight="bold" /></Button>
      </div>
    </div>
  );
}

function FaceGateModal({ exam, onClose }: { exam: Exam; onClose: () => void }) {
  const identify = useIdentify();
  const [error, setError] = useState<string | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);

  const handleCapture = (imageBase64: string) => {
    setLastScan(imageBase64);
    setError(null);
    identify.mutate(
      { imageBase64, examId: exam.id },
      {
        onError: (err) => {
          const code = isApiError(err) ? (err.body as any)?.error?.code : undefined;
          if (code === "LOOKALIKE_VERIFICATION_REQUIRED") setVerifyOpen(true);
          else setError(isApiError(err) ? err.message : "Not recognized. Go to the enrollment desk.");
        },
      }
    );
  };

  if (verifyOpen) {
    return <VerifyRequestModal exam={exam} initialSelfie={lastScan} onClose={() => { setVerifyOpen(false); onClose(); }} />;
  }

  return (
    <Modal open onClose={onClose} dismissible={false} icon={<ShieldCheck size={20} weight="duotone" />} title={exam.title} description="Look at the camera to start.">
      <div className="relative mx-auto w-fit">
        <div className="scan-ring-ring absolute -inset-2 rounded-[2rem] border-2 border-accent/25 pointer-events-none" />
        <div className="scan-ring-ring-delay absolute -inset-2 rounded-[2rem] border-2 border-accent/15 pointer-events-none" />
        <FaceCapture onCapture={handleCapture} busy={identify.isPending} label={identify.isPending ? "Identifying…" : "Scan my face"} />
      </div>
      {error ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs text-red-800" role="alert">{error}</p>
      ) : (
        <p className="mt-3 text-center text-[12px] text-text-muted">Look straight, good light. 5 attempts max before cooldown.</p>
      )}
      <div className="mt-4 flex items-center justify-between">
        <button type="button" onClick={onClose} className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-navy-900">Back to exams</button>
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-text-muted">
          <ArrowsClockwise size={11} weight="bold" /> University servers
        </span>
      </div>
    </Modal>
  );
}

/**
 * Look-alike verification (twins): the scan matched more than one
 * student, so the kiosk enters the code, takes a live selfie, sends a
 * request to staff, and polls every 10s. On approval the backend starts
 * the attempt and this kiosk enters the exam. Non-dismissible except
 * via explicit Cancel — an accidental close must not strand the request.
 */
function VerifyRequestModal({ exam, initialSelfie, onClose }: { exam: Exam; initialSelfie?: string | null; onClose: () => void }) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  // Pre-filled with the original scan selfie — no retake needed unless blurred.
  const [selfie, setSelfie] = useState<string | null>(initialSelfie ?? null);
  const [request, setRequest] = useState<{ requestId: string; claimToken: string } | null>(null);
  const [status, setStatus] = useState<"idle" | "waiting" | "denied" | "expired" | "claimed">("idle");
  const [pollError, setPollError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const checkNow = async () => {
    if (!request) return;
    setChecking(true);
    try {
      const res = await faceApi.pollVerifyRequest(request.requestId, request.claimToken);
      const s = (res.data as any)?.status;
      setPollError(null);
      if (s === "denied" || s === "expired" || s === "claimed") setStatus(s);
      if (s === "approved") {
        try { await client("/auth/me"); } catch { /* cookies already set */ }
        const attempt = (res.data as any)?.attempt;
        if (attempt?.id) navigate(`/exam/${attempt.id}`);
        else navigate("/exams");
      }
    } catch (err) {
      // Surface claim failures (e.g. exam already completed) instead of
      // spinning forever — the kiosk can retry or go back.
      setPollError(isApiError(err) ? err.message : "Could not check the request. Try again.");
    } finally {
      setChecking(false);
    }
  };

  // Poll every 10s while waiting for the admin decision.
  useEffect(() => {
    if (!request || status !== "waiting") return;
    intervalRef.current = window.setInterval(() => { void checkNow(); }, 10_000);
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, status]);

  const sendRequest = async () => {
    if (!code.trim() || !selfie) return;
    setBusy(true);
    setError(null);
    try {
      const res = await faceApi.createVerifyRequest(exam.id, code.trim(), selfie);
      setRequest({ requestId: res.data.requestId, claimToken: res.data.claimToken });
      setStatus("waiting");
    } catch (err) {
      setError(isApiError(err) ? err.message : "Could not send the request. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (confirmCancel) {
    return (
      <Modal open onClose={() => setConfirmCancel(false)} dismissible={false} icon={<ShieldCheck size={20} weight="duotone" />} title="Cancel request?" description="Your verification request will be abandoned. You can start a new request from the exam list.">
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmCancel(false)}>Keep waiting</Button>
          <Button onClick={onClose}>Yes, cancel</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} dismissible={false} icon={<ShieldCheck size={20} weight="duotone" />} title="Verification needed" description="Your face matches more than one student. Enter your student code and take a live selfie so an admin can verify you.">
      {status === "waiting" ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Spinner />
          <p className="text-sm font-medium text-navy-900">Waiting for an admin to review your request…</p>
          <p className="text-xs text-text-muted">This kiosk checks every 10 seconds. Do not close this window.</p>
          {pollError ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800" role="alert">{pollError}</p> : null}
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => void checkNow()} disabled={checking} loading={checking}>Check now</Button>
            <Button variant="ghost" onClick={() => setConfirmCancel(true)}>Cancel request</Button>
          </div>
        </div>
      ) : status === "claimed" ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm font-medium text-navy-900">This request was already used to enter the exam.</p>
          <Button variant="secondary" onClick={onClose}>Back to exams</Button>
        </div>
      ) : status === "denied" || status === "expired" ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm font-medium text-red-800">{status === "denied" ? "Request denied by admin." : "Request expired (10 minutes). "}Please try again.</p>
          <Button variant="secondary" onClick={() => { setStatus("idle"); setRequest(null); setSelfie(null); }}>Try again</Button>
          <Button variant="ghost" onClick={onClose}>Back to exams</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-navy-800">Student code</span>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. STU-2026-00003" autoComplete="off" />
          </label>
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-navy-800">Live selfie</p>
            {selfie ? (
              <div className="flex flex-col items-center gap-2">
                <img src={selfie} alt="Your selfie" className="h-44 w-44 rounded-3xl border border-border object-cover" />
                <Button variant="ghost" size="sm" onClick={() => setSelfie(null)}>Retake</Button>
              </div>
            ) : (
              <FaceCapture onCapture={setSelfie} busy={false} label="Take selfie" />
            )}
          </div>
          {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800" role="alert">{error}</p> : null}
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={sendRequest} disabled={!code.trim() || !selfie || busy} loading={busy}>Send request to admin</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
