import React, { useCallback, useMemo, useState } from "react";

import { ArrowDown, ArrowUp } from "@icons";
import { toast } from "sonner";

import { InlineNotification, SkeletonText, Tag, TextInput } from "@ally-ui-mono/ui-shared";
import {
  useArchiveWaTemplateMutation,
  useGetWaTemplatesQuery,
  useReorderWaTemplatesMutation,
  useTestWaTemplateMutation,
} from "@api";
import {
  ActionConfirmationPopup,
  Button,
  EmptyState,
  EntityTable,
  EntityTableColumn,
} from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { WaTemplate, WaTemplateKind, WaTemplateMatchType } from "@types";

import { TemplatePanel } from "./TemplatePanel";

/**
 * Carbon Tag types rather than a local colour map — same reason as the corpus status badge: a
 * hand-rolled palette drifts from the theme, and these chips sit in the same tables.
 *
 * Crisis is red because it is the one kind whose text an admin must never edit carelessly.
 */
const KIND_TAG_TYPE: Record<WaTemplateKind, "red" | "magenta" | "blue" | "gray"> = {
  [WaTemplateKind.CRISIS]: "red",
  [WaTemplateKind.CONSENT]: "magenta",
  [WaTemplateKind.COMMAND]: "blue",
  [WaTemplateKind.FAQ]: "gray",
};

/**
 * Keyword replies, listed in evaluation order.
 *
 * The list IS the order — the same (priority, createdAt) sort the matcher uses — because ordering
 * here is safety-critical and otherwise invisible: an admin cannot otherwise tell that a new FAQ
 * rule now swallows a phrase the crisis rule used to catch.
 *
 * Reordering is Up/Down buttons rather than drag-and-drop, deliberately. Drag-and-drop needs a
 * library, keyboard fallbacks and touch handling; two buttons plus a server-side renumber that keeps
 * each rule inside its own kind band gives the same result and cannot produce an ordering that moves
 * an FAQ rule ahead of a crisis rule.
 */
export const TemplatesTab: React.FC = () => {
  const { data, isLoading, isError } = useGetWaTemplatesQuery();
  const [archiveTemplate] = useArchiveWaTemplateMutation();
  const [reorderTemplates] = useReorderWaTemplatesMutation();
  const [testTemplate, { data: testResult, isLoading: isTesting, reset: resetTest }] =
    useTestWaTemplateMutation();

  const templates = data?.templates ?? [];

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editing, setEditing] = useState<WaTemplate | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<WaTemplate | null>(null);
  const [testText, setTestText] = useState("");

  const handleMove = useCallback(
    async (row: WaTemplate, direction: -1 | 1) => {
      // Reorder within the same KIND only. Swapping across bands would be meaningless — the server
      // renumbers per band, so a cross-band move would silently snap back.
      const sameKind = templates.filter(t => t.kind === row.kind);
      const index = sameKind.findIndex(t => t.id === row.id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= sameKind.length) return;

      const reordered = [...sameKind];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

      // Send the whole list with this kind's rules in their new order, so the server's per-band
      // renumber sees a complete picture.
      const ids = templates
        .filter(t => t.kind !== row.kind)
        .concat(reordered)
        .sort((a, b) => (a.kind === row.kind ? 0 : a.priority - b.priority))
        .map(t => t.id);

      try {
        await reorderTemplates(ids).unwrap();
      } catch {
        toast.error(en.whatsappBot.templates.saveFailed);
      }
    },
    [templates, reorderTemplates],
  );

  const handleArchiveConfirmed = useCallback(async () => {
    if (!archiveTarget) return;
    try {
      await archiveTemplate(archiveTarget.id).unwrap();
      toast.success(en.whatsappBot.templates.archived);
    } catch {
      // A 403 here is the mandatory-template guard, which is the most likely failure.
      toast.error(en.whatsappBot.templates.cannotDeactivate);
    } finally {
      setArchiveTarget(null);
    }
  }, [archiveTarget, archiveTemplate]);

  const columns: EntityTableColumn<WaTemplate>[] = useMemo(
    () => [
      {
        key: "name",
        label: en.whatsappBot.templates.columnName,
        render: row => (
          <div className="flex flex-col gap-1">
            <span className="font-medium flex items-center gap-2">
              {row.name}
              {row.mandatory && (
                <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] text-typography-600">
                  {en.whatsappBot.templates.requiredBadge}
                </span>
              )}
              {!row.active && (
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-typography-500">
                  OFF
                </span>
              )}
            </span>
            <span className="text-xs text-typography-500 line-clamp-1 max-w-[420px]">
              {row.responseText}
            </span>
          </div>
        ),
      },
      {
        key: "kind",
        label: en.whatsappBot.templates.columnKind,
        render: row => (
          <Tag type={KIND_TAG_TYPE[row.kind] ?? "gray"} size="sm">
            {en.whatsappBot.templates.kind[row.kind]}
          </Tag>
        ),
      },
      {
        key: "patterns",
        label: en.whatsappBot.templates.columnPatterns,
        render: row => (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-typography-400">
              {en.whatsappBot.templates.matchType[row.matchType]}
            </span>
            <span className="text-xs text-typography-700 max-w-[280px]">
              {row.patterns.slice(0, 4).join(", ")}
              {row.patterns.length > 4 ? ` +${row.patterns.length - 4}` : ""}
            </span>
          </div>
        ),
      },
      {
        key: "priority",
        label: en.whatsappBot.templates.columnOrder,
        render: row => <span className="text-typography-600">{row.priority}</span>,
      },
    ],
    [],
  );

  return (
    <div className="pt-4">
      <p className="text-sm text-typography-600 pb-4">{en.whatsappBot.templates.subtitle}</p>

      <div className="flex justify-end pb-3">
        <Button
          variant={ButtonVariant.PRIMARY}
          onClick={() => {
            setEditing(null);
            setIsPanelOpen(true);
          }}
        >
          {en.whatsappBot.templates.create}
        </Button>
      </div>

      {isError && (
        <InlineNotification
          kind="error"
          title={en.whatsappBot.templates.saveFailed}
          lowContrast
          hideCloseButton
        />
      )}

      {isLoading && (
        <div className="py-6">
          <SkeletonText paragraph lineCount={6} />
        </div>
      )}

      {!isLoading && !isError && templates.length === 0 && (
        <EmptyState
          title={en.whatsappBot.templates.empty}
          subtitle={en.whatsappBot.templates.emptySubtitle}
          actionLabel={en.whatsappBot.templates.create}
          onAction={() => {
            setEditing(null);
            setIsPanelOpen(true);
          }}
        />
      )}

      {templates.length > 0 && (
        <EntityTable
          columns={columns}
          rows={templates}
          rowClassName={row => (row.active ? "" : "opacity-60")}
          actions={[
            {
              key: "up",
              label: en.whatsappBot.templates.moveUp,
              icon: <ArrowUp size={16} />,
              onClick: row => void handleMove(row, -1),
            },
            {
              key: "down",
              label: en.whatsappBot.templates.moveDown,
              icon: <ArrowDown size={16} />,
              onClick: row => void handleMove(row, 1),
            },
          ]}
          onEdit={row => {
            setEditing(row);
            setIsPanelOpen(true);
          }}
          // A required safety rule has no Delete at all, rather than one that 403s.
          onDelete={row => (row.mandatory ? undefined : setArchiveTarget(row))}
        />
      )}

      {/* The tester lives on this tab because it answers the question the tab raises: "given the
          rules above, what happens to this message?" */}
      <section className="mt-8 border border-border-light rounded-md p-4 max-w-3xl">
        <h3 className="text-base text-typography-900 font-secondary pb-2">
          {en.whatsappBot.templates.tester}
        </h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <TextInput
              id="wa-template-test"
              labelText=""
              hideLabel
              value={testText}
              placeholder={en.whatsappBot.templates.testerPlaceholder}
              onChange={event => {
                setTestText(event.target.value);
                resetTest();
              }}
            />
          </div>
          <Button
            variant={ButtonVariant.SECONDARY}
            disabled={!testText.trim() || isTesting}
            onClick={() => void testTemplate({ text: testText.trim() })}
          >
            {en.whatsappBot.templates.testerRun}
          </Button>
        </div>

        {testResult && (
          <div className="pt-4 text-sm flex flex-col gap-2">
            <p className="text-xs text-typography-500">
              {en.whatsappBot.templates.testerNormalised}: “{testResult.normalisedText}”
            </p>

            {!testResult.matched ? (
              <p className="text-typography-700">{en.whatsappBot.templates.testerNoMatch}</p>
            ) : (
              <>
                <p className="text-typography-900">
                  {en.whatsappBot.templates.testerMatched}:{" "}
                  <strong>{testResult.template?.name}</strong>{" "}
                  <span className="text-xs text-typography-500">
                    ({en.whatsappBot.templates.kind[testResult.template!.kind]},{" "}
                    {testResult.template?.priority})
                  </span>
                </p>
                <div>
                  <p className="text-xs text-typography-500">
                    {en.whatsappBot.templates.testerReply}
                  </p>
                  <p className="whitespace-pre-wrap text-typography-900">{testResult.reply}</p>
                </div>
                <p className="text-xs text-typography-500">
                  {testResult.terminal
                    ? en.whatsappBot.templates.testerStops
                    : testResult.wouldReachRetrieval
                      ? en.whatsappBot.templates.testerReachesCorpus
                      : en.whatsappBot.templates.testerStops}
                </p>
              </>
            )}
          </div>
        )}
      </section>

      <TemplatePanel
        isOpen={isPanelOpen}
        template={editing}
        onClose={() => {
          setIsPanelOpen(false);
          setEditing(null);
        }}
      />

      <ActionConfirmationPopup
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        title={`Remove “${archiveTarget?.name ?? ""}”?`}
        description="The bot will stop using this reply. Messages that matched it will go to the corpus instead."
        primaryButton={{
          label: en.whatsappBot.templates.archived,
          onClick: () => void handleArchiveConfirmed(),
        }}
        secondaryButton={{ label: en.common.cancel, onClick: () => setArchiveTarget(null) }}
      />
    </div>
  );
};

/** Re-exported so the matcher's default is documented next to the UI that sets it. */
export const DEFAULT_MATCH_TYPE = WaTemplateMatchType.ANY_OF;
