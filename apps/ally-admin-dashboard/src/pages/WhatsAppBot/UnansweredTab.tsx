import React, { useCallback, useMemo, useState } from "react";

import { Cancel, Chat, Document, Tick } from "@icons";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { CarbonDropdown, InlineNotification, SkeletonText, Tag } from "@ally-ui-mono/ui-shared";
import { useGetWaUnansweredQuery, useUpdateWaUnansweredMutation } from "@api";
import {
  EmptyState,
  EntityTable,
  EntityTableColumn,
  EntityTableSort,
  ListPagination,
} from "@components";
import { TooltipHint } from "@components/app-tooltip";
import { en, TooltipLocation } from "@constants";
import { WaUnansweredQuestion, WaUnansweredReason, WaUnansweredStatus } from "@types";
import { formatDate, formatRelativeTime } from "@utils";

import { UnansweredAnswerPanel } from "./UnansweredAnswerPanel";

const PAGE_SIZE = 25;

interface FilterItem {
  id: string;
  label: string;
}

/**
 * Reason colours carry the same distinction the copy does, so the queue is scannable without
 * reading every row: a threshold problem is tunable (blue), missing material is inert (grey), and a
 * failure is a fault to chase (red).
 */
const REASON_TAG_TYPE: Record<string, "gray" | "blue" | "red"> = {
  [WaUnansweredReason.NO_HITS]: "gray",
  [WaUnansweredReason.BELOW_THRESHOLD]: "blue",
  [WaUnansweredReason.MODEL_DECLINED]: "blue",
  [WaUnansweredReason.ERROR]: "red",
};

/**
 * The corpus-gap worklist.
 *
 * Only real gaps land here — `clarify` outcomes are excluded server-side, because a vague question
 * ("help with a client") is not evidence the corpus is missing anything, and mixing them in would
 * bury the questions that are.
 *
 * Each row shows WHY it failed and how close the corpus came, because the fix differs: a queue full
 * of `below_threshold` at 0.40 means the answer threshold is too strict, while a queue full of
 * `no_hits` means the material genuinely isn't there.
 */
export const UnansweredTab: React.FC = () => {
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<WaUnansweredStatus>(WaUnansweredStatus.OPEN);
  const [reason, setReason] = useState<WaUnansweredReason | "">("");
  const [answering, setAnswering] = useState<WaUnansweredQuestion | null>(null);
  const [sort, setSort] = useState<EntityTableSort>({ key: "createdAt", direction: "desc" });
  const [, setSearchParams] = useSearchParams();

  // The question text alone rarely says enough to judge a gap — what came before it in the thread
  // usually does. The row already carries its conversation id, so this is a link, not a search.
  const openThread = useCallback(
    (row: WaUnansweredQuestion) =>
      setSearchParams({ tab: "conversations", conversation: row.conversationId }),
    [setSearchParams],
  );

  const { data, isLoading, isFetching, isError } = useGetWaUnansweredQuery({
    limit: PAGE_SIZE,
    offset,
    status,
    reason: reason || undefined,
    sortBy: sort.key,
    sortDir: sort.direction,
  });
  const [updateQuestion] = useUpdateWaUnansweredMutation();

  // Built inside the component, not at module scope. A constants read at import time is the
  // documented way this app has broken unrelated test suites before — nine of them, when a barrel
  // helper ran on import — because a spec that mocks `@constants` wholesale throws before its first
  // assertion.
  const statusItems: FilterItem[] = useMemo(
    () =>
      Object.values(WaUnansweredStatus).map(value => ({
        id: value,
        label: en.whatsappBot.unanswered.status[value],
      })),
    [],
  );
  const reasonItems: FilterItem[] = useMemo(
    () => [
      { id: "", label: en.whatsappBot.unanswered.anyReason },
      ...Object.values(WaUnansweredReason).map(value => ({
        id: value,
        label: en.whatsappBot.unanswered.reason[value],
      })),
    ],
    [],
  );

  const questions = data?.questions ?? [];
  const isFiltered = status !== WaUnansweredStatus.OPEN || reason !== "";
  const total = data?.count ?? 0;

  const handleUpdate = useCallback(
    async (row: WaUnansweredQuestion, next: WaUnansweredStatus) => {
      try {
        await updateQuestion({ id: row.id, status: next }).unwrap();
        toast.success(en.whatsappBot.unanswered.updated);
      } catch {
        toast.error(en.whatsappBot.unanswered.updateFailed);
      }
    },
    [updateQuestion],
  );

  const columns: EntityTableColumn<WaUnansweredQuestion>[] = useMemo(
    () => [
      {
        key: "questionText",
        label: en.whatsappBot.unanswered.columnQuestion,
        className: "max-w-[420px]",
        render: row => (
          <div className="flex flex-col gap-1">
            <span className="text-typography-900">{row.questionText}</span>
            {row.language && <span className="text-xs text-typography-500">{row.language}</span>}
          </div>
        ),
      },
      {
        key: "reason",
        label: en.whatsappBot.unanswered.columnReason,
        render: row => (
          <Tag type={REASON_TAG_TYPE[row.reason] ?? "gray"} size="sm">
            {en.whatsappBot.unanswered.reason[row.reason] ?? row.reason}
          </Tag>
        ),
      },
      {
        key: "topSimilarity",
        label: en.whatsappBot.unanswered.columnScore,
        // Descending, this surfaces the questions the corpus very nearly answered — the cheapest
        // gaps to close, and the ones a threshold change would fix outright.
        sortKey: "topSimilarity",
        render: row => (
          // Both numbers. A 0.41 over four hits is a threshold decision; a null over zero hits is a
          // corpus decision. One number alone cannot tell those apart.
          <span className="text-typography-600 tabular-nums">
            {row.topSimilarity === null
              ? "—"
              : `${Number(row.topSimilarity).toFixed(2)} / ${row.hitCount}`}
          </span>
        ),
      },
      {
        key: "createdAt",
        label: en.whatsappBot.unanswered.columnAsked,
        sortKey: "createdAt",
        render: row => (
          <span className="text-typography-600" title={formatDate(row.createdAt)}>
            {formatRelativeTime(row.createdAt)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="pt-4">
      <p className="text-sm text-typography-600">{en.whatsappBot.unanswered.subtitle}</p>
      <p className="pt-1 pb-4 text-xs text-typography-500 flex items-center gap-1">
        {en.whatsappBot.unanswered.reasonHelp}
        {/* Renders nothing until a superadmin authors and enables the text under Manage Tooltips. */}
        <TooltipHint location={TooltipLocation.WA_UNANSWERED_REASON} />
        <TooltipHint location={TooltipLocation.WA_UNANSWERED_SCORE} />
      </p>

      <div className="flex items-end gap-4 pb-4">
        <CarbonDropdown
          id="wa-unanswered-status"
          size="sm"
          className="w-[200px]"
          titleText={en.whatsappBot.unanswered.statusFilter}
          label={en.whatsappBot.unanswered.statusFilter}
          items={statusItems}
          selectedItem={statusItems.find(item => item.id === status) ?? statusItems[0]}
          itemToString={(item: FilterItem | null) => item?.label ?? ""}
          onChange={({ selectedItem }: { selectedItem: FilterItem | null }) => {
            if (!selectedItem) return;
            setStatus(selectedItem.id as WaUnansweredStatus);
            setOffset(0);
          }}
        />

        <CarbonDropdown
          id="wa-unanswered-reason"
          size="sm"
          className="w-[240px]"
          titleText={en.whatsappBot.unanswered.columnReason}
          label={en.whatsappBot.unanswered.anyReason}
          items={reasonItems}
          selectedItem={reasonItems.find(item => item.id === reason) ?? reasonItems[0]}
          itemToString={(item: FilterItem | null) => item?.label ?? ""}
          onChange={({ selectedItem }: { selectedItem: FilterItem | null }) => {
            if (!selectedItem) return;
            setReason(selectedItem.id as WaUnansweredReason | "");
            setOffset(0);
          }}
        />

        {/* A way back to the default view. Without it an admin who filters to "dismissed · error"
            and finds nothing has to reason out which of two controls put them there. */}
        {isFiltered && (
          <button
            className="pb-2 text-sm text-primary-500 underline"
            onClick={() => {
              setStatus(WaUnansweredStatus.OPEN);
              setReason("");
              setOffset(0);
            }}
          >
            {en.whatsappBot.unanswered.clearFilters}
          </button>
        )}
      </div>

      {isError && (
        <InlineNotification
          kind="error"
          title={en.whatsappBot.unanswered.loadError}
          lowContrast
          hideCloseButton
        />
      )}

      {isLoading && !questions.length && (
        <div className="py-6">
          <SkeletonText paragraph lineCount={6} />
        </div>
      )}

      {!isLoading && !isError && questions.length === 0 && (
        <EmptyState
          title={en.whatsappBot.unanswered.empty}
          subtitle={en.whatsappBot.unanswered.emptySubtitle}
          hideActionButton
        />
      )}

      {questions.length > 0 && (
        <>
          <EntityTable
            columns={columns}
            rows={questions}
            sort={sort}
            onSortChange={next => {
              setSort(next);
              setOffset(0);
            }}
            actions={[
              {
                key: "answer",
                // The loop that matters: write the answer, and the next worker to ask gets it.
                label: en.whatsappBot.unanswered.markAnswered,
                icon: <Document size={18} />,
                onClick: row => setAnswering(row),
              },
              {
                key: "thread",
                label: en.whatsappBot.unanswered.viewThread,
                icon: <Chat size={18} />,
                onClick: openThread,
              },
              {
                key: "triage",
                label: en.whatsappBot.unanswered.markTriaged,
                icon: <Tick size={18} />,
                hidden: row => row.status !== WaUnansweredStatus.OPEN,
                onClick: row => void handleUpdate(row, WaUnansweredStatus.TRIAGED),
              },
              {
                key: "dismiss",
                // Dismissing is a legitimate answer, not a failure to act: some questions the bot
                // SHOULD decline, and marking that decision keeps the queue meaningful.
                label: en.whatsappBot.unanswered.dismiss,
                icon: <Cancel size={18} />,
                hidden: row =>
                  row.status === WaUnansweredStatus.DISMISSED ||
                  row.status === WaUnansweredStatus.ANSWERED,
                onClick: row => void handleUpdate(row, WaUnansweredStatus.DISMISSED),
              },
            ]}
          />

          <ListPagination
            offset={offset}
            pageSize={PAGE_SIZE}
            total={total}
            onChange={setOffset}
            isFetching={isFetching}
          />
        </>
      )}

      <UnansweredAnswerPanel question={answering} onClose={() => setAnswering(null)} />
    </div>
  );
};
