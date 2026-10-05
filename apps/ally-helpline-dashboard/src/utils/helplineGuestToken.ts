import { getGuestTokenStorageKey } from "@constants/helpline";

/**
 * A talker's guest token lives in sessionStorage, one per helpline, so it dies
 * with the tab (contract §7.6: "closing the tab ends the chat on this device")
 * and is never visible to another tab or to the signed-in app's localStorage.
 *
 * Every accessor swallows storage errors: a private window or blocked site data
 * makes sessionStorage throw, and the talker should then simply get a fresh
 * consent screen rather than a crash.
 */
export interface StoredGuestToken {
  token: string;
  /** ISO timestamp from the server. */
  expiresAt: string;
}

export const readGuestToken = (tenantCode: string): StoredGuestToken | null => {
  try {
    const raw = window.sessionStorage.getItem(getGuestTokenStorageKey(tenantCode));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredGuestToken>;
    if (typeof parsed?.token !== "string" || !parsed.token) return null;
    return { token: parsed.token, expiresAt: String(parsed.expiresAt ?? "") };
  } catch {
    return null;
  }
};

export const writeGuestToken = (tenantCode: string, token: string, expiresAt: string) => {
  try {
    window.sessionStorage.setItem(
      getGuestTokenStorageKey(tenantCode),
      JSON.stringify({ token, expiresAt } satisfies StoredGuestToken),
    );
  } catch {
    // Storage unavailable: the chat still works for as long as this page stays open.
  }
};

export const clearGuestToken = (tenantCode: string) => {
  try {
    window.sessionStorage.removeItem(getGuestTokenStorageKey(tenantCode));
  } catch {
    // Nothing to clear.
  }
};

/** Milliseconds until the token should be refreshed (≤ 0 means now); null if unknown. */
export const msUntilGuestTokenRefresh = (
  expiresAt: string,
  refreshBeforeMs: number,
  now: number = Date.now(),
): number | null => {
  const expiry = Date.parse(expiresAt);
  if (Number.isNaN(expiry)) return null;
  return expiry - refreshBeforeMs - now;
};
