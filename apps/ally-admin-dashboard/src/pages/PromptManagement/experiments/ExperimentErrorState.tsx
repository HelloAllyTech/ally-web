import React from "react";

import { Button, InlineNotification } from "@ally-ui-mono/ui-shared";
import { en } from "@constants";

/** A failed load, kept distinct from "nothing here yet" so nobody recreates data that exists. */
export const ExperimentErrorState: React.FC<{ message: string; onRetry: () => void }> = ({
  message,
  onRetry,
}) => (
  <div className="flex flex-col items-start gap-3 py-4">
    <InlineNotification kind="error" lowContrast hideCloseButton title={message} />
    <Button kind="tertiary" size="sm" onClick={onRetry}>
      {en.common.retry}
    </Button>
  </div>
);
