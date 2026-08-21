import { FC, useEffect, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { UpArrow } from "@assets";
import { Button, CharacterCount } from "@components";

const MAX_MESSAGE_LENGTH = 2000;

interface DebriefReplyInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

/**
 * Reply composer for the debrief thread. Same mechanics as the old Ask AI
 * composer, but framed as replying to Ally rather than querying a tool.
 */
export const DebriefReplyInput: FC<DebriefReplyInputProps> = ({ onSend, disabled }) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wasDisabledRef = useRef(disabled);
  const [messageLength, setMessageLength] = useState(0);

  useEffect(() => {
    // Hand focus back when a reply finishes streaming, so a follow-up question
    // does not need a click first.
    if (wasDisabledRef.current && !disabled && inputRef.current) {
      inputRef.current.focus();
    }
    wasDisabledRef.current = disabled;
  }, [disabled]);

  const handleSend = () => {
    if (disabled) return;
    const text = inputRef.current?.value?.trim() ?? "";
    if (!text) return;
    onSend(text);
    if (inputRef.current) {
      inputRef.current.value = "";
      setMessageLength(0);
      inputRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageLength(event.target.value.length);
    event.target.style.height = "auto";
    event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`;
  };

  return (
    // Sticky rather than absolutely positioned: it used to float over the note
    // and the thread scrolled underneath it, leaving half-covered lines of text
    // showing above and below the composer. The opaque wrapper is what makes
    // content pass cleanly behind it.
    <div className="sticky bottom-0 z-10 bg-white pt-3 pb-1">
      <div className="flex items-end gap-2 rounded-[32px] border border-gray-300 bg-white p-[6px] shadow-md">
        {/* Only once there is something to count. A "0" ring sitting in an
            empty field is noise, and on a phone it was stealing the width the
            placeholder needed. */}
        {messageLength > 0 && (
          <CharacterCount value={messageLength} maxLength={MAX_MESSAGE_LENGTH} />
        )}
        <textarea
          ref={inputRef}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="custom-scrollbar max-h-[120px] w-full flex-1 resize-none overflow-y-auto p-2 px-3 font-primary text-sm outline-none disabled:opacity-60"
          // No character count in the placeholder: CharacterCount sits right
          // beside it saying the same thing, and the pair overflowed the field
          // on a phone.
          placeholder={t("postSim.debrief.replyPlaceholder")}
          disabled={disabled}
          maxLength={MAX_MESSAGE_LENGTH}
          rows={1}
        />
        <Button
          variant="primary"
          type="button"
          className="!h-10 !w-10 shrink-0 items-center justify-center !rounded-full !p-2 disabled:opacity-60 flex"
          onClick={handleSend}
          disabled={disabled || messageLength === 0}
        >
          <UpArrow />
        </Button>
      </div>
    </div>
  );
};
