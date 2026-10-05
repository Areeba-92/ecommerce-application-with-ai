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

// The SDK keeps the session in memory only, so on every page load
// `getCurrentUser()` calls POST /api/auth/refresh. For a visitor who never
// signed in that is a guaranteed 401 ("No refresh token provided") logged in the
// console. The SDK writes `insforge_csrf_token` on sign-in and clears it on
// sign-out / failed refresh, and refresh is rejected (403) without it — so if
// the cookie is absent the refresh cannot succeed and we skip it.
const CSRF_COOKIE = "insforge_csrf_token";

function mayHaveSession() {
  return document.cookie.split(";").some((c) => c.trim().startsWith(`${CSRF_COOKIE}=`));
}

export function getCurrentUserOnce() {
  if (!mayHaveSession()) {
    return Promise.resolve({ data: { user: null }, error: null });
  }
  if (!pendingCurrentUser) {
    pendingCurrentUser = insforge.auth.getCurrentUser().finally(() => {
      pendingCurrentUser = null;
    });
  }
  return pendingCurrentUser;
}
