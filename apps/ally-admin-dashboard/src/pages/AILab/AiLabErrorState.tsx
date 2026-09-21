import React from "react";

import { Button, InlineNotification } from "@ally-ui-mono/ui-shared";
import { en } from "@constants";

interface AiLabErrorStateProps {
  message: string;
  onRetry?: () => void;
}

/**
 * Shared "this list failed to load" state for the six AI Lab tabs.
 *
 * Before this existed, every tab destructured only `{data, isLoading}` — never
 * `isError` — so a failed fetch fell into the exact same branch as a genuinely
 * empty list: "you haven't created any skills yet" plus a create-one button.
 * That doesn't just mislead, it invites the admin to recreate data that
 * already exists on the server. This renders instead, distinct from both the
 * loading and empty states, with a retry action when the query exposes one.
 */
export const AiLabErrorState: React.FC<AiLabErrorStateProps> = ({ message, onRetry }) => (
  <div className="py-8 flex flex-col items-start gap-3">
    <InlineNotification kind="error" lowContrast hideCloseButton title={message} />
    {onRetry && (
      <Button kind="tertiary" size="sm" onClick={onRetry}>
        {en.common.retry}
      </Button>
    )}
  </div>
);
