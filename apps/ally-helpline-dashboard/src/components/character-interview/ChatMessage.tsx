import React from "react";

import { InlineLoading, InlineNotification, Tag, Tile } from "@ally-ui-mono/ui-shared";
import { characterInterviewStrings as strings } from "@constants";
import { CharacterInterviewChatMessage } from "@types";

import { CharacterInterviewAnswerPayload, QuestionCard } from "./QuestionCard";

interface ChatMessageProps {
  message: CharacterInterviewChatMessage;
  onAnswerQuestion: (payload: CharacterInterviewAnswerPayload) => void;
  disabled?: boolean;
}

/**
 * One chat feed entry. User turns render as right-aligned bubbles; agent
 * turns render as plain text (the agent's visible commentary is one short
 * sentence per the interview prompt, so no markdown rendering is needed).
 * Structured `question` events render as an answer card instead of a bubble.
 */
export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onAnswerQuestion,
  disabled = false,
}) => {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-secondary-50 px-4 py-2.5">
          <p className="text-sm text-typography-900 whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  if (message.question) {
    return (
      <QuestionCard
        question={message.question}
        answeredWith={message.answeredWith}
        answeredAnswer={message.answeredAnswer}
        onAnswer={onAnswerQuestion}
        disabled={disabled}
      />
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] min-w-0">
        {message.toolNotes && message.toolNotes.length > 0 && (
          <div className="flex flex-col items-start gap-1 mb-1.5">
            {message.toolNotes.map((note, index) => (
              <Tag key={`${message.id}-tool-${index}`} type="cool-gray" size="sm">
                {note}
              </Tag>
            ))}
          </div>
        )}
        {message.content ? (
          <Tile className="rounded-2xl rounded-bl-sm">
            <p className="text-sm text-typography-900 whitespace-pre-wrap">{message.content}</p>
            {message.interrupted && (
              <span className="text-xs italic text-typography-500">{strings.interrupted}</span>
            )}
          </Tile>
        ) : message.streaming ? (
          <Tile className="rounded-2xl rounded-bl-sm">
            <InlineLoading description={strings.thinking} />
          </Tile>
        ) : null}
        {message.error && (
          <InlineNotification
            className="mt-1"
            kind="error"
            lowContrast
            hideCloseButton
            title={message.error}
          />
        )}
      </div>
    </div>
  );
};
