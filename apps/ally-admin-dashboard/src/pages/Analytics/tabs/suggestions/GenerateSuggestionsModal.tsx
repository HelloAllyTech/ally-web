import React, { useEffect, useState } from "react";

import {
  ComposedModal,
  DatePicker,
  DatePickerInput,
  InlineNotification,
  ModalBody,
  RadioButton,
  RadioButtonGroup,
  SkeletonPlaceholder,
} from "@ally-ui-mono/ui-shared";
import { useGenerateAnalyticsSuggestionsMutation } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { GenerateAnalyticsSuggestionsResponse } from "@types";

/** Matches ally-be's MAX_CUSTOM_RANGE_DAYS, so the form rejects what the API would. */
const MAX_CUSTOM_RANGE_DAYS = 400;
/**
 * When the wait stops being "a moment" and needs explaining. Same threshold as the
 * Analytics Agent tab: past this, silence reads as stuck rather than working.
 */
const SLOW_AFTER_MS = 6000;

type PeriodChoice = "30d" | "90d" | "12m" | "all" | "custom";

const toIsoDate = (date?: Date): string =>
  date
    ? new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
    : "";

const fill = (template: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  );

interface GenerateSuggestionsModalProps {
  onClose: () => void;
  onGenerated: (result: GenerateAnalyticsSuggestionsResponse) => void;
}

/**
 * Pick the window, then run.
 *
 * The run is synchronous and slow (fifteen analytics sections, then a drafting
 * call), so the dialog stays open for the whole thing and narrates: a bounded
 * progress line that changes at six seconds, over a skeleton. It never shows an
 * unexplained spinner — a reader who cannot tell working from stuck starts a
 * second run, and two runs produce two batches.
 *
 * Failures render INSIDE the dialog rather than as a toast. The reader has to act
 * on this one (pick a different window, or retry), and a message that vanishes
 * takes the only explanation with it.
 */
export const GenerateSuggestionsModal: React.FC<GenerateSuggestionsModalProps> = ({
  onClose,
  onGenerated,
}) => {
  const strings = en.analyticsSuggestions;
  const [period, setPeriod] = useState<PeriodChoice>("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [generate, { isLoading }] = useGenerateAnalyticsSuggestionsMutation();

  useEffect(() => {
    if (!isLoading) {
      setSlow(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [isLoading]);

  /** Client-side validation of the custom range, mirroring the server's rules. */
  const customError = ((): string | null => {
    if (period !== "custom") return null;
    if (!from || !to) return strings.customIncomplete;
    if (to < from) return strings.customOrder;
    const days =
      Math.round(
        (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) /
          86_400_000,
      ) + 1;
    if (days > MAX_CUSTOM_RANGE_DAYS) {
      return fill(strings.customTooLong, { max: MAX_CUSTOM_RANGE_DAYS, days });
    }
    return null;
  })();

  const submit = async () => {
    if (isLoading || customError) return;
    setError(null);
    try {
      const result = await generate(
        period === "custom" ? { from, to } : { range: period },
      ).unwrap();
      onGenerated(result);
    } catch (caught) {
      setError(
        (caught as { data?: { message?: string } })?.data?.message ?? strings.generateFailed,
      );
    }
  };

  return (
    <ComposedModal open onClose={isLoading ? () => undefined : onClose} size="sm">
      <ModalBody>
        <div className="flex flex-col gap-4">
          <h2 className="text-typography-primary text-xl">{strings.generateTitle}</h2>
          <p className="text-typography-700 text-sm">{strings.generateIntro}</p>

          <RadioButtonGroup
            legendText={strings.periodLabel}
            name="suggestions-period"
            orientation="vertical"
            valueSelected={period}
            onChange={(value: unknown) => setPeriod(value as PeriodChoice)}
            disabled={isLoading}
          >
            <RadioButton labelText={strings.period30d} value="30d" id="period-30d" />
            <RadioButton labelText={strings.period90d} value="90d" id="period-90d" />
            <RadioButton labelText={strings.period12m} value="12m" id="period-12m" />
            <RadioButton labelText={strings.periodAll} value="all" id="period-all" />
            <RadioButton labelText={strings.periodCustom} value="custom" id="period-custom" />
          </RadioButtonGroup>

          {period === "custom" && (
            <DatePicker
              datePickerType="range"
              dateFormat="Y-m-d"
              value={[from, to].filter(Boolean)}
              onChange={(dates: Date[]) => {
                setFrom(toIsoDate(dates?.[0]));
                setTo(toIsoDate(dates?.[1]));
              }}
            >
              <DatePickerInput
                id="suggestions-from"
                labelText={strings.customFrom}
                placeholder="yyyy-mm-dd"
                size="sm"
                disabled={isLoading}
              />
              <DatePickerInput
                id="suggestions-to"
                labelText={strings.customTo}
                placeholder="yyyy-mm-dd"
                size="sm"
                disabled={isLoading}
              />
            </DatePicker>
          )}

          {customError && !isLoading && <p className="text-support-error text-sm">{customError}</p>}

          {isLoading && (
            <div className="flex flex-col gap-2">
              <p className="text-typography-600 text-sm">
                {slow ? strings.pendingSlow : strings.pendingReading}
              </p>
              <SkeletonPlaceholder className="h-16 w-full" />
            </div>
          )}

          {error && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title=""
              subtitle={error}
              className="max-w-full"
            />
          )}

          <div className="flex justify-end gap-2">
            <Button variant={ButtonVariant.SECONDARY} onClick={onClose} disabled={isLoading}>
              {strings.cancel}
            </Button>
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={submit}
              disabled={isLoading || Boolean(customError)}
            >
              {isLoading ? strings.pendingReading : strings.generateSubmit}
            </Button>
          </div>
        </div>
      </ModalBody>
    </ComposedModal>
  );
};
