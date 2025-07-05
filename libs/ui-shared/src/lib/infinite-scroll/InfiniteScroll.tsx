"use client";

import { FC, useEffect, useRef, useCallback } from "react";

interface InfiniteScrollProps {
  onInfiniteScroll: () => void;
  children: React.ReactNode[];
  isLoading: boolean;
}

// TODO: Need to add an implementation for hasMore
// TODO: Review and update code to match good code
const InfiniteScroll: FC<InfiniteScrollProps> = ({ onInfiniteScroll, children, isLoading }) => {
  const observerTarget = useRef<HTMLDivElement>(null);
  const lastTriggerTime = useRef<number>(0);

  const debouncedOnInfiniteScroll = useCallback(() => {
    const now = Date.now();
    // Prevent multiple triggers within 500ms
    if (now - lastTriggerTime.current < 500) {
      return;
    }
    lastTriggerTime.current = now;
    onInfiniteScroll();
  }, [onInfiniteScroll]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const target = entries[0];
        if (target.isIntersecting && !isLoading && children.length > 0) {
          debouncedOnInfiniteScroll();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px", // Start loading when we're 100px from the bottom
      },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [debouncedOnInfiniteScroll, children.length, isLoading]);

  return (
    <>
      {children}
      <div ref={observerTarget} className="h-4 w-full" />
    </>
  );
};

export default InfiniteScroll;
