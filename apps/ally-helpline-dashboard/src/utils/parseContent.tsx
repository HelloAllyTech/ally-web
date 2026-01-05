/**
 * Parses content string and converts <a>text</a> to hyperlinks and <b>text</b> to bold text.
 * @param content - The string content to parse
 * @returns JSX element with parsed content
 */
export const parseContent = (content: string) => {
  // Pattern to match <a>text</a> and <b>text</b> tags
  const tagPattern = /<a>([^<]+)<\/a>|<b>([^<]+)<\/b>/g;

  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    if (match[1]) {
      parts.push(
        <a
          key={match.index}
          href={match[1]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 underline hover:text-primary-700"
        >
          {match[1]}
        </a>,
      );
    } else if (match[2]) {
      // It's a <b> tag - match[2] is the bold text
      parts.push(
        <b key={match.index} className="font-semibold">
          {match[2]}
        </b>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last match
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return <div className="w-full">{parts.length > 0 ? parts : content}</div>;
};
