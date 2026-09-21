import React, { useCallback, useMemo, useState } from "react";

import { toast } from "sonner";

import { InlineNotification, SkeletonText, Tag } from "@ally-ui-mono/ui-shared";
import { useDeleteWaPhoneMappingMutation, useGetWaPhoneMappingsQuery } from "@api";
import {
  ActionConfirmationPopup,
  EmptyState,
  EntityTable,
  EntityTableColumn,
  ListPagination,
  ListToolbar,
} from "@components";
import { en } from "@constants";
import { WaPhoneMapping } from "@types";
import { formatDate, formatRelativeTime } from "@utils";

import { PhoneMappingBulkPanel } from "./PhoneMappingBulkPanel";
import { PhoneMappingPanel } from "./PhoneMappingPanel";

const PAGE_SIZE = 25;

/**
 * Phone → organisation mappings, under User Management.
 *
 * This is the screen that makes the bot's refusal fixable. Documents are targeted per
 * organisation, so a number the bot cannot place gets no answer at all — and until this existed
 * the only way to place one was for it to happen to be on somebody's Ally profile, which no
 * screen could set.
 *
 * Numbers are shown IN FULL here, unlike the conversation log, which masks them to the last four
 * with an explicit reveal. The difference is what the number is: there it is observed traffic
 * from a worker, here it is reference data an admin typed and has to be able to recognise to
 * remove the right row.
 */
export const PhoneMappingsTab: React.FC = () => {
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [editing, setEditing] = useState<WaPhoneMapping | null>(null);
  const [removeTarget, setRemoveTarget] = useState<WaPhoneMapping | null>(null);

  const { data, isLoading, isFetching, isError } = useGetWaPhoneMappingsQuery({
    limit: PAGE_SIZE,
    offset,
    search: search.trim() || undefined,
  });
  const [deleteMapping] = useDeleteWaPhoneMappingMutation();

  const mappings = data?.mappings ?? [];
  const total = data?.count ?? 0;
  const isFiltered = search.trim().length > 0;

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setOffset(0);
  }, []);

  const handleRemoveConfirmed = useCallback(async () => {
    if (!removeTarget) return;
    try {
      await deleteMapping(removeTarget.id).unwrap();
      toast.success(en.whatsappBot.phoneMappings.removed);
    } catch {
      toast.error(en.whatsappBot.phoneMappings.saveFailed);
    } finally {
      setRemoveTarget(null);
    }
  }, [removeTarget, deleteMapping]);

  const columns: EntityTableColumn<WaPhoneMapping>[] = useMemo(
    () => [
      {
        key: "phone",
        label: en.whatsappBot.phoneMappings.columnPhone,
        render: mapping => (
          <span className="font-mono text-sm tabular-nums">{mapping.phoneE164}</span>
        ),
      },
      {
        key: "organisation",
        label: en.whatsappBot.phoneMappings.columnOrganisation,
        render: mapping => (
          <div className="flex flex-col gap-1">
            <span>{mapping.tenantName ?? mapping.tenantId}</span>
            {/* The mapping wins, and this says so rather than implying a broken state: an admin
                seeing two organisations against one number needs to know which one the bot
                actually uses. */}
            {mapping.conflictingTenantName && (
              <Tag
                type="blue"
                size="sm"
                title={en.whatsappBot.phoneMappings.conflictWarning(mapping.conflictingTenantName)}
              >
                {mapping.conflictingTenantName}
              </Tag>
            )}
          </div>
        ),
      },
      {
        key: "label",
        label: en.whatsappBot.phoneMappings.columnLabel,
        render: mapping =>
          mapping.label ? (
            <span className="text-typography-700">{mapping.label}</span>
          ) : (
            <span className="text-typography-400">—</span>
          ),
      },
      {
        key: "createdAt",
        label: en.whatsappBot.phoneMappings.columnAdded,
        render: mapping => (
          <span className="text-typography-600" title={formatDate(mapping.createdAt)}>
            {formatRelativeTime(mapping.createdAt)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-typography-600">{en.whatsappBot.phoneMappings.subtitle}</p>

      <ListToolbar
        searchValue={search}
        onSearchChange={handleSearchChange}
        placeholder={en.whatsappBot.phoneMappings.searchPlaceholder}
        action={{
          label: en.whatsappBot.phoneMappings.add,
          onClick: () => {
            setEditing(null);
            setIsPanelOpen(true);
          },
        }}
        secondaryAction={{
          label: en.whatsappBot.phoneMappings.bulkAdd,
          onClick: () => setIsBulkOpen(true),
        }}
      />

      {isError && (
        <InlineNotification
          kind="error"
          title={en.whatsappBot.phoneMappings.listError}
          subtitle={en.whatsappBot.phoneMappings.listErrorSubtitle}
          lowContrast
          hideCloseButton
        />
      )}

      {isLoading && !mappings.length && <SkeletonText paragraph lineCount={5} />}

      {!isLoading && !isError && mappings.length === 0 && (
        // Two empty states: an "add your first number" CTA under an active search reads as a bug.
        <EmptyState
          title={
            isFiltered
              ? en.whatsappBot.phoneMappings.emptyFiltered
              : en.whatsappBot.phoneMappings.empty
          }
          subtitle={
            isFiltered
              ? en.whatsappBot.phoneMappings.emptyFilteredSubtitle
              : en.whatsappBot.phoneMappings.emptySubtitle
          }
          actionLabel={en.whatsappBot.phoneMappings.add}
          hideActionButton={isFiltered}
          onAction={() => {
            setEditing(null);
            setIsPanelOpen(true);
          }}
        />
      )}

      {mappings.length > 0 && (
        <>
          <EntityTable
            columns={columns}
            rows={mappings}
            onEdit={mapping => {
              setEditing(mapping);
              setIsPanelOpen(true);
            }}
            onDelete={mapping => setRemoveTarget(mapping)}
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

      <PhoneMappingPanel
        isOpen={isPanelOpen}
        mapping={editing}
        onClose={() => {
          setIsPanelOpen(false);
          setEditing(null);
        }}
      />

      <PhoneMappingBulkPanel isOpen={isBulkOpen} onClose={() => setIsBulkOpen(false)} />

      {/* Says what removal actually does — the number may still resolve through its owner's
          profile, so "the bot will stop recognising it" would be a promise this cannot keep. */}
      <ActionConfirmationPopup
        isOpen={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        title={en.whatsappBot.phoneMappings.removeConfirmTitle}
        description={en.whatsappBot.phoneMappings.removeConfirmDescription}
        primaryButton={{
          label: en.whatsappBot.phoneMappings.remove,
          onClick: () => void handleRemoveConfirmed(),
        }}
        secondaryButton={{
          label: en.common.cancel,
          onClick: () => setRemoveTarget(null),
        }}
      />
    </div>
  );
};
