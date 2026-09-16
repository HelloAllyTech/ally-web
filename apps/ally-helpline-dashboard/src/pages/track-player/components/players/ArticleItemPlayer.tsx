import { FC, useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { RichTextRenderer } from "@ally-ui-mono/ui-shared";
import { useMarkArticleReadMutation } from "@api";
import { TickGreenBackground } from "@assets";
import {
  StartArticleItemPayload,
  SubmitArticleQuestionAnswerResponse,
  TrackItemCompletionResult,
} from "@types";

import { ArticleQuestionCard } from "./ArticleQuestionCard";
import { splitArticleHtml } from "./articleSegments";

interface ArticleItemPlayerProps {
  payload: StartArticleItemPayload;
  itemId: string;
  /** Whether the item is already completed (resumed). */
  alreadyCompleted: boolean;
  onCompleted: (result: TrackItemCompletionResult) => void;
}

/** Scroll fraction (0-1) past which the article counts as "read". */
const READ_SCROLL_THRESHOLD = 0.95;
/** If the article doesn't scroll, auto-eligible after this many ms. */
const NO_SCROLL_READY_MS = 3000;

/** Selectable article text sizes, in rem. Persisted across articles/sessions. */
const FONT_SCALE_STEPS = [1, 1.125, 1.25, 1.375, 1.5];
const DEFAULT_FONT_SCALE_INDEX = 0;
const FONT_SCALE_STORAGE_KEY = "ally.trackArticle.fontScaleIndex";

function readStoredFontScaleIndex(): number {
  const raw = window.localStorage.getItem(FONT_SCALE_STORAGE_KEY);
  const parsed = raw === null ? NaN : Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 && parsed < FONT_SCALE_STEPS.length
    ? parsed
    : DEFAULT_FONT_SCALE_INDEX;
}

/**
 * Article item: renders sanitized HTML with a thin scroll-progress bar and
 * a mark-read affordance that unlocks once the reader reaches ~95% (via an
 * IntersectionObserver sentinel) or after a few seconds if the content is
 * too short to scroll.
 *
 * An article may also carry inline questions, anchored between its prose
 * blocks. Those are the article's completion rule when present: the server
 * completes the item on the last answer (and refuses mark-as-read while any
 * are outstanding), so the reader has to work through them rather than
 * scrolling past. The body is split on their placeholders and the segments
 * rendered in order.
 */
export const ArticleItemPlayer: FC<ArticleItemPlayerProps> = ({
  payload,
  itemId,
  alreadyCompleted,
  onCompleted,
}) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [scrollPct, setScrollPct] = useState(0);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [marked, setMarked] = useState(alreadyCompleted);
  const [markArticleRead, { isLoading }] = useMarkArticleReadMutation();
  const [fontScaleIndex, setFontScaleIndex] = useState(readStoredFontScaleIndex);

  const segments = useMemo(
    () => splitArticleHtml(payload.html, payload.questions ?? []),
    [payload.html, payload.questions],
  );
  /**
   * Only the questions the article actually shows. Counting
   * `payload.questions` instead would hold the footer shut forever on a
   * translated body that lost a placeholder — the server counts the rendered
   * set for the same reason.
   */
  const shownQuestions = useMemo(
    () => segments.flatMap(segment => (segment.kind === "question" ? [segment.question] : [])),
    [segments],
  );
  // Seeded from the payload so a resumed article counts what was answered
  // before, then advanced locally as each card reports back.
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(
    () =>
      new Set(
        (payload.questions ?? [])
          .filter(question => question.answered)
          .map(question => question.id),
      ),
  );
  const unansweredCount = shownQuestions.filter(question => !answeredIds.has(question.id)).length;

  const handleQuestionAnswered = (
    questionId: string,
    result: SubmitArticleQuestionAnswerResponse,
  ) => {
    setAnsweredIds(prev => new Set(prev).add(questionId));
    // The last answer completes the article server-side; mirror that here so
    // the outline and the footer move without a round trip.
    if (result.completion?.completed) {
      setMarked(true);
      onCompleted(result.completion);
    }
  };

  const changeFontScale = (delta: 1 | -1) => {
    setFontScaleIndex(prev => {
      const next = Math.min(FONT_SCALE_STEPS.length - 1, Math.max(0, prev + delta));
      window.localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(next));
      return next;
    });
  };

  // Scroll progress bar.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      const pct = max <= 0 ? 100 : Math.min(100, Math.round((el.scrollTop / max) * 100));
      setScrollPct(pct);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [payload.html]);

  // Reached-end detection via a sentinel at the bottom of the content.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root) return undefined;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) setReachedEnd(true);
      },
      { root, threshold: READ_SCROLL_THRESHOLD },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [payload.html]);

  // Fallback: short articles that never scroll become eligible after a delay.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && el.scrollHeight <= el.clientHeight) {
      const id = setTimeout(() => setReachedEnd(true), NO_SCROLL_READY_MS);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [payload.html]);

  const canMark = (reachedEnd || scrollPct >= READ_SCROLL_THRESHOLD * 100) && unansweredCount === 0;

  const handleMarkRead = async () => {
    if (marked || isLoading) return;
    try {
      const result = await markArticleRead({ itemId }).unwrap();
      setMarked(true);
      onCompleted(result);
    } catch {
      toast.error(t("common.somethingWentWrong"));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="h-1 w-full flex-shrink-0 bg-neutral-100">
        <div
          className="h-full bg-primary-500 transition-[width] duration-150"
          style={{ width: `${scrollPct}%` }}
        />
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto mb-3 flex max-w-[68ch] items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => changeFontScale(-1)}
            disabled={fontScaleIndex === 0}
            aria-label={t("tracks2.article.decreaseFontSize")}
            className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold text-typography-700 transition-colors hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-40"
          >
            A-
          </button>
          <button
            type="button"
            onClick={() => changeFontScale(1)}
            disabled={fontScaleIndex === FONT_SCALE_STEPS.length - 1}
            aria-label={t("tracks2.article.increaseFontSize")}
            className="flex h-7 w-7 items-center justify-center rounded-full text-base font-semibold text-typography-700 transition-colors hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-40"
          >
            A+
          </button>
        </div>
        <article
          className="mx-auto max-w-[68ch]"
          style={{ fontSize: `${FONT_SCALE_STEPS[fontScaleIndex]}rem` }}
        >
          {segments.map(segment =>
            segment.kind === "html" ? (
              <RichTextRenderer key={segment.key} content={segment.html} allowImages />
            ) : (
              <ArticleQuestionCard
                key={segment.key}
                itemId={itemId}
                question={segment.question}
                onAnswered={result => handleQuestionAnswered(segment.question.id, result)}
              />
            ),
          )}
          <div ref={sentinelRef} aria-hidden className="h-px w-full" />
        </article>
      </div>

      <div className="flex flex-shrink-0 items-center justify-center border-t border-border-light bg-white px-4 py-3">
        {marked ? (
          <span className="inline-flex items-center gap-2 text-sm font-medium text-success-800">
            <TickGreenBackground className="h-4 w-4" />
            {t("tracks2.article.read")}
          </span>
        ) : (
          <button
            onClick={handleMarkRead}
            disabled={!canMark || isLoading}
            className="rounded-full bg-primary-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:pointer-events-none disabled:opacity-40"
          >
            {unansweredCount > 0
              ? t(
                  unansweredCount === 1
                    ? "tracks2.article.answerQuestionToContinue"
                    : "tracks2.article.answerQuestionsToContinue",
                )
              : canMark
                ? t("tracks2.article.markRead")
                : t("tracks2.article.keepReading")}
          </button>
        )}
      </div>
    </div>
  );
};
