import React from "react";

import i18n from "@src/i18n";

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  /**
   * `page` fills the whole route area — the entire screen is gone, so the
   * copy explains that and offers a reload. `panel` is the compact form for
   * one subtree of an otherwise-working page (the track player, the
   * simulation room) where a full-page apology and reload would overstate
   * the damage — the learner can keep using the rest of the app.
   */
  variant?: "page" | "panel";
  /**
   * Changing this value clears a caught error and re-renders the children.
   * Pass whatever "you are somewhere else now" means for the caller — e.g.
   * a track/item id or a session id — so a boundary that outlives its
   * content doesn't keep showing a stale crash when the surrounding route
   * moves on to different content in the same position.
   */
  resetKey?: string | number | null;
  /** Extra classes for the wrapper. */
  className?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
  /** Bumped on every "Try again" click; used as the children's `key` so a
   * retry actually remounts the crashed subtree instead of re-rendering the
   * same component instances (which usually reproduces the same crash). */
  attempt: number;
}

/**
 * The app's crash barrier.
 *
 * Before this existed, zero components in ally-helpline-dashboard caught
 * render errors: `src/App.tsx` wrapped only a theme provider and a Toaster,
 * so any exception thrown while rendering the quiz/roleplay/track tree
 * white-screened the entire app with no recovery — a bad item in a track a
 * learner is halfway through, or a malformed roleplay payload, took down
 * every other feature too.
 *
 * One root boundary in `App.tsx` is the backstop; `variant="panel"` copies
 * are placed around the track player and simulation subtrees specifically so
 * one bad item/session doesn't blank the whole app for a learner who could
 * otherwise navigate away and keep working.
 *
 * Class component because `getDerivedStateFromError`/`componentDidCatch`
 * have no hook equivalent — React only exposes error catching to classes.
 * Copy is read via the `i18n` singleton (not the `useTranslation` hook,
 * which isn't available to class components) so it still responds to the
 * app's language switcher.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null, attempt: 0 };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Caught by ErrorBoundary:", error, errorInfo.componentStack);
  }

  override componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private handleTryAgain = () =>
    this.setState(prev => ({ error: null, attempt: prev.attempt + 1 }));

  override render() {
    const { error, attempt } = this.state;
    const { children, variant = "page", className = "" } = this.props;

    if (!error) return <React.Fragment key={attempt}>{children}</React.Fragment>;

    const isPanel = variant === "panel";
    const t = i18n.t.bind(i18n);

    return (
      <div
        role="alert"
        className={
          isPanel
            ? `flex flex-col items-center justify-center gap-3 text-center p-6 min-h-[300px] ${className}`
            : `flex flex-col font-primary items-center justify-center h-full min-h-[500px] px-4 ${className}`
        }
      >
        <h1
          className={
            isPanel
              ? "text-lg font-semibold text-typography-900"
              : "text-2xl font-medium text-typography-800 mb-3 text-center"
          }
        >
          {isPanel ? t("errorBoundary.panelTitle") : t("errorBoundary.pageTitle")}
        </h1>

        <p
          className={
            isPanel
              ? "text-sm text-typography-700 max-w-md"
              : "text-typography-800 text-center max-w-md mb-8 leading-relaxed"
          }
        >
          {isPanel ? t("errorBoundary.panelMessage") : t("errorBoundary.pageMessage")}
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={this.handleTryAgain}
            className={
              isPanel
                ? "inline-flex items-center bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors"
                : "inline-flex items-center bg-primary-500 hover:bg-primary-600 text-white text-base font-medium px-6 py-3 rounded-lg shadow-sm transition-colors"
            }
          >
            {t("errorBoundary.tryAgain")}
          </button>
          {/* Only offered at page level: a reload is proportionate to losing
              the whole app, and an overreaction to losing one panel. */}
          {!isPanel && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center border border-border-light hover:bg-neutral-50 text-typography-800 text-base font-medium px-6 py-3 rounded-lg transition-colors"
            >
              {t("errorBoundary.reloadPage")}
            </button>
          )}
        </div>

        {/* The message the throw site produced, shown as-is — useful for a
            learner/counsellor reporting a bug, and for us reading it back. */}
        {error.message && (
          <p
            className={`text-xs text-typography-600 ${isPanel ? "mt-2" : "mt-6 max-w-xl text-center"}`}
          >
            <span className="font-semibold">{t("errorBoundary.detailLabel")}: </span>
            {error.message}
          </p>
        )}
      </div>
    );
  }
}

export default ErrorBoundary;
