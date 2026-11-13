
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GraduationCap, SignOut } from "@phosphor-icons/react";

import { useAuthStore } from "../store/auth.store";
import { useLogout } from "../../features/auth/hooks/auth.hooks";
import { SidebarNav } from "./SidebarNav";
import { MobileTabBar } from "./MobileTabBar";

export function AppShell() {
  const { t } = useTranslation();
  const identity = useAuthStore((s) => s.identity);
  const logout = useLogout();

  const fullName = identity?.ownerType === "User" ? identity.user.fullName : (identity?.student.fullName ?? "—");
  const subtitle = identity?.ownerType === "User" ? "@" + identity.user.username : identity?.student.studentCode;

  return (
    <div className="min-h-[100dvh] bg-bg text-navy-900">
      <header className="sticky top-0 z-30 border-b border-border bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-navy-900 shadow-sm ring-1 ring-border"><GraduationCap size={20} weight="fill" /></div>
            <div className="leading-tight">
              <span className="block text-[16px] font-bold tracking-tight">{t("app.name")}</span>
              <span className="block text-[11px] text-text-muted">Exam console</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight">{fullName}</p>
              <p className="font-mono text-[11px] leading-tight text-text-muted">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => logout.mutate()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-strong bg-white px-3 text-xs font-semibold text-navy-700 transition-colors hover:bg-accent-soft"
            >
              <SignOut size={14} weight="bold" />
              {t("nav.signOut")}
            </button>
          </div>
        </div>
      </header>

      <div className="relative mx-auto flex max-w-[1280px] gap-8 px-6 pb-28 pt-8 lg:pb-10">
        <aside className="relative hidden w-60 shrink-0 lg:block">
          <div className="nav-rail sticky top-24 overflow-hidden rounded-2xl shadow-lg">
            <div className="relative p-3">
              <SidebarNav />
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      <MobileTabBar />
    </div>
  );
}
