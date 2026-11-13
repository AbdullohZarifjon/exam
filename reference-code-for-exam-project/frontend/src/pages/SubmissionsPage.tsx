import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";

import { Card, EmptyState, Spinner, StatusBadge } from "../shared/ui";
import { ROUTES } from "../shared/config/routes";
import { useExam } from "../features/exams/hooks/exams.hooks";
import { useAttemptsForExam } from "../features/attempts/hooks/attempts.hooks";
import { useSearchParam } from "../shared/lib/search-param";
import { formatRelative } from "../shared/lib/format";

/**
 * Submissions list for a single exam. Replaces the inline table on the
 * exam-detail page — same data, but each row is a real link so the staff
 * can deep-link or open in a new tab.
 */
export function SubmissionsPage() {
 const { examId = "" } = useParams<{ examId: string }>();
 const { data: examData, isLoading: examLoading } = useExam(examId);
 const { data: attempts, isLoading: aLoading } = useAttemptsForExam(examId);
 const [search, setSearch] = useSearchParam("q");

 const list = attempts?.data ?? [];

 const filtered = useMemo(() => {
  const q = search.trim().toLowerCase();
  if (!q) return list;
  return list.filter((a) => {
   const name = a.student?.fullName?.toLowerCase() ?? "";
   const code = a.student?.studentCode?.toLowerCase() ?? "";
   return name.includes(q) || code.includes(q);
  });
 }, [list, search]);

 if (examLoading || aLoading) {
  return (
   <div className="flex h-40 items-center justify-center text-[#8A9BB8]">
    <Spinner />
   </div>
  );
 }
 if (!examData) return <EmptyState title="Exam not found" />;
 const exam = examData.data;

 return (
  <div>
   <Link
    to={ROUTES.EXAM_DETAIL(examId)}
    className="font-mono text-[11px] uppercase tracking-wider text-text-muted hover:text-navy-900"
   >
    ← {exam.title}
   </Link>

   <div className="mt-4 flex items-end justify-between gap-4">
    <div>
     <h1 className="text-[28px] font-bold tracking-tight">Submissions</h1>
     <p className="mt-1 text-sm text-text-muted">
      {filtered.length} of {list.length} attempts
      {filtered.length !== list.length ? " match your search" : ""}.
     </p>
    </div>
   </div>

   <Card className="mt-6 p-4">
    <div className="relative">
     <MagnifyingGlass
      size={14}
      weight="bold"
      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8A9BB8]"
     />
     <input
      type="search"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search by student name or code…"
      className="h-9 w-full rounded-xl border border-border bg-surface pl-8 pr-3 text-sm text-navy-900 outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15"
     />
    </div>
   </Card>

   <div className="mt-6">
    {filtered.length === 0 ? (
     <EmptyState
      title={list.length === 0 ? "No attempts yet" : "No matches"}
      description={
       list.length === 0
        ? "Once a student starts the exam, the result will appear here."
        : "Try a different name or code."
      }
     />
    ) : (
     <Card className="overflow-hidden p-0">
      <table className="w-full text-sm">
       <thead className="bg-bg text-left text-xs uppercase tracking-wider text-text-muted">
        <tr>
         <th className="px-4 py-3 font-medium">Student</th>
         <th className="px-4 py-3 font-medium">Code</th>
         <th className="px-4 py-3 font-medium">Status</th>
         <th className="px-4 py-3 font-medium">Auth</th>
         <th className="px-4 py-3 font-medium text-right">Score</th>
         <th className="px-4 py-3 font-medium">Submitted</th>
        </tr>
       </thead>
       <tbody className="divide-y divide-border">
        {filtered.map((a) => (
         <tr key={a.id} className="group hover:bg-bg">
          <td className="px-4 py-3">
           <Link
            to={ROUTES.ATTEMPT_DETAIL(a.id)}
            className="font-medium text-navy-900 group-hover:text-accent"
           >
            {a.student?.fullName ?? a.studentId}
           </Link>
          </td>
          <td className="px-4 py-3 font-mono text-xs text-text-muted">{a.student?.studentCode ?? "—"}</td>
          <td className="px-4 py-3">
           <StatusBadge status={a.status} />
          </td>
          <td className="px-4 py-3 font-mono text-xs text-text-muted">
           {a.identityAssurance?.method === "staff-verified" ? "Desk verify" : a.identityAssurance?.method === "face+rerank" ? "Face + rerank" : "Face scan"}
          </td>
          <td className="px-4 py-3 text-right font-mono text-xs">
           {a.status === "in-progress"
            ? `${a.questions.filter((q) => q.givenOptionIds.length > 0).length}/${a.questions.length} answered`
            : a.score != null && a.maxScore != null
             ? `${a.score} / ${a.maxScore} · ${a.scorePercent ?? 0}%`
             : `${a.totalCorrect ?? 0}/${a.totalQuestions ?? 0} · ${a.scorePercent ?? 0}%`}
          </td>
          <td className="px-4 py-3 text-xs text-text-muted">
           {a.submittedAt ? formatRelative(a.submittedAt) : "—"}
          </td>
         </tr>
        ))}
       </tbody>
      </table>
     </Card>
    )}
   </div>
  </div>
 );
}
