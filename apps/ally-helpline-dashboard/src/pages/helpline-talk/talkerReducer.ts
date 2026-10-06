import type {
  GuestChatDto,
  GuestMessageDto,
  HelplineClosedReason,
  HelplineChatStatus,
  PublicStatusDto,
  PublicStatusEnabled,
} from "@types";

/**
 * The talker page's state machine:
 *
 *   loading → notAvailable | closed | consent → waiting → chat → ended
 *                                                   ↘ ended (left the queue / wait expired)
 *   any chat screen → deleted (erased)        error (status could not be loaded)
 *
 * Pure, so the transitions are unit-tested without a socket or a server. The
 * hook (useTalkerSession) owns the side effects and only dispatches here.
 */
export type TalkerScreen =
  | "loading"
  | "notAvailable"
  | "closed"
  | "consent"
  | "waiting"
  | "chat"
  | "ended"
  | "deleted"
  | "error";

export type TalkerMessageStatus = "pending" | "sent" | "failed";

export interface TalkerMessage extends GuestMessageDto {
  /** Only set on the talker's own messages. */
  localStatus?: TalkerMessageStatus;
  /** Why a send failed (an ack error code), for the retry hint. */
  failure?: string;
}

/** What kind of notice to show on the consent screen. */
export type TalkerNotice =
  | "network"
  | "consentOutdated"
  | "blocked"
  | "sessionExpired"
  | "rateLimited"
  | "generic"
  | null;

export interface TalkerState {
  screen: TalkerScreen;
  status: PublicStatusEnabled | null;
  /** The status endpoint said `{ enabled: false }` (unknown code or helpline off). */
  helplineDisabled: boolean;
  /** Why the closed screen is showing. */
  closedReason: HelplineClosedReason | null;
  chat: GuestChatDto | null;
  messages: TalkerMessage[];
  listenerTyping: boolean;
  notice: TalkerNotice;
  /** True while a resume (stored token → GET guest/chat) is in flight. */
  resuming: boolean;
}

export const initialTalkerState: TalkerState = {
  screen: "loading",
  status: null,
  helplineDisabled: false,
  closedReason: null,
  chat: null,
  messages: [],
  listenerTyping: false,
  notice: null,
  resuming: false,
};

export type TalkerAction =
  | { type: "STATUS_LOADED"; status: PublicStatusDto }
  | { type: "STATUS_FAILED" }
  | { type: "RESUME_STARTED" }
  | { type: "RESUMED"; chat: GuestChatDto; messages: GuestMessageDto[] }
  | { type: "RESUME_FAILED"; expired: boolean }
  | { type: "SESSION_STARTED"; chat: GuestChatDto; messages: GuestMessageDto[] }
  | {
      type: "START_FAILED";
      reason:
        | "closed"
        | "queueFull"
        | "disabled"
        | "blocked"
        | "consentOutdated"
        | "rateLimited"
        | "network";
    }
  | { type: "CHAT_UPDATED"; chat: GuestChatDto }
  | { type: "CHAT_ACCEPTED"; chat: GuestChatDto }
  | { type: "QUEUE_POSITION"; chatId: string; position: number }
  | { type: "MESSAGES_MERGED"; messages: GuestMessageDto[] }
  | {
      type: "MESSAGE_QUEUED";
      /** Negative: marks a message the server has not confirmed yet. See nextLocalMessageId. */
      localId: number;
      clientMessageId: string;
      content: string;
      createdAt: string;
    }
  | { type: "MESSAGE_ACKED"; clientMessageId: string; message: GuestMessageDto | null }
  | { type: "MESSAGE_FAILED"; clientMessageId: string; failure: string }
  | { type: "MESSAGE_RETRYING"; clientMessageId: string }
  | { type: "CHAT_ENDED"; chatId: string; endedReason: string | null }
  | { type: "LISTENER_TYPING"; typing: boolean }
  | { type: "FEEDBACK_SUBMITTED" }
  | { type: "DELETED" }
  | { type: "RESET"; notice?: TalkerNotice }
  | { type: "CLEAR_NOTICE" };

/** The screen a chat in this status belongs on. */
export const screenForChatStatus = (status: HelplineChatStatus): TalkerScreen => {
  if (status === "WAITING") return "waiting";
  if (status === "ACTIVE") return "chat";
  return "ended";
};

/** Where a talker with no chat lands, given what the status endpoint said. */
const screenWithoutChat = (
  status: PublicStatusEnabled | null,
  knownDisabled: boolean,
): Pick<TalkerState, "screen" | "closedReason"> => {
  if (knownDisabled) return { screen: "notAvailable", closedReason: null };
  if (!status) return { screen: "loading", closedReason: null };
  if (!status.open) {
    return { screen: "closed", closedReason: status.closedReason ?? "NO_LISTENERS" };
  }
  return { screen: "consent", closedReason: null };
};

const isChatScreen = (screen: TalkerScreen) =>
  screen === "waiting" || screen === "chat" || screen === "ended" || screen === "deleted";

/**
 * Merge server messages into the list. A server message replaces the local
 * pending copy that shares its `clientMessageId` (that is the "sent" tick), and
 * a message already held by `id` is replaced, never duplicated — the same
 * message arrives by ack, by MESSAGE_RECEIVED and by SYNC_SINCE.
 */
export const mergeTalkerMessages = (
  existing: TalkerMessage[],
  incoming: GuestMessageDto[],
): TalkerMessage[] => {
  const result = [...existing];
  for (const message of incoming) {
    const asTalkerMessage: TalkerMessage =
      message.from === "ME" ? { ...message, localStatus: "sent" } : { ...message };
    const byId = result.findIndex(item => item.id === message.id && item.localStatus !== "pending");
    if (byId >= 0) {
      result[byId] = asTalkerMessage;
      continue;
    }
    if (message.clientMessageId) {
      const byClientId = result.findIndex(item => item.clientMessageId === message.clientMessageId);
      if (byClientId >= 0) {
        result[byClientId] = asTalkerMessage;
        continue;
      }
    }
    result.push(asTalkerMessage);
  }
  // Server messages in server order (ids are monotonic); local unsent ones last.
  const confirmed = result.filter(item => item.id > 0).sort((a, b) => a.id - b.id);
  const unconfirmed = result.filter(item => item.id <= 0);
  return [...confirmed, ...unconfirmed];
};

let localIdCounter = 0;
/**
 * Negative ids mark messages the server has not confirmed yet. Generated by the
 * caller and carried on the action so the reducer stays pure.
 */
export const nextLocalMessageId = () => {
  localIdCounter -= 1;
  return localIdCounter;
};

/** The highest server-confirmed message id, for `SYNC_SINCE` / `afterId`. */
export const lastServerMessageId = (messages: TalkerMessage[]): number =>
  messages.reduce((max, item) => (item.id > max ? item.id : max), 0);

export const talkerReducer = (state: TalkerState, action: TalkerAction): TalkerState => {
  switch (action.type) {
    case "STATUS_LOADED": {
      const status = action.status.enabled ? action.status : null;
      const helplineDisabled = !action.status.enabled;
      // A status refresh never pulls a talker out of their chat: turning the
      // helpline off refuses new sessions, open chats finish normally.
      if (isChatScreen(state.screen) || state.resuming) {
        return { ...state, status: status ?? state.status, helplineDisabled };
      }
      return {
        ...state,
        status,
        helplineDisabled,
        ...screenWithoutChat(status, helplineDisabled),
      };
    }

    case "STATUS_FAILED":
      if (isChatScreen(state.screen) || state.resuming) return state;
      return { ...state, screen: "error" };

    case "RESUME_STARTED":
      return { ...state, resuming: true };

    case "RESUMED":
      return {
        ...state,
        resuming: false,
        chat: action.chat,
        messages: mergeTalkerMessages([], action.messages),
        screen: screenForChatStatus(action.chat.status),
        notice: null,
      };

    case "RESUME_FAILED": {
      const next = screenWithoutChat(state.status, state.helplineDisabled);
      return {
        ...state,
        resuming: false,
        chat: null,
        messages: [],
        ...next,
        // Status may still be loading; STATUS_LOADED will move the screen on.
        notice: action.expired ? "sessionExpired" : state.notice,
      };
    }

    case "SESSION_STARTED":
      return {
        ...state,
        chat: action.chat,
        messages: mergeTalkerMessages([], action.messages),
        screen: screenForChatStatus(action.chat.status),
        notice: null,
        listenerTyping: false,
      };

    case "START_FAILED":
      switch (action.reason) {
        case "closed":
          return {
            ...state,
            screen: "closed",
            closedReason: state.status?.closedReason ?? "NO_LISTENERS",
          };
        case "queueFull":
          return { ...state, screen: "closed", closedReason: "QUEUE_FULL" };
        case "disabled":
          return { ...state, screen: "notAvailable", closedReason: null, helplineDisabled: true };
        case "blocked":
          return { ...state, screen: "consent", notice: "blocked" };
        case "consentOutdated":
          return { ...state, screen: "consent", notice: "consentOutdated" };
        case "rateLimited":
          return { ...state, screen: "consent", notice: "rateLimited" };
        default:
          return { ...state, screen: "consent", notice: "network" };
      }

    case "CHAT_UPDATED":
    case "CHAT_ACCEPTED": {
      if (state.screen === "deleted") return state;
      if (state.chat && state.chat.id !== action.chat.id) return state;
      const screen =
        action.type === "CHAT_ACCEPTED" && action.chat.status !== "ENDED"
          ? "chat"
          : screenForChatStatus(action.chat.status);
      return { ...state, chat: action.chat, screen };
    }

    case "QUEUE_POSITION":
      if (!state.chat || state.chat.id !== action.chatId) return state;
      return { ...state, chat: { ...state.chat, queuePosition: action.position } };

    case "MESSAGES_MERGED":
      if (state.screen === "deleted") return state;
      return { ...state, messages: mergeTalkerMessages(state.messages, action.messages) };

    case "MESSAGE_QUEUED":
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: action.localId,
            clientMessageId: action.clientMessageId,
            from: "ME",
            type: "TEXT",
            systemKind: null,
            content: action.content,
            createdAt: action.createdAt,
            localStatus: "pending",
          },
        ],
      };

    case "MESSAGE_ACKED": {
      if (action.message) {
        return { ...state, messages: mergeTalkerMessages(state.messages, [action.message]) };
      }
      return {
        ...state,
        messages: state.messages.map(item =>
          item.clientMessageId === action.clientMessageId
            ? { ...item, localStatus: "sent", failure: undefined }
            : item,
        ),
      };
    }

    case "MESSAGE_FAILED":
      return {
        ...state,
        messages: state.messages.map(item =>
          item.clientMessageId === action.clientMessageId && item.localStatus !== "sent"
            ? { ...item, localStatus: "failed", failure: action.failure }
            : item,
        ),
      };

    case "MESSAGE_RETRYING":
      return {
        ...state,
        messages: state.messages.map(item =>
          item.clientMessageId === action.clientMessageId
            ? { ...item, localStatus: "pending", failure: undefined }
            : item,
        ),
      };

    case "CHAT_ENDED": {
      if (!state.chat || state.chat.id !== action.chatId || state.screen === "deleted") {
        return state;
      }
      return {
        ...state,
        chat: {
          ...state.chat,
          status: "ENDED",
          endedReason: action.endedReason ?? state.chat.endedReason,
          queuePosition: null,
        },
        screen: "ended",
        listenerTyping: false,
      };
    }

    case "LISTENER_TYPING":
      return { ...state, listenerTyping: action.typing };

    case "FEEDBACK_SUBMITTED":
      return state.chat ? { ...state, chat: { ...state.chat, feedbackSubmitted: true } } : state;

    case "DELETED":
      return {
        ...state,
        screen: "deleted",
        chat: null,
        messages: [],
        listenerTyping: false,
        notice: null,
      };

    case "RESET":
      return {
        ...state,
        chat: null,
        messages: [],
        listenerTyping: false,
        notice: action.notice ?? null,
        resuming: false,
        ...screenWithoutChat(state.status, state.helplineDisabled),
      };

    case "CLEAR_NOTICE":
      return { ...state, notice: null };

    default:
      return state;
  }
};
