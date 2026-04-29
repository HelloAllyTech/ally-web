import React, { useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { useGetTooltipsQuery, useCreateTooltipMutation, useUpdateTooltipMutation } from "@api";
import { NotionTable, ListToolbar, TooltipSidePanel } from "@components";
import { ButtonVariant } from "@components/types";
import { en, TOOLTIPS_TABLE_COLUMNS, SORT_BY, SORT_ORDER } from "@constants";
import { Tooltip } from "@types";

export const TooltipManagement: React.FC = () => {
  const limit = 30;
  const [offset, setOffset] = useState<number>(0);
  const [tooltips, setTooltips] = useState<Tooltip[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(false);
  const [selectedTooltip, setSelectedTooltip] = useState<Tooltip | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  const { data: tooltipsResponse, isFetching: isQueryFetching } = useGetTooltipsQuery({
    search: debouncedSearchQuery,
    limit,
    offset,
    sortBy: SORT_BY.CREATED_AT,
    order: SORT_ORDER.DESC,
  });

  useEffect(() => {
    setIsFetching(isQueryFetching);
  }, [isQueryFetching]);

  useEffect(() => {
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    searchDebounceTimer.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setOffset(0);
    }, 500);

    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, [searchQuery]);

  const [createTooltip] = useCreateTooltipMutation();
  const [updateTooltip] = useUpdateTooltipMutation();

  useEffect(() => {
    const incoming = tooltipsResponse;

    if (incoming) {
      setHasMore(incoming.length === limit);

      if (offset === 0) {
        setTooltips(incoming);
      } else {
        setTooltips(prev => {
          const seen = new Set(prev.map(t => t.id));
          const merged = [...prev];
          for (const item of incoming) {
            if (!seen.has(item.id)) merged.push(item);
          }
          return merged;
        });
      }
    }
  }, [tooltipsResponse, offset]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setOffset(0);
  };

  const handleNewTooltipClick = () => {
    setSelectedTooltip(null);
    setIsSidePanelOpen(true);
  };

  const handleTooltipSelect = (rowIndex: number) => {
    if (rowIndex !== null && tooltips?.length > 0) {
      setSelectedTooltip(tooltips[rowIndex]);
      setIsSidePanelOpen(true);
    }
  };

  const handleSidePanelClose = () => {
    setIsSidePanelOpen(false);
    setSelectedTooltip(null);
  };

  const handleTooltipSave = async (tooltipData: Partial<Tooltip>) => {
    try {
      if (selectedTooltip?.id) {
        const response = await updateTooltip({
          id: selectedTooltip.id,
          data: {
            location: tooltipData.location,
            tipText: tooltipData.tipText,
            icon: tooltipData.icon,
            active: tooltipData.active,
          },
        });
        if (response.error) {
          const err = response.error as { status?: number };
          toast.error(err.status === 409 ? en.tooltip.locationAlreadyExists : en.errors.failedToUpdateTooltip);
        } else {
          toast.success(en.tooltip.tooltipUpdated);
          handleSidePanelClose();
        }
      } else {
        const response = await createTooltip({
          location: tooltipData.location!,
          tipText: tooltipData.tipText!,
          icon: tooltipData.icon,
          active: tooltipData.active,
        });
        if (response.error) {
          const err = response.error as { status?: number };
          toast.error(err.status === 409 ? en.tooltip.locationAlreadyExists : en.errors.failedToCreateTooltip);
        } else {
          toast.success(en.tooltip.tooltipCreated);
          handleSidePanelClose();
        }
      }
    } catch {
      toast.error(
        selectedTooltip?.id ? en.errors.failedToUpdateTooltip : en.errors.failedToCreateTooltip,
      );
    }
  };

  const handleLoadMore = () => {
    if (isFetching || !hasMore) return;
    setOffset(prev => prev + limit);
  };

  const handleTableRowChange = async (action: any) => {
    const { columnId, rowIndex, value } = action;

    const originalTooltip = tooltips[rowIndex];
    if (!originalTooltip) return;

    setTooltips(prev => {
      const updated = [...prev];
      if (updated[rowIndex]) {
        updated[rowIndex] = { ...updated[rowIndex], [columnId]: value };
      }
      return updated;
    });

    try {
      const response = await updateTooltip({
        id: originalTooltip.id,
        data: {
          location: columnId === "location" ? value : originalTooltip.location,
          tipText: columnId === "tipText" ? value : originalTooltip.tipText,
          icon: columnId === "icon" ? value : originalTooltip.icon,
          active: columnId === "active" ? value : originalTooltip.active,
        },
      });

      if (response.error) {
        toast.error(en.errors.failedToUpdateTooltip);
        setTooltips(prev => {
          const updated = [...prev];
          if (updated[rowIndex]) updated[rowIndex] = originalTooltip;
          return updated;
        });
      } else {
        toast.success(en.tooltip.tooltipUpdated);
      }
    } catch {
      toast.error(en.errors.failedToUpdateTooltip);
      setTooltips(prev => {
        const updated = [...prev];
        if (updated[rowIndex]) updated[rowIndex] = originalTooltip;
        return updated;
      });
    }
  };

  const formatTableData = tooltips.map(tooltip => ({
    ...tooltip,
    createdAt: tooltip.createdAt ? new Date(tooltip.createdAt).toLocaleDateString() : "",
  }));

  const tableFooter = (
    <button
      type="button"
      onClick={handleLoadMore}
      className="flex justify-start items-center py-4 text-typography-700 hover:text-typography-900 disabled:opacity-50 w-[200px]"
      disabled={isFetching || !hasMore}
    >
      <span>+</span>
      <span className="text-base ml-[5px] font-primary">
        {isFetching ? en.common.loading : hasMore ? en.common.loadMore : en.common.noMoreData}
      </span>
    </button>
  );

  return (
    <div className="py-[2px] font-primary overflow-hidden relative">
      <div>
        <div className="flex items-center gap-3 pb-6">
          <h1 className="text-2xl text-typography-900 font-secondary">
            {en.tooltip.scenarioTooltips}
          </h1>
        </div>
        <ListToolbar
          searchValue={searchQuery}
          onSearchChange={handleSearchChange}
          placeholder={en.tooltip.searchTooltips}
          action={{
            label: en.tooltip.createTooltip,
            variant: ButtonVariant.PRIMARY,
            onClick: handleNewTooltipClick,
          }}
        />
        <div className="flex flex-col gap-4 h-[calc(100vh-100px)] relative mt-[20px]">
          <NotionTable
            tableData={{
              data: formatTableData,
              columns: TOOLTIPS_TABLE_COLUMNS,
            }}
            onRowChange={handleTableRowChange}
            onRowClick={handleTooltipSelect}
            onSelectionChange={() => {}}
            tableFooter={tableFooter}
          />
        </div>
      </div>
      {isSidePanelOpen && (
        <TooltipSidePanel
          selectedTooltip={selectedTooltip}
          isOpen={isSidePanelOpen}
          onClose={handleSidePanelClose}
          onSave={handleTooltipSave}
        />
      )}
    </div>
  );
};
