'use client';

import { FC, useEffect, useRef } from 'react';

interface InfiniteScrollProps {
  onInfiniteScroll: () => void;
  children: React.ReactNode[];
  isLoading: boolean;
}

// TODO: Need to add an implementation for hasMore
const InfiniteScroll: FC<InfiniteScrollProps> = ({ onInfiniteScroll, children, isLoading }) => {
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && !isLoading && children.length > 0) {
          onInfiniteScroll();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '100px' // Start loading when we're 100px from the bottom
      }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [onInfiniteScroll]);

  return (
    <>
      {children}
      <div ref={observerTarget} className="h-4 w-full" />
    </>
  );
};

export default InfiniteScroll; 