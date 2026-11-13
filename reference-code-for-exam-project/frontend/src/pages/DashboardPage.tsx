
import { Link } from "react-router-dom";
import { GraduationCap, ListChecks, Users, ShieldCheck } from "@phosphor-icons/react";

import { Card } from "../shared/ui";
import { ROUTES } from "../shared/config/routes";
import { useAuthStore } from "../app/store/auth.store";
import { useExams } from "../features/exams/hooks/exams.hooks";
import { useStudents } from "../features/students/hooks/students.hooks";
import { useCountUp } from "../shared/lib/useCountUp";
import { useScrollReveal } from "../shared/lib/gsap-hooks";

export function DashboardPage() {
 const identityState = useAuthStore((s) => s.identity);
 const identity = identityState && "user" in identityState ? (identityState as unknown as { user?: { fullName?: string } }).user : undefined;
 const { data: examsData } = useExams();
 const { data: studentsData } = useStudents("", 1, 5000);
 const exams = examsData?.data ?? [];
 const students = studentsData?.data.items ?? [];
 const published = exams.filter((e: { status: string }) => e.status === "published").length;
 const enrolledCount = (students as unknown as { faceStatus?: string }[]).filter((s) => s.faceStatus === "enrolled").length;
 const ref = useScrollReveal<HTMLDivElement>([exams.length, students.length]);

 return (
  <div>
   <header className="mb-8">
    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">Staff dashboard</p>
    <h1 className="mt-2 text-[28px] font-bold tracking-tight">Hello, {identity?.fullName?.split(" ")[0] ?? "there"}.</h1>
    <p className="mt-1 text-sm text-text-muted">Students identify at kiosks by face. Manage exams and enrollment below.</p>
   </header>

   <div ref={ref} className="grid gap-4 md:grid-cols-3" style={{ gridAutoFlow: "dense" }}>
    <StatCard value={exams.length} label="Exams" icon={GraduationCap} to={ROUTES.EXAMS} />
    <StatCard value={published} label="Published" icon={ListChecks} to={ROUTES.EXAMS} />
    <StatCard value={students.length} label="Students" icon={Users} to={ROUTES.STUDENTS} />
   </div>

   <div ref={ref} className="mt-4 grid gap-4 md:grid-cols-2">
    <Card data-reveal className="overflow-hidden">
     <h2 className="flex items-center gap-2 text-sm font-bold"><ShieldCheck size={14} weight="bold" className="text-accent" />Face coverage</h2>
     <Coverage value={enrolledCount} total={students.length} />
     <p className="mt-1 text-xs text-text-muted">Enrolled students can take exams at kiosks immediately.</p>
    </Card>
    <Card data-reveal>
     <h2 className="text-sm font-bold">Quick actions</h2>
     <div className="mt-3 flex flex-col gap-2">
      <Link to={ROUTES.EXAMS} className="text-xs font-semibold text-accent hover:underline">Manage exams</Link>
      <Link to={ROUTES.STUDENTS} className="text-xs font-semibold text-accent hover:underline">Manage students</Link>
      <Link to="/students/enroll" className="text-xs font-semibold text-accent hover:underline">Face enrollment</Link>
     </div>
    </Card>
   </div>
  </div>
 );
}

function StatCard({ value, label, icon: Icon, to }: { value: number; label: string; icon: typeof GraduationCap; to: string; dataReveal?: boolean }) {
 const animated = useCountUp(value);
 return (
  <Link data-reveal to={to} className="group relative block overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-navy-900/8">
   <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent to-accent-bright opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
   <div className="flex items-center justify-between">
    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8A9BB8]">{label}</span>
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent transition-transform duration-300 group-hover:scale-105">
     <Icon size={17} weight="duotone" />
    </span>
   </div>
   <p className="mt-3 text-[32px] font-bold leading-none tabular-nums tracking-tight">{value === 0 && animated === 0 ? "0" : animated}</p>
  </Link>
 );
}

function Coverage({ value, total }: { value: number; total: number }) {
 const pct = total > 0 ? Math.round((value / total) * 100) : 0;
 const animatedPct = useCountUp(pct);
 return (
  <div className="mt-3">
   <div className="flex items-baseline gap-2">
    <span className="text-3xl font-bold tabular-nums tracking-tight">{value} / {total}</span>
    <span className="text-sm text-[#8A9BB8] tabular-nums">{animatedPct}%</span>
   </div>
   <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#EEF2FA]">
    <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-bright transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
   </div>
  </div>
 );
}
