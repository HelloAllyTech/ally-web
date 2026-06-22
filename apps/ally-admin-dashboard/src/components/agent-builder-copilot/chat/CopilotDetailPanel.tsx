import { FC, useEffect, useState } from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useLazyGetReportTranscriptQuery } from "@api";
import { en } from "@constants";
import { Close } from "@icons";

import { scoreColor } from "./scoreColor";

const copy = en.simulation.agentBuilder;
const PAGE_SIZE = 50;

interface TranscriptRow {
  id: number;
  role: string;
  content: string;
}

interface CopilotDetailPanelProps {
  reportId: string;
  reportMarkdown?: string;
  metrics?: Record<string, number>;
  score?: number | null;
  round?: number;
  onClose: () => void;
}

const humanizeMetric = (key: string): string =>
  key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

type DetailTab = "evaluation" | "transcript";

/**
 * Right-docked side panel showing the full detail behind a tested round: the
 * LLM-judge evaluation report (markdown + per-metric scores) and the practice
 * conversation transcript (lazily fetched + paginated by reportId).
 */
export const CopilotDetailPanel: FC<CopilotDetailPanelProps> = ({
  reportId,
  reportMarkdown,
  metrics,
  score,
  round,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<DetailTab>("evaluation");
  const [messages, setMessages] = useState<TranscriptRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [fetchTranscript, { isFetching }] = useLazyGetReportTranscriptQuery();

  const loadPage = async (offset: number) => {
    const res = await fetchTranscript({ reportId, limit: PAGE_SIZE, offset }).unwrap();
    setMessages(prev => (offset === 0 ? res.messages : [...prev, ...res.messages]));
    if (res.total != null) setTotal(res.total);
  };

  // Reset + fetch the first page whenever the report changes.
  useEffect(() => {
    setMessages([]);
    setTotal(null);
    void loadPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hasMore = total != null && messages.length < total;
  const metricEntries = metrics ? Object.entries(metrics) : [];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={onClose} />
      <aside className="flex h-full w-[50%] min-w-[640px] flex-col border-l border-border-light bg-white shadow-xl animate-slideInFromRight">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border-light px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-medium text-typography-900">
              {round != null ? `${copy.roundLabel(round)} — ${copy.detailPanelTitle}` : copy.detailPanelTitle}
            </h2>
            {score != null && (
              <span
                className="inline-flex h-6 min-w-[36px] items-center justify-center rounded-full px-2 text-xs font-semibold text-white"
                style={{ backgroundColor: scoreColor(score) }}
              >
                {score}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.closePanel}
            className="flex h-9 w-9 items-center justify-center rounded-md text-typography-500 hover:bg-neutral-100"
          >
            <Close size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-border-light px-6">
          {(["evaluation", "transcript"] as DetailTab[]).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`-mb-px border-b-2 py-3 text-sm transition-colors ${
                activeTab === tab
                  ? "border-primary-500 font-medium text-typography-900"
                  : "border-transparent text-typography-600 hover:text-typography-900"
              }`}
            >
              {tab === "evaluation" ? copy.detailTabEvaluation : copy.detailTabTranscript}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5">
          {activeTab === "evaluation" ? (
            <div className="flex flex-col gap-6">
              {metricEntries.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium text-typography-800">{copy.metricsLabel}</h3>
                  {metricEntries.map(([key, value]) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="w-48 shrink-0 text-xs text-typography-700">{humanizeMetric(key)}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: scoreColor(value) }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-xs font-semibold text-typography-800">{value}</span>
                    </div>
                  ))}
                </div>
              )}
              {reportMarkdown ? (
                <div className="prose prose-sm max-w-none text-typography-900">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportMarkdown}</ReactMarkdown>
                </div>
              ) : (
                <span className="text-sm text-typography-500">{copy.noEvaluationYet}</span>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.length === 0 && !isFetching && (
                <span className="text-sm text-typography-500">{copy.noTranscriptYet}</span>
              )}
              {messages.map(msg => {
                const isClient = msg.role?.toUpperCase().includes("CLIENT");
                return (
                  <div key={msg.id} className={`flex ${isClient ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        isClient
                          ? "bg-neutral-100 text-typography-900"
                          : "bg-primary-50 text-typography-900"
                      }`}
                    >
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-typography-500">
                        {msg.role}
                      </div>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              {isFetching && <span className="text-sm text-typography-500">{copy.loadingTranscript}</span>}
              {hasMore && !isFetching && (
                <button
                  type="button"
                  onClick={() => void loadPage(messages.length)}
                  className="self-center rounded-md border border-border-light px-4 py-2 text-sm text-typography-700 hover:bg-neutral-100"
                >
                  {copy.loadMore}
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
