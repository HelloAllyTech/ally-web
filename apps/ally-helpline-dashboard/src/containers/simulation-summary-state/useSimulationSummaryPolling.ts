import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { logger } from "@ally-ui-mono/ui-shared";
import { useLazyGetSimulationSummaryQuery } from "@api";
import { SimulationSummary as SimulationSummaryType } from "@types";

const POLL_INTERVAL_MS = 5000;
// Evaluation is an LLM pass that only starts once the roleplay ends, and a
// longer session takes longer to summarize. The previous 5 polls @ 3.5s gave
// up after 17.5s — long enough to look broken on an ordinary session, while
// simultaneously telling the learner (via DebriefTab) that generation had
// permanently failed. 24 polls @ 5s gives ~2 minutes of real headroom before
// we treat it as "taking a while" rather than "failed", without polling
// forever. "Check again" (below) covers the rare session that still isn't
// ready after that.
const MAX_POLLS = 24;

export function useSimulationSummaryPolling(
  summaryId: string | undefined,
  languageCode?: string,
): {
  summaryData: SimulationSummaryType | undefined;
  /** The poll window ran out before feedback (or an error) arrived. This is
   * NOT necessarily a failure — see `checkAgain`. */
  retryMaxReached: boolean;
  isShortSession: boolean;
  /** True when the backend recorded this session as force-ended by the
   * agent's stall watchdog (`endReason: "TECHNICAL_INTERRUPTION"`) rather
   * than a normal finish — takes priority over `isShortSession`, since it
   * explains WHY the session was short instead of just noting that it was. */
  isTechnicalInterruption: boolean;
  /** Ask the backend again after `retryMaxReached` — restarts a full poll
   * window rather than a single one-shot check, since a summary that is
   * merely slow rarely finishes in the next few seconds either. */
  checkAgain: () => void;
  /** True from the moment `checkAgain` is called until it either lands
   * feedback or gives up again — lets the UI show a "Checking…" state on the
   * manual control. */
  isCheckingAgain: boolean;
} {
  const [summaryData, setSummaryData] = useState<SimulationSummaryType | undefined>(undefined);
  const [retryMaxReached, setRetryMaxReached] = useState(false);
  const [isShortSession, setIsShortSession] = useState(false);
  const [isTechnicalInterruption, setIsTechnicalInterruption] = useState(false);
  const [isCheckingAgain, setIsCheckingAgain] = useState(false);
  // Bumping this re-runs the polling effect from scratch (fresh poll count,
  // fresh timers) without duplicating the loop's logic in a second function.
  const [pollGeneration, setPollGeneration] = useState(0);

  const [getSimulationSummary] = useLazyGetSimulationSummaryQuery();
  const { i18n } = useTranslation();
  const activeLanguageCode = languageCode ?? i18n.language;

  const checkAgain = useCallback(() => {
    setRetryMaxReached(false);
    setIsCheckingAgain(true);
    setPollGeneration(generation => generation + 1);
  }, []);

  useEffect(() => {
    if (!summaryId) {
      setSummaryData(undefined);
      setRetryMaxReached(false);
    }

    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;
    let summaryPollCount = 0;

    const giveUp = () => {
      if (!isMounted) return;
      setRetryMaxReached(true);
      setIsCheckingAgain(false);
    };

    const pollSimulationSummary = async () => {
      try {
        const { data } = await getSimulationSummary({
          sessionId: summaryId ?? "",
          languageCode: activeLanguageCode,
        });

        if (data) {
          if (isMounted) setSummaryData(data);
          setIsShortSession(data?.details?.callDuration <= 30); // 30 seconds
          setIsTechnicalInterruption(data?.endReason === "TECHNICAL_INTERRUPTION");
        }

        if (data?.details?.summary?.feedback) {
          if (isMounted) setIsCheckingAgain(false);
          return;
        }

        if (summaryPollCount >= MAX_POLLS) {
          // A real backend-reported failure is still worth surfacing right
          // away as a toast; a plain timeout is not — the panel itself now
          // carries a persistent "still working, check again" state, and a
          // toast on top of that would just repeat (or contradict) it.
          if (data?.details?.summary?.errorMessage?.length > 0) {
            toast.error(data.details.summary.errorMessage);
          }
          giveUp();
          return;
        }

        if (isMounted && !data?.details?.summary?.feedback) {
          summaryPollCount++;
          timeoutId = setTimeout(pollSimulationSummary, POLL_INTERVAL_MS);
        }
      } catch {
        logger.error("Polling error in simulation summary");
        if (isMounted && summaryPollCount < MAX_POLLS) {
          summaryPollCount++;
          timeoutId = setTimeout(pollSimulationSummary, POLL_INTERVAL_MS);
        } else {
          giveUp();
        }
      }
    };

    pollSimulationSummary();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [summaryId, activeLanguageCode, getSimulationSummary, pollGeneration]);

  return {
    summaryData,
    retryMaxReached,
    isShortSession,
    isTechnicalInterruption,
    checkAgain,
    isCheckingAgain,
  };
}
