import { FC, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { ConsentScreen } from "./components/ConsentScreen";
import { ConversationScreen } from "./components/ConversationScreen";
import { EndedScreen } from "./components/EndedScreen";
import { resourcesFor } from "./components/ResourcesCard";
import {
  ClosedScreen,
  DeletedScreen,
  ErrorScreen,
  LoadingScreen,
  NotAvailableScreen,
} from "./components/StatusScreens";
import { TalkerButton } from "./components/TalkerButton";
import { TalkerDialog } from "./components/TalkerDialog";
import { TalkerHeader, type TalkerMenuItem } from "./components/TalkerHeader";
import { useTalkerSession } from "./useTalkerSession";
import { usePageMeta } from "../blog/usePageMeta";

type PendingConfirm = "end" | "leave" | "delete" | null;

const baseLanguage = (language: string | undefined) => (language || "en").split("-")[0];

/**
 * `/talk/:tenantCode` — the anonymous public talker page of a text helpline.
 * No sign-in, no app nav, mobile-first.
 *
 * The whole page carries `ph-no-capture`, so PostHog session replay and
 * autocapture never record what a talker reads or types; the events this page
 * sends carry no content (see useTalkerSession).
 */
export const HelplineTalk: FC = () => {
  const { tenantCode = "" } = useParams<{ tenantCode: string }>();
  const { t, i18n } = useTranslation();
  const session = useTalkerSession(tenantCode);
  const { state } = session;
  const { status, chat } = state;

  const [draft, setDraft] = useState("");
  const [confirm, setConfirm] = useState<PendingConfirm>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // The language the talker reads in: their chat's once one exists, otherwise
  // the page language if this helpline offers it, otherwise its first language.
  const offered = status?.languages ?? [];
  const pageLanguage = baseLanguage(i18n.language);
  const consentLanguage = offered.includes(pageLanguage) ? pageLanguage : (offered[0] ?? "en");
  const language = chat?.language ?? consentLanguage;

  useEffect(() => {
    // Move the page onto a language this helpline offers, so the consent text
    // and the chat the talker is about to start are in the same language.
    if (!chat && offered.length && !offered.includes(pageLanguage)) {
      session.applyLanguage(consentLanguage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offered.join(","), pageLanguage, chat]);

  const org = chat?.org ?? status?.org ?? null;
  usePageMeta({
    title: org?.name || t("helplineTalker.orgFallback"),
    robots: "noindex, nofollow",
  });

  const resourcesText = resourcesFor(status?.resources, language);

  // A chat that ends under an open "End chat?" / "Leave?" dialog makes it moot.
  useEffect(() => {
    if ((confirm === "end" || confirm === "leave") && !["waiting", "chat"].includes(state.screen)) {
      setConfirm(null);
      setConfirmError(null);
    }
  }, [confirm, state.screen]);

  const closeConfirm = () => {
    setConfirm(null);
    setConfirmError(null);
  };

  const runConfirm = async () => {
    setConfirmError(null);
    if (confirm === "delete") {
      const ok = await session.eraseConversation();
      if (!ok) {
        setConfirmError(t("helplineTalker.delete.failed"));
        return;
      }
      setDraft("");
    } else {
      const ok = await session.endChat();
      if (!ok) {
        setConfirmError(t("helplineTalker.chat.actionFailed"));
        return;
      }
    }
    setConfirm(null);
  };

  const tryAgain = async () => {
    setIsCheckingStatus(true);
    await session.refreshStatus();
    setIsCheckingStatus(false);
  };

  const menuItems = useMemo<TalkerMenuItem[]>(() => {
    const items: TalkerMenuItem[] = [];
    if (state.screen === "waiting") {
      items.push({
        key: "leave",
        label: t("helplineTalker.header.leaveQueue"),
        onSelect: () => setConfirm("leave"),
      });
    }
    if (state.screen === "chat") {
      items.push({
        key: "end",
        label: t("helplineTalker.header.endChat"),
        onSelect: () => setConfirm("end"),
      });
    }
    if (
      chat &&
      (state.screen === "waiting" || state.screen === "chat" || state.screen === "ended")
    ) {
      items.push({
        key: "delete",
        label: t("helplineTalker.header.deleteConversation"),
        onSelect: () => setConfirm("delete"),
        destructive: true,
      });
    }
    return items;
  }, [chat, state.screen, t]);

  const renderScreen = () => {
    switch (state.screen) {
      case "loading":
        return <LoadingScreen />;
      case "notAvailable":
        return <NotAvailableScreen />;
      case "error":
        return <ErrorScreen onRetry={session.retry} />;
      case "closed":
        return (
          <ClosedScreen
            reason={state.closedReason}
            hours={status?.hours ?? null}
            resourcesText={resourcesText}
            isChecking={isCheckingStatus}
            onTryAgain={tryAgain}
          />
        );
      case "consent":
        return status ? (
          <ConsentScreen
            status={status}
            language={consentLanguage}
            notice={state.notice}
            isStarting={session.isStarting}
            onLanguageChange={session.applyLanguage}
            onStart={input => void session.startChat(input)}
          />
        ) : (
          <LoadingScreen />
        );
      case "waiting":
      case "chat":
        return chat ? (
          <ConversationScreen
            key={state.screen}
            mode={state.screen}
            chat={chat}
            messages={state.messages}
            listenerTyping={state.listenerTyping}
            resourcesText={resourcesText}
            estimatedWaitMinutes={status?.estimatedWaitMinutes ?? null}
            isReconnecting={session.isReconnecting}
            draft={draft}
            onDraftChange={setDraft}
            onSend={session.sendMessage}
            onTyping={session.notifyTyping}
            onRetry={session.retryMessage}
            onLeave={() => setConfirm("leave")}
          />
        ) : null;
      case "ended":
        return chat ? (
          <EndedScreen
            chat={chat}
            messages={state.messages}
            resourcesText={resourcesText}
            isSubmittingFeedback={session.isSubmittingFeedback}
            onSubmitFeedback={session.submitFeedback}
            onStartNew={() => {
              setDraft("");
              session.startNewChat();
            }}
            onDelete={() => setConfirm("delete")}
          />
        ) : null;
      case "deleted":
        return (
          <DeletedScreen
            resourcesText={resourcesText}
            onStartNew={() => {
              setDraft("");
              session.startNewChat();
            }}
          />
        );
      default:
        return null;
    }
  };

  const isConversation = state.screen === "waiting" || state.screen === "chat";
  const listenerName = chat?.listenerName || t("helplineTalker.chat.listenerFallback");

  return (
    <div
      className="ph-no-capture flex h-dvh flex-col bg-white font-primary"
      data-testid="helpline-talk-page"
      lang={language}
    >
      <TalkerHeader org={org} onQuickExit={session.quickExit} menuItems={menuItems} />

      {state.screen === "chat" && (
        <div className="border-b border-border-light bg-background-secondary">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-1.5">
            <p className="min-w-0 truncate text-sm text-typography-800">
              {t("helplineTalker.chat.withListener", { name: listenerName })}
            </p>
            <TalkerButton
              variant="ghost"
              className="!min-h-[40px] !px-3 text-sm"
              onClick={() => setConfirm("end")}
            >
              {t("helplineTalker.header.endChat")}
            </TalkerButton>
          </div>
        </div>
      )}

      <main
        className={`flex min-h-0 flex-1 flex-col ${isConversation ? "" : "overflow-y-auto"}`}
        aria-busy={state.screen === "loading"}
      >
        {renderScreen()}
      </main>

      <TalkerDialog
        open={confirm === "leave"}
        title={t("helplineTalker.waiting.leaveTitle")}
        body={t("helplineTalker.waiting.leaveBody")}
        confirmLabel={t("helplineTalker.waiting.leaveConfirm")}
        cancelLabel={t("helplineTalker.waiting.stay")}
        onConfirm={() => void runConfirm()}
        onCancel={closeConfirm}
        busy={session.isEnding}
        error={confirmError}
      />
      <TalkerDialog
        open={confirm === "end"}
        title={t("helplineTalker.chat.endTitle")}
        body={t("helplineTalker.chat.endBody")}
        confirmLabel={t("helplineTalker.chat.endConfirm")}
        cancelLabel={t("helplineTalker.chat.keepChatting")}
        onConfirm={() => void runConfirm()}
        onCancel={closeConfirm}
        busy={session.isEnding}
        error={confirmError}
      />
      <TalkerDialog
        open={confirm === "delete"}
        title={t("helplineTalker.delete.title")}
        body={t("helplineTalker.delete.body")}
        confirmLabel={
          session.isErasing
            ? t("helplineTalker.delete.deleting")
            : t("helplineTalker.delete.confirm")
        }
        cancelLabel={t("helplineTalker.delete.cancel")}
        onConfirm={() => void runConfirm()}
        onCancel={closeConfirm}
        destructive
        busy={session.isErasing}
        error={confirmError}
      />
    </div>
  );
};

export default HelplineTalk;
