import type { HelplineErrorBody } from "@types";

export interface ParsedHelplineError {
  /** HTTP status, or an RTK Query string status such as "FETCH_ERROR". */
  status: number | string | undefined;
  errorCode: string | undefined;
  /** The server's message — for logs/toasts on staff screens only, never shown to talkers verbatim. */
  message: string | undefined;
}

/** Read `{ statusCode, message, errorCode }` out of an RTK Query error. */
export const parseHelplineError = (error: unknown): ParsedHelplineError => {
  if (typeof error !== "object" || error === null) {
    return { status: undefined, errorCode: undefined, message: undefined };
  }
  const { status, data } = error as { status?: number | string; data?: unknown };
  const body = (
    typeof data === "object" && data !== null ? data : {}
  ) as Partial<HelplineErrorBody>;
  const message = Array.isArray(body.message) ? body.message.join(", ") : body.message;
  return { status, errorCode: body.errorCode, message };
};

/** The guest token is no good any more: expired, revoked by erasure or block, or its chat is gone. */
export const isGuestTokenRejected = (error: unknown): boolean => {
  const { status, errorCode } = parseHelplineError(error);
  if (status === 401) return true;
  if (errorCode === "HELPLINE_GUEST_TOKEN_INVALID" || errorCode === "HELPLINE_CHAT_NOT_FOUND") {
    return true;
  }
  return status === 404;
};

/** A v4 uuid for `clientMessageId`; `crypto.randomUUID` needs a secure context. */
export const createClientMessageId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
