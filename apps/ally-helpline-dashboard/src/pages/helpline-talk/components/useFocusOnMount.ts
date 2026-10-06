import { useEffect, useRef } from "react";

/**
 * Moves focus to a screen's heading when the screen appears, so a screen-reader
 * user hears where they are after every transition (consent → waiting → chat →
 * ended) instead of being left on a button that no longer exists.
 */
export const useFocusOnMount = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return ref;
};
