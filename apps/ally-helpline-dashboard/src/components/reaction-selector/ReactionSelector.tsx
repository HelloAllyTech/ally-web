import { useState, useLayoutEffect, useRef } from "react";

import { Emoji } from "emoji-picker-react";
import { createPortal } from "react-dom";

import { PLATFORM_EMOJIS } from "@constants";
import { useClickOutside } from "@hooks";

interface ReactionSelectorProps {
  anchorElement: HTMLElement | null;
  selectedEmoji: string;
  handleEmojiClick: (emoji: string) => void;
  borderSize?: number;
  emojiSize?: number;
}

const ReactionSelector = ({
  anchorElement,
  selectedEmoji,
  handleEmojiClick,
  borderSize = 26,
  emojiSize = 14,
}: ReactionSelectorProps) => {
  const selectorRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useClickOutside(selectorRef, () => setPosition(null));

  useLayoutEffect(() => {
    if (!anchorElement || !selectorRef.current) return;

    const rect = anchorElement.getBoundingClientRect();
    const selectorRect = selectorRef.current.getBoundingClientRect();

    let top = rect.top - selectorRect.height - 8;
    let left = rect.left + rect.width / 2 - selectorRect.width / 2;

    // Flip if not enough space on top
    if (top < 8) top = rect.bottom + 8;

    // Keep inside viewport
    if (left < 8) left = 8;
    if (left + selectorRect.width > window.innerWidth - 8) {
      left = window.innerWidth - selectorRect.width - 8;
    }

    setPosition({ top, left });
  }, [anchorElement]);

  if (!anchorElement) return null;

  return createPortal(
    <div
      ref={selectorRef}
      className="fixed z-50 flex gap-1 rounded-full bg-white p-2 shadow-lg border border-neutral-200"
      onMouseDown={e => e.stopPropagation()}
      style={position ? { top: position.top, left: position.left } : { visibility: "hidden" }}
    >
      {PLATFORM_EMOJIS.map(emoji => (
        <div
          key={emoji}
          onClick={() => handleEmojiClick(emoji)}
          style={{
            width: borderSize,
            height: borderSize,
            borderColor: selectedEmoji === emoji ? "#0957D0" : undefined,
          }}
          className="flex cursor-pointer items-center justify-center rounded-full
                     border border-neutral-300 bg-white
                     transition-transform hover:scale-125"
        >
          <Emoji unified={emoji} size={emojiSize} />
        </div>
      ))}
    </div>,
    document.body,
  );
};

export default ReactionSelector;
