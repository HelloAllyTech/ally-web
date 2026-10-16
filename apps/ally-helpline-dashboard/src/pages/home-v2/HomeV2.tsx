import { FunctionComponent, useCallback, useEffect, useRef, useState } from "react";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { TermsAndAgreement } from "@components";
import { ROUTES } from "@constants";
import { ANALYTICS_EVENTS, ANALYTICS_PROPS, HOME_V2_SOURCE } from "@constants/analyticsEvents";
import { useAnalytics, useUser } from "@hooks";
import { RootState } from "@store";
import { cn } from "@utils";

import { AllyMark, ConversationEntry } from "./components/ConversationEntry";
import { CodeComposer, MessageComposer } from "./components/HomeV2Composer";
import { HomeV2Header, HomeV2Index } from "./components/HomeV2Frame";
import {
  maskEmail,
  practiceOutcome,
  respond,
  routeTyped,
  scrubQuestion,
  suggestionsFor,
} from "./conversation";
import { REMEMBERED_EMAIL_KEY, useHomeV2SignIn } from "./useHomeV2SignIn";

import type { ConversationContext, Entry, PracticeChoice, Topic } from "./conversation";

// Hello in each of the app's languages: a greeting, not a label, so it is not translated.
const HELLOS = ["Hi", "नमस्ते", "नमस्कार", "வணக்கம்", "ನಮಸ್ಕಾರ"];

const readRememberedEmail = () => {
  try {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY);
  } catch {
    return null;
  }
};

const ally = (key: string, extra: Partial<Extract<Entry, { kind: "ally" }>> = {}): Entry => ({
  kind: "ally",
  key,
  ...extra,
});

/**
 * The conversational homepage, at /v2 beside the existing /login. Ally greets the
 * visitor; they can try a practice moment, ask about Ally, or type their email
 * and sign in without leaving the conversation.
 */
export const HomeV2: FunctionComponent = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { track } = useAnalytics();
  const { isAuthenticated, checkAuth } = useUser();
  const user = useSelector((state: RootState) => state.user.user);
  const signIn = useHomeV2SignIn();

  const [entries, setEntries] = useState<Entry[]>([]);
  const [asked, setAsked] = useState<Topic[]>([]);
  const [context, setContext] = useState<ConversationContext>(null);
  const [mode, setMode] = useState<"chat" | "code">("chat");
  const [codeEmail, setCodeEmail] = useState({ address: "", shown: "" });
  const [draft, setDraft] = useState("");
  const [code, setCode] = useState("");
  const [remembered, setRemembered] = useState<string | null>(readRememberedEmail);
  const [composerHighlighted, setComposerHighlighted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const verifyingRef = useRef(false);
  const hasInteracted = useRef(false);

  // Mount-only, as on /login: `checkAuth` is a new closure every render, and with
  // no token it dispatches logout actions that re-render this page.
  useEffect(() => {
    checkAuth();
  }, []);

  const signedIn = isAuthenticated && !!user;

  // Keep the newest reply and the composer in view as the conversation grows.
  useEffect(() => {
    if (!hasInteracted.current) return;
    composerRef.current?.scrollIntoView?.({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
    });
  }, [entries.length, mode, reduceMotion]);

  const append = useCallback((...more: Entry[]) => {
    hasInteracted.current = true;
    // A new practice moment retires any earlier one left unanswered.
    const startsPractice = more.some(entry => entry.kind === "choices");
    setEntries(previous => [
      ...(startsPractice
        ? previous.map(entry =>
            entry.kind === "choices" && !entry.answered ? { ...entry, answered: true } : entry,
          )
        : previous),
      ...more,
    ]);
  }, []);

  const focusComposer = () => {
    setComposerHighlighted(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const answer = (topic: Topic, said: Entry) => {
    append(said, ...respond(topic));
    if (topic !== "again" && topic !== "fallback") {
      setAsked(previous => (previous.includes(topic) ? previous : [...previous, topic]));
    }
    setContext(topic);
    setComposerHighlighted(topic === "signin");
    if (topic === "signin") focusComposer();
  };

  const showSupport = (source: string, said: Entry, acknowledge = false) => {
    track(ANALYTICS_EVENTS.HOME_V2_SUPPORT_SHOWN, { [ANALYTICS_PROPS.SOURCE]: source });
    if (acknowledge) {
      append(said, ally("supportAck"), ...respond("support"));
      setAsked(previous => (previous.includes("support") ? previous : [...previous, "support"]));
      setContext("support");
    } else {
      answer("support", said);
    }
  };

  const handleSuggestion = (topic: Topic) => {
    track(ANALYTICS_EVENTS.HOME_V2_SUGGESTION_TAPPED, { [ANALYTICS_PROPS.HOME_V2_TOPIC]: topic });
    const said: Entry = { kind: "user", key: `homeV2.suggestions.${topic}` };
    if (topic === "support") showSupport(HOME_V2_SOURCE.SUGGESTION, said);
    else answer(topic, said);
  };

  const startCode = async (address: string, shown: string, said?: Entry) => {
    if (said) append(said);
    setComposerHighlighted(false);
    const result = await signIn.requestCode(address);
    if (result.status === "send-failed") {
      append(ally("sendFailed", { tone: "error" }));
      return;
    }
    setCodeEmail({ address, shown });
    setCode("");
    setMode("code");
    append(
      ally("codeSent", { values: { email: shown, count: result.expiryMinutes } }),
      ally("noCode", { tone: "quiet" }),
    );
  };

  const handleSubmitDraft = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const routed = routeTyped(text);

    if (routed.type === "email") {
      if (signedIn) {
        append({ kind: "user", text: routed.email }, ally("alreadySignedIn"));
        return;
      }
      track(ANALYTICS_EVENTS.HOME_V2_SIGN_IN_STARTED, {
        [ANALYTICS_PROPS.HOME_V2_AUTH_METHOD]: "email",
        [ANALYTICS_PROPS.SOURCE]: HOME_V2_SOURCE.TYPED,
      });
      void startCode(routed.email, routed.email, { kind: "user", text: routed.email });
      return;
    }

    if (routed.type === "distress") {
      // Never log what was typed here — only that support was shown.
      showSupport(HOME_V2_SOURCE.TYPED, { kind: "user", text }, true);
      return;
    }

    track(ANALYTICS_EVENTS.HOME_V2_QUESTION_ASKED, {
      [ANALYTICS_PROPS.HOME_V2_TOPIC]: routed.topic,
      [ANALYTICS_PROPS.HOME_V2_MATCHED]: routed.matched,
      ...(routed.matched
        ? {}
        : {
            [ANALYTICS_PROPS.HOME_V2_QUESTION_TEXT]: scrubQuestion(text),
            [ANALYTICS_PROPS.QUERY_LENGTH]: text.length,
          }),
    });
    answer(routed.topic, { kind: "user", text });
  };

  const handlePick = (index: number, choice: PracticeChoice) => {
    track(ANALYTICS_EVENTS.HOME_V2_PRACTICE_RESPONSE_CHOSEN, {
      [ANALYTICS_PROPS.HOME_V2_PRACTICE_CHOICE]: choice,
    });
    hasInteracted.current = true;
    setEntries(previous => [
      ...previous.map((entry, i) =>
        i === index && entry.kind === "choices" ? { ...entry, answered: true } : entry,
      ),
      ...practiceOutcome(choice),
    ]);
    setContext("practiced");
  };

  const handleVerify = async (value: string) => {
    if (value.length < 4 || verifyingRef.current) return;
    verifyingRef.current = true;
    const outcome = await signIn.verifyCode(codeEmail.address, value);
    verifyingRef.current = false;
    if (outcome === "wrong-code") {
      append(ally("codeWrong", { tone: "error" }));
      setCode("");
    } else if (outcome === "failed") {
      append(ally("verifyFailed", { tone: "error" }));
      setCode("");
    }
    // "signed-in" opens the terms modal; "suspended" has already navigated away.
  };

  const handleResend = async () => {
    const result = await signIn.requestCode(codeEmail.address);
    append(
      result.status === "sent"
        ? ally("codeResent", { tone: "quiet", values: { email: codeEmail.shown } })
        : ally("sendFailed", { tone: "error" }),
    );
  };

  const handleDifferentEmail = () => {
    setMode("chat");
    setCode("");
    append(ally("differentEmail"));
    focusComposer();
  };

  const handleRememberedSend = () => {
    if (!remembered) return;
    track(ANALYTICS_EVENTS.HOME_V2_SIGN_IN_STARTED, {
      [ANALYTICS_PROPS.HOME_V2_AUTH_METHOD]: "email",
      [ANALYTICS_PROPS.SOURCE]: HOME_V2_SOURCE.REMEMBERED,
    });
    void startCode(remembered, maskEmail(remembered));
  };

  const handleNotYou = () => {
    try {
      localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    } catch {
      // Storage blocked: nothing was remembered to forget.
    }
    setRemembered(null);
    append(ally("notYou"));
    focusComposer();
  };

  const handleGoogleSuccess = async (token: { accessToken?: string; credential?: string }) => {
    track(ANALYTICS_EVENTS.HOME_V2_SIGN_IN_STARTED, {
      [ANALYTICS_PROPS.HOME_V2_AUTH_METHOD]: "google",
    });
    const outcome = await signIn.signInWithGoogle(token);
    if (outcome === "no-account") {
      append(ally("googleNoAccount", { link: { key: "homeV2.links.partner", target: "partner" } }));
    } else if (outcome === "failed") {
      append(ally("googleFailed", { tone: "error" }));
    }
  };

  const hasPendingPractice = entries.some(entry => entry.kind === "choices" && !entry.answered);
  const suggestions = suggestionsFor(asked, context).filter(
    topic => !(signedIn && (topic === "signin" || topic === "access")),
  );
  const showSuggestions = mode === "chat" && !hasPendingPractice && suggestions.length > 0;

  return (
    <div className="flex min-h-dvh flex-col bg-background font-primary text-gray-900">
      <HomeV2Header
        onSupport={() =>
          showSupport(HOME_V2_SOURCE.HEADER, { kind: "user", key: "homeV2.suggestions.supportNow" })
        }
      />

      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-4 px-5 pb-16 pt-4 sm:px-6 sm:pt-12">
        <p
          aria-hidden="true"
          className="m-0 ml-12 hidden flex-wrap gap-x-3 text-md text-gray-500 sm:flex"
        >
          {HELLOS.map((hello, index) => (
            <span key={hello} className="flex gap-3">
              {index > 0 && <span>·</span>}
              {hello}
            </span>
          ))}
        </p>

        <section aria-label={t("homeV2.speakers.ally")} className="flex flex-col gap-3.5">
          <div className="flex items-start gap-3">
            <AllyMark className="mt-1.5" />
            <h1 className="m-0 font-secondary text-4xl font-normal leading-tight sm:text-5xl sm:leading-tight">
              {signedIn
                ? t("homeV2.greeting.signedInTitle", { name: user?.name?.split(" ")[0] ?? "" })
                : remembered
                  ? t("homeV2.greeting.welcomeBack")
                  : t("homeV2.greeting.title")}
            </h1>
          </div>

          {signedIn ? (
            <div className="ml-12 flex flex-wrap items-center gap-4">
              <p className="m-0 text-xl text-gray-800">{t("homeV2.greeting.signedInBody")}</p>
              <button
                type="button"
                onClick={() => navigate(ROUTES.HOME)}
                className="min-h-12 rounded-xl bg-primary-500 px-5 text-lg font-semibold text-white hover:bg-primary-600"
              >
                {t("homeV2.signedIn.open")}
              </button>
            </div>
          ) : remembered ? (
            <>
              <div className="ml-12 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4">
                <div className="flex flex-col">
                  <span className="text-sm text-gray-600">{t("homeV2.remembered.label")}</span>
                  <span className="ph-no-capture text-xl font-semibold">
                    {maskEmail(remembered)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleRememberedSend}
                    disabled={signIn.isSending || mode === "code"}
                    className="min-h-12 rounded-xl bg-primary-500 px-5 text-lg font-semibold text-white hover:bg-primary-600 disabled:opacity-40"
                  >
                    {t("homeV2.remembered.send")}
                  </button>
                  <button
                    type="button"
                    onClick={handleNotYou}
                    className="min-h-12 rounded-xl border border-gray-300 px-4 text-lg text-gray-900 hover:border-gray-500"
                  >
                    {t("homeV2.remembered.notYou")}
                  </button>
                </div>
              </div>
              <p className="m-0 ml-12 text-lg text-gray-600">
                {t("homeV2.greeting.rememberedHint")}
              </p>
            </>
          ) : (
            <>
              <p className="m-0 ml-12 text-xl leading-relaxed">{t("homeV2.greeting.intro")}</p>
              <p className="m-0 ml-12 text-lg leading-relaxed text-gray-600">
                {t("homeV2.greeting.capabilities")}
              </p>
            </>
          )}
        </section>

        <div
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          className="ph-no-capture flex flex-col gap-3.5"
        >
          {entries.map((entry, index) => (
            <motion.div
              key={index}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={cn("flex flex-col", entry.kind === "user" && "items-end")}
            >
              <ConversationEntry
                entry={entry}
                startsRun={entry.kind === "ally" && entries[index - 1]?.kind !== "ally"}
                onPick={choice => handlePick(index, choice)}
              />
            </motion.div>
          ))}
        </div>

        {showSuggestions && (
          <div
            role="group"
            aria-label={t("homeV2.suggestions.label")}
            // One scrollable row on phones, so the composer stays above the fold in every
            // language; wrapped from `sm` up, where there is room.
            className="-mr-5 ml-12 flex gap-2 overflow-x-auto pb-1 pr-5 sm:mr-0 sm:flex-wrap sm:overflow-visible sm:pb-0 sm:pr-0"
          >
            {suggestions.map(topic => (
              <button
                key={topic}
                type="button"
                onClick={() => handleSuggestion(topic)}
                className={cn(
                  "min-h-11 flex-none whitespace-nowrap rounded-full border px-4 text-md",
                  topic === "support"
                    ? "border-status-sageDot/40 bg-status-sageBg text-status-sageFg hover:border-status-sageDot"
                    : "border-gray-300 bg-white text-gray-900 hover:border-gray-500",
                )}
              >
                {t(`homeV2.suggestions.${topic}`)}
              </button>
            ))}
          </div>
        )}

        <div ref={composerRef} className="mt-3 scroll-mb-6">
          {mode === "code" ? (
            <CodeComposer
              email={codeEmail.shown}
              code={code}
              onCodeChange={setCode}
              onVerify={handleVerify}
              isVerifying={signIn.isVerifying}
              countdown={signIn.countdown}
              onResend={handleResend}
              onDifferentEmail={handleDifferentEmail}
            />
          ) : (
            <MessageComposer
              ref={inputRef}
              draft={draft}
              onDraftChange={setDraft}
              onSubmit={handleSubmitDraft}
              highlighted={composerHighlighted}
              isSending={signIn.isSending}
              signedIn={signedIn}
              onGoogleSuccess={handleGoogleSuccess}
              onGoogleError={() => append(ally("googleFailed", { tone: "error" }))}
            />
          )}
        </div>
      </main>

      <HomeV2Index />

      <TermsAndAgreement isOpen={signIn.isTermsOpen} handleAgreeButtonClick={signIn.agreeToTerms} />
    </div>
  );
};
