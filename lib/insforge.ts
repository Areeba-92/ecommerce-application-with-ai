import { createClient } from "@insforge/sdk";

export const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
});

// Dispatched on window after sign-in/sign-out so components with their own
// auth checks (Navbar, cart sync) know to re-check `insforge.auth.getCurrentUser()`.
export const AUTH_CHANGED_EVENT = "insforge-auth-changed";

export function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  pendingCurrentUser = null;
}

// Several components (Navbar, cart sync, page-level auth guards) each check
// auth state independently on mount. InsForge's refresh token is single-use,
// so firing `getCurrentUser()` from all of them at once races — the losing
// call's refresh attempt 401s and looks like "signed out". Dedupe concurrent
// calls onto one in-flight request instead.
let pendingCurrentUser: ReturnType<typeof insforge.auth.getCurrentUser> | null = null;

export function getCurrentUserOnce() {
  if (!pendingCurrentUser) {
    pendingCurrentUser = insforge.auth.getCurrentUser().finally(() => {
      pendingCurrentUser = null;
    });
  }
  return pendingCurrentUser;
}
