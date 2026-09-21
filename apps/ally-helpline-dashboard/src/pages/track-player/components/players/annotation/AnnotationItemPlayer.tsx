import { FC, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  ArtifactLabelPalette,
  ArtifactMarker,
  ArtifactVerdict,
  markKey,
} from "@ally-ui-mono/ui-shared";
import { useSubmitAnnotationAttemptMutation } from "@api";
import {
  AnnotationAttemptResult,
  AnnotationMarkInput,
  StartAnnotationItemPayload,
  TrackItemCompletionResult,
} from "@types";
import { clearItemProgress, loadItemProgress, saveItemProgress } from "@utils";

import { AnnotationResultPanel } from "./AnnotationResultPanel";

interface AnnotationItemPlayerProps {
  payload: StartAnnotationItemPayload;
  itemId: string;
  alreadyCompleted: boolean;
  onCompleted: (result: TrackItemCompletionResult) => void;
}

const VERDICT_MAP: Record<string, ArtifactVerdict> = {
  FOUND: "found",
  MISSED: "missed",
  NOT_HERE: "notHere",
};

/**
 * Annotation item: read a real artifact, arm a label, tap the lines where you
 * see it. Marking is local until Submit — the server grades in one shot and
 * hands back per-mark verdicts.
 */
export const AnnotationItemPlayer: FC<AnnotationItemPlayerProps> = ({
  payload,
  itemId,
  alreadyCompleted,
  onCompleted,
}) => {
  const { t } = useTranslation();
  const { annotation, lastResult, attemptsUsed, maxAttempts } = payload;

  const [marks, setMarks] = useState<AnnotationMarkInput[]>([]);
  const [armedLabelId, setArmedLabelId] = useState<string | null>(null);
  const [result, setResult] = useState<AnnotationAttemptResult | null>(lastResult);

  // Resume an in-progress attempt snapshotted before a forced reload (e.g. a
  // session-expiry redirect) rather than starting from a blank artifact —
  // only meaningful while there's no server-graded result to show instead.
  useEffect(() => {
    if (lastResult) return;
    const saved = loadItemProgress<AnnotationMarkInput[]>("annotation", itemId);
    if (saved?.length) setMarks(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (result) return;
    saveItemProgress("annotation", itemId, marks);
  }, [marks, result, itemId]);

  const [submitAnnotation, { isLoading: isSubmitting }] = useSubmitAnnotationAttemptMutation();

  const attemptsLeft =
    maxAttempts === null ? null : Math.max(0, maxAttempts - (result?.attemptsUsed ?? attemptsUsed));
  const canRetry =
    !!result && !result.passed && !result.revealed && (attemptsLeft === null || attemptsLeft > 0);

  const verdicts = useMemo(() => {
    if (!result) return undefined;
    return result.entries.reduce<Record<string, ArtifactVerdict>>((acc, entry) => {
      acc[markKey(entry.unitId, entry.labelId)] = VERDICT_MAP[entry.verdict];
      return acc;
    }, {});
  }, [result]);

  const notes = useMemo(() => {
    if (!result) return undefined;
    return result.entries.reduce<Record<string, string>>((acc, entry) => {
      if (entry.note) acc[markKey(entry.unitId, entry.labelId)] = entry.note;
      return acc;
    }, {});
  }, [result]);

  const toggleMark = (unitId: string, labelId: string) => {
    setMarks(prev => {
      const exists = prev.some(mark => mark.unitId === unitId && mark.labelId === labelId);
      return exists
        ? prev.filter(mark => !(mark.unitId === unitId && mark.labelId === labelId))
        : [...prev, { unitId, labelId }];
    });
  };

  const handleSubmit = async () => {
    if (!marks.length || isSubmitting) return;
    try {
      const response = await submitAnnotation({ itemId, marks }).unwrap();
      // Graded — the local snapshot would otherwise resurrect a finished
      // attempt's marks on a later visit.
      clearItemProgress("annotation", itemId);
      setResult(response);
      setArmedLabelId(null);
      if (response.itemCompleted) onCompleted(response);
    } catch {
      toast.error(t("common.somethingWentWrong"));
    }
  };

  const handleRetry = () => {
    setResult(null);
    setMarks([]);
    setArmedLabelId(null);
  };

  const showingResult = !!result;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          {annotation.intro && (
            <p className="text-base font-medium leading-relaxed text-typography-900">
              {annotation.intro}
            </p>
          )}

          {showingResult ? (
            <AnnotationResultPanel result={result} />
          ) : (
            <p className="text-sm text-typography-600">
              {t(
                annotation.settings.falsePositivePenalty > 0
                  ? "tracks2.annotation.instructions"
                  : "tracks2.annotation.instructionsNoPenalty",
                { passScore: annotation.settings.passScore },
              )}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <ArtifactMarker
              units={annotation.units}
              labels={annotation.labels}
              marks={marks}
              armedLabelId={armedLabelId}
              onToggleMark={toggleMark}
              verdicts={verdicts}
              notes={notes}
              readOnly={showingResult}
            />

            {!showingResult && (
              <div className="lg:sticky lg:top-0 lg:self-start">
                <ArtifactLabelPalette
                  labels={annotation.labels}
                  armedLabelId={armedLabelId}
                  onArm={setArmedLabelId}
                  title={t("tracks2.annotation.labels")}
                />
                <p className="mt-2 text-xs text-typography-500">
                  {t("tracks2.annotation.markedCount", { count: marks.length })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-wrap items-center justify-center gap-3 border-t border-border-light bg-white px-4 py-3">
        {showingResult ? (
          <>
            {canRetry && (
              <button
                onClick={handleRetry}
                className="rounded-full bg-primary-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
              >
                {t("tracks2.annotation.tryAgain")}
              </button>
            )}
            {attemptsLeft !== null && (
              <span className="text-sm text-typography-500">
                {t("tracks2.annotation.attemptsLeft", { count: attemptsLeft })}
              </span>
            )}
          </>
        ) : (
          <>
            <button
              onClick={handleSubmit}
              disabled={!marks.length || isSubmitting || alreadyCompleted}
              className="rounded-full bg-primary-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:pointer-events-none disabled:opacity-40"
            >
              {t("tracks2.annotation.submit")}
            </button>
            {!marks.length && (
              <span className="text-sm text-typography-500">
                {t("tracks2.annotation.markSomethingFirst")}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
};
