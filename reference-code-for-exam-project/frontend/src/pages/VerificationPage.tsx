import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, CaretRight } from "@phosphor-icons/react";

import { Button, Card, EmptyState, Modal, Spinner } from "../shared/ui";
import { faceApi } from "../features/face/api/face.api";

type VerifyRequest = any;

const DECISION_LABEL: Record<string, string> = {
  pending: "PENDING",
  approved: "ACCEPTED",
  denied: "DENIED",
  expired: "EXPIRED",
  claimed: "ACCEPTED",
};
const DECISION_CLASS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  claimed: "bg-emerald-100 text-emerald-800",
  denied: "bg-red-100 text-red-800",
  expired: "bg-slate-200 text-slate-600",
};

function DecisionBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider ${DECISION_CLASS[status] ?? "bg-slate-200 text-slate-600"}`}>
      {DECISION_LABEL[status] ?? status.toUpperCase()}
    </span>
  );
}

/**
 * Staff verification queue for look-alike (twin) kiosk requests.
 * The list shows only the student code per row (pending first);
 * clicking a row opens the review modal — live selfie vs enrollment
 * photo in 3:4 — with Approve/Deny. Decided/expired rows are greyed
 * and sorted last.
 */
export function VerificationPage() {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["verify-requests"],
    queryFn: () => faceApi.verifyRequests(),
    refetchInterval: 10_000,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const decide = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "deny" }) =>
      faceApi.decideVerifyRequest(id, action),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ["verify-requests"] });
      setSelectedId((cur) => (cur === id ? null : cur));
    },
  });

  const sorted = [...(data?.data ?? [])].sort((a, b) => {
    const rank = (r: VerifyRequest) =>
      r.status === "pending" ? 0 : r.status === "expired" ? 2 : 1;
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    // Pending oldest-first (fair queue); decided newest-first.
    return rank(a) === 0
      ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const pendingCount = sorted.filter((r) => r.status === "pending").length;
  const selected = selectedId ? sorted.find((r) => r.id === selectedId) ?? null : null;

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-[#8A9BB8]">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Verification</h1>
          <p className="mt-1 text-sm text-text-muted">
            Look-alike students request access from the kiosk — click a request to compare the live selfie with the enrollment photo. {pendingCount} pending.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void refetch()}>Refresh</Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState title="No verification requests" description="When a look-alike student scans at the kiosk, their request appears here." />
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-bg text-left text-xs uppercase tracking-wider text-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Student code</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Requested</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((r) => {
                const decided = r.status !== "pending";
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`cursor-pointer transition-colors hover:bg-bg ${decided ? "opacity-50" : ""}`}
                  >
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-navy-900">{r.student?.studentCode ?? r.claimedCode}</td>
                    <td className="px-4 py-3">
                      <DecisionBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</td>
                    <td className="px-4 py-3 text-right text-[#8A9BB8]"><CaretRight size={14} weight="bold" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {selected ? (
        <RequestDetailModal
          request={selected}
          busy={decide.isPending}
          onClose={() => setSelectedId(null)}
          onDecide={(action) => decide.mutate({ id: selected.id, action })}
        />
      ) : null}
    </div>
  );
}

function RequestDetailModal({
  request: r,
  busy,
  onClose,
  onDecide,
}: {
  request: VerifyRequest;
  busy: boolean;
  onClose: () => void;
  onDecide: (action: "approve" | "deny") => void;
}) {
  const isPending = r.status === "pending";
  return (
    <Modal
      open
      onClose={onClose}
      title={`${r.student?.fullName ?? r.claimedCode} · ${r.student?.studentCode ?? r.claimedCode}`}
      description={`${r.exam?.title ?? ""} — requested ${r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}${r.status === "pending" && r.expiresAt ? ` · expires ${new Date(r.expiresAt).toLocaleTimeString()}` : ""}`}
      maxWidth="max-w-2xl"
      footer={
        isPending ? (
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button variant="secondary" onClick={() => onDecide("deny")} loading={busy}>
              <XCircle size={14} weight="bold" /> Deny
            </Button>
            <Button onClick={() => onDecide("approve")} loading={busy}>
              <CheckCircle size={14} weight="bold" /> Approve
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end">
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>
        )
      }
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
        <DecisionBadge status={r.status} />
        {(r.candidates?.length ?? 0) > 0 ? (
          <span>Face candidates: {r.candidates.map((c: any) => Number(c.score ?? 0).toFixed(2)).join(" / ")}</span>
        ) : null}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <figure>
          <figcaption className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-text-muted">Live selfie (kiosk)</figcaption>
          {r.selfieUrl ? (
            <img src={r.selfieUrl} alt="Live selfie from kiosk" className="aspect-[3/4] w-full rounded-2xl border border-border object-cover" />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center rounded-2xl border border-dashed border-border text-xs text-text-muted">No selfie</div>
          )}
        </figure>
        <figure>
          <figcaption className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-text-muted">Enrollment photo (database)</figcaption>
          {r.enrollmentPhotoUrl ? (
            <img src={r.enrollmentPhotoUrl} alt="Enrollment photo" className="aspect-[3/4] w-full rounded-2xl border border-border object-cover" />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center rounded-2xl border border-dashed border-border text-xs text-text-muted">No photo on file</div>
          )}
        </figure>
      </div>
    </Modal>
  );
}
