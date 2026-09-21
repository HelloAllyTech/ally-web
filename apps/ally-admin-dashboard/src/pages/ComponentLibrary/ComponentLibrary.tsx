import React, { useCallback, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import { useDeleteComponentTemplatesMutation, useGetComponentTemplatesQuery } from "@api";
import { Trash } from "@assets";
import { ActionConfirmationPopup, DropdownField, ListToolbar, NotionTable } from "@components";
import { ButtonVariant } from "@components/types";
import {
  COMPONENT_LIBRARY_SUPPORTED_TYPES,
  COMPONENT_LIBRARY_TABLE_COLUMNS,
  en,
  Permissions,
  TRACK_ITEM_TYPE_LABELS,
} from "@constants";
import { useUser } from "@hooks";
import { TrackComponentTemplate, TrackItemType } from "@types";
import { formatRelativeTime, hasPermissions } from "@utils";

import { ComponentLibrarySidePanel } from "./ComponentLibrarySidePanel";

const TYPE_FILTER_OPTIONS = [
  { value: "", label: en.componentLibrary.allTypes },
  ...COMPONENT_LIBRARY_SUPPORTED_TYPES.map(type => ({
    value: type,
    label: TRACK_ITEM_TYPE_LABELS[type],
  })),
];

/**
 * Standalone admin page for the global, cross-tenant Component Library —
 * modeled directly on CharacterLibrary: a NotionTable list with search + type
 * filter, a side panel for create/edit, and ActionConfirmationPopup-gated
 * single and multi-select bulk delete.
 *
 * No internal feature-toggle gate here: like CharacterLibrary, this page
 * relies entirely on the route's `requiredPermissions`/`requiredFeature`
 * (see RouteLayout.tsx) — there is no second, in-page check duplicating that
 * gate.
 */
export const ComponentLibrary: React.FC = () => {
  const limit = 30;

  const { permissions } = useUser();
  const canEdit = hasPermissions(permissions, [Permissions.EDIT_ADMIN_TRACK]);
  const canDelete = hasPermissions(permissions, [Permissions.DELETE_ADMIN_TRACK]);

  const [offset, setOffset] = useState<number>(0);
  const [templates, setTemplates] = useState<TrackComponentTemplate[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [search, setSearch] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<TrackItemType | "">("");
  const [selectedTemplates, setSelectedTemplates] = useState<any[]>([]);
  const [showDeleteConfirmationPopup, setShowDeleteConfirmationPopup] = useState<boolean>(false);
  const [showCreateTypePicker, setShowCreateTypePicker] = useState<boolean>(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TrackComponentTemplate | null>(null);
  const [createType, setCreateType] = useState<TrackItemType | null>(null);

  const { data: templatesData, isLoading } = useGetComponentTemplatesQuery({
    limit,
    offset,
    search,
    type: typeFilter || undefined,
  });

  const [deleteComponentTemplates] = useDeleteComponentTemplatesMutation();

  useEffect(() => {
    if (templatesData) {
      setTotal(templatesData.total);
      if (offset === 0) {
        setTemplates(templatesData.items);
      } else {
        setTemplates(prev => {
          const existingIds = new Set(prev.map(item => item.id));
          return [...prev, ...templatesData.items.filter(item => !existingIds.has(item.id))];
        });
      }
    }
  }, [templatesData, offset]);

  const hasMore = templates.length < total;

  const onSearchChange = (value: string) => {
    setSearch(value);
    setOffset(0);
  };

  const onTypeFilterChange = (value: string) => {
    setTypeFilter((value as TrackItemType) || "");
    setOffset(0);
    setTemplates([]);
  };

  const handleLoadMore = () => {
    if (isLoading || !hasMore) return;
    setOffset(prev => prev + limit);
  };

  const handleCreateClick = () => {
    setShowCreateTypePicker(prev => !prev);
  };

  const handlePickCreateType = (type: TrackItemType) => {
    setCreateType(type);
    setSelectedTemplate(null);
    setShowCreateTypePicker(false);
    setIsSidePanelOpen(true);
  };

  const handleTemplateSelect = (rowIndex: number) => {
    if (rowIndex !== null && templates?.length > 0) {
      setSelectedTemplate(templates[rowIndex]);
      setCreateType(null);
      setIsSidePanelOpen(true);
    }
  };

  const handleSidePanelClose = () => {
    setIsSidePanelOpen(false);
    setSelectedTemplate(null);
    setCreateType(null);
  };

  const handleDeleteTemplates = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      await deleteComponentTemplates({ ids }).unwrap();
      setTemplates(prev => prev.filter(item => !ids.includes(item.id)));
      toast.success(
        `${en.common.successfullyDeleted} ${ids.length} ${
          ids.length > 1 ? en.componentLibrary.templates : en.componentLibrary.template
        }`,
      );
      setShowDeleteConfirmationPopup(false);
      setSelectedTemplates([]);
    } catch {
      toast.error(en.componentLibrary.failedToDeleteTemplate);
    }
  };

  const handleDeleteFromPanel = async (templateId: string) => {
    try {
      await deleteComponentTemplates({ ids: [templateId] }).unwrap();
      setTemplates(prev => prev.filter(item => item.id !== templateId));
      toast.success(en.componentLibrary.templateDeletedSuccessfully);
    } catch {
      toast.error(en.componentLibrary.failedToDeleteTemplate);
    }
  };

  const createTemplateRow = useCallback(
    (template: TrackComponentTemplate) => ({
      id: { value: template.id, disabled: true, rowId: template.id },
      title: { value: template.title || "", disabled: true, rowId: template.id },
      type: { value: TRACK_ITEM_TYPE_LABELS[template.type], disabled: true, rowId: template.id },
      updatedAt: {
        value: formatRelativeTime(template.updatedAt),
        disabled: true,
        rowId: template.id,
      },
    }),
    [],
  );

  const tableData = useMemo(
    () => ({
      data: templates.map(createTemplateRow),
      columns: COMPONENT_LIBRARY_TABLE_COLUMNS,
    }),
    [templates, createTemplateRow],
  );

  const handleSelectionChange = useCallback((markedRows: any[]) => {
    setSelectedTemplates(markedRows);
  }, []);

  const tableFooter = (
    <button
      type="button"
      onClick={handleLoadMore}
      className="flex justify-start items-center py-4 text-typography-700 hover:text-typography-900 disabled:opacity-50 w-[200px]"
      disabled={isLoading || !hasMore}
    >
      <span>+</span>
      <span className="text-base ml-[5px] font-primary">
        {isLoading ? en.common.loading : hasMore ? en.common.loadMore : en.common.noMoreData}
      </span>
    </button>
  );

  const listToolbarAction = useMemo(() => {
    return canDelete && selectedTemplates.length > 0
      ? {
          label: en.common.delete,
          variant: ButtonVariant.SECONDARY,
          icon: (
            <div className="w-3 h-3">
              <Trash />
            </div>
          ),
          onClick: () => setShowDeleteConfirmationPopup(true),
        }
      : {
          label: en.componentLibrary.createTemplate,
          variant: ButtonVariant.PRIMARY,
          onClick: handleCreateClick,
        };
  }, [selectedTemplates, canDelete]);

  return (
    <div className="py-[2px] font-primary overflow-hidden relative">
      <div>
        <h1 className="text-2xl text-typography-900 pb-6 font-secondary">
          {en.componentLibrary.title}
        </h1>
        <div className="relative">
          <ListToolbar
            searchValue={search}
            onSearchChange={onSearchChange}
            placeholder={en.componentLibrary.searchPlaceholder}
            action={listToolbarAction}
            filter={
              <DropdownField
                id="component-library-type-filter"
                label="Type"
                options={TYPE_FILTER_OPTIONS}
                value={typeFilter}
                onChange={onTypeFilterChange}
                allowDeselect
                borderless
                placeholder={en.componentLibrary.allTypes}
              />
            }
          />
          {showCreateTypePicker && (
            <div className="absolute z-30 right-0 top-full mt-1 w-56 bg-white border border-border-light rounded-md shadow-lg p-2">
              {COMPONENT_LIBRARY_SUPPORTED_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handlePickCreateType(type)}
                  className="w-full text-left rounded-md px-2 py-2 text-sm hover:bg-secondary-50 text-typography-900"
                >
                  {TRACK_ITEM_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4 h-[calc(100vh-100px)] relative mt-[20px]">
          {templates.length === 0 && !isLoading ? (
            <p className="text-sm text-typography-500 px-2 py-6 text-center">
              {en.componentLibrary.emptyState}
            </p>
          ) : (
            <NotionTable
              tableData={tableData}
              onRowChange={undefined}
              onRowClick={canEdit ? handleTemplateSelect : undefined}
              rowClickTrigger="row"
              tableFooter={tableFooter}
              onSelectionChange={canDelete ? handleSelectionChange : undefined}
              hideSelectionColumn={!canDelete}
            />
          )}
        </div>
        {showDeleteConfirmationPopup && (
          <ActionConfirmationPopup
            isOpen={showDeleteConfirmationPopup}
            onClose={() => setShowDeleteConfirmationPopup(false)}
            title={`${en.common.delete} ${
              selectedTemplates.length > 1
                ? en.componentLibrary.templates
                : en.componentLibrary.template
            }`}
            description={`${en.common.areYouSureYouWantToDelete} ${selectedTemplates.length} ${
              selectedTemplates.length > 1
                ? en.componentLibrary.templates
                : en.componentLibrary.template
            }?`}
            primaryButton={{
              label: en.common.delete,
              onClick: () =>
                handleDeleteTemplates(selectedTemplates?.map(row => row.id?.value || row.id) || []),
              variant: ButtonVariant.DESTRUCTIVE,
            }}
            secondaryButton={{
              label: en.common.cancel,
              onClick: () => setShowDeleteConfirmationPopup(false),
              variant: ButtonVariant.SECONDARY,
            }}
          />
        )}
        {isSidePanelOpen && (createType || selectedTemplate) && (
          <ComponentLibrarySidePanel
            key={selectedTemplate?.id ?? `new-${createType}`}
            isOpen={isSidePanelOpen}
            type={selectedTemplate?.type ?? (createType as TrackItemType)}
            template={selectedTemplate}
            onClose={handleSidePanelClose}
            onDelete={handleDeleteFromPanel}
          />
        )}
      </div>
    </div>
  );
};
