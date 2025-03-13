import { FunctionComponent } from "react";

const CustomMarkdown: FunctionComponent<{ content: string }> = ({
  content,
}) => {
  const parseMarkdown = (text: string) => {
    const lines = text.split("\n");
    const parsedContent: React.ReactNode[] = [];

    let currentSection: {
      type: "title" | "list" | "text";
      content: string[];
    } | null = null;

    const parseBoldAndText = (line: string) => {
      const parts: React.ReactNode[] = [];
      let remainingText = line;

      while (remainingText.includes("**")) {
        const boldMatch = remainingText.match(/(.?)\*\*(.*?)\*\*(.*)$/);
        if (boldMatch) {
          // Add text before bold if exists
          if (boldMatch[1]) {
            parts.push(boldMatch[1]);
          }

          // Add bold text
          parts.push(
            <strong key={`bold-${parts.length}`} className="font-semibold">
              {boldMatch[2]}
            </strong>
          );

          // Update remaining text
          remainingText = boldMatch[3];
        } else {
          // If no more bold matches, add remaining text
          parts.push(remainingText);
          break;
        }
      }

      // Add any remaining text
      if (remainingText) {
        parts.push(remainingText);
      }

      return parts.length > 0 ? parts : line;
    };

    lines.forEach((line, index) => {
      const titleMatch = line.match(/^(#+)\s*(.+)/);
      const listItemMatch = line.match(/^-\s*(.+)/);

      if (titleMatch) {
        // Close previous section if exists
        if (currentSection) {
          if (currentSection.type === "title") {
            parsedContent.push(
              <h3
                key={`title-${parsedContent.length}`}
                className="font-semibold mb-2"
              >
                {parseBoldAndText(currentSection.content[0])}
              </h3>
            );
          } else if (currentSection.type === "list") {
            parsedContent.push(
              <ul
                key={`list-${parsedContent.length}`}
                className="list-disc pl-5 mb-2"
              >
                {currentSection.content.map((item, idx) => (
                  <li key={idx}>{parseBoldAndText(item)}</li>
                ))}
              </ul>
            );
          } else if (currentSection.type === "text") {
            parsedContent.push(
              <p key={`text-${parsedContent.length}`} className="mb-2">
                {currentSection.content.map((line) => parseBoldAndText(line))}
              </p>
            );
          }
        }

        // Start new title section
        currentSection = { type: "title", content: [titleMatch[2]] };
      } else if (listItemMatch) {
        // If current section is not a list, start a new list
        if (!currentSection || currentSection.type !== "list") {
          if (currentSection) {
            // Close previous section
            parsedContent.push(
              currentSection.type === "title" ? (
                <h3
                  key={`title-${parsedContent.length}`}
                  className="text-sm font-semibold mb-2"
                >
                  {parseBoldAndText(currentSection.content[0])}
                </h3>
              ) : currentSection.type === "text" ? (
                <p key={`text-${parsedContent.length}`} className="mb-2">
                  {currentSection.content.map((line) => parseBoldAndText(line))}
                </p>
              ) : null
            );
          }
          currentSection = { type: "list", content: [listItemMatch[1]] };
        } else if (currentSection.type === "list") {
          // Add to existing list
          currentSection.content.push(listItemMatch[1]);
        }
      } else if (line.trim()) {
        // Regular text
        if (!currentSection || currentSection.type !== "text") {
          if (currentSection) {
            // Close previous section
            parsedContent.push(
              currentSection.type === "title" ? (
                <h3
                  key={`title-${parsedContent.length}`}
                  className="text-sm font-semibold mb-2"
                >
                  {parseBoldAndText(currentSection.content[0])}
                </h3>
              ) : currentSection.type === "list" ? (
                <ul
                  key={`list-${parsedContent.length}`}
                  className="list-disc pl-5 mb-2"
                >
                  {currentSection.content.map((item, idx) => (
                    <li key={idx}>{parseBoldAndText(item)}</li>
                  ))}
                </ul>
              ) : null
            );
          }
          currentSection = { type: "text", content: [line] };
        } else if (currentSection.type === "text") {
          currentSection.content.push(line);
        }
      }

      // If last line, close the current section
      if (index === lines.length - 1 && currentSection) {
        if (currentSection.type === "title") {
          parsedContent.push(
            <h3
              key={`title-${parsedContent.length}`}
              className="text-sm font-semibold mb-2"
            >
              {parseBoldAndText(currentSection.content[0])}
            </h3>
          );
        } else if (currentSection.type === "list") {
          parsedContent.push(
            <ul
              key={`list-${parsedContent.length}`}
              className="list-disc pl-5 mb-2"
            >
              {currentSection.content.map((item, idx) => (
                <li key={idx}>{parseBoldAndText(item)}</li>
              ))}
            </ul>
          );
        } else if (currentSection.type === "text") {
          parsedContent.push(
            <p key={`text-${parsedContent.length}`} className="mb-2">
              {currentSection.content.map((line) => parseBoldAndText(line))}
            </p>
          );
        }
      }
    });

    return parsedContent;
  };

  return <div className="text-sm">{parseMarkdown(content)}</div>;
};
export default CustomMarkdown;
