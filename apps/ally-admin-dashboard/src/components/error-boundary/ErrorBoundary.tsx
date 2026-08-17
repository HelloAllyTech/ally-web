import React from "react";

import { en } from "@constants";
import { logger } from "@utils";

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  /**
   * `page` fills the route area — the whole page is gone, so the copy explains
   * that and offers a reload. `panel` is the compact form for one section of an
   * otherwise-working page (a drawer, a card), where a full-page apology and a
   * reload button would both overstate the damage.
   */
  variant?: "page" | "panel";
  /**
   * Changing this value clears a caught error and re-renders the children.
   * Callers pass whatever "you are somewhere else now" means for them — the
   * route path at page level, the record id at panel level. Without it a
   * boundary that outlives its content keeps showing a stale crash: React
   * Router reuses the element position across routes, so navigating away from a
   * broken page could otherwise leave the error panel in place on the next one.
   */
  resetKey?: string | number | null;
  /**
   * Panel-level escape hatch. A crashed drawer takes its own close button down
   * with it, so the boundary has to offer the way out the drawer no longer can
   * — pass the same handler the panel's own close uses. Omitted at page level,
   * where there is nothing to close.
   */
  onDismiss?: () => void;
  /** Extra classes for the wrapper. */
  className?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * The console's crash barrier.
 *
 * Before this existed, any component that threw during render unmounted the
 * entire app — the admin got a blank white page with no message and no way back
 * except a manual reload. That is what a single missing field in one API
 * response did to the whole Bug Hunter tab: the drawer read `.some` off an
 * array the deployed backend didn't send, and clicking any row in the bugs
 * table blanked the console.
 *
 * It is deliberately one aggregating handler rather than per-component
 * try/catch: the throw site is what knows how to describe its own failure, and
 * that message is carried on the error and rendered here verbatim.
 *
 * Class component because `getDerivedStateFromError`/`componentDidCatch` have
 * no hook equivalent — React exposes error catching only to classes.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Into the in-app log the Logs page reads, so a crash the admin reports
    // has a trail — and to the console, where the component stack is the
    // useful part while developing.
    logger.error(`Unhandled render error: ${error.message}`);
    // eslint-disable-next-line no-console
    console.error("Caught by ErrorBoundary:", error, errorInfo.componentStack);
  }

  override componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private handleTryAgain = () => this.setState({ error: null });

  override render() {
    const { error } = this.state;
    const { children, variant = "page", className = "", onDismiss } = this.props;

    if (!error) return children;

    const isPanel = variant === "panel";

    return (
      <div
        role="alert"
        className={
          isPanel
            ? `flex flex-col items-start gap-3 border border-border-light rounded p-4 ${className}`
            : `flex flex-col font-primary items-center justify-center h-full min-h-[500px] px-4 ${className}`
        }
      >
        {isPanel ? (
          <h3 className="text-sm font-semibold text-typography-900">
            {en.errorBoundary.panelTitle}
          </h3>
        ) : (
          <h1 className="text-2xl font-medium text-typography-800 mb-3 text-center">
            {en.errorBoundary.pageTitle}
          </h1>
        )}

        <p
          className={
            isPanel
              ? "text-sm text-typography-700"
              : "text-typography-800 text-center max-w-md mb-8 leading-relaxed"
          }
        >
          {isPanel ? en.errorBoundary.panelMessage : en.errorBoundary.pageMessage}
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
            {en.errorBoundary.tryAgain}
          </button>
          {/* Only offered at page level: a reload is a proportionate response
              to losing the page, and an overreaction to losing a drawer. */}
          {!isPanel && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center border border-border-light hover:bg-neutral-50 text-typography-800 text-base font-medium px-6 py-3 rounded-lg transition-colors"
            >
              {en.errorBoundary.reloadPage}
            </button>
          )}
          {isPanel && onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center border border-border-light hover:bg-neutral-50 text-typography-800 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {en.common.close}
            </button>
          )}
        </div>

        {/* The message the throw site wrote, shown as-is. Everyone reading this
            console is staff or a tenant admin, and this line is the difference
            between a report we can act on and "the admin panel broke". */}
        {error.message && (
          <p
            className={`text-xs text-typography-600 ${isPanel ? "" : "mt-6 max-w-xl text-center"}`}
          >
            <span className="font-semibold">{en.errorBoundary.detailLabel}: </span>
            {error.message}
          </p>
        )}
      </div>
    );
  }
}
