import React from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { en } from "@constants";
import { CopilotChatMessage } from "@src/types/roleplayStudio";

import { roleplayMarkdownComponents } from "../markdownComponents";
import { QuestionCard } from "./QuestionCard";
import { TestCaseSuggestionCard } from "./TestCaseSuggestionCard";

interface ChatMessageProps {
  message: CopilotChatMessage;
  onAnswerQuestion: (answer: string) => void;
  disabled?: boolean;
}

/**
 * One chat feed entry. User turns render as right-aligned bubbles; assistant
 * turns render markdown (gfm) with inline tool-activity notes. Structured
 * `question` events render as an answer card instead of a plain bubble.
 */
export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onAnswerQuestion,
  disabled = false,
}) => {
  const strings = en.roleplayStudio.copilot;
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
      <QuestionCard question={message.question} onAnswer={onAnswerQuestion} disabled={disabled} />
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] min-w-0">
        {message.toolNotes && message.toolNotes.length > 0 && (
          <div className="flex flex-col gap-1 mb-1.5">
            {message.toolNotes.map((note, index) => (
              <span
                key={`${message.id}-tool-${index}`}
                className="inline-flex w-fit items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-typography-700"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary-300" />
                {note}
              </span>
            ))}
          </div>
        )}
        {message.content ? (
          <div className="rounded-2xl rounded-bl-sm border border-border-light bg-white px-4 py-2.5">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={roleplayMarkdownComponents}>
              {message.content}
            </ReactMarkdown>
            {message.interrupted && (
              <span className="text-xs italic text-typography-500">{strings.interrupted}</span>
            )}
          </div>
        ) : message.streaming ? (
          <div className="rounded-2xl rounded-bl-sm border border-border-light bg-white px-4 py-2.5">
            <span className="flex items-center gap-2 text-xs text-typography-500">
              <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-dashed border-primary-300 border-t-transparent" />
              {strings.thinking}
            </span>
          </div>
        ) : null}
        {message.testCaseSuggestions && message.testCaseSuggestions.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            {message.testCaseSuggestions.map(suggestion => (
              <TestCaseSuggestionCard key={suggestion.id} suggestion={suggestion} />
            ))}
          </div>
        )}
        {message.error && <p className="mt-1 text-xs text-destructive-500">{message.error}</p>}
      </div>
    </div>
  );
};
