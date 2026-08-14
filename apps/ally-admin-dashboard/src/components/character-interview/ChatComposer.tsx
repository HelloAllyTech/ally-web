import React, { useState } from "react";

import { Send, StopFilled } from "@carbon/icons-react";

import { Button, TextArea } from "@ally-ui-mono/ui-shared";
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
  const strings = en.characterInterview;

  const send = () => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || disabled) return;
    setValue("");
    onSend(trimmed);
  };

  return (
    <div className="flex items-end gap-2 border-t border-border-light pt-3">
      <div className="flex-1 min-w-0">
        <TextArea
          id="character-interview-composer"
          labelText={strings.placeholder}
          hideLabel
          value={value}
          onChange={event => setValue(event.target.value)}
          placeholder={strings.placeholder}
          disabled={disabled}
          rows={2}
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
          kind="secondary"
          size="md"
          className="shrink-0"
          renderIcon={StopFilled}
          onClick={onStop}
        >
          {strings.stop}
        </Button>
      ) : (
        <Button
          kind="primary"
          size="md"
          className="shrink-0"
          renderIcon={Send}
          disabled={disabled || !value.trim()}
          onClick={send}
        >
          {strings.send}
        </Button>
      )}
    </div>
  );
};
