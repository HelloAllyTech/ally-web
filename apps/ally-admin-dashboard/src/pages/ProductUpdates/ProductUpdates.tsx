import { FC, useState } from "react";

import { Edit } from "@icons";
import { toast } from "sonner";

import {
  Checkbox,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Toggle,
} from "@ally-ui-mono/ui-shared";
import {
  ProductUpdate,
  ProductUpdateAudience,
  ProductUpdateKind,
  ProductUpdateStatusFilter,
  ProductUpdateSurface,
  useUpdateProductUpdateMutation,
} from "@api";
import { Button, EmptyState } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { formatDate } from "@utils";

import { getAudienceOptions, getSurfaceOptions } from "./options";
import { ProductUpdatePanel } from "./ProductUpdatePanel";
import { StatusStrip } from "./StatusStrip";
import { useProductUpdates } from "./useProductUpdates";

const KIND_TAG_TYPE: Record<ProductUpdateKind, "blue" | "teal" | "purple"> = {
  new: "blue",
  improved: "teal",
  fixed: "purple",
};

/**
 * Public / Internal, switchable in the row without opening the panel. Saving it locks the
 * audience, so the automation never flips it back. Clicks and keys stay in the cell: they must
 * not also open the side panel.
 */
const AudienceCell: FC<{
  update: ProductUpdate;
  onChange: (update: ProductUpdate, audience: ProductUpdateAudience) => void;
}> = ({ update, onChange }) => {
  const t = en.productUpdates;
  const note = update.hidden
    ? t.audienceTag.hidden
    : update.audience === "public" && !update.liveAt
      ? t.audienceTag.waiting
      : null;
  return (
    <div
      className="flex flex-col gap-1"
      onClick={e => e.stopPropagation()}
      onKeyDown={e => e.stopPropagation()}
      role="presentation"
    >
      <Toggle
        // Uncontrolled: remount when the saved value changes (or a failed save reverts it).
        key={update.audience}
        label={t.audienceToggle.label(update.title)}
        hideLabel
        items={[
          { value: "public", label: t.audienceTag.public },
          { value: "internal", label: t.audienceTag.internal },
        ]}
        initialValue={update.audience}
        onChange={value => {
          if (value !== update.audience) onChange(update, value as ProductUpdateAudience);
        }}
      />
      {note && <span className="text-xs text-typography-700">{note}</span>}
    </div>
  );
};

export const ProductUpdates: FC = () => {
  const t = en.productUpdates;
  const {
    params,
    updates,
    total,
    isLoading,
    isFetching,
    isError,
    automation,
    isStatusError,
    running,
    searchInput,
    setSearchInput,
    status,
    onStatusChange,
    audience,
    onAudienceChange,
    surface,
    onSurfaceChange,
    showHidden,
    onShowHiddenChange,
    hasActiveFilters,
    clearFilters,
    canPrev,
    canNext,
    goPrev,
    goNext,
    rangeStart,
    rangeEnd,
  } = useProductUpdates();

  const [selected, setSelected] = useState<ProductUpdate | null>(null);
  const [saveUpdate] = useUpdateProductUpdateMutation();

  const changeAudience = async (update: ProductUpdate, value: ProductUpdateAudience) => {
    const result = await saveUpdate({
      id: update.id,
      data: { audience: value },
      listArgs: params,
    });
    if ("error" in result && result.error) {
      toast.error(t.toasts.audienceFailed);
      return;
    }
    toast.success(t.toasts.audienceSaved(t.audienceTag[value]));
  };

  return (
    <div className="h-full font-primary flex flex-col">
      <div className="shrink-0">
        <h1 className="text-2xl text-typography-900 font-secondary">{t.title}</h1>
        <p className="text-sm text-typography-700 mt-1 max-w-3xl">{t.description}</p>
      </div>

      <StatusStrip status={automation} running={running} isError={isStatusError} />

      {/* Filters: search + status / audience / surface + hidden toggle. */}
      <div className="flex flex-wrap items-end gap-3 mt-6 shrink-0">
        <div className="flex flex-col gap-1">
          <label htmlFor="product-updates-search" className="text-xs text-typography-700">
            {t.filters.search}
          </label>
          <input
            id="product-updates-search"
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder={t.filters.searchPlaceholder}
            className="w-[260px] rounded border border-border-light px-3 py-2 bg-white text-sm outline-none focus:border-primary-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="product-updates-status-filter" className="text-xs text-typography-700">
            {t.filters.status}
          </label>
          <Select
            id="product-updates-status-filter"
            labelText={t.filters.status}
            hideLabel
            value={status}
            onChange={e => onStatusChange(e.target.value as ProductUpdateStatusFilter | "")}
          >
            <SelectItem value="" text={t.filters.allStatuses} />
            <SelectItem value="live" text={t.statusOptions.live} />
            <SelectItem value="merged" text={t.statusOptions.merged} />
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="product-updates-audience-filter" className="text-xs text-typography-700">
            {t.filters.audience}
          </label>
          <Select
            id="product-updates-audience-filter"
            labelText={t.filters.audience}
            hideLabel
            value={audience}
            onChange={e => onAudienceChange(e.target.value as ProductUpdateAudience | "")}
          >
            <SelectItem value="" text={t.filters.allAudiences} />
            {getAudienceOptions().map(o => (
              <SelectItem key={o.value} value={o.value} text={o.label} />
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="product-updates-surface-filter" className="text-xs text-typography-700">
            {t.filters.surface}
          </label>
          <Select
            id="product-updates-surface-filter"
            labelText={t.filters.surface}
            hideLabel
            value={surface}
            onChange={e => onSurfaceChange(e.target.value as ProductUpdateSurface | "")}
          >
            <SelectItem value="" text={t.filters.allSurfaces} />
            {getSurfaceOptions().map(o => (
              <SelectItem key={o.value} value={o.value} text={o.label} />
            ))}
          </Select>
        </div>
        <div className="h-[40px] flex items-center">
          <Checkbox
            id="product-updates-show-hidden"
            labelText={t.filters.showHidden}
            checked={showHidden}
            onChange={(_event: unknown, { checked }: { checked: boolean }) =>
              onShowHiddenChange(checked)
            }
          />
        </div>
        {hasActiveFilters && (
          <Button variant={ButtonVariant.TEXT} onClick={clearFilters} className="h-[40px] px-4">
            {t.filters.clear}
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar mt-4">
        {isLoading ? (
          <p className="text-typography-700">{t.table.loading}</p>
        ) : isError ? (
          <p className="text-destructive-500">{t.table.loadFailed}</p>
        ) : updates.length === 0 ? (
          <EmptyState title={hasActiveFilters ? t.empty.filtered : t.empty.none} hideActionButton />
        ) : (
          <Table className="w-full text-left border-collapse">
            <TableHead>
              <TableRow className="border-b border-border-light text-sm text-typography-700">
                <TableHeader className="py-3 pr-4 font-medium">{t.columns.title}</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">{t.columns.audience}</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">{t.columns.surfaces}</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">{t.columns.live}</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">{t.columns.merges}</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {updates.map(update => (
                <TableRow
                  key={update.id}
                  tabIndex={0}
                  onClick={() => setSelected(update)}
                  onKeyDown={e => {
                    if (e.key === "Enter") setSelected(update);
                  }}
                  className="border-b border-border-light text-sm text-typography-900 align-top cursor-pointer hover:bg-background-secondary"
                >
                  <TableCell className="py-3 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{update.title}</span>
                      <Tag type={KIND_TAG_TYPE[update.kind]} size="sm">
                        {t.kindLabels[update.kind]}
                      </Tag>
                      {update.editedFields.length > 0 && (
                        <span
                          className="inline-flex items-center gap-1 text-xs text-typography-700"
                          title={t.table.editedTitle}
                        >
                          <Edit size={14} />
                          {t.table.edited}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 pr-4">
                    <AudienceCell update={update} onChange={changeAudience} />
                  </TableCell>
                  <TableCell className="py-3 pr-4">
                    {update.surfaces.map(s => t.surfaceLabels[s] ?? s).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="py-3 pr-4 whitespace-nowrap">
                    {update.liveAt ? formatDate(update.liveAt) : t.table.waiting}
                  </TableCell>
                  <TableCell className="py-3 pr-4">{update.sourceCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination footer. */}
      {updates.length > 0 && (
        <div className="flex items-center justify-between shrink-0 border-t border-border-light pt-3 mt-2">
          <span className="text-sm text-typography-700">
            {t.table.showing(rangeStart, rangeEnd, total)}
            {isFetching ? t.table.updating : ""}
          </span>
          <div className="flex gap-2">
            <Button
              variant={ButtonVariant.SECONDARY}
              onClick={goPrev}
              disabled={!canPrev}
              className="h-[36px] px-4"
            >
              {t.table.previous}
            </Button>
            <Button
              variant={ButtonVariant.SECONDARY}
              onClick={goNext}
              disabled={!canNext}
              className="h-[36px] px-4"
            >
              {t.table.next}
            </Button>
          </div>
        </div>
      )}

      <ProductUpdatePanel update={selected} onClose={() => setSelected(null)} />
    </div>
  );
};
