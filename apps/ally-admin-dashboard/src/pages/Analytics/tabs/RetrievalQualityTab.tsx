import { FC, useState } from "react";

import {
  InlineNotification,
  SkeletonText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
} from "@ally-ui-mono/ui-shared";
import { useGetRagQualityQuery } from "@api";
import { en } from "@constants";
import { RagFloorPoint, RagQualityResponse } from "@types";

import { AnalyticsTabFilters } from "../analyticsFilters";

/**
 * Corpus retrieval quality: what the LLM judge says about whether retrieval answered the
 * question it was asked.
 *
 * COUNTS LEAD, AND THERE IS NO CHART. Both are deliberate. The server sends counts because a
 * corpus can see a handful of retrievals a day and a percentage over six rows reads as
 * authoritative when it is noise; a trend line over that would read worse still. The floor
 * table is the deliverable here, not decoration — it is the artefact that replaces an argument
 * about what the similarity threshold "ought" to be with what each candidate would have cost.
 *
 * VOLUME IS NOT THE HEADLINE. Retrieval count is the one number here anybody can move without
 * improving anything — an operator probing thresholds in the preview doubles it in an
 * afternoon — so it appears only inside the per-consumer breakdown, where it is a segmentation
 * aid rather than a result.
 */

/** The floor the character corpus actually runs at, marked in the curve for orientation. */
const CURRENT_DEFAULT_FLOOR = 0.35;

const CONSUMERS: { id: string | undefined; label: string }[] = [
  { id: undefined, label: en.ragQuality.allConsumers },
  // The bot first: it is the platform's highest-volume retrieval path, and the one whose
  // floor has the least evidence behind it.
  { id: "whatsapp_bot", label: en.ragQuality.whatsappBot },
  { id: "interview_agent", label: en.ragQuality.interviewAgent },
  { id: "admin_preview", label: en.ragQuality.adminPreview },
];

const CORPORA: { id: string | undefined; label: string }[] = [
  { id: undefined, label: en.ragQuality.allCorpora },
  { id: "character_library", label: en.ragQuality.characterLibrary },
  { id: "whatsapp_qa", label: en.ragQuality.whatsappQa },
];

const count = (rows: { label: string; count: number }[], label: string) =>
  rows.find(r => r.label === label)?.count ?? 0;

/** A count, and a rate ONLY when the judged sample supports one. */
const CountStat: FC<{
  label: string;
  value: number;
  outOf?: number;
  suppressRate: boolean;
  tone?: "plain" | "warn";
}> = ({ label, value, outOf, suppressRate, tone = "plain" }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs text-typography-500">{label}</span>
    <span
      className={`text-xl font-secondary ${
        tone === "warn" && value > 0 ? "text-error-600" : "text-typography-900"
      }`}
    >
      {value}
      {outOf !== undefined && <span className="text-sm text-typography-500"> / {outOf}</span>}
    </span>
    {outOf !== undefined && outOf > 0 && !suppressRate && (
      <span className="text-xs text-typography-500">{Math.round((value / outOf) * 100)}%</span>
    )}
  </div>
);

const FloorRow: FC<{ point: RagFloorPoint; suppressRate: boolean }> = ({ point, suppressRate }) => {
  const isCurrent = Math.abs(point.floor - CURRENT_DEFAULT_FLOOR) < 0.0001;
  const precision =
    point.kept > 0 && !suppressRate ? `${Math.round((point.relevant / point.kept) * 100)}%` : "—";
  return (
    <TableRow data-testid={`rag-floor-${point.floor.toFixed(2)}`}>
      <TableCell>
        {point.floor.toFixed(2)}
        {isCurrent && (
          <span className="ml-2 text-xs text-primary-600">{en.ragQuality.currentFloor}</span>
        )}
      </TableCell>
      <TableCell>{point.kept}</TableCell>
      <TableCell>{point.relevant}</TableCell>
      <TableCell>{point.tangential}</TableCell>
      <TableCell>{point.irrelevant}</TableCell>
      <TableCell>{precision}</TableCell>
      {/* The column the floor argument turns on: what tightening to here would discard. */}
      <TableCell
        className={point.relevantLost > 0 ? "text-error-600" : undefined}
        data-testid={`rag-floor-lost-${point.floor.toFixed(2)}`}
      >
        {point.relevantLost}
      </TableCell>
    </TableRow>
  );
};

export const RetrievalQualityTab: FC<AnalyticsTabFilters> = ({ range }) => {
  const [consumer, setConsumer] = useState<string | undefined>(undefined);
  const [corpus, setCorpus] = useState<string | undefined>(undefined);
  const { data, isLoading, isError } = useGetRagQualityQuery({
    range,
    consumer,
    corpus,
  });

  if (isLoading) return <SkeletonText paragraph />;
  if (isError || !data) return <InlineNotification kind="error" title={en.ragQuality.failed} />;

  const d: RagQualityResponse = data;
  const suppress = d.coverage.belowReportingFloor;
  const judgedPassages = d.coverage.judgedPassages;

  return (
    <div className="flex flex-col gap-4" data-testid="rag-quality-tab">
      {/* Segmentation first, because reading these numbers pooled is the documented mistake:
          the preview is one operator probing thresholds, and chunk size and floor differ per
          corpus, so a similarity distribution across both describes neither. */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1">
          <span className="text-xs text-typography-500">{en.ragQuality.consumer}</span>
          {CONSUMERS.map(c => (
            <button
              key={c.label}
              type="button"
              onClick={() => setConsumer(c.id)}
              data-testid={`rag-consumer-${c.id ?? "all"}`}
              className={`rounded-full border px-2 py-0.5 text-xs ${
                consumer === c.id
                  ? "border-primary-500 text-primary-600 bg-primary-50"
                  : "border-border-200 text-typography-600"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-typography-500">{en.ragQuality.corpus}</span>
          {CORPORA.map(c => (
            <button
              key={c.label}
              type="button"
              onClick={() => setCorpus(c.id)}
              data-testid={`rag-corpus-${c.id ?? "all"}`}
              className={`rounded-full border px-2 py-0.5 text-xs ${
                corpus === c.id
                  ? "border-primary-500 text-primary-600 bg-primary-50"
                  : "border-border-200 text-typography-600"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Coverage before any number, so nobody reads a rate without knowing what it is over. */}
      {/* The testid sits on markup we own: InlineNotification is Carbon's, and whether it
          forwards unknown props is not a contract worth a test depending on. */}
      {suppress && (
        <div data-testid="rag-small-sample">
          <InlineNotification kind="info" title={en.ragQuality.smallSample} />
        </div>
      )}

      {d.judgeVersions.length > 1 && (
        <div data-testid="rag-mixed-judges">
          <InlineNotification kind="warning" title={en.ragQuality.mixedJudges} />
        </div>
      )}

      <Tile className="p-4">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
          <CountStat
            label={en.ragQuality.retrievalsJudged}
            value={d.coverage.judged}
            outOf={d.coverage.retrievals}
            suppressRate
          />
          <CountStat
            label={en.ragQuality.passagesLabelled}
            value={judgedPassages}
            outOf={d.coverage.passages}
            suppressRate
          />
          <CountStat
            label={en.ragQuality.answered}
            value={count(d.sufficiency, "sufficient")}
            outOf={d.coverage.judged}
            suppressRate={suppress}
          />
          <CountStat
            label={en.ragQuality.nothingUseful}
            value={count(d.sufficiency, "nothing_useful")}
            outOf={d.coverage.judged}
            suppressRate={suppress}
            tone="warn"
          />
          <CountStat
            label={en.ragQuality.superficial}
            value={d.superficialMatches}
            outOf={judgedPassages}
            suppressRate={suppress}
            tone="warn"
          />
        </div>
        <p className="mt-3 text-xs text-typography-500">{en.ragQuality.superficialHelp}</p>
      </Tile>

      <Tile className="p-4">
        <h3 className="text-sm text-typography-900 font-secondary">{en.ragQuality.floorTitle}</h3>
        <p className="mt-1 text-xs text-typography-500">{en.ragQuality.floorHelp}</p>
        <Table className="mt-3">
          <TableHead>
            <TableRow>
              <TableHeader>{en.ragQuality.floor}</TableHeader>
              <TableHeader>{en.ragQuality.kept}</TableHeader>
              <TableHeader>{en.ragQuality.relevant}</TableHeader>
              <TableHeader>{en.ragQuality.tangential}</TableHeader>
              <TableHeader>{en.ragQuality.irrelevant}</TableHeader>
              <TableHeader>{en.ragQuality.precision}</TableHeader>
              <TableHeader>{en.ragQuality.relevantLost}</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {d.floorCurve.map(point => (
              <FloorRow key={point.floor} point={point} suppressRate={suppress} />
            ))}
          </TableBody>
        </Table>
        <p className="mt-2 text-xs text-typography-500">{en.ragQuality.floorCaveat}</p>
      </Tile>

      <Tile className="p-4">
        <h3 className="text-sm text-typography-900 font-secondary">
          {en.ragQuality.consumerTitle}
        </h3>
        <Table className="mt-3">
          <TableHead>
            <TableRow>
              <TableHeader>{en.ragQuality.consumer}</TableHeader>
              <TableHeader>{en.ragQuality.retrievals}</TableHeader>
              <TableHeader>{en.ragQuality.judged}</TableHeader>
              <TableHeader>{en.ragQuality.returnedNothing}</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {d.byConsumer.map(row => (
              <TableRow key={row.consumer} data-testid={`rag-consumer-row-${row.consumer}`}>
                <TableCell>{row.consumer}</TableCell>
                <TableCell>{row.retrievals}</TableCell>
                <TableCell>{row.judged}</TableCell>
                <TableCell>{row.emptyRetrievals}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Tile>

      <Tile className="p-4">
        <h3 className="text-sm text-typography-900 font-secondary">{en.ragQuality.gapsTitle}</h3>
        <p className="mt-1 text-xs text-typography-500">{en.ragQuality.gapsHelp}</p>
        {d.gaps.length === 0 ? (
          <p className="mt-3 text-xs text-typography-500" data-testid="rag-no-gaps">
            {d.coverage.judged === 0 ? en.ragQuality.nothingJudged : en.ragQuality.noGaps}
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {d.gaps.map((gap, index) => (
              <li
                key={`${gap.occurredAt}-${index}`}
                data-testid="rag-gap"
                className="rounded border border-border-200 p-3"
              >
                <div className="flex items-baseline justify-between gap-3">
                  {/* A withheld query is SAID, not rendered blank. The WhatsApp bot's
                      queries are health workers' own questions and arrive as null from the
                      server; an empty line would read as a bug and invite someone to "fix"
                      the redaction. The judge's `missing` text below carries the useful half
                      regardless, and it is judge-authored rather than anyone's words. */}
                  {gap.query ? (
                    <span className="text-sm text-typography-900">{gap.query}</span>
                  ) : (
                    <span
                      className="text-sm italic text-typography-500"
                      data-testid="rag-gap-withheld"
                    >
                      {en.ragQuality.queryWithheld}
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-typography-500">
                    {gap.sufficiency} · {gap.returnedCount} {en.ragQuality.returned} ·{" "}
                    {en.ragQuality.atFloor} {gap.minSimilarity.toFixed(2)}
                  </span>
                </div>
                {/* The judge's own words. Without this, an empty retrieval is unreadable:
                    a corpus gap and a floor set too tight arrive as the same zero. */}
                {gap.missing && (
                  <p className="mt-1 text-xs text-typography-700">
                    {en.ragQuality.missingPrefix} {gap.missing}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Tile>
    </div>
  );
};

export default RetrievalQualityTab;
