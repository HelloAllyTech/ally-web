import { FC, useEffect, useRef, useState } from "react";

import {
  ArrowRightLeft,
  ChevronLeft,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import {
  useAckHelplineRiskFlagMutation,
  useBlockHelplineTalkerMutation,
  useEndHelplineChatMutation,
  useGetHelplineChatQuery,
  useGetHelplineMeQuery,
  useGetHelplineMonitorQuery,
  useRequestHelplineTransferMutation,
  useSaveHelplineSummaryMutation,
  useSendHelplineCopilotFeedbackMutation,
  useSendHelplineWhisperMutation,
  useTakeOverHelplineChatMutation,
} from "@api/helpline";
import { ANALYTICS_EVENTS, ANALYTICS_PROPS } from "@constants/analyticsEvents";
import { HELPLINE_LIMITS } from "@constants/helpline";
import { Permissions } from "@constants/permissions";
import { ROUTES } from "@constants/routes";
import { useAnalytics } from "@hooks/useAnalytics";
import { useUser } from "@hooks/useUser";
import type { AckRiskFlagBody, CopilotSuggestion, RiskFlagDto } from "@types";
import { parseHelplineError } from "@utils/helplineErrors";
import { hasPermissions } from "@utils/permission";

import { AlertSupervisorButton } from "./components/AlertSupervisorButton";
import { BlockTalkerDialog, ListenerPickerDialog } from "./components/ChatActionDialogs";
import { CopilotPanel } from "./components/CopilotPanel";
import { RiskBadge } from "./components/HelplineBadges";
import { StaffComposer, STAFF_COMPOSER_ID } from "./components/StaffComposer";
import { StaffTranscript } from "./components/StaffTranscript";
import { SummaryReviewModal } from "./components/SummaryReviewModal";
import { TalkerInfoPanel, type TalkerAction } from "./components/TalkerInfoPanel";
import { WellbeingInterstitial } from "./components/WellbeingInterstitial";
import { WhisperComposer } from "./components/WhisperComposer";
import { useHelplineRealtime } from "./realtime/HelplineRealtimeProvider";
import { useSupervisorAlert } from "./useSupervisorAlert";
import { assignableListeners, isPreviousListener, openRiskFlags } from "./utils";
import { TalkerDialog } from "../helpline-talk/components/TalkerDialog";

type Phase = "chat" | "wellbeing";
type ActionDialog = "transfer" | "takeOver" | "block" | null;
/** "afterEnd": the chat just ended under me — then wellbeing/lobby. "edit": a later edit — stay. */
type ReviewMode = "afterEnd" | "edit" | null;

const wideScreen = () => typeof window !== "undefined" && window.innerWidth >= 1280;

/**
 * `/helpline/chat/:chatId` — transcript + composer | copilot | talker info.
 * The same view serves a live chat, a read-only one (monitoring, a previous
 * listener after transfer) and an ended one from History.
 */
export const HelplineChatView: FC = () => {
  const { chatId = "" } = useParams<{ chatId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { track } = useAnalytics();
  const { permissions } = useUser();
  const realtime = useHelplineRealtime();
  const { data: me } = useGetHelplineMeQuery();
  const {
    data: detail,
    isLoading,
    error,
    refetch,
  } = useGetHelplineChatQuery(chatId, {
    skip: !chatId,
  });
  const [endChat, { isLoading: isEnding }] = useEndHelplineChatMutation();
  const [saveSummary, { isLoading: isSavingSummary }] = useSaveHelplineSummaryMutation();
  const [ackFlag] = useAckHelplineRiskFlagMutation();
  const [sendFeedback] = useSendHelplineCopilotFeedbackMutation();
  const [requestTransfer, { isLoading: isTransferring }] = useRequestHelplineTransferMutation();
  const [takeOver, { isLoading: isTakingOver }] = useTakeOverHelplineChatMutation();
  const [blockTalker, { isLoading: isBlocking }] = useBlockHelplineTalkerMutation();
  const [sendWhisper] = useSendHelplineWhisperMutation();
  const supervisorAlert = useSupervisorAlert(chatId, me?.settings.listenerSupportContact ?? null);

  const [draft, setDraft] = useState("");
  const [attached, setAttached] = useState<{ messageId: number; index: number } | null>(null);
  const [copilotOpen, setCopilotOpen] = useState(true);
  const [infoOpen, setInfoOpen] = useState(wideScreen);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState<ReviewMode>(null);
  const [phase, setPhase] = useState<Phase>("chat");
  const [actionDialog, setActionDialog] = useState<ActionDialog>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canMessage = hasPermissions(permissions, Permissions.EDIT_HELPLINE_MESSAGE);
  const canEnd = hasPermissions(permissions, Permissions.EDIT_HELPLINE_END);
  const canUseCopilot = hasPermissions(permissions, Permissions.VIEW_HELPLINE_COPILOT);
  const canSummarise = hasPermissions(permissions, Permissions.EDIT_HELPLINE_SUMMARY);
  // Supervisors: transfer/assign/take-over/block share one permission.
  const canSupervise = hasPermissions(permissions, Permissions.EDIT_HELPLINE_TRANSFER);
  const canWhisper = hasPermissions(permissions, Permissions.EDIT_HELPLINE_WHISPER);
  const canMonitor = hasPermissions(permissions, Permissions.VIEW_HELPLINE_MONITOR);

  const chat = detail?.chat;
  const isListener = chat?.myAccess === "LISTENER";
  const isReadOnly = chat?.myAccess === "READ_ONLY";
  const isActive = chat?.status === "ACTIVE";
  const canEditSummary = Boolean(isListener && canSummarise);
  const wasMyChat = Boolean(detail && me && isPreviousListener(detail, me.userId));

  // A transfer target is picked from who is available — which only the Monitor
  // can see. Fetched just for the open dialog; a listener without it gets
  // "anyone available".
  const { data: monitor, isFetching: isLoadingListeners } = useGetHelplineMonitorQuery(undefined, {
    skip: actionDialog !== "transfer" || !canMonitor,
  });
  const transferTargets =
    canMonitor && monitor && me
      ? assignableListeners(monitor.listeners, me.orgMaxConcurrentPerListener, chat?.listener?.id)
      : null;

  // Join the room (read-only access included) and resync once loaded.
  useEffect(() => {
    if (!chatId) return undefined;
    return realtime.watchChat(chatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);
  const loadedChatId = detail?.chat.id;
  useEffect(() => {
    if (loadedChatId) void realtime.syncChat(loadedChatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedChatId]);

  // The chat ending while it's on screen (by me, the talker, or a supervisor)
  // opens the summary review for the listener of record.
  const previousStatus = useRef(chat?.status);
  useEffect(() => {
    const before = previousStatus.current;
    previousStatus.current = chat?.status;
    if (before === "ACTIVE" && chat?.status === "ENDED" && canEditSummary)
      setReviewMode("afterEnd");
  }, [chat?.status, canEditSummary]);

  // Losing the chat while it's on screen (a transfer was claimed, or a
  // supervisor took over) says so once; the banner then stays.
  const previousAccess = useRef(chat?.myAccess);
  useEffect(() => {
    const before = previousAccess.current;
    previousAccess.current = chat?.myAccess;
    if (before === "LISTENER" && chat?.myAccess === "READ_ONLY") {
      toast(
        t("helplineWorkspace.transfer.nowWith", {
          name: chat.listener?.displayName || t("helplineWorkspace.chat.otherStaff"),
        }),
      );
    }
    if (before === "READ_ONLY" && chat?.myAccess === "LISTENER") {
      toast(t("helplineWorkspace.takeOver.nowYours"));
    }
  }, [chat?.myAccess, chat?.listener?.displayName, t]);

  // An open risk flag keeps the copilot panel (where its banner lives) open.
  const hasOpenFlag = detail ? openRiskFlags(detail.riskFlags).length > 0 : false;
  const showCopilot = copilotOpen || hasOpenFlag;

  const finishChat = () => {
    if (detail?.chat.riskLevel === "HIGH") setPhase("wellbeing");
    else navigate(ROUTES.HELPLINE);
  };

  const onConfirmEnd = async () => {
    setEndError(null);
    try {
      await endChat(chatId).unwrap();
      track(ANALYTICS_EVENTS.HELPLINE_CHAT_ENDED_BY_LISTENER, {
        [ANALYTICS_PROPS.HELPLINE_CHAT_ID]: chatId,
        [ANALYTICS_PROPS.HELPLINE_RISK_LEVEL]: chat?.riskLevel,
        [ANALYTICS_PROPS.HELPLINE_MESSAGE_COUNT]: detail?.messages.filter(m => m.type === "TEXT")
          .length,
      });
      setConfirmEnd(false);
      if (canEditSummary) setReviewMode("afterEnd");
      else finishChat();
    } catch (endFailure) {
      if (parseHelplineError(endFailure).errorCode === "HELPLINE_CHAT_ENDED") {
        setConfirmEnd(false);
        void refetch();
        return;
      }
      setEndError(t("helplineWorkspace.info.endFailed"));
    }
  };

  const closeReview = () => {
    const mode = reviewMode;
    setReviewMode(null);
    if (mode === "afterEnd") finishChat();
  };

  const onSaveSummary = async (fields: Record<string, string>) => {
    try {
      await saveSummary({ chatId, fields }).unwrap();
      toast.success(t("helplineWorkspace.summary.saved"));
      closeReview();
    } catch {
      toast.error(t("helplineWorkspace.summary.failed"));
    }
  };

  const onUseSuggestion = (suggestion: CopilotSuggestion, messageId: number) => {
    setDraft(current =>
      current.trim() ? `${current.trimEnd()} ${suggestion.text}` : suggestion.text,
    );
    setAttached({ messageId, index: suggestion.index });
    track(ANALYTICS_EVENTS.HELPLINE_SUGGESTION_INSERTED, {
      [ANALYTICS_PROPS.HELPLINE_CHAT_ID]: chatId,
      [ANALYTICS_PROPS.HELPLINE_SKILL_KEY]: suggestion.skillKey,
      [ANALYTICS_PROPS.HELPLINE_SUGGESTION_INDEX]: suggestion.index,
    });
    // Inserted, never sent: hand the listener the box to edit it in.
    requestAnimationFrame(() => {
      const box = document.getElementById(STAFF_COMPOSER_ID) as HTMLTextAreaElement | null;
      box?.focus();
      box?.setSelectionRange(box.value.length, box.value.length);
    });
  };

  const onSend = () => {
    const content = draft.trim();
    if (!content || !chat) return;
    realtime.sendMessage(chat.id, content, attached ?? undefined);
    setDraft("");
    setAttached(null);
  };

  const onAcknowledge = async (flag: RiskFlagDto, body: AckRiskFlagBody) => {
    try {
      await ackFlag({ chatId, flagId: flag.id, body }).unwrap();
      track(ANALYTICS_EVENTS.HELPLINE_RISK_ACKNOWLEDGED, {
        [ANALYTICS_PROPS.HELPLINE_CHAT_ID]: chatId,
        [ANALYTICS_PROPS.HELPLINE_RISK_LEVEL]: flag.level,
        [ANALYTICS_PROPS.HELPLINE_RISK_SOURCE]: flag.source,
        [ANALYTICS_PROPS.HELPLINE_RISK_OUTCOME]: body.outcome,
      });
      return true;
    } catch {
      return false;
    }
  };

  const onFeedback = async (
    messageId: number,
    index: number | undefined,
    rating: "UP" | "DOWN",
  ) => {
    try {
      await sendFeedback({
        chatId,
        body: { messageId, rating, ...(index !== undefined ? { index } : {}) },
      }).unwrap();
      return true;
    } catch {
      toast.error(t("helplineWorkspace.copilot.feedbackFailed"));
      return false;
    }
  };

  const openActionDialog = (dialog: ActionDialog) => {
    setActionError(null);
    setActionDialog(dialog);
  };

  /** Shared failure handling: an ended chat closes the dialog and refreshes. */
  const actionFailed = (failure: unknown, fallbackKey: string) => {
    if (parseHelplineError(failure).errorCode === "HELPLINE_CHAT_ENDED") {
      setActionDialog(null);
      void refetch();
      return;
    }
    setActionError(t(fallbackKey));
  };

  const onConfirmTransfer = async (targetListenerId: number | undefined) => {
    setActionError(null);
    try {
      await requestTransfer({ chatId, targetListenerId }).unwrap();
      track(ANALYTICS_EVENTS.HELPLINE_TRANSFER_REQUESTED, {
        [ANALYTICS_PROPS.HELPLINE_CHAT_ID]: chatId,
        [ANALYTICS_PROPS.HELPLINE_ACTOR]: isListener ? "listener" : "supervisor",
        [ANALYTICS_PROPS.HELPLINE_HAS_TARGET]: targetListenerId !== undefined,
      });
      setActionDialog(null);
      toast(t("helplineWorkspace.transfer.requested"));
    } catch (failure) {
      actionFailed(failure, "helplineWorkspace.transfer.failed");
    }
  };

  const onConfirmTakeOver = async () => {
    setActionError(null);
    try {
      await takeOver(chatId).unwrap();
      track(ANALYTICS_EVENTS.HELPLINE_CHAT_TAKEN_OVER, {
        [ANALYTICS_PROPS.HELPLINE_CHAT_ID]: chatId,
        [ANALYTICS_PROPS.HELPLINE_RISK_LEVEL]: chat?.riskLevel,
      });
      setActionDialog(null);
    } catch (failure) {
      actionFailed(failure, "helplineWorkspace.takeOver.failed");
    }
  };

  const onConfirmBlock = async (reason: string) => {
    if (!chat) return;
    setActionError(null);
    try {
      await blockTalker({
        talkerId: chat.talker.id,
        chatId,
        ...(reason ? { reason: reason.slice(0, HELPLINE_LIMITS.BLOCK_REASON_MAX) } : {}),
      }).unwrap();
      track(ANALYTICS_EVENTS.HELPLINE_TALKER_BLOCKED, {
        [ANALYTICS_PROPS.HELPLINE_CHAT_ID]: chatId,
        [ANALYTICS_PROPS.HELPLINE_HAS_REASON]: Boolean(reason),
      });
      setActionDialog(null);
      toast.success(t("helplineWorkspace.block.done"));
    } catch (failure) {
      actionFailed(failure, "helplineWorkspace.block.failed");
    }
  };

  const onWhisper = async (content: string) => {
    try {
      await sendWhisper({ chatId, content }).unwrap();
      track(ANALYTICS_EVENTS.HELPLINE_WHISPER_SENT, {
        [ANALYTICS_PROPS.HELPLINE_CHAT_ID]: chatId,
      });
      return true;
    } catch {
      toast.error(t("helplineWorkspace.whisper.failed"));
      return false;
    }
  };

  const isOpen = chat !== undefined && chat.status !== "ENDED";
  const alertSupervisorNode =
    isListener && isActive ? <AlertSupervisorButton alert={supervisorAlert} /> : null;
  const bannerAlertSupervisor =
    isListener && isActive ? (
      <AlertSupervisorButton alert={supervisorAlert} variant="banner" />
    ) : undefined;

  const actions: TalkerAction[] = (() => {
    const list: TalkerAction[] = [];
    if (alertSupervisorNode) {
      list.push({
        key: "alertSupervisor",
        label: t("helplineWorkspace.alertSupervisor.button"),
        onSelect: () => undefined,
        node: alertSupervisorNode,
      });
    }
    if (isActive && !chat?.transferPending && ((isListener && canEnd) || canSupervise)) {
      list.push({
        key: "transfer",
        label: t("helplineWorkspace.transfer.action"),
        onSelect: () => openActionDialog("transfer"),
      });
    }
    if (isActive && isReadOnly && canSupervise) {
      list.push({
        key: "takeOver",
        label: t("helplineWorkspace.takeOver.action"),
        onSelect: () => openActionDialog("takeOver"),
      });
    }
    if (isOpen && canSupervise && !chat?.talker.blocked) {
      list.push({
        key: "block",
        label: t("helplineWorkspace.block.action"),
        onSelect: () => openActionDialog("block"),
        destructive: true,
      });
    }
    if (isListener && isActive && canEnd) {
      list.push({
        key: "end",
        label: t("helplineWorkspace.info.endChat"),
        onSelect: () => setConfirmEnd(true),
        destructive: true,
      });
    }
    return list;
  })();

  if (phase === "wellbeing") {
    return (
      <WellbeingInterstitial
        supportContact={me?.settings.listenerSupportContact ?? null}
        onContinue={() => navigate(ROUTES.HELPLINE)}
      />
    );
  }

  if (isLoading) {
    return (
      <p className="p-6 font-primary text-sm text-typography-700" role="status">
        {t("helplineWorkspace.chat.loading")}
      </p>
    );
  }

  if (!detail || !chat || !me) {
    const { status } = parseHelplineError(error);
    return (
      <div className="flex flex-col items-start gap-3 p-6 font-primary">
        <p className="text-base text-typography-800">
          {status === 404 || status === 403
            ? t("helplineWorkspace.chat.notFound")
            : t("helplineWorkspace.chat.loadFailed")}
        </p>
        <div className="flex gap-2">
          <Link
            to={ROUTES.HELPLINE}
            className="rounded-full border border-border-medium px-4 py-2 text-sm text-typography-900 hover:bg-background-secondary"
          >
            {t("helplineWorkspace.chat.back")}
          </Link>
          {status !== 404 && status !== 403 && (
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-full border border-border-medium px-4 py-2 text-sm text-typography-900 hover:bg-background-secondary"
            >
              {t("helplineWorkspace.chat.retry")}
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentListenerName = chat.listener?.displayName || t("helplineWorkspace.chat.otherStaff");
  const showWhisperComposer = isReadOnly && isActive && canWhisper && Boolean(chat.listener);
  const disabledReason =
    chat.status === "ENDED"
      ? t("helplineWorkspace.chat.ended")
      : !isListener
        ? wasMyChat
          ? t("helplineWorkspace.transfer.previousComposer", { name: currentListenerName })
          : t("helplineWorkspace.chat.readOnly")
        : !canMessage
          ? t("helplineWorkspace.chat.noPermission")
          : null;

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="helpline-chat-view">
      <header className="flex flex-wrap items-center gap-2 border-b border-border-light px-4 py-2">
        <Link
          to={ROUTES.HELPLINE}
          className="inline-flex min-h-[36px] items-center gap-1 rounded-full pr-2 font-primary text-sm text-typography-800 hover:text-typography-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          {t("helplineWorkspace.chat.back")}
        </Link>
        <h1 className="ph-no-capture min-w-0 truncate font-primary text-lg font-medium text-typography-900">
          {chat.talker.displayName}
        </h1>
        <span className="rounded-full bg-background-secondary px-2 py-0.5 font-primary text-xs text-typography-800">
          {t(`helplineWorkspace.chat.status.${chat.status}`)}
        </span>
        <RiskBadge level={chat.riskLevel} />
        <div className="ml-auto flex items-center gap-1">
          {/* End chat is always one click away, not only in the (collapsible) info panel. */}
          {actions.some(action => action.key === "end") && (
            <button
              type="button"
              onClick={() => setConfirmEnd(true)}
              className="mr-1 inline-flex min-h-[36px] items-center rounded-full border border-destructive-300 px-3 font-primary text-sm font-medium text-destructive-700 hover:bg-destructive-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              {t("helplineWorkspace.info.endChat")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setCopilotOpen(open => !open)}
            disabled={hasOpenFlag}
            aria-pressed={showCopilot}
            aria-label={
              showCopilot
                ? t("helplineWorkspace.chat.hideCopilot")
                : t("helplineWorkspace.chat.showCopilot")
            }
            title={
              showCopilot
                ? t("helplineWorkspace.chat.hideCopilot")
                : t("helplineWorkspace.chat.showCopilot")
            }
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-typography-800 hover:bg-background-secondary disabled:opacity-50"
          >
            <Sparkles aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setInfoOpen(open => !open)}
            aria-pressed={infoOpen}
            aria-label={
              infoOpen ? t("helplineWorkspace.chat.hideInfo") : t("helplineWorkspace.chat.showInfo")
            }
            title={
              infoOpen ? t("helplineWorkspace.chat.hideInfo") : t("helplineWorkspace.chat.showInfo")
            }
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-typography-800 hover:bg-background-secondary"
          >
            {infoOpen ? (
              <PanelRightClose aria-hidden="true" className="h-4 w-4" />
            ) : (
              <PanelRightOpen aria-hidden="true" className="h-4 w-4" />
            )}
          </button>
        </div>
      </header>

      {chat.erased && (
        <p className="border-b border-border-light bg-background-secondary px-4 py-2 font-primary text-sm text-typography-800">
          {t("helplineWorkspace.chat.erased")}
        </p>
      )}
      {isActive && chat.transferPending && (
        <p
          role="status"
          className="flex items-center gap-2 border-b border-border-light bg-status-mauveBg px-4 py-2 font-primary text-sm text-status-mauveFg"
          data-testid="transfer-pending-banner"
        >
          <ArrowRightLeft aria-hidden="true" className="h-4 w-4 flex-shrink-0" />
          {isListener
            ? t("helplineWorkspace.transfer.pendingListener")
            : t("helplineWorkspace.transfer.pending")}
        </p>
      )}
      {wasMyChat && chat.status !== "ENDED" && (
        <p
          role="status"
          className="border-b border-border-light bg-background-secondary px-4 py-2 font-primary text-sm text-typography-800"
          data-testid="previous-listener-banner"
        >
          {t("helplineWorkspace.transfer.previousBanner", { name: currentListenerName })}
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section
          className="flex min-h-0 min-w-0 flex-1 flex-col"
          aria-label={t("helplineWorkspace.chat.transcriptLabel")}
        >
          <StaffTranscript
            chat={chat}
            messages={detail.messages}
            pending={realtime.pendingByChat[chat.id] ?? []}
            myUserId={me.userId}
            talkerTyping={Boolean(realtime.typingByChat[chat.id])}
            onRetry={clientMessageId => realtime.retryMessage(chat.id, clientMessageId)}
          />
          {showWhisperComposer ? (
            <WhisperComposer listenerName={currentListenerName} onSend={onWhisper} />
          ) : (
            <StaffComposer
              value={draft}
              onChange={value => {
                setDraft(value);
                if (!value.trim()) setAttached(null);
              }}
              onSend={onSend}
              onTyping={() => realtime.notifyTyping(chat.id)}
              disabledReason={disabledReason}
            />
          )}
        </section>

        {showCopilot && (
          <aside className="max-h-[50vh] overflow-y-auto border-t border-border-light bg-background-secondary lg:max-h-none lg:w-[360px] lg:border-l lg:border-t-0">
            <CopilotPanel
              detail={detail}
              settings={me.settings}
              canUseCopilot={canUseCopilot}
              canAcknowledge={canUseCopilot && isListener}
              canEditSummary={canEditSummary}
              onUseSuggestion={onUseSuggestion}
              onAcknowledge={onAcknowledge}
              onFeedback={onFeedback}
              onEditFinalSummary={() => setReviewMode("edit")}
              alertSupervisor={bannerAlertSupervisor}
            />
          </aside>
        )}

        {infoOpen && (
          <aside className="overflow-y-auto border-t border-border-light lg:w-[260px] lg:border-l lg:border-t-0">
            <TalkerInfoPanel chat={chat} actions={actions} />
          </aside>
        )}
      </div>

      <TalkerDialog
        open={confirmEnd}
        title={t("helplineWorkspace.info.endTitle")}
        body={t("helplineWorkspace.info.endBody")}
        confirmLabel={t("helplineWorkspace.info.endConfirm")}
        cancelLabel={t("helplineWorkspace.info.cancel")}
        onConfirm={() => void onConfirmEnd()}
        onCancel={() => {
          setConfirmEnd(false);
          setEndError(null);
        }}
        destructive
        busy={isEnding}
        error={endError}
      />

      <ListenerPickerDialog
        open={actionDialog === "transfer"}
        title={t("helplineWorkspace.transfer.title")}
        body={
          isListener
            ? t("helplineWorkspace.transfer.body")
            : t("helplineWorkspace.transfer.bodySupervisor")
        }
        confirmLabel={t("helplineWorkspace.transfer.confirm")}
        listeners={transferTargets}
        loadingListeners={canMonitor && isLoadingListeners && !monitor}
        optional
        busy={isTransferring}
        error={actionError}
        onConfirm={target => void onConfirmTransfer(target)}
        onCancel={() => setActionDialog(null)}
      />
      <TalkerDialog
        open={actionDialog === "takeOver"}
        title={t("helplineWorkspace.takeOver.title")}
        body={t("helplineWorkspace.takeOver.body", { name: currentListenerName })}
        confirmLabel={t("helplineWorkspace.takeOver.confirm")}
        cancelLabel={t("helplineWorkspace.info.cancel")}
        onConfirm={() => void onConfirmTakeOver()}
        onCancel={() => setActionDialog(null)}
        busy={isTakingOver}
        error={actionError}
      />
      <BlockTalkerDialog
        open={actionDialog === "block"}
        busy={isBlocking}
        error={actionError}
        onConfirm={reason => void onConfirmBlock(reason)}
        onCancel={() => setActionDialog(null)}
      />

      <SummaryReviewModal
        open={reviewMode !== null}
        fields={me.settings.summaryFields}
        finalSummary={detail.summaries.final}
        saving={isSavingSummary}
        onSave={fields => void onSaveSummary(fields)}
        onSkip={closeReview}
        onRefetch={() => void refetch()}
      />
    </div>
  );
};

export default HelplineChatView;
