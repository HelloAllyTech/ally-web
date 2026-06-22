import { useEffect, useRef } from "react";

export function useDebounce<T extends (...args: any[]) => any>(callback: T, delay: number): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  // Resolver for the promise returned by the most recent (still pending) call.
  // When a call is superseded or cancelled we settle its promise with
  // `undefined` instead of leaving it hanging — otherwise any `await` on it
  // never returns and any `.finally()` attached to it never runs (e.g. a guard
  // flag reset). StrictMode's mount/unmount/remount makes this routine.
  const pendingResolveRef = useRef<((value: unknown) => void) | null>(null);

  const settlePending = () => {
    if (pendingResolveRef.current) {
      pendingResolveRef.current(undefined);
      pendingResolveRef.current = null;
    }
  };

  /**
   * Clears the timeout when the component unmounts
   */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      settlePending();
    };
  }, []);

  /**
   * Returns a debounced version of the callback function
   * Always returns a Promise to support both sync and async callbacks
   * @param args - Arguments to pass to the callback
   * @returns The debounced callback function that returns a Promise
   */
  return ((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    // A new call supersedes the previous pending one; settle it so its awaiter
    // unblocks rather than hanging forever.
    settlePending();

    return new Promise((resolve, reject) => {
      pendingResolveRef.current = resolve;
      timeoutRef.current = setTimeout(async () => {
        pendingResolveRef.current = null;
        try {
          const result = await callback(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  }) as T;
}
