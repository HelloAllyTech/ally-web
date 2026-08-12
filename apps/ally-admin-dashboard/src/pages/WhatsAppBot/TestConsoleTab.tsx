import React, { useState } from "react";

import { AutoExpandableTextarea, InlineNotification } from "@ally-ui-mono/ui-shared";
import { usePreviewWaAskMutation } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { WaPreviewResponse } from "@types";

/**
 * Ask a question and see the literal reply, its sources and the retrieval scores.
 *
 * The reason this exists rather than "just test it on WhatsApp": it is the only way to verify a
 * corpus, prompt or threshold change without a phone, a number and a real conversation — and it
 * writes nothing, so experimenting here cannot pollute the conversation log or file phantom gaps in
 * the unanswered queue.
 *
 * It shows the COMPOSED message (source lines, truncation and all), not the model's raw output,
 * because the composed text is what a worker actually receives.
 */
export const TestConsoleTab: React.FC = () => {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<WaPreviewResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [ask, { isLoading }] = usePreviewWaAskMutation();

  const handleAsk = async () => {
    if (!question.trim()) return;
    setFailed(false);
    try {
      setResult(await ask({ question: question.trim() }).unwrap());
    } catch {
      setResult(null);
      setFailed(true);
    }
  };

  const intentLabel = (intent: WaPreviewResponse["intent"]) =>
    intent === "answer"
      ? en.whatsappBot.testConsole.intentAnswer
      : intent === "clarify"
        ? en.whatsappBot.testConsole.intentClarify
        : en.whatsappBot.testConsole.intentDecline;

  const overLimit = result ? result.replyLength > 1600 : false;

  return (
    <div className="pt-4 flex flex-col gap-4">
      <p className="text-sm text-typography-600">{en.whatsappBot.testConsole.subtitle}</p>

      <div className="flex flex-col gap-2 max-w-3xl">
        <label className="text-sm text-typography-900">
          {en.whatsappBot.testConsole.questionLabel}
        </label>
        <AutoExpandableTextarea
          value={question}
          onChange={setQuestion}
          placeholder={en.whatsappBot.testConsole.questionPlaceholder}
          minHeight={90}
        />
        <div>
          <Button
            variant={ButtonVariant.PRIMARY}
            onClick={() => void handleAsk()}
            disabled={isLoading || !question.trim()}
          >
            {isLoading ? en.whatsappBot.testConsole.asking : en.whatsappBot.testConsole.ask}
          </Button>
        </div>
      </div>

      {failed && (
        <InlineNotification
          kind="error"
          title={en.whatsappBot.testConsole.failed}
          lowContrast
          hideCloseButton
        />
      )}

      {!result && !failed && (
        <p className="text-sm text-typography-500">{en.whatsappBot.testConsole.empty}</p>
      )}

      {result && (
        <div className="flex flex-col gap-5 max-w-3xl">
          <section className="border border-border-light rounded-md p-4">
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-sm font-medium text-typography-900">
                {en.whatsappBot.testConsole.replyHeading}
              </h3>
              <span className="text-xs text-typography-500 flex items-center gap-3">
                <span className="rounded bg-neutral-100 px-2 py-0.5">
                  {intentLabel(result.intent)}
                </span>
                <span className={overLimit ? "text-destructive-600" : ""}>
                  {result.replyLength} {en.whatsappBot.testConsole.charCount}
                  {overLimit ? ` — ${en.whatsappBot.testConsole.overLimit}` : ""}
                </span>
              </span>
            </div>
            {/* Pre-wrap: this is plain text destined for WhatsApp, and its line breaks are part of
                the message. Rendering it as HTML would collapse them and misrepresent the reply. */}
            <p className="whitespace-pre-wrap text-sm text-typography-900 font-primary">
              {result.reply}
            </p>
            {result.intent === "decline" && result.declineReason !== "none" && (
              <p className="text-xs text-typography-500 pt-2">
                {en.whatsappBot.testConsole.declineReason}: {result.declineReason}
              </p>
            )}
          </section>

          {result.retrieval?.unsupported && (
            <InlineNotification
              kind="warning"
              title={en.whatsappBot.testConsole.unsupportedWarning}
              lowContrast
              hideCloseButton
            />
          )}

          {result.citations.length > 0 && (
            <section>
              <h3 className="text-sm font-medium text-typography-900 pb-2">
                {en.whatsappBot.testConsole.sourcesHeading}
              </h3>
              <ul className="flex flex-col gap-1 text-sm text-typography-700">
                {result.citations.map(citation => (
                  <li key={citation.chunk_id} className="flex items-center gap-2">
                    <span>
                      {citation.document_title}
                      {citation.page_from
                        ? citation.page_to && citation.page_to !== citation.page_from
                          ? `, pp. ${citation.page_from}-${citation.page_to}`
                          : `, p. ${citation.page_from}`
                        : citation.section_path
                          ? `, ${citation.section_path}`
                          : ""}
                    </span>
                    <span className="text-xs text-typography-400">
                      {citation.similarity.toFixed(3)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <h3 className="col-span-2 text-sm font-medium text-typography-900">
              {en.whatsappBot.testConsole.retrievalHeading}
            </h3>
            <Row label={en.whatsappBot.testConsole.hitCount} value={result.retrieval.hit_count} />
            <Row
              label={en.whatsappBot.testConsole.topSimilarity}
              value={result.retrieval.top_similarity.toFixed(4)}
            />
            <Row
              label={en.whatsappBot.testConsole.passagesUsed}
              value={result.retrieval.passages_used}
            />
            <Row label={en.whatsappBot.testConsole.language} value={result.language} />
            {/* Surfaced because translation changes WHAT WAS SEARCHED. When an answer looks wrong,
                the first question is whether the restatement changed the question's meaning. */}
            <Row
              label={en.whatsappBot.testConsole.translatedQuery}
              value={result.retrieval.translated_query ?? en.whatsappBot.testConsole.notTranslated}
            />
          </section>

          <section className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <h3 className="col-span-2 text-sm font-medium text-typography-900">
              {en.whatsappBot.testConsole.modelHeading}
            </h3>
            {/* The model that ACTUALLY ran — dispatch falls back when a key is missing, so this can
                differ from what is configured. */}
            <Row label="Provider" value={result.provider || "—"} />
            <Row label="Model" value={result.model || "—"} />
            <Row label="Prompt" value={result.promptVersion || "—"} />
            <Row label={en.whatsappBot.testConsole.latency} value={`${result.latencyMs} ms`} />
          </section>
        </div>
      )}
    </div>
  );
};

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between border-b border-border-light py-1">
    <span className="text-typography-600">{label}</span>
    <span className="text-typography-900">{value}</span>
  </div>
);
