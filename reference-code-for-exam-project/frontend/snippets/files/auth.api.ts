import type { SignInType } from "../model/sign-in.schema";
import { client, type ApiResponse } from "@/shared/api";
import type { ChangePasswordLinkType } from "../model/password.change";

/**
 * Sign out the current user.
 * skipAuthRefresh: if the session's already dead, retrying via refresh just
 * to sign out again doesn't make sense - fail fast instead.
 * @returns 200 | 400
 */
export function signout() {
  return client<void>("/sign-out", { method: "POST", skipAuthRefresh: true });
}

/**
 * Sign in a user.
 * @param body - SignInType
 * @returns 200 | 404 | 400
 */
export function signin(body: SignInType) {
  // TODO: swap `unknown` for the real sign-in response shape once you have it
  return client<ApiResponse<unknown>>("/sign-in", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Change the current user's password.
 * @returns 200 | 400
 */
export function changePassword(body: unknown) {
  return client<ApiResponse<unknown>>("/user/password", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/**
 * Generate a password-reset link for a user (admin action).
 * @returns 200 | 400
 */
export function generatePasswordResetLink(id: number) {
  return client<ApiResponse<string>>(`/admin/user/${id}/reset/password`, {
    method: "POST",
  });
}

export function resetPassword(body: Partial<ChangePasswordLinkType>) {
  return client<ApiResponse<unknown>>("/reset/password", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
