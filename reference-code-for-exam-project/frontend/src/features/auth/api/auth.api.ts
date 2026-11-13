import { client } from "../../../shared/api";
import type { PublicUser } from "../../../app/store/auth.store";
import type { CreateStaffInput, LoginInput, ResetPasswordInput } from "../model/auth.schema";

interface AuthResponse {
  success: true;
  data: {
    ownerType: "User";
    user: PublicUser;
  };
}

/** POST /auth/login — sets httpOnly session cookies. */
export function login(body: LoginInput) {
  return client<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/* ------------------------- Admin-only staff ------------------------- */
/* There is no public registration. Staff accounts are created only
   by an authenticated admin; the backend enforces requireRole(admin). */

/** GET /auth/admin/users — list staff users (admin only). */
export function listStaffUsers() {
  return client<{ success: true; data: PublicUser[] }>("/auth/admin/users");
}

/** POST /auth/admin/users — create a teacher/admin (admin only). */
export function createStaffUser(body: CreateStaffInput) {
  return client<{ success: true; data: PublicUser }>("/auth/admin/users", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** POST /auth/admin/users/:id/reset-password — set a new password (admin only). */
export function resetStaffPassword(id: string, body: ResetPasswordInput) {
  return client<{ success: true; data: PublicUser }>(`/auth/admin/users/${id}/reset-password`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** POST /auth/logout — clears the auth cookies on this device. */
export function logout() {
  return client<{ success: true; data: { ok: true } }>("/auth/logout", {
    method: "POST",
    skipAuthRefresh: true,
  });
}
