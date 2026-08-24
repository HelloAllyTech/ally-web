import React, { useCallback, useEffect, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  useCreateCharacterInterviewSessionMutation,
  useLazyGetCharacterInterviewSessionQuery,
} from "@api";
import { ArrowLeft, NoResults } from "@assets";
import { ButtonVariant, ConfirmationDialog, FallbackUI } from "@components";
import {
  CharacterInterviewAnswerPayload,
  ChatComposer,
  ChatMessage,
} from "@components/character-interview";
import { CharacterFormPanel } from "@components/character-library";
import {
  characterInterviewStrings as strings,
  characterLibraryStrings,
  LOCAL_STORAGE_KEYS,
  ROUTES,
} from "@constants";
import { useCanViewCharacterLibrary, useCharacterInterviewStream } from "@hooks";
import { CharacterData } from "@types";

// Import AccessDenied from its leaf module (not the @pages barrel) — same
// import-cycle avoidance as CharacterLibrary.tsx / OrganizationSettings.tsx.
import { AccessDenied } from "../access-denied/AccessDenied";

const sessionStorageKey = LOCAL_STORAGE_KEYS.CHARACTER_INTERVIEW_SESSION_ID;

/** Turns a save_character_draft payload into a fresh, unsaved CharacterData row. */
const toDraftCharacter = (draft: Partial<CharacterData>): CharacterData => ({
  id: `temp-${Date.now()}`,
  name: "",
  age: "",
  gender: "",
  profession: "",
  currentLocation: "",
  genderIdentity: "",
  sexualOrientation: "",
  ...draft,
});

/**
 * Full-page character-interview agent chat, ported from
 * ally-admin-dashboard's CharacterInterview.tsx: bootstraps (or resumes) an
 * interview session, streams the Q&A feed, and — once the agent calls
 * save_character_draft — opens the finished profile in CharacterFormPanel for
 * review, exactly like a manually-created character.
 */
export const CharacterInterview: React.FC = () => {
  const navigate = useNavigate();
  const { canView, isLoading: isAccessLoading } = useCanViewCharacterLibrary();

  const [createSession] = useCreateCharacterInterviewSessionMutation();
  const [getSession] = useLazyGetCharacterInterviewSessionQuery();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  // A failed fresh-session start used to leave isBooting true forever — the
  // three skeleton bubbles just sat there with no way out but a manual
  // reload, on top of the toast that already fired once.
  const [bootFailed, setBootFailed] = useState(false);
  const [draftCharacter, setDraftCharacter] = useState<CharacterData | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  // Set true only for a brand-new session (never on resume) so the next
  // render's effect can fire the hidden kickoff message with a `sendMessage`
  // closure that actually sees the new `sessionId`.
  const [needsKickoff, setNeedsKickoff] = useState(false);

  const bootedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const startFreshSession = useCallback(async (): Promise<string | null> => {
    try {
      const session = await createSession().unwrap();
      localStorage.setItem(sessionStorageKey, session.id);
      setSessionId(session.id);
      return session.id;
    } catch {
      toast.error(strings.startFailed);
      return null;
    }
  }, [createSession]);

  const { messages, isStreaming, sendMessage, stop, hydrateMessages } = useCharacterInterviewStream(
    {
      sessionId,
      onCharacterDraft: draft => {
        setDraftCharacter(toDraftCharacter(draft));
        setIsReviewOpen(true);
        localStorage.removeItem(sessionStorageKey);
        toast.success(strings.draftReadyToast);
      },
      onSessionInvalid: startFreshSession,
    },
  );

  useEffect(() => {
    if (!canView || bootedRef.current) return;
    bootedRef.current = true;

    (async () => {
      setIsBooting(true);
      const pinnedId = localStorage.getItem(sessionStorageKey);

      if (pinnedId) {
        try {
          const session = await getSession(pinnedId).unwrap();
          if (session.status === "ACTIVE") {
            setSessionId(session.id);
            hydrateMessages(session.messages ?? []);
            setIsBooting(false);
            return;
          }
        } catch {
          // Pinned session is gone (e.g. a local DB reset) — fall through to a fresh one.
        }
        localStorage.removeItem(sessionStorageKey);
      }

      const freshId = await startFreshSession();
      setIsBooting(false);
      if (freshId) {
        setNeedsKickoff(true);
      } else {
        setBootFailed(true);
      }
    })();
    // Runs once on mount only — bootedRef guards StrictMode's double-invoke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  useEffect(() => {
    if (!needsKickoff || !sessionId || isBooting) return;
    setNeedsKickoff(false);
    void sendMessage("Let's begin.", undefined, true);
  }, [needsKickoff, sessionId, isBooting, sendMessage]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  if (isAccessLoading) return null;
  if (!canView) return <AccessDenied />;

  const handleSend = (text: string) => void sendMessage(text);
  const handleAnswerQuestion = (payload: CharacterInterviewAnswerPayload) =>
    void sendMessage(payload.message, { questionId: payload.questionId, answer: payload.answer });

  const handleRetryBoot = async () => {
    setBootFailed(false);
    setIsBooting(true);
    const freshId = await startFreshSession();
    setIsBooting(false);
    if (freshId) setNeedsKickoff(true);
    else setBootFailed(true);
  };

  // "Leave the interview?" only matters once the admin has actually answered
  // something — leaving during the agent's opening question loses nothing.
  // Before this guard, the back button navigated straight away and the
  // conversation (and its unsaved draft, if the agent had already produced
  // one) was gone with no warning, despite copy for exactly this having
  // existed in characterInterviewStrings all along.
  const hasProgress = messages.some(message => message.role === "user");

  const handleBack = () => {
    if (hasProgress) {
      setIsExitConfirmOpen(true);
      return;
    }
    navigate(ROUTES.CHARACTER_LIBRARY);
  };

  const confirmExit = () => {
    // Leave the pinned session id in place — the session resumes from where
    // it left off if the admin reopens the interview agent, same as a
    // pinned session recovered after any other navigation away from here.
    setIsExitConfirmOpen(false);
    navigate(ROUTES.CHARACTER_LIBRARY);
  };

  return (
    <div className="py-[2px] font-primary h-[calc(100vh-40px)] flex flex-col">
      <div className="flex items-center gap-2 pb-6 shrink-0">
        <button
          type="button"
          className="text-typography-800 cursor-pointer shrink-0 flex items-center gap-2"
          onClick={handleBack}
        >
          <ArrowLeft width={14} height={14} />
          {characterLibraryStrings.characters}
        </button>
        <h1 className="text-2xl text-typography-900 font-secondary">{strings.title}</h1>
      </div>

      <div className="flex-1 min-h-0 flex flex-col max-w-3xl w-full mx-auto">
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1"
          data-testid="character-interview-feed"
        >
          {isBooting ? (
            <div className="flex flex-col gap-3 pt-2">
              <div className="h-12 w-2/3 rounded-2xl bg-background-secondary animate-pulse" />
              <div className="h-12 w-1/2 self-end rounded-2xl bg-background-secondary animate-pulse" />
              <div className="h-12 w-3/4 rounded-2xl bg-background-secondary animate-pulse" />
            </div>
          ) : bootFailed ? (
            <FallbackUI
              icon={<NoResults />}
              mainMessage={strings.startFailed}
              description={characterLibraryStrings.errorDescription}
              button={{
                text: characterLibraryStrings.retry,
                onClick: () => void handleRetryBoot(),
              }}
              className="py-16"
            />
          ) : (
            <div className="flex flex-col gap-3 pb-2">
              {messages.map(message => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onAnswerQuestion={handleAnswerQuestion}
                  disabled={isStreaming}
                />
              ))}
              {draftCharacter && !isReviewOpen && (
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={() => setIsReviewOpen(true)}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700 underline"
                  >
                    {strings.reviewCharacter}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 pt-1">
          <ChatComposer
            onSend={handleSend}
            onStop={stop}
            isStreaming={isStreaming}
            disabled={isBooting || bootFailed || !sessionId || !!draftCharacter}
          />
        </div>
      </div>

      <CharacterFormPanel
        isOpen={isReviewOpen && !!draftCharacter}
        onClose={() => setIsReviewOpen(false)}
        onSave={() => navigate(ROUTES.CHARACTER_LIBRARY)}
        initialCharacter={draftCharacter}
      />

      <ConfirmationDialog
        isOpen={isExitConfirmOpen}
        onClose={() => setIsExitConfirmOpen(false)}
        title={{ normal: strings.exitConfirmTitle, italic: "" }}
        content={strings.exitConfirmDescription}
        buttonText={strings.exitConfirmLeave}
        buttonVariant={ButtonVariant.DESTRUCTIVE}
        onButtonClick={confirmExit}
        secondaryButtonText={strings.exitConfirmStay}
        secondaryButtonVariant={ButtonVariant.SECONDARY}
        onSecondaryButtonClick={() => setIsExitConfirmOpen(false)}
      />
    </div>
  );
};
