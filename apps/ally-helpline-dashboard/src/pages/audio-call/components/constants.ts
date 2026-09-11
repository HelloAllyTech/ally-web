import { InDoubt, NoNetwork } from "@assets";
import { SocketDisconnectionReasons } from "@constants";

export const socketDisconnectionReasonContentMap = {
  [SocketDisconnectionReasons.NO_NETWORK]: {
    icon: NoNetwork,
    titleKey: "audioCall.error.noNetwork",
    descriptionKey: "audioCall.error.noNetworkDesc",
  },
  [SocketDisconnectionReasons.NO_NETWORK_IN_SHARED_SESSION]: {
    icon: NoNetwork,
    titleKey: "audioCall.error.noNetwork",
    descriptionKey: "audioCall.error.noNetworkSharedDesc",
  },
  [SocketDisconnectionReasons.SOMETHING_WENT_WRONG]: {
    icon: InDoubt,
    titleKey: "audioCall.error.somethingWrong",
    descriptionKey: "audioCall.error.somethingWrongDesc",
  },
  [SocketDisconnectionReasons.MICROPHONE_BLOCKED]: {
    icon: InDoubt,
    titleKey: "audioCall.error.micBlocked",
    descriptionKey: "audioCall.error.micBlockedDesc",
  },
  [SocketDisconnectionReasons.MICROPHONE_UNAVAILABLE]: {
    icon: InDoubt,
    titleKey: "audioCall.error.micUnavailable",
    descriptionKey: "audioCall.error.micUnavailableDesc",
  },
};

/**
 * Why the microphone could not be opened, in the two flavours worth telling a
 * counsellor apart: one they can fix in the browser, one they have to fix on
 * the machine.
 *
 * Exists because `getUserMedia` rejecting used to be swallowed entirely — the
 * session looked live, recorded nothing, and only failed at the summary screen
 * with "No audio detected".
 */
export const classifyMicrophoneError = (error: unknown): SocketDisconnectionReasons => {
  const name = (error as DOMException)?.name;
  return name === "NotAllowedError" || name === "SecurityError"
    ? SocketDisconnectionReasons.MICROPHONE_BLOCKED
    : SocketDisconnectionReasons.MICROPHONE_UNAVAILABLE;
};

// How long after the recording screen mounts to report the start conditions to
// the server if the session still is not capturing. The first fires around when
// a counsellor would notice nothing is happening; the second catches the ones
// who wait it out. Mirrors the mobile SCRIBE_START_DIAGNOSTIC cadence so the
// two platforms' log lines are comparable.
export const START_DIAGNOSTIC_DELAYS_MS = [5_000, 15_000];

export const NetworkIssuesList = [
  "io client disconnect",
  "io server disconnect",
  "transport close",
  "ping timeout",
  "transport error",
];

// socket.io sets this reason ONLY when the client itself calls disconnect() —
// i.e. an intentional end (user stopped, CHAT_ENDED). Must never be treated as
// a failure.
export const INTENTIONAL_DISCONNECT_REASON = "io client disconnect";

// Transient reasons socket.io automatically tries to reconnect from. The
// recorder is kept running across these so socket.io buffers the audio frames
// and flushes them on reconnect — instead of tearing the session down and
// showing an error the moment the network hiccups.
export const RECOVERABLE_DISCONNECT_REASONS = [
  "transport close",
  "ping timeout",
  "transport error",
];

// How long to keep a recording alive waiting for socket.io to reconnect after a
// transient drop before giving up and surfacing an error. Comfortably covers
// socket.io's default reconnection budget (5 attempts, up to 5s apart).
export const RECONNECT_GRACE_MS = 25_000;

export type DisconnectAction = "ignore" | "reconnecting" | "terminal";

/**
 * Decide how to react to a socket disconnect during an active recording:
 * - `ignore`: we disconnected on purpose (normal end) — do nothing.
 * - `reconnecting`: a transient drop socket.io will auto-recover — keep
 *   recording and wait (buffered frames flush on reconnect).
 * - `terminal`: a non-recoverable drop (server-forced / unknown-terminal) — the
 *   caller cleans up and surfaces an error.
 * Pure + side-effect-free so the decision is unit-tested independently of the
 * 500-line recording hook.
 */
export const classifyDisconnect = (reason?: string): DisconnectAction => {
  if (reason === INTENTIONAL_DISCONNECT_REASON) return "ignore";
  if (reason && RECOVERABLE_DISCONNECT_REASONS.some(recoverable => reason.includes(recoverable))) {
    return "reconnecting";
  }
  // No reason string → socket.io still attempts reconnection, so stay optimistic.
  if (!reason) return "reconnecting";
  // e.g. "io server disconnect": socket.io will NOT auto-reconnect.
  return "terminal";
};
