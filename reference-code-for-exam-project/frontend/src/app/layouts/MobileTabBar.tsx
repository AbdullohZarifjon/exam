
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { cn } from "../../shared/lib/cn";
import { useNavItems } from "./nav-items";

/** Mobile bottom navigation (below `lg`). */
export function MobileTabBar() {
  const { t } = useTranslation();
  const { items, pendingCount } = useNavItems();

  return (
    <nav
      aria-label={t("nav.main")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-semibold transition-colors",
                isActive ? "text-accent" : "text-text-muted hover:text-navy-800",
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={cn("relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors", isActive ? "bg-accent-soft text-accent" : "text-text-muted")}>
                  <item.icon size={20} weight={isActive ? "fill" : "duotone"} />
                  {item.pendingBadge && typeof pendingCount === "number" && pendingCount > 0 ? (
                    <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 font-mono text-[9px] font-semibold leading-none text-white">
                      {pendingCount}
                    </span>
                  ) : null}
                </span>
                <span className="max-w-full truncate">{t(item.labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
