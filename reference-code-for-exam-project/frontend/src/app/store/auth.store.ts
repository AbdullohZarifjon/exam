import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { client } from "../../shared/api";

/* ------------------------------------------------------------------ */
/*  Types — mirror the backend response shapes                          */
/* ------------------------------------------------------------------ */

export type Role = "admin" | "teacher" | "";

export interface PublicUser {
  id: string;
  fullName: string;
  username: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicStudent {
  id: string;
  fullName: string;
  studentCode: string;

  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type Identity = { ownerType: "User"; user: PublicUser } | { ownerType: "Student"; student: PublicStudent };

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

interface AuthState {
  /** The currently authenticated identity (staff user OR student). */
  identity: Identity | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /**
   * True once the first `/auth/me` revalidation has settled (pass or fail).
   * Route gates use it to tell "still checking" apart from "definitely
   * signed out", so a valid cookie session is never bounced to /login
   * before the request has answered. Not persisted: every full page load
   * must re-prove the session.
   */
  sessionChecked: boolean;

  /** Pulls the identity from `/auth/me`. Hydrates on app start. */
  fetchIdentity: () => Promise<void>;
  setIdentity: (identity: Identity) => void;
  clear: () => void;
}

/**
 * Auth state. Tokens live in httpOnly cookies managed by the backend —
 * the store only remembers WHO is signed in (persisted so a reload
 * doesn't flash the login screen; the cookie is the real source of
 * truth and `/auth/me` / `/auth/refresh` validate it).
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      identity: null,
      isLoading: false,
      isAuthenticated: false,
      sessionChecked: false,

      async fetchIdentity() {
        set({ isLoading: true });
        try {
          const res = await client<{ success: true; data: Identity }>("/auth/me");
          set({ identity: res.data, isAuthenticated: true, isLoading: false, sessionChecked: true });
        } catch {
          set({ identity: null, isAuthenticated: false, isLoading: false, sessionChecked: true });
        }
      },

      setIdentity(identity) {
        set({ identity, isAuthenticated: true });
      },

      clear() {
        set({ identity: null, isAuthenticated: false });
      },
    }),
    {
      name: "exam.auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        identity: s.identity,
        isAuthenticated: s.isAuthenticated,
      }),
    },
  ),
);
