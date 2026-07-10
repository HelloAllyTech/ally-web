import { FC, useEffect, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { RichTextRenderer } from "@ally-ui-mono/ui-shared";
import { useMarkArticleReadMutation } from "@api";
import { TickGreenBackground } from "@assets";
import { StartArticleItemPayload, TrackItemCompletionResult } from "@types";

interface ArticleItemPlayerProps {
  payload: StartArticleItemPayload;
  /** Whether the item is already completed (resumed). */
  alreadyCompleted: boolean;
  onCompleted: (result: TrackItemCompletionResult) => void;
}

/** Scroll fraction (0-1) past which the article counts as "read". */
const READ_SCROLL_THRESHOLD = 0.95;
/** If the article doesn't scroll, auto-eligible after this many ms. */
const NO_SCROLL_READY_MS = 3000;

/**
 * Article item: renders sanitized HTML with a thin scroll-progress bar and
 * a mark-read affordance that unlocks once the reader reaches ~95% (via an
 * IntersectionObserver sentinel) or after a few seconds if the content is
 * too short to scroll.
 */
export const ArticleItemPlayer: FC<ArticleItemPlayerProps> = ({
  payload,
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

  const canMark = reachedEnd || scrollPct >= READ_SCROLL_THRESHOLD * 100;

  const handleMarkRead = async () => {
    if (marked || isLoading) return;
    try {
      const result = await markArticleRead({ itemId: payload.trackItemProgressId }).unwrap();
      setMarked(true);
      onCompleted(result);
    } catch {
      // Surfaced via the shared toast layer elsewhere; keep the button live.
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
        <article className="mx-auto max-w-[68ch]">
          <RichTextRenderer content={payload.html} allowImages />
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
            {canMark ? t("tracks2.article.markRead") : t("tracks2.article.keepReading")}
          </button>
        )}
      </div>
    </div>
  );
};
