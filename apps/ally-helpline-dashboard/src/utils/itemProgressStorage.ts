/**
 * In-progress answers for quiz/annotation track items live only in component
 * state until a single final submit. A session-expiry logout is a full
 * `window.location.href` reload (see `handleLogout` in `api/baseAPI.ts`),
 * which throws away that state and, previously, silently discarded whatever
 * the learner had done so far.
 *
 * These helpers snapshot that in-progress state to `sessionStorage`, keyed by
 * item id, so a re-login after a session-expiry redirect (same tab —
 * `sessionStorage` survives a same-tab navigation, only a closed tab clears
 * it) can restore exactly where the learner left off. They are equally used
 * to recover from an accidental refresh/back-navigation mid-item.
 *
 * Reads/writes are wrapped in try/catch because sessionStorage can throw in
 * private-browsing modes or when storage is disabled — this is a convenience
 * recovery path, never something a learner's progress should depend on.
 */

const keyFor = (namespace: string, itemId: string) => `tracks2.progress.${namespace}.${itemId}`;

export const saveItemProgress = <T>(namespace: string, itemId: string, value: T): void => {
  try {
    sessionStorage.setItem(keyFor(namespace, itemId), JSON.stringify(value));
  } catch {
    // sessionStorage may be unavailable (private mode) — non-fatal, the
    // learner just loses the resume-on-re-login convenience, not the ability
    // to keep working right now.
  }
};

export const loadItemProgress = <T>(namespace: string, itemId: string): T | null => {
  try {
    const raw = sessionStorage.getItem(keyFor(namespace, itemId));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const clearItemProgress = (namespace: string, itemId: string): void => {
  try {
    sessionStorage.removeItem(keyFor(namespace, itemId));
  } catch {
    // Nothing to do — worst case a stale snapshot lingers until it is
    // overwritten or the tab closes.
  }
};
