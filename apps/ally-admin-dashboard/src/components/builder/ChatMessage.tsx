import React from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { InlineLoading, InlineNotification, Tag, Tile } from "@ally-ui-mono/ui-shared";
import { en } from "@constants";
import { BuilderChatMessage, BuilderStructuredAnswer } from "@types";

import { BuilderAnswerPayload, QuestionCard } from "./QuestionCard";
import {
  builderTransition,
  prefersReducedMotion,
  staggerDelayMs,
} from "../../pages/Builder/builderMotion";
import { sharedMarkdownComponents } from "../markdown/markdownComponents";

/** Human-readable labels for the agent's tools — the raw names leak plumbing. */
const TOOL_LABELS: Record<string, string> = {
  ask_admin: "Asking you",
  update_prd: "Writing the PRD",
  github_search_code: "Searching the codebase",
  github_read_file: "Reading a file",
  github_repo_tree: "Looking through a repo",
  stacks_search: "Checking product guidance",
  stacks_get: "Reading product guidance",
  list_repo_commands: "Checking repo commands",
};

const toolLabel = (name: string) => TOOL_LABELS[name] ?? name;

interface ChatMessageProps {
  message: BuilderChatMessage;
  index: number;
  onAnswer: (payload: BuilderAnswerPayload) => void;
  disabled?: boolean;
}

/**
 * One row of the interview feed.
 *
 * Tool activity renders as chips above the bubble rather than as transcript
 * lines: what the agent looked at is worth seeing at a glance, but it is not
 * what the admin is here to read, and interleaving it with the prose buries
 * the question.
 */
export const ChatMessage: React.FC<ChatMessageProps> = ({ message, index, onAnswer, disabled }) => {
  if (message.question) {
    return (
      <QuestionCard
        question={message.question}
        answeredWith={message.answeredWith}
        answeredAnswer={message.answeredAnswer as BuilderStructuredAnswer | undefined}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    );
  }

  const entrance = prefersReducedMotion()
    ? undefined
    : {
        animation: `builderFadeIn ${240}ms both`,
        animationDelay: `${staggerDelayMs(index)}ms`,
        transition: builderTransition(["opacity"]),
      };

  if (message.role === "user") {
    return (
      <div className="flex justify-end" style={entrance}>
        <div className="max-w-[85%] rounded-lg bg-primary-600 px-3 py-2 text-sm text-white">
          {message.content}
        </div>
      </div>
    );
  }

  const hasBody = Boolean(message.content?.trim());

  return (
    <div className="flex flex-col items-start gap-1" style={entrance}>
      {message.toolNotes && message.toolNotes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {message.toolNotes.map((note, noteIndex) => (
            <Tag key={`${note}-${noteIndex}`} type="cool-gray" size="sm">
              {toolLabel(note)}
            </Tag>
          ))}
        </div>
      )}

      {(hasBody || message.isStreaming || message.interrupted) && (
        <Tile className="w-full max-w-[92%]">
          {hasBody ? (
            <div className="prose prose-sm max-w-none text-sm text-typography-900">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={sharedMarkdownComponents}>
                {message.content}
              </ReactMarkdown>
            </div>
          ) : message.isStreaming ? (
            <InlineLoading description={en.builder.chat.thinking} />
          ) : null}
          {message.interrupted && (
            <p className="mt-2 text-xs italic text-typography-500">Stopped.</p>
          )}
        </Tile>
      )}

      {message.error && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={message.error}
          className="w-full max-w-[92%]"
        />
      )}
    </div>
  );
};
