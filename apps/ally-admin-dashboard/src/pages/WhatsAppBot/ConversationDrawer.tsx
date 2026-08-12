import React, { useEffect, useRef, useState } from "react";

import { DoubleArrowRight } from "@icons";

import { InlineNotification, SkeletonText, Tag } from "@ally-ui-mono/ui-shared";
import { useGetWaCitationQuery, useGetWaConversationQuery } from "@api";
import { TooltipHint } from "@components/app-tooltip";
import { en, TooltipLocation } from "@constants";
import { WaConversationMessage, WaHandledBy, WaPreviewCitation } from "@types";
import { formatDate, formatRelativeTime } from "@utils";

interface ConversationDrawerProps {
  /** Null closes the drawer; the query is skipped while it is null. */
  conversationId: string | null;
  onClose: () => void;
}

/**
 * Read-only thread viewer.
 *
 * Deliberately not `EntitySidePanel`: that shell has a Save button and an unsaved-changes guard, and
 * nothing in a conversation log is editable. A Save button that cannot save anything is worse than a
 * second, simpler shell.
 *
 * The point of this view is answering "why did the bot say that" — so each reply carries the
 * passages it cited, the similarity scores behind them, the query that was actually embedded (which
 * may be an English translation of what the worker typed), and the provider and model that ran.
 * Without the last one a behaviour change after an admin swaps models is unexplainable, because
 * `prompt_version` stays put.
 */
export const ConversationDrawer: React.FC<ConversationDrawerProps> = ({
  conversationId,
  onClose,
}) => {
  const { data, isLoading, isError } = useGetWaConversationQuery(conversationId ?? "", {
    skip: !conversationId,
  });
  const [openCitation, setOpenCitation] = useState<WaPreviewCitation | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape closes, and focus lands inside the drawer when it opens. Without both, a keyboard user
  // who opens a thread is stranded: tab order continues behind the overlay and there is no exit.
  useEffect(() => {
    if (!conversationId) return undefined;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // The citation popup is layered above the drawer, so Escape dismisses the top layer first
      // rather than closing everything and losing the reader's place in the thread.
      if (openCitation) setOpenCitation(null);
      else onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [conversationId, openCitation, onClose]);

  if (!conversationId) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop is presentational: the close affordance is the labelled button and the Escape key,
          both reachable from a keyboard. A click target that only a mouse can find is not a way out. */}
      <div className="flex-1 bg-black bg-opacity-50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wa-thread-title"
        className="w-[50%] min-w-[700px] bg-white shadow-xl border-l-[1px] border-border-light flex flex-col"
      >
        <div className="flex items-center justify-between p-6">
          <button
            ref={closeRef}
            onClick={onClose}
            className="flex flex-row items-center justify-center gap-2 text-typography-600 hover:text-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
          >
            <DoubleArrowRight width={14} height={14} />
            <span id="wa-thread-title" className="text-base font-tertiary font-[500]">
              {en.whatsappBot.conversations.threadHeading}
              {data?.contact ? ` · ••••${data.contact.phoneLast4}` : ""}
            </span>
          </button>
        </div>

        <div className="flex-1 min-h-0 px-10 pb-10 overflow-y-auto custom-scrollbar">
          {isLoading && <SkeletonText paragraph lineCount={8} />}

          {isError && (
            <InlineNotification
              kind="error"
              title={en.whatsappBot.conversations.loadError}
              lowContrast
              hideCloseButton
            />
          )}

          <div className="space-y-4">
            {data?.messages.map(message => (
              <MessageBubble key={message.id} message={message} onOpenCitation={setOpenCitation} />
            ))}
          </div>
        </div>
      </div>

      {openCitation && (
        <CitationPopup citation={openCitation} onClose={() => setOpenCitation(null)} />
      )}
    </div>
  );
};

/**
 * Outcome colours, so a thread is scannable without reading every label: a crisis reply is the one
 * an operator must never miss (red), a grounded answer is the good outcome (green), a decline is
 * neither a failure nor a success (blue), and the operational outcomes stay inert (grey).
 */
const HANDLED_BY_TAG_TYPE: Record<string, "red" | "green" | "blue" | "gray"> = {
  [WaHandledBy.CRISIS]: "red",
  [WaHandledBy.ERROR]: "red",
  [WaHandledBy.RAG]: "green",
  [WaHandledBy.DECLINED]: "blue",
  [WaHandledBy.CLARIFIED]: "blue",
  [WaHandledBy.TEMPLATE]: "gray",
  [WaHandledBy.CONSENT]: "gray",
  [WaHandledBy.RATE_LIMITED]: "gray",
  [WaHandledBy.UNSUPPORTED_MEDIA]: "gray",
};

const MessageBubble: React.FC<{
  message: WaConversationMessage;
  onOpenCitation: (citation: WaPreviewCitation) => void;
}> = ({ message, onOpenCitation }) => {
  const isInbound = message.direction === "inbound";
  const meta = message.retrievalMeta;

  return (
    <div className={`flex ${isInbound ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 text-sm ${
          isInbound ? "bg-neutral-100" : "bg-primary-50"
        }`}
      >
        <div className="flex items-center gap-2 pb-1 text-xs text-typography-500">
          <span>
            {isInbound ? en.whatsappBot.conversations.worker : en.whatsappBot.conversations.bot}
          </span>
          <span>·</span>
          <span title={formatDate(message.createdAt)}>{formatRelativeTime(message.createdAt)}</span>
          {message.language && <span>· {message.language}</span>}
          {message.handledBy && (
            <Tag type={HANDLED_BY_TAG_TYPE[message.handledBy] ?? "gray"} size="sm">
              {en.whatsappBot.conversations.handledBy[message.handledBy] ?? message.handledBy}
            </Tag>
          )}
          {/* Seconds, as on the usage dashboard. The same quantity shown as "1240 ms" here and
              "1.2s" there makes two screens look like they measure different things. */}
          {message.latencyMs !== null && <span>· {(message.latencyMs / 1000).toFixed(1)}s</span>}
        </div>

        <p className="whitespace-pre-wrap text-typography-900">{message.body}</p>

        {message.errorMessage && (
          // The server's reason verbatim. A generic "failed" makes a provider rejection
          // indistinguishable from a timeout, and those need different fixes.
          <p className="pt-2 text-xs text-red-700">{message.errorMessage}</p>
        )}

        {message.citations.length > 0 && (
          <div className="pt-3">
            <p className="text-xs font-medium text-typography-600">
              {en.whatsappBot.conversations.sources}
            </p>
            <ul className="pt-1 space-y-1">
              {message.citations.map(citation => (
                <li key={citation.chunk_id} className="text-xs text-typography-600">
                  <button
                    className="text-left underline hover:text-primary-600"
                    onClick={() => onOpenCitation(citation)}
                    title={en.whatsappBot.conversations.viewPassage}
                  >
                    [{citation.passage_number}] {citation.document_title}
                    {citation.page_from > 0 ? `, p. ${citation.page_from}` : ""}
                    {citation.section_path ? ` · ${citation.section_path}` : ""}
                  </button>{" "}
                  <span className="text-typography-400">{citation.similarity.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Shown for every RAG-handled reply including declines — a decline with hit_count 4 and a
            top similarity just under the threshold is a threshold problem, while one with hit_count 0
            is a corpus problem, and they are indistinguishable without these numbers. */}
        {meta &&
          (message.handledBy === WaHandledBy.RAG ||
            message.handledBy === WaHandledBy.DECLINED ||
            message.handledBy === WaHandledBy.CLARIFIED) && (
            <div className="pt-3 text-xs text-typography-500 space-y-0.5">
              <p className="flex items-center gap-1 font-medium text-typography-600">
                {en.whatsappBot.conversations.retrieval}
                {/* These numbers are the least self-explanatory thing on the screen, and the ones an
                    operator most often misreads — hence a tooltip a superadmin can author. */}
                <TooltipHint location={TooltipLocation.WA_RETRIEVAL_META} />
              </p>
              <p>
                hits {meta.hit_count} · top {Number(meta.top_similarity ?? 0).toFixed(2)} · used{" "}
                {meta.passages_used} · threshold {Number(meta.decline_similarity ?? 0).toFixed(2)}
              </p>
              {meta.translated_query && (
                // What was actually embedded, not what the worker typed. When a non-English question
                // declines, this is the first thing to read.
                <p className="italic">searched as: {meta.translated_query}</p>
              )}
              {(meta.provider || meta.model) && (
                <p>
                  {en.whatsappBot.conversations.modelUsed}: {meta.provider} / {meta.model}
                  {meta.prompt_version ? ` · ${meta.prompt_version}` : ""}
                </p>
              )}
              {meta.unsupported && (
                <p className="text-amber-700">{en.whatsappBot.testConsole.unsupportedWarning}</p>
              )}
            </div>
          )}
      </div>
    </div>
  );
};

/** Resolves a citation to the exact passage text that was quoted. */
const CitationPopup: React.FC<{
  citation: WaPreviewCitation;
  onClose: () => void;
}> = ({ citation, onClose }) => {
  const { data, isLoading, isError } = useGetWaCitationQuery(citation.chunk_id);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wa-passage-title"
        className="relative w-[600px] max-h-[70vh] overflow-y-auto custom-scrollbar rounded-lg bg-white p-6 shadow-xl"
      >
        <p id="wa-passage-title" className="text-base font-[500] text-typography-900">
          {en.whatsappBot.conversations.passageHeading}
        </p>
        <p className="pt-1 text-xs text-typography-500">
          {citation.document_title}
          {citation.page_from > 0 ? `, p. ${citation.page_from}` : ""}
          {citation.section_path ? ` · ${citation.section_path}` : ""}
        </p>

        {isLoading && (
          <div className="pt-4">
            <SkeletonText paragraph lineCount={5} />
          </div>
        )}
        {isError && (
          // A deleted document is a real, expected outcome here, so it gets its own sentence rather
          // than a bare "failed to load".
          <p className="pt-4 text-sm text-red-700">{en.whatsappBot.conversations.passageFailed}</p>
        )}
        {data && (
          <p className="pt-4 whitespace-pre-wrap text-sm text-typography-800">{data.text}</p>
        )}

        <button
          className="mt-6 rounded border border-border px-3 py-1 text-sm text-typography-700"
          onClick={onClose}
        >
          {en.whatsappBot.conversations.close}
        </button>
      </div>
    </div>
  );
};
