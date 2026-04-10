import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { logger } from "@ally-ui-mono/ui-shared";
import { useLazyGetSimulationSummaryQuery } from "@api";
import { SimulationSummary as SimulationSummaryType } from "@types";

const POLL_INTERVAL_MS = 3500;
const MAX_POLLS = 5;

export function useSimulationSummaryPolling(
  summaryId: string | undefined,
  languageCode?: string,
): {
  summaryData: SimulationSummaryType | undefined;
  retryMaxReached: boolean;
  isShortSession: boolean;
} {
  const [summaryData, setSummaryData] = useState<SimulationSummaryType | undefined>(undefined);
  const [retryMaxReached, setRetryMaxReached] = useState(false);
  const [isShortSession, setIsShortSession] = useState(false);

  const [getSimulationSummary] = useLazyGetSimulationSummaryQuery();
  const { i18n } = useTranslation();
  const activeLanguageCode = languageCode ?? i18n.language;

  useEffect(() => {
    if (!summaryId) {
      setSummaryData(undefined);
      setRetryMaxReached(false);
    }

    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;
    let summaryPollCount = 0;

    const pollSimulationSummary = async () => {
      try {
        const { data } = await getSimulationSummary({
          sessionId: summaryId ?? "",
          languageCode: activeLanguageCode,
        });

        if (data) {
          if (isMounted) setSummaryData(data);
          setIsShortSession(data?.details?.callDuration <= 30); // 30 seconds
        }

        if (data?.details?.summary?.feedback) return;

        if (summaryPollCount >= MAX_POLLS) {
          if (isMounted) {
            setRetryMaxReached(true);
            if (data?.details?.summary?.errorMessage?.length > 0) {
              toast.error(data.details.summary.errorMessage);
            } else if (!data?.details?.summary?.feedback) {
              toast.error("Summary generation in progress. Please try again later.");
            }
          }
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
        }
      }
    };

    pollSimulationSummary();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [summaryId, activeLanguageCode, getSimulationSummary]);

  return { summaryData, retryMaxReached, isShortSession };
}
