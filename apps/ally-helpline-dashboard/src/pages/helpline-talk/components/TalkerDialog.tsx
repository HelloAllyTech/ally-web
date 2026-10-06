import { FC, ReactNode, RefObject, useEffect, useId, useRef } from "react";

import { TalkerButton } from "./TalkerButton";

interface TalkerDialogProps {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  busy?: boolean;
  /** Disables only the confirm button (e.g. a required choice not made yet). */
  confirmDisabled?: boolean;
  error?: string | null;
  /**
   * The Cancel button, for a caller that has to put focus back on it — e.g. after something inside
   * the body (a button that disables itself once used) takes focus with it.
   */
  cancelRef?: RefObject<HTMLButtonElement>;
}

/**
 * A small, accessible confirm dialog for the talker page. Built here rather
 * than reusing ConfirmationDialog: that one leads with a 32 px display title and
 * a non-focusable close icon, which is too loud and too hard to use on a phone.
 *
 * Focus moves to the safe choice (Cancel) on open, Tab is kept inside, Escape
 * cancels, and focus returns to whatever opened it.
 */
export const TalkerDialog: FC<TalkerDialogProps> = ({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive,
  busy,
  confirmDisabled,
  error,
  cancelRef: externalCancelRef,
}) => {
  const titleId = useId();
  const bodyId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const ownCancelRef = useRef<HTMLButtonElement>(null);
  const cancelRef = externalCancelRef ?? ownCancelRef;
  const returnFocusTo = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    returnFocusTo.current = document.activeElement;
    cancelRef.current?.focus();
    return () => {
      (returnFocusTo.current as HTMLElement | null)?.focus?.();
    };
  }, [open, cancelRef]);

  if (!open) return null;

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      if (!busy) onCancel();
      return;
    }
    if (event.key !== "Tab" || !panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      "button:not([disabled]), [href], textarea, input, select",
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onKeyDown={onKeyDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="w-full max-w-sm rounded-2xl bg-white p-5 font-primary shadow-lg"
      >
        <h2 id={titleId} className="text-xl font-medium text-typography-900">
          {title}
        </h2>
        <div id={bodyId} className="mt-2 text-base text-typography-800">
          {body}
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive-700">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <TalkerButton ref={cancelRef} variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </TalkerButton>
          <TalkerButton
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
          >
            {confirmLabel}
          </TalkerButton>
        </div>
      </div>
    </div>
  );
};
