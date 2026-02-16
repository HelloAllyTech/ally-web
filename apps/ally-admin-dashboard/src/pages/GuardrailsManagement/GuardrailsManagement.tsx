import React, { useCallback, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import {
  useCreateGuardrailMutation,
  useGetGuardrailsQuery,
  useUpdateGuardrailMutation,
} from "@api";
import { Trash, Add } from "@assets";
import {
  NotionTable,
  ListToolbar,
  ActionConfirmationPopup,
  GuardrailSidePanel,
} from "@components";
import { ButtonVariant } from "@components/types";
import { SORT_BY, SORT_ORDER, en, GUARDRAILS_TABLE_COLUMNS } from "@constants";
import { UpdateConversationalGuardrailInput } from "@types";

// Define table columns locally or in constants


export const GuardrailsManagement: React.FC = () => {
  const limit = 30;
  const [offset, setOffset] = useState<number>(0);
  const [guardrails, setGuardrails] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(false);
  const [selectedGuardrails, setSelectedGuardrails] = useState<any[]>([]);
  const [selectedGuardrail, setSelectedGuardrail] = useState<any | null>(null);
  const [showDeleteConfirmationPopup, setShowDeleteConfirmationPopup] = useState<boolean>(false);

  // API Hooks
  const { data: guardrailsData, isFetching } = useGetGuardrailsQuery({
    search,
    limit,
    offset,
    sortBy: SORT_BY.CREATED_AT,
    order: SORT_ORDER.DESC as "ASC" | "DESC",
  });

  const [createGuardrail] = useCreateGuardrailMutation();
  const [updateGuardrail] = useUpdateGuardrailMutation();

  // Handle data updates
  useEffect(() => {
    const incoming = guardrailsData ?? [];
    setHasMore(incoming.length === limit);

    if (offset === 0) {
      setGuardrails(incoming);
    } else if (incoming.length > 0) {
      setGuardrails(prev => {
        const seen = new Set(prev.map(g => g.id));
        const merged = [...prev];
        for (const item of incoming) {
          if (!seen.has(item.id)) merged.push(item);
        }
        return merged;
      });
    }
  }, [guardrailsData, offset]);

  // Handlers
  const onSearchChange = (value: string) => {
    setSearch(value);
    setOffset(0);
  };

  const handleNewGuardrailClick = () => {
    // Open side panel with an empty guardrail template for creation
    setSelectedGuardrail({
      name: "",
      helperDialogue: "",
      actorDialogue: "",
      active: true,
    });
    setIsSidePanelOpen(true);
  };

  const handleCreateGuardrail = async (guardrail: any) => {
    try {
      const response = await createGuardrail(guardrail);
      if (response.error) {
        toast.error("Failed to create guardrail");
      } else {
        toast.success("Guardrail created successfully");
        setIsSidePanelOpen(false);
      }
    } catch {
      toast.error("Failed to create guardrail");
    }
  };

  const handleLoadMore = () => {
    if (isFetching || !hasMore) return;
    setOffset(prev => prev + limit);
  };

  const handleGuardrailSelect = (rowIndex: number) => {
    if (rowIndex !== null && guardrails?.length > 0) {
      setSelectedGuardrail(guardrails[rowIndex]);
      // If we implement a side panel for detailed editing/translations
      setIsSidePanelOpen(true);
    }
  };

  const handleSidePanelClose = () => {
    setIsSidePanelOpen(false);
    setSelectedGuardrail(null);
  };

  const handleUpdateTable = async (action: {
    columnId?: string;
    value?: any;
    rowIndex?: number;
    rowId?: string;
  }) => {
    const { columnId, value, rowId } = action;
    const item = guardrails.find(g => g.id === rowId);

    if (item && value !== undefined) {
      // If columnId is 'all', value is the full update object
      let updatePayload: UpdateConversationalGuardrailInput = {};

      if (columnId === "all") {
        updatePayload = value;
      } else {
        if (columnId === "name") updatePayload.name = value;
        if (columnId === "helperDialogue") updatePayload.helperDialogue = value;
        if (columnId === "actorDialogue") updatePayload.actorDialogue = value;
        if (columnId === "active") updatePayload.active = value;
      }

      try {
        const response: any = await updateGuardrail({ id: item.id, guardrail: updatePayload });
        if (response.error) {
          toast.error("Failed to update guardrail");
        }
        // else toast.success("Guardrail updated"); // Optional toast to avoid spam on typing
      } catch {
        toast.error("Failed to update guardrail");
      }
    }
  };

  const handleSelectionChange = useCallback((markedRows: any[]) => {
    setSelectedGuardrails(markedRows);
  }, []);

  const handleDeleteGuardrails = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      const results = await Promise.all(
        ids.map(id => updateGuardrail({ id, guardrail: { active: false } })),
      );
      const hasError = results.some((r: any) => r.error);

      if (hasError) {
        toast.error("Failed to delete some guardrails");
      } else {
        toast.success(`Successfully deleted ${ids.length} guardrail(s)`);
        setShowDeleteConfirmationPopup(false);
        setSelectedGuardrails([]);
        setIsSidePanelOpen(false);
        setSelectedGuardrail(null);
      }
    } catch {
      toast.error("Failed to delete guardrails");
    }
  };

  // Build Table Data
  const tableData = useMemo(() => {
    return {
      data: guardrails.map(g => ({
        id: { value: g.id, disabled: false, rowId: g.id },
        name: { value: g.name, disabled: false, rowId: g.id },
        helperDialogue: { value: g.helperDialogue, disabled: false, rowId: g.id },
        actorDialogue: { value: g.actorDialogue, disabled: false, rowId: g.id },
        active: { value: g.active, disabled: false, rowId: g.id },
        createdAt: {
          value: new Date(g.createdAt).toLocaleDateString(),
          disabled: true,
          rowId: g.id,
        },
      })),
      columns: GUARDRAILS_TABLE_COLUMNS,
    };
  }, [guardrails]);

  const listToolbarAction = useMemo(() => {
    return selectedGuardrails.length > 0
      ? {
          label: en.common.delete, // "Delete"
          variant: ButtonVariant.SECONDARY,
          icon: (
            <div className="w-3 h-3">
              <Trash />
            </div>
          ),
          onClick: () => setShowDeleteConfirmationPopup(true),
        }
      : {
          label: "Create new guardrail",
          variant: ButtonVariant.PRIMARY,
          icon: (
            <div className="w-5 h-5 flex items-center justify-center">
              <Add />
            </div>
          ),
          onClick: handleNewGuardrailClick,
        };
  }, [selectedGuardrails]); // handleNewGuardrailClick is stable or needs callback if dependencies change, but it's simpler here

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
        <h1 className="text-2xl text-typography-900 pb-6 font-secondary">
          Conversational Guardrails
        </h1>
        <ListToolbar
          searchValue={search}
          onSearchChange={onSearchChange}
          action={listToolbarAction}
        />
        <div className="flex flex-col gap-4 h-[calc(100vh-100px)] relative mt-[20px]">
          <NotionTable
            tableData={tableData}
            onRowChange={handleUpdateTable}
            onRowClick={handleGuardrailSelect}
            tableFooter={tableFooter}
            onSelectionChange={handleSelectionChange}
          />
        </div>

        <GuardrailSidePanel
          isOpen={isSidePanelOpen}
          onClose={handleSidePanelClose}
          selectedGuardrail={selectedGuardrail}
          onDelete={() => setShowDeleteConfirmationPopup(true)} // Or handle direct delete
          onUpdate={(id, updates) =>
            handleUpdateTable({ rowId: id, columnId: "all", value: updates })
          }
          onCreate={handleCreateGuardrail}
        />

        {showDeleteConfirmationPopup && (
          <ActionConfirmationPopup
            isOpen={showDeleteConfirmationPopup}
            onClose={() => setShowDeleteConfirmationPopup(false)}
            title={`Delete ${selectedGuardrails.length > 1 ? "guardrails" : "guardrail"}`}
            description={`Are you sure you want to delete ${selectedGuardrails.length} item(s)?`}
            primaryButton={{
              label: en.common.delete,
              onClick: () =>
                handleDeleteGuardrails(selectedGuardrails.map(g => g.id.value || g.id)),
              variant: ButtonVariant.DESTRUCTIVE,
            }}
            secondaryButton={{
              label: en.common.cancel,
              onClick: () => setShowDeleteConfirmationPopup(false),
              variant: ButtonVariant.SECONDARY,
            }}
          />
        )}
      </div>
    </div>
  );
};
