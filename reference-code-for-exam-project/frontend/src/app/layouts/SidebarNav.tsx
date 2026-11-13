
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { cn } from "../../shared/lib/cn";
import { useNavItems } from "./nav-items";

export function SidebarNav() {
  const { t } = useTranslation();
  const { items } = useNavItems();

  return (
    <nav aria-label={t("nav.main")} className="flex flex-col gap-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.exact}
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-white/12 text-white shadow-sm ring-1 ring-white/12 backdrop-blur-sm"
                : "text-white/65 hover:bg-white/6 hover:text-white",
            )
          }
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/8 ring-1 ring-white/10 transition-transform duration-200 group-hover:scale-102">
            <item.icon size={16} weight="duotone" className="shrink-0" />
          </span>
          <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
          <span className="h-1.5 w-1.5 rounded-full bg-accent-bright opacity-0 transition-opacity duration-200 group-[.active]:opacity-100 NavLink-active:opacity-100" aria-hidden />
        </NavLink>
      ))}
      <div className="mt-4 rounded-xl bg-white/6 p-3 ring-1 ring-white/8">
        <p className="text-[11px] font-semibold text-white/85">Kiosk mode is live</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-white/55">Students identify by face at the kiosk. No codes, no proctors.</p>
      </div>
    </nav>
  );
}
