import React, { useState } from "react";

import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";

interface ChatComposerProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

/** Pinned composer: Enter sends, Shift+Enter adds a newline, Stop aborts. */
export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSend,
  onStop,
  isStreaming,
  disabled = false,
}) => {
  const [value, setValue] = useState("");
  const strings = en.roleplayStudio.copilot;

  const send = () => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || disabled) return;
    setValue("");
    onSend(trimmed);
  };

  return (
    <div className="flex items-end gap-2 border-t border-border-light pt-3">
      <div className="flex-1 min-w-0">
        <AutoExpandableTextarea
          value={value}
          onChange={setValue}
          placeholder={strings.placeholder}
          disabled={disabled}
          minHeight={44}
          maxLines={8}
          className="w-full rounded-lg border border-border-light bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-500"
          onKeyDown={event => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
        />
      </div>
      {isStreaming ? (
        <Button
          variant={ButtonVariant.SECONDARY}
          className="h-[40px] px-4 shrink-0"
          onClick={onStop}
        >
          {strings.stop}
        </Button>
      ) : (
        <Button
          variant={ButtonVariant.PRIMARY}
          className="h-[40px] px-4 shrink-0"
          disabled={disabled || !value.trim()}
          onClick={send}
        >
          {strings.send}
        </Button>
      )}
    </div>
  );
};
