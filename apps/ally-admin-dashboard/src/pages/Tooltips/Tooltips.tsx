import React, { useState, useCallback, useEffect } from "react";

import { toast } from "sonner";

import { useGetTooltipsQuery, useCreateTooltipMutation, useUpdateTooltipMutation } from "@api";
import { NotionTable, ListToolbar, TooltipSidePanel } from "@components";
import { ButtonVariant } from "@components/types";
import { en, TOOLTIPS_TABLE_COLUMNS, SORT_BY, SORT_ORDER } from "@constants";
import { Tooltip } from "@types";
import { fromLocationSlug, toLocationSlug } from "@utils";

const LIMIT = 30;

export const TooltipManagement: React.FC = () => {
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedTooltip, setSelectedTooltip] = useState<Tooltip | null>(null);

  const { data, isFetching } = useGetTooltipsQuery({
    search: search || undefined,
    limit: LIMIT,
    offset,
    sortBy: SORT_BY.CREATED_AT,
    order: SORT_ORDER.DESC,
  });

  // Accumulate pages so "Load more" appends rather than replacing the list, and
  // derive hasMore from the last page size (an accumulated length can never tell
  // us whether more pages remain).
  const [tooltips, setTooltips] = useState<Tooltip[]>([]);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!data) return;
    setTooltips(prev => {
      if (offset === 0) return data;
      const byId = new Map(prev.map(tooltip => [tooltip.id, tooltip]));
      data.forEach(tooltip => byId.set(tooltip.id, tooltip));
      return Array.from(byId.values());
    });
    setHasMore(data.length >= LIMIT);
  }, [data, offset]);

  const [createTooltip] = useCreateTooltipMutation();
  const [updateTooltip] = useUpdateTooltipMutation();

  const formatTableData = tooltips.map(tooltip => ({
    ...tooltip,
    location: fromLocationSlug(tooltip.location),
    locationSlug: tooltip.location,
    createdAt: tooltip.createdAt ? new Date(tooltip.createdAt).toLocaleDateString() : "",
  }));

  const handleRowClick = useCallback(
    (rowIndex: number) => {
      setSelectedTooltip(tooltips[rowIndex]);
      setIsPanelOpen(true);
    },
    [tooltips],
  );

  const handlePanelClose = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedTooltip(null);
  }, []);

  const handleTooltipSave = useCallback(
    async (tooltipData: Partial<Tooltip>) => {
      if (selectedTooltip) {
        const response = await updateTooltip({
          id: selectedTooltip.id,
          data: {
            location: tooltipData.location ? toLocationSlug(tooltipData.location) : undefined,
            tipText: tooltipData.tipText,
            active: tooltipData.active,
          },
        });
        if (response.error) {
          const status = (response.error as any)?.status;
          if (status === 409) {
            toast.error(en.tooltip.locationAlreadyExists);
          } else {
            toast.error(en.errors.failedToUpdateTooltip);
          }
        } else {
          toast.success(en.tooltip.tooltipUpdated);
          handlePanelClose();
        }
      } else {
        const response = await createTooltip({
          location: toLocationSlug(tooltipData.location!),
          tipText: tooltipData.tipText!,
          active: tooltipData.active ?? false,
        });
        if (response.error) {
          const status = (response.error as any)?.status;
          if (status === 409) {
            toast.error(en.tooltip.locationAlreadyExists);
          } else {
            toast.error(en.errors.failedToCreateTooltip);
          }
        } else {
          toast.success(en.tooltip.tooltipCreated);
          handlePanelClose();
        }
      }
    },
    [selectedTooltip, createTooltip, updateTooltip, handlePanelClose],
  );

  const handleTableRowChange = useCallback(
    async ({ columnId, rowIndex, value }: { columnId: string; rowIndex: number; value: any }) => {
      const originalTooltip = tooltips[rowIndex];
      if (!originalTooltip) return;

      const response = await updateTooltip({
        id: originalTooltip.id,
        data: {
          location: columnId === "location" ? toLocationSlug(value) : originalTooltip.location,
          tipText: columnId === "tipText" ? value : originalTooltip.tipText,
          active: columnId === "active" ? value : originalTooltip.active,
        },
      });

      if (response.error) {
        toast.error(en.errors.failedToUpdateTooltip);
      } else {
        toast.success(en.tooltip.tooltipUpdated);
      }
    },
    [tooltips, updateTooltip],
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setOffset(0);
  }, []);

  const tableFooter = (
    <div className="flex justify-center py-4 text-sm text-typography-600">
      {isFetching ? (
        en.common.loading
      ) : hasMore ? (
        <button
          onClick={() => setOffset(prev => prev + LIMIT)}
          className="text-primary-600 hover:underline"
        >
          {en.common.loadMore}
        </button>
      ) : (
        en.common.noMoreData
      )}
    </div>
  );

  return (
    <div className="py-[2px] font-primary overflow-hidden relative">
      <div>
        <h1 className="text-2xl text-typography-900 pb-6 font-secondary">
          {en.tooltip.scenarioTooltips}
        </h1>
        <ListToolbar
          searchValue={search}
          onSearchChange={handleSearchChange}
          placeholder={en.tooltip.searchTooltips}
          action={{
            label: en.tooltip.createTooltip,
            onClick: () => {
              setSelectedTooltip(null);
              setIsPanelOpen(true);
            },
            variant: ButtonVariant.PRIMARY,
          }}
        />
        <div className="flex flex-col gap-4 h-[calc(100vh-100px)] relative mt-[20px]">
          <NotionTable
            tableData={{
              columns: TOOLTIPS_TABLE_COLUMNS,
              data: formatTableData,
            }}
            onRowClick={handleRowClick}
            onRowChange={handleTableRowChange}
            tableFooter={tableFooter}
            hideSelectionColumn
          />
        </div>
      </div>

      <TooltipSidePanel
        selectedTooltip={selectedTooltip}
        isOpen={isPanelOpen}
        onClose={handlePanelClose}
        onSave={handleTooltipSave}
      />
    </div>
  );
};
