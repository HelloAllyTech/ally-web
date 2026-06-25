import { FC, ReactNode } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { useGetRoleplaySessionLogQuery } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { ROUTES } from "@constants";
import { formatDate } from "@utils";

/** Seconds offset -> "m:ss" for transcript turn timestamps. */
const formatOffset = (seconds: number | null): string => {
  if (seconds === null || seconds < 0) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

const formatDurationSeconds = (seconds: number | null): string => {
  if (seconds === null || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
};

const Field: FC<{ label: string; value: ReactNode }> = ({ label, value }) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs text-typography-700">{label}</span>
    <span className="text-sm text-typography-900">{value}</span>
  </div>
);

export const RoleplaySessionLogDetail: FC = () => {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useGetRoleplaySessionLogQuery(id, { skip: !id });

  const goBack = () => navigate(ROUTES.ROLEPLAY_SESSION_LOGS);

  if (isLoading) {
    return <p className="p-2 text-typography-700 font-primary">Loading…</p>;
  }
  if (isError || !data) {
    return (
      <div className="p-2 font-primary">
        <p className="text-destructive-500">Failed to load this roleplay session.</p>
        <Button variant={ButtonVariant.TEXT} onClick={goBack} className="mt-3 h-[40px] px-4">
          Back to logs
        </Button>
      </div>
    );
  }

  const summaryEntries = data.summary
    ? Object.entries(data.summary).filter(([, v]) => v !== null && v !== undefined)
    : [];

  return (
    <div className="h-full font-primary flex flex-col overflow-y-auto custom-scrollbar">
      <div className="shrink-0">
        <Button variant={ButtonVariant.TEXT} onClick={goBack} className="h-[36px] px-0">
          ← Back to logs
        </Button>
        <h1 className="text-2xl text-typography-900 font-secondary mt-2">
          {data.scenarioTitle || "Roleplay session"}
        </h1>
      </div>

      {/* Summary card */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 p-4 rounded-lg border border-border-light bg-white">
        <Field label="User" value={data.counselorName || "—"} />
        <Field label="Email" value={data.counselorEmail || "—"} />
        <Field label="Organization" value={data.orgName || "—"} />
        <Field label="Status" value={data.status === "ENDED" ? "Ended" : "In progress"} />
        <Field label="Started" value={data.startedAt ? formatDate(data.startedAt) : "—"} />
        <Field label="Ended" value={data.endedAt ? formatDate(data.endedAt) : "—"} />
        <Field label="Duration" value={formatDurationSeconds(data.durationSeconds)} />
        <Field label="Score" value={data.score === null ? "—" : Math.round(data.score)} />
        {data.platform && <Field label="Platform" value={data.platform} />}
      </div>

      {/* Events / score breakdown */}
      <section className="mt-6">
        <h2 className="text-lg font-secondary text-typography-900 mb-2">Events</h2>
        {data.events.length === 0 ? (
          <p className="text-sm text-typography-700">No events recorded for this session.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-light text-sm text-typography-700">
                <th className="py-2 pr-4 font-medium">Time</th>
                <th className="py-2 pr-4 font-medium">Event</th>
                <th className="py-2 pr-4 font-medium">Score</th>
                <th className="py-2 pr-4 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map(event => (
                <tr
                  key={event.id}
                  className="border-b border-border-light text-sm text-typography-900 align-top"
                >
                  <td className="py-2 pr-4 whitespace-nowrap text-typography-700">
                    {formatDate(event.occurredAt)}
                  </td>
                  <td className="py-2 pr-4">
                    {event.emoji ? `${event.emoji} ` : ""}
                    {event.eventName || event.eventId}
                  </td>
                  <td className="py-2 pr-4">{event.score ?? "—"}</td>
                  <td className="py-2 pr-4 text-typography-700">{event.message || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Transcript */}
      <section className="mt-6 pb-6">
        <h2 className="text-lg font-secondary text-typography-900 mb-2">Transcript</h2>
        {data.transcript.length === 0 ? (
          <p className="text-sm text-typography-700">No transcript available for this session.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {data.transcript.map(turn => {
              const isUser = turn.senderId === data.counselorId;
              return (
                <div
                  key={turn.id}
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    isUser
                      ? "self-end bg-primary-50 text-typography-900"
                      : "self-start bg-neutral-100 text-typography-900"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs text-typography-700 mb-1">
                    <span className="font-medium">{isUser ? "User" : "Ally"}</span>
                    {turn.startSeconds !== null && <span>{formatOffset(turn.startSeconds)}</span>}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{turn.content}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Raw summary (if any) */}
      {summaryEntries.length > 0 && (
        <section className="mt-2 pb-8">
          <h2 className="text-lg font-secondary text-typography-900 mb-2">Summary</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summaryEntries.map(([key, value]) => (
              <div key={key} className="flex flex-col gap-1">
                <dt className="text-xs text-typography-700">{key}</dt>
                <dd className="text-sm text-typography-900 whitespace-pre-wrap">
                  {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
};
