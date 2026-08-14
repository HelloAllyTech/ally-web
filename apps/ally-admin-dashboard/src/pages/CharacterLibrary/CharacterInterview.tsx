import React, { useCallback, useEffect, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { SkeletonPlaceholder } from "@ally-ui-mono/ui-shared";
import {
  useCreateCharacterInterviewSessionMutation,
  useLazyGetCharacterInterviewSessionQuery,
} from "@api";
import { ArrowDown } from "@assets";
import { ActionConfirmationPopup, CharacterSidePanel } from "@components";
import {
  CharacterInterviewAnswerPayload,
  ChatComposer,
  ChatMessage,
} from "@components/character-interview";
import { ButtonVariant } from "@components/types";
import { en, LOCAL_STORAGE_KEYS, ROUTES } from "@constants";
import { useCharacterInterviewStream } from "@hooks/useCharacterInterviewStream";
import { CharacterData } from "@types";
import { logger } from "@utils";

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
 * Full-page character-interview agent chat: bootstraps (or resumes) an
 * interview session, streams the Q&A feed, and — once the agent calls
 * save_character_draft — opens the finished profile in the same character
 * form used everywhere else in the library, so the admin reviews and saves
 * it exactly like a manually-created character.
 */
export const CharacterInterview: React.FC = () => {
  const strings = en.characterInterview;
  const navigate = useNavigate();

  const [createSession] = useCreateCharacterInterviewSessionMutation();
  const [getSession] = useLazyGetCharacterInterviewSessionQuery();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [draftCharacter, setDraftCharacter] = useState<CharacterData | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  // Set true only for a brand-new session (never on resume) so the next
  // render's effect can fire the hidden kickoff message with a `sendMessage`
  // closure that actually sees the new `sessionId` — calling sendMessage
  // directly in the same tick as setSessionId still closes over the old
  // (null) sessionId, since state updates aren't visible until the next render.
  const [needsKickoff, setNeedsKickoff] = useState(false);

  const bootedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fresh session per page load (a hard refresh naturally starts over unless
  // the id is still pinned from an in-progress conversation).
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
  }, [createSession, strings.startFailed]);

  const { messages, isStreaming, sendMessage, stop, hydrateMessages, resetMessages } =
    useCharacterInterviewStream({
      sessionId,
      onCharacterDraft: draft => {
        setDraftCharacter(toDraftCharacter(draft));
        setIsReviewOpen(true);
        localStorage.removeItem(sessionStorageKey);
        toast.success(strings.draftReadyToast);
      },
      onSessionInvalid: startFreshSession,
    });

  // Bootstrap once: resume a pinned ACTIVE session, else start fresh. Either
  // way, an empty transcript gets a hidden kickoff message so the agent asks
  // its first question without the admin having to type anything.
  useEffect(() => {
    if (bootedRef.current) return;
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
        } catch (error) {
          logger.warn(`[Character Interview] Pinned-session resume failed: ${error}`);
        }
        localStorage.removeItem(sessionStorageKey);
      }

      const freshId = await startFreshSession();
      setIsBooting(false);
      if (freshId) setNeedsKickoff(true);
    })();
    // Runs once on mount only — bootedRef guards StrictMode's double-invoke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fires the hidden kickoff message once sessionId has actually landed in
  // state (this render's sendMessage closure — not the one from the render
  // that called setSessionId — is the one that will see it).
  useEffect(() => {
    if (!needsKickoff || !sessionId || isBooting) return;
    setNeedsKickoff(false);
    void sendMessage("Let's begin.", undefined, true);
  }, [needsKickoff, sessionId, isBooting, sendMessage]);

  // Keep the feed pinned to the latest message.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  const handleSend = (text: string) => void sendMessage(text);
  const handleAnswerQuestion = (payload: CharacterInterviewAnswerPayload) =>
    void sendMessage(payload.message, { questionId: payload.questionId, answer: payload.answer });

  const hasProgress = messages.length > 0 && !draftCharacter;

  const handleBack = () => {
    if (hasProgress) {
      setShowExitConfirm(true);
      return;
    }
    navigate(ROUTES.CHARACTER_LIBRARY);
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    stop();
    localStorage.removeItem(sessionStorageKey);
    navigate(ROUTES.CHARACTER_LIBRARY);
  };

  const handleStartOver = () => {
    localStorage.removeItem(sessionStorageKey);
    setDraftCharacter(null);
    setIsReviewOpen(false);
    resetMessages();
    bootedRef.current = false;
    setIsBooting(true);
    (async () => {
      const freshId = await startFreshSession();
      setIsBooting(false);
      if (freshId) setNeedsKickoff(true);
    })();
  };

  return (
    <div className="py-[2px] font-primary h-[calc(100vh-40px)] flex flex-col">
      <div className="flex items-center gap-2 pb-6 shrink-0">
        <span className="text-typography-800 cursor-pointer shrink-0" onClick={handleBack}>
          {en.simulation.characters}
        </span>
        <span className="-rotate-90 shrink-0">
          <ArrowDown />
        </span>
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
              <SkeletonPlaceholder className="!h-12 !w-2/3 rounded-2xl" />
              <SkeletonPlaceholder className="!h-12 !w-1/2 self-end rounded-2xl" />
              <SkeletonPlaceholder className="!h-12 !w-3/4 rounded-2xl" />
            </div>
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
            disabled={isBooting || !sessionId || !!draftCharacter}
          />
        </div>
      </div>

      <CharacterSidePanel
        selectedCharacter={draftCharacter}
        isOpen={isReviewOpen && !!draftCharacter}
        onClose={() => setIsReviewOpen(false)}
        onSave={() => navigate(ROUTES.CHARACTER_LIBRARY)}
        isNewCharacter
      />

      <ActionConfirmationPopup
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        title={strings.exitConfirmTitle}
        description={strings.exitConfirmDescription}
        primaryButton={{
          label: strings.exitConfirmLeave,
          onClick: handleConfirmExit,
          variant: ButtonVariant.DESTRUCTIVE,
        }}
        secondaryButton={{
          label: strings.exitConfirmStay,
          onClick: () => setShowExitConfirm(false),
          variant: ButtonVariant.SECONDARY,
        }}
      />

      {draftCharacter && !isReviewOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={handleStartOver}
            className="text-xs text-typography-500 hover:text-typography-700 underline"
          >
            {strings.startOver}
          </button>
        </div>
      )}
    </div>
  );
};
