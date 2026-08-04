import { LOCAL_STORAGE_KEYS, isEmbeddedSurface } from "@constants";

/**
 * Bridges the consumer app's session into the embedded admin console.
 *
 * When path-mounted at /admin the console shares an origin — and therefore a
 * localStorage — with the consumer app, which keeps its tokens under
 * `accessToken` / `refreshToken`. This console keeps its own under
 * `adminAccessToken` / `adminRefreshToken`. The keys are distinct, so both
 * sessions coexist; that also means an INTERNAL user arriving from the
 * consumer app would otherwise be bounced to /admin/login despite already
 * being signed in.
 *
 * So: on startup, if there is no admin session but the consumer app has one,
 * copy it across. The token is the same kind of bearer token issued by the
 * same backend to the same user, and the backend authorises every request on
 * the caller's own permissions — adopting it grants nothing the user could not
 * already reach by signing in here directly.
 *
 * Deliberately a copy rather than a shared key: the console refreshes and
 * clears its tokens independently (baseApi's 401 handler rewrites them, logout
 * removes them), and neither should reach into the consumer app's session.
 *
 * No-ops on the standalone surface, where the consumer app's keys are not on
 * this origin at all.
 */

/** Consumer app (ally-helpline-dashboard) localStorage keys, on the shared origin. */
const CONSUMER_STORAGE_KEYS = {
  ACCESS_TOKEN: "accessToken",
  REFRESH_TOKEN: "refreshToken",
} as const;

/**
 * @param embedded which surface this is running on. Defaults to the build's own
 * answer; passed explicitly by tests, which always run as a standalone build.
 * @returns true when a consumer session was adopted, false otherwise (already
 * signed in here, no consumer session, or not the embedded surface).
 */
export const adoptConsumerSession = (embedded: boolean = isEmbeddedSurface()): boolean => {
  if (!embedded) return false;

  // An existing admin session always wins — it may belong to a different
  // account than the consumer session, and silently replacing it would swap
  // the user out from under an open console.
  if (localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN)) return false;

  const accessToken = localStorage.getItem(CONSUMER_STORAGE_KEYS.ACCESS_TOKEN);
  const refreshToken = localStorage.getItem(CONSUMER_STORAGE_KEYS.REFRESH_TOKEN);
  if (!accessToken || !refreshToken) return false;

  localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN, accessToken);
  localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN, refreshToken);
  // PrivateLayout gates on this flag rather than the token itself.
  localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "true");

  return true;
};
