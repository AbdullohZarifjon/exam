import { GraduationCap, ListChecks, ShieldCheck, Users, UserCheck } from "@phosphor-icons/react";

import { ROUTES } from "../../shared/config/routes";
import { useAuthStore, type Role } from "../store/auth.store";

export interface NavItem {
  to: string;
  labelKey: string;
  icon: typeof ListChecks;
  roles?: ReadonlyArray<Role>;
  exact?: boolean;
  pendingBadge?: boolean;
}

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  {
    to: ROUTES.DASHBOARD,
    labelKey: "nav.dashboard",
    icon: ListChecks,
    exact: true,
    roles: ["admin", "teacher"],
  },
  { to: ROUTES.EXAMS, labelKey: "nav.exams", icon: GraduationCap, roles: ["admin", "teacher"] },
  { to: ROUTES.STUDENTS, labelKey: "nav.students", icon: Users, exact: true, roles: ["admin", "teacher"] },
  { to: "/students/enroll", labelKey: "nav.faceEnrollment", icon: Users, exact: true, roles: ["admin"] },
  { to: "/verification", labelKey: "nav.verification", icon: UserCheck, roles: ["admin", "teacher"] },
  { to: ROUTES.STAFF, labelKey: "nav.staff", icon: ShieldCheck, roles: ["admin"] },
];

export function useNavItems(): { items: NavItem[]; pendingCount: number } {
  const identity = useAuthStore((s) => s.identity);
  const role = (identity && "user" in identity ? (identity as { user?: { role?: string } }).user?.role : undefined) as Role | undefined;
  const items = NAV_ITEMS.filter((item) => !item.roles || !role || item.roles.includes(role as Role));
  return { items, pendingCount: 0 };
}
