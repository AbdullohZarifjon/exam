
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GraduationCap, ShieldCheck, Camera, Clock } from "@phosphor-icons/react";
import { useHeroStagger } from "../../shared/lib/gsap-hooks";

/** Split auth screen — navy brand panel, white form side. */
export function AuthLayout() {
  const { t } = useTranslation();
  const heroRef = useHeroStagger<HTMLDivElement>([]);

  return (
    <div className="grid min-h-[100dvh] bg-bg lg:grid-cols-[1.05fr_1fr]">
      {/* Left — navy brand panel */}
      <div className="kiosk-hero relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div className="kiosk-wash absolute inset-0 pointer-events-none" />
        <div ref={heroRef} className="relative flex flex-col justify-between h-full">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-navy-900 shadow-sm">
              <GraduationCap size={22} weight="fill" />
            </div>
            <span className="text-base font-bold tracking-tight">{t("app.name")}</span>
          </div>

          <div className="max-w-md py-16">
            <p data-hero-step className="mt-5 text-[32px] font-bold leading-[1.08] tracking-tight">
              {t("app.tagline")}
            </p>
            <p data-hero-step className="mt-4 text-[14px] leading-relaxed text-white/70">
              Students identify by face at the kiosk. No codes, no proctors — the attempt starts instantly and logs them out when they finish.
            </p>
            <div data-hero-step className="mt-8 grid grid-cols-3 gap-3 border-t border-white/12 pt-6">
              <div>
                <Camera size={16} weight="duotone" className="text-accent-bright" />
                <p className="mt-2 text-xs font-semibold text-white">Face match</p>
                <p className="mt-0.5 text-[11px] text-white/55">Score + gap gated</p>
              </div>
              <div>
                <Clock size={16} weight="duotone" className="text-accent-bright" />
                <p className="mt-2 text-xs font-semibold text-white">Timed attempts</p>
                <p className="mt-0.5 text-[11px] text-white/55">Snapshot grading</p>
              </div>
              <div>
                <ShieldCheck size={16} weight="duotone" className="text-accent-bright" />
                <p className="mt-2 text-xs font-semibold text-white">Result tokens</p>
                <p className="mt-0.5 text-[11px] text-white/55">Private, revocable</p>
              </div>
            </div>
          </div>

          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">Bilim v2 · University kiosk</p>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm rounded-3xl border border-border bg-white p-8 shadow-xl shadow-navy-900/8">
          {/* Mobile brand */}
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-white">
              <GraduationCap size={18} weight="fill" />
            </div>
            <span className="text-base font-bold tracking-tight">{t("app.name")}</span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
