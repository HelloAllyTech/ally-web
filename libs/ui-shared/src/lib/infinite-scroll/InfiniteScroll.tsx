"use client";

import { FC, useEffect, useRef, useCallback } from "react";

/**
 * InfiniteScroll component triggers a callback when the user scrolls near the bottom of the list.
 * Uses the scroll container as IntersectionObserver root when provided, so intersection is
 * computed against the actual scrolling element (reliable for overflow-y-auto containers).
 * @component
 * @param {InfiniteScrollProps} props - Props for InfiniteScroll
 */

/**
 * Props for InfiniteScroll component.
 */
interface InfiniteScrollProps {
  onInfiniteScroll: () => void;
  children: React.ReactNode[];
  isLoading: boolean;
  /** When false, the callback will not fire. Omit or true to allow loading. */
  hasMore?: boolean;
  /** Ref to the scroll container (element with overflow-y-auto). When provided, intersection is relative to this element instead of the viewport, fixing unreliable triggers when scrolling inside a div. */
  scrollContainerRef?: React.RefObject<Element | null>;
}

const InfiniteScroll: FC<InfiniteScrollProps> = ({
  onInfiniteScroll,
  children,
  isLoading,
  hasMore = true,
  scrollContainerRef,
}) => {
  const observerTarget = useRef<HTMLDivElement>(null);
  const lastTriggerTime = useRef<number>(0);
  const lastLengthRef = useRef<number>(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isInitialIntersectionRef = useRef<boolean>(true);

  /**
   * Debounced callback to prevent multiple triggers in quick succession.
   */
  const debouncedOnInfiniteScroll = useCallback(() => {
    const now = Date.now();
    if (children.length > lastLengthRef.current) {
      lastLengthRef.current = children.length;
      lastTriggerTime.current = 0;
    }
    if (now - lastTriggerTime.current < 500) {
      return;
    }
    lastTriggerTime.current = now;
    onInfiniteScroll();
  }, [onInfiniteScroll, children.length]);

  useEffect(() => {
    const sentinel = observerTarget.current;
    const root = scrollContainerRef?.current ?? null;

    // When scroll container ref is provided but not yet set, wait for it (e.g. parent just mounted)
    if (scrollContainerRef != null && root === null) {
      return;
    }
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        const target = entries[0];
        // Skip the first intersection event which fires immediately when observer is created
        // This prevents triggering on mount when sentinel is already visible
        if (isInitialIntersectionRef.current) {
          isInitialIntersectionRef.current = false;
          return;
        }
        if (target.isIntersecting && !isLoading && hasMore && children.length > 0) {
          debouncedOnInfiniteScroll();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px",
        root: root ?? undefined, // undefined = viewport (default)
      },
    );

    observerRef.current = observer;
    observer.observe(sentinel);

    return () => {
      observerRef.current = null;
      observer.disconnect();
      // Reset for next mount
      isInitialIntersectionRef.current = true;
    };
  }, [debouncedOnInfiniteScroll, children.length, isLoading, hasMore, scrollContainerRef]);

  return (
    <>
      {children}
      <div ref={observerTarget} className="h-4 w-full" />
    </>
  );
};

export default InfiniteScroll;
