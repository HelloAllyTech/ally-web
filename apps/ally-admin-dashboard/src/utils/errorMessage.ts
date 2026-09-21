/**
 * The shared version of the `error?.data?.message || fallback` idiom that was
 * hand-rolled at 40+ call sites with inconsistent quality — some falling back
 * to an untranslated literal, some skipping the fallback and letting `undefined`
 * reach `toast.error`. Centralising it here means every call site gets the
 * same safety: only a genuine, non-empty string from the backend's own error
 * body is ever shown verbatim; anything else — a missing field, a non-string
 * value, a raw JS exception with no `.data` at all — falls back to curated,
 * caller-supplied copy instead of leaking a shape the backend never
 * guaranteed to be user-facing.
 */
export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === "object" && "message" in data) {
      const message = (data as { message?: unknown }).message;
      if (typeof message === "string" && message.trim().length > 0) {
        return message;
      }
    }
  }
  return fallback;
};
