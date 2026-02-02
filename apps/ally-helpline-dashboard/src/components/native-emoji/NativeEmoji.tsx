import { FC } from "react";

interface NativeEmojiProps {
  unified: string;
  size?: number;
  className?: string;
}

/**
 * NativeEmoji component that renders emojis using native Unicode characters
 * This avoids external dependencies and CDN issues in production
 */
const NativeEmoji: FC<NativeEmojiProps> = ({ unified, size = 16, className = "" }) => {
  // Convert unified code (e.g., "1f44d") to emoji character
  const getEmojiFromUnified = (unifiedCode: string): string => {
    try {
      // Handle compound emojis (e.g., "1f468-200d-1f4bb")
      const codes = unifiedCode.split("-").map(code => parseInt(code, 16));
      return String.fromCodePoint(...codes);
    } catch {
      return "❓"; // Fallback emoji
    }
  };

  const emoji = getEmojiFromUnified(unified);

  return (
    <span
      className={className}
      style={{
        fontSize: `${size}px`,
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      role="img"
      aria-label={`emoji-${unified}`}
    >
      {emoji}
    </span>
  );
};

export default NativeEmoji;
