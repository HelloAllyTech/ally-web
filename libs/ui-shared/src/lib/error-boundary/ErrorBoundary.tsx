import React, { Component, ErrorInfo, ReactNode } from "react";

import { logger } from "../../logger";

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI rendered instead of the default one. */
  fallback?: ReactNode;
  /** Heading shown in the default fallback. */
  title?: string;
  /** Supporting text shown in the default fallback. */
  description?: string;
  /** Label for the reload button in the default fallback. */
  reloadLabel?: string;
  /** Called after an error is caught, e.g. to report to an error tracker. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches render errors in its subtree and shows a recoverable fallback UI
 * instead of unmounting the whole application.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error(`Unhandled render error: ${error.message}\n${errorInfo.componentStack}`);
    this.props.onError?.(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    const {
      title = "Something went wrong",
      description = "An unexpected error occurred. Please reload the page to continue.",
      reloadLabel = "Reload page",
    } = this.props;

    return (
      <div
        data-testid="error-boundary-fallback"
        role="alert"
        className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3 p-6 text-center"
      >
        <h2 className="text-xl font-semibold text-[#1F2933]">{title}</h2>
        <p className="max-w-md text-sm text-[#52606D]">{description}</p>
        <button
          type="button"
          onClick={this.handleReload}
          className="mt-2 rounded-md bg-[#1F2933] px-4 py-2 text-sm font-medium text-white hover:bg-[#323F4B]"
        >
          {reloadLabel}
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
