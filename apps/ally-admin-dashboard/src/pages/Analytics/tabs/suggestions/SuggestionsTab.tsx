import { useMemo, useState } from "react";

import { toast } from "sonner";

import {
  CarbonDropdown as Dropdown,
  InlineNotification,
  SkeletonPlaceholder,
} from "@ally-ui-mono/ui-shared";
import { useGetAnalyticsSuggestionsQuery, useGetRoadmapProductGoalsQuery } from "@api";
import { Button, EmptyState } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import {
  AnalyticsSuggestion,
  AnalyticsSuggestionStatus,
  AnalyticsSuggestionStatusFilter,
  GenerateAnalyticsSuggestionsResponse,
} from "@types";

import { AcceptSuggestionModal } from "./AcceptSuggestionModal";
import { GenerateSuggestionsModal } from "./GenerateSuggestionsModal";
import { RejectSuggestionDialog } from "./RejectSuggestionDialog";
import { SuggestionCard } from "./SuggestionCard";

const strings = en.analyticsSuggestions;

const STATUS_ITEMS: { id: AnalyticsSuggestionStatusFilter; label: string }[] = [
  { id: AnalyticsSuggestionStatus.PENDING, label: strings.statusPending },
  { id: AnalyticsSuggestionStatus.ACCEPTED, label: strings.statusAccepted },
  { id: AnalyticsSuggestionStatus.REJECTED, label: strings.statusRejected },
  { id: "all", label: strings.statusAll },
];

const fill = (template: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  );

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

/** One Generate run's worth of cards. */
interface Batch {
  batchId: string;
  windowLabel: string;
  generatedAt: string;
  suggestions: AnalyticsSuggestion[];
}

/**
 * Group the flat list into runs.
 *
 * The server returns rows newest-first with a run's rows adjacent, so grouping is a
 * fold over consecutive batch ids rather than a sort — which keeps the surface's
 * order identical to the server's and means a filtered view cannot silently
 * re-order batches.
 */
const groupIntoBatches = (items: AnalyticsSuggestion[]): Batch[] => {
  const batches: Batch[] = [];
  for (const suggestion of items) {
    const last = batches[batches.length - 1];
    if (last?.batchId === suggestion.batchId) {
      last.suggestions.push(suggestion);
      continue;
    }
    batches.push({
      batchId: suggestion.batchId,
      windowLabel: suggestion.window.label,
      generatedAt: suggestion.createdAt,
      suggestions: [suggestion],
    });
  }
  return batches;
};

/**
 * Analytics → Suggestions: what the platform's own data suggests building next.
 *
 * A review queue, not a dashboard. Generate reads one window of analytics and
 * drafts up to ten suggestions; each is accepted onto the product roadmap (through
 * an editable form, so a person owns what gets filed) or rejected with an optional
 * reason that later runs are told to respect.
 *
 * Batches ACCUMULATE rather than replacing each other, and every card carries the
 * window and model it came from. That is what makes two runs weeks apart
 * comparable — and why the range picker lives in the Generate dialog rather than at
 * the top of the page: the window is a property of a run that already happened, not
 * a filter over the queue. `uses.range: false` on the tab entry says the same thing.
 */
export const SuggestionsTab = () => {
  const [status, setStatus] = useState<AnalyticsSuggestionStatusFilter>(
    AnalyticsSuggestionStatus.PENDING,
  );
  const [generateOpen, setGenerateOpen] = useState(false);
  const [accepting, setAccepting] = useState<AnalyticsSuggestion | null>(null);
  const [rejecting, setRejecting] = useState<AnalyticsSuggestion | null>(null);
  /**
   * Sections the last run could not read. Kept until the next run so a reader
   * judging today's cards can see what the model was not shown — the API reports
   * this per run, not per suggestion.
   */
  const [unavailableSections, setUnavailableSections] = useState<string[]>([]);

  const { data, isLoading, isError, refetch } = useGetAnalyticsSuggestionsQuery({ status });
  // Goals are fetched once here and passed down, the same way ProductRoadmap's page
  // supplies its modals.
  const { data: goals } = useGetRoadmapProductGoalsQuery();

  const batches = useMemo(() => groupIntoBatches(data?.items ?? []), [data?.items]);

  const onGenerated = (result: GenerateAnalyticsSuggestionsResponse) => {
    setUnavailableSections(result.sections.failed);
    setGenerateOpen(false);
    // Zero is a real answer, so it gets its own message rather than a success
    // toast that would read as "it worked, but there is nothing here".
    if (result.suggestions.length === 0) {
      toast.message(strings.nothingProposed);
      return;
    }
    toast.success(fill(strings.generated, { count: result.suggestions.length }));
    // A fresh batch is pending, so make sure the reader is looking at pending.
    setStatus(AnalyticsSuggestionStatus.PENDING);
  };

  const selectedStatus = STATUS_ITEMS.find(item => item.id === status) ?? STATUS_ITEMS[0];
  const isEmpty = !isLoading && !isError && batches.length === 0;
  const isFiltered = status !== AnalyticsSuggestionStatus.PENDING;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 className="text-typography-primary text-lg">{strings.heading}</h3>
        <div className="flex items-end gap-3">
          <div className="w-56">
            <Dropdown
              id="suggestions-status"
              size="md"
              titleText={strings.statusFilterLabel}
              hideLabel
              label={strings.statusFilterLabel}
              items={STATUS_ITEMS}
              selectedItem={selectedStatus}
              itemToString={item => item?.label ?? ""}
              onChange={({ selectedItem }) => {
                if (selectedItem) setStatus(selectedItem.id);
              }}
            />
          </div>
          <Button variant={ButtonVariant.PRIMARY} onClick={() => setGenerateOpen(true)}>
            {strings.generate}
          </Button>
        </div>
      </div>

      {/* Named rather than omitted: a suggestion set drawn from an incomplete read
          is still usable, but only if the reader knows what was missing. */}
      {unavailableSections.length > 0 && (
        <InlineNotification
          kind="info"
          lowContrast
          onCloseButtonClick={() => setUnavailableSections([])}
          title={fill(strings.sectionsUnavailable, { count: unavailableSections.length })}
          subtitle={unavailableSections.join("; ")}
          className="max-w-full"
        />
      )}

      {isLoading && <SkeletonPlaceholder className="h-40 w-full" />}

      {/* Inline and persistent, not a toast: this is a failure the reader has to
          act on, and the retry has to still be there when they look for it. */}
      {isError && (
        <div className="flex flex-col items-start gap-2">
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title=""
            subtitle={strings.loadFailed}
            className="max-w-full"
          />
          <Button variant={ButtonVariant.SECONDARY} onClick={() => refetch()}>
            {strings.retry}
          </Button>
        </div>
      )}

      {isEmpty && (
        <EmptyState
          title={isFiltered ? strings.emptyFilteredTitle : strings.emptyTitle}
          subtitle={isFiltered ? strings.emptyFilteredSubtitle : strings.emptySubtitle}
          hideActionButton
        />
      )}

      {batches.map(batch => (
        <section key={batch.batchId} className="flex flex-col gap-3">
          <h4 className="text-typography-600 text-sm">
            {fill(strings.batchHeading, {
              window: batch.windowLabel,
              date: formatDate(batch.generatedAt),
            })}
          </h4>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {batch.suggestions.map(suggestion => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onAccept={setAccepting}
                onReject={setRejecting}
              />
            ))}
          </div>
        </section>
      ))}

      {generateOpen && (
        <GenerateSuggestionsModal
          onClose={() => setGenerateOpen(false)}
          onGenerated={onGenerated}
        />
      )}

      {accepting && (
        <AcceptSuggestionModal
          suggestion={accepting}
          goals={goals ?? []}
          onClose={() => setAccepting(null)}
          onAccepted={() => setAccepting(null)}
        />
      )}

      {rejecting && (
        <RejectSuggestionDialog
          suggestion={rejecting}
          onClose={() => setRejecting(null)}
          onRejected={() => setRejecting(null)}
        />
      )}
    </div>
  );
};
