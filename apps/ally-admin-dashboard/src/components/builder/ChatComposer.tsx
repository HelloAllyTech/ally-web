import React, { useState } from "react";

import { Button } from "@ally-ui-mono/ui-shared";
import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import { en } from "@constants";

interface ChatComposerProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * The free-text way in. Most turns are answered from a question card instead;
 * this is for the things the agent hasn't thought to ask about, which is why
 * its placeholder says so rather than prompting for an answer.
 */
export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSend,
  onStop,
  isStreaming,
  disabled = false,
  placeholder,
}) => {
  const [value, setValue] = useState("");

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || disabled) return;
    setValue("");
    onSend(trimmed);
  };

  return (
    <div className="flex items-end gap-2 border-t border-neutral-200 bg-white p-3">
      <AutoExpandableTextarea
        id="builder-composer"
        value={value}
        onChange={setValue}
        placeholder={placeholder ?? en.builder.chat.placeholder}
        disabled={disabled || isStreaming}
        maxLines={6}
        onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
      />
      {isStreaming ? (
        <Button kind="danger--tertiary" size="md" onClick={onStop}>
          {en.builder.chat.stop}
        </Button>
      ) : (
        <Button kind="primary" size="md" disabled={disabled || !value.trim()} onClick={submit}>
          {en.builder.chat.send}
        </Button>
      )}
    </div>
  );
};
