import { FC, useState, useEffect, useMemo, useCallback } from "react";

import { toast } from "sonner";

import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared/featureFlag";
import {
  useGetSummarySectionsQuery,
  useUpdateSummarySectionsMutation,
  useUpdateSummaryFieldsMutation,
} from "@api";
import { ArrowSolid } from "@assets";
import { ToggleSwitch, Accordion, Button } from "@components";
import { en } from "@constants";
import { ScribeSettingsItem, ScribeSettingsList } from "@types";

interface ScribeSettingsProps {
  tenantId: string;
}

const cloneFields = (fields: ScribeSettingsItem[]): ScribeSettingsItem[] =>
  fields.map(field => ({ ...field }));

const cloneSection = (section: ScribeSettingsList): ScribeSettingsList => ({
  ...section,
  fields: cloneFields(section.fields),
});

const ScribeSettingsSkeleton = () => {
  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0 w-3/4 mt-4 animate-pulse">
      <div className="h-5 bg-neutral-200 rounded w-40" />

      {[1, 2, 3].map(item => (
        <div key={item} className="border border-border-light rounded">
          <div className="flex flex-row justify-between items-center p-4">
            <div className="h-5 bg-neutral-200 rounded w-32" />
            <div className="flex flex-row gap-[18px] items-center">
              <div className="h-6 bg-neutral-200 rounded-full w-12" />
              <div className="h-4 bg-neutral-200 rounded w-16" />
            </div>
          </div>

          <div className="border-t border-border-light">
            {[1, 2].map(field => (
              <div key={field} className="px-4 pb-4 pt-2 border-t-[0.5px] border-border-light">
                <div className="flex flex-row justify-between">
                  <div className="h-4 bg-neutral-200 rounded w-24" />
                  <div className="flex flex-row gap-[18px] items-center">
                    <div className="h-6 bg-neutral-200 rounded-full w-12" />
                    <div className="h-4 bg-neutral-200 rounded w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const ScribeSettings: FC<ScribeSettingsProps> = ({ tenantId }) => {
  const { data: summarySectionsData, isLoading: isSummarySectionsLoading } =
    useGetSummarySectionsQuery(tenantId);
  const [updateSummarySections, { isLoading: isUpdatingSections }] =
    useUpdateSummarySectionsMutation();
  const [updateSummaryFields, { isLoading: isUpdatingFields }] = useUpdateSummaryFieldsMutation();

  const isUpdating = isUpdatingSections || isUpdatingFields;

  const [data, setData] = useState<ScribeSettingsList[]>([]);
  const [initialData, setInitialData] = useState<ScribeSettingsList[]>([]);

  const mergeSectionData = (
    newSections: ScribeSettingsList[],
    existingSections: ScribeSettingsList[],
  ): ScribeSettingsList[] => {
    if (existingSections.length === 0) return newSections;

    const existingFieldsMap = new Map(
      existingSections.flatMap(section =>
        section.fields.map(field => [`${section.id}-${field.id}`, field]),
      ),
    );

    return newSections.map(section => {
      const existingSection = existingSections.find(s => s.id === section.id);
      if (!existingSection) return section;

      return {
        ...section,
        enabled: section.enabled,
        fields: section.fields.map(field => {
          const existingField = existingFieldsMap.get(`${section.id}-${field.id}`);
          return existingField ? { ...field, visible: existingField.visible } : { ...field };
        }),
      };
    });
  };

  useEffect(() => {
    if (!summarySectionsData) return;

    const sections = summarySectionsData.sections ?? [];
    setData(prev => mergeSectionData(sections, prev));
    setInitialData(prev =>
      prev.length === 0 ? sections.map(cloneSection) : mergeSectionData(sections, prev),
    );
  }, [summarySectionsData]);

  const updateItemEnabled = (prev: ScribeSettingsList[], itemId: string, enabled: boolean) =>
    prev.map(item => (item.id === itemId ? { ...item, enabled } : item));

  const handleParentToggle = useCallback(
    (itemId: string, enabled: boolean) => {
      const originalItem = initialData.find(item => item.id === itemId);
      const originalEnabled = originalItem?.enabled ?? false;

      setData(prev => {
        const updated = updateItemEnabled(prev, itemId, enabled);
        const hiddenSections = updated
          .filter(section => !section.enabled)
          .map(section => section.id);

        updateSummarySections({ tenantId, hiddenSections })
          .unwrap()
          .then(() => {
            setInitialData(prev => updateItemEnabled(prev, itemId, enabled));
          })
          .catch(error => {
            setData(prev => updateItemEnabled(prev, itemId, originalEnabled));
            setInitialData(prev => updateItemEnabled(prev, itemId, originalEnabled));
            const errorMessage =
              error instanceof Error
                ? error.message
                : en.userManagement.failedToUpdateScribeSettings;
            toast.error(errorMessage);
          });

        return updated;
      });
    },
    [tenantId, updateSummarySections, initialData],
  );

  const handleChildToggle = useCallback((parentId: string, childId: string, enabled: boolean) => {
    setData(prev =>
      prev.map(item => {
        if (item.id !== parentId) return item;

        const updatedFields = item.fields.map(field =>
          field.id === childId ? { ...field, visible: enabled } : field,
        );

        return {
          ...item,
          enabled: updatedFields.some(field => field.visible) ? item.enabled : false,
          fields: updatedFields,
        };
      }),
    );
  }, []);

  const dataMap = useMemo(() => {
    return new Map(data.map(item => [item.id, item]));
  }, [data]);

  const initialDataMap = useMemo(() => {
    return new Map(initialData.map(item => [item.id, item]));
  }, [initialData]);

  const isAnyChildEnabled = useCallback(
    (parentId: string) => {
      const item = dataMap.get(parentId);
      return item?.fields.some(child => child.visible) ?? false;
    },
    [dataMap],
  );

  const itemsAreEqual = (item1: ScribeSettingsList, item2: ScribeSettingsList): boolean => {
    if (
      item1.id !== item2.id ||
      item1.enabled !== item2.enabled ||
      item1.fields.length !== item2.fields.length
    ) {
      return false;
    }

    const fields2Map = new Map(item2.fields.map(f => [f.id, f.visible]));
    return item1.fields.every(field => fields2Map.get(field.id) === field.visible);
  };

  const hasItemChanged = useCallback(
    (itemId: string) => {
      const currentItem = dataMap.get(itemId);
      const originalItem = initialDataMap.get(itemId);
      if (!currentItem || !originalItem) return false;
      return !itemsAreEqual(currentItem, originalItem);
    },
    [dataMap, initialDataMap, itemsAreEqual],
  );

  const buildHiddenFields = useCallback(
    (currentItem: ScribeSettingsList, itemId: string): string[] => {
      const hiddenFieldsFromCurrentItem = currentItem.fields
        .filter(field => !field.visible)
        .map(field => field.id);

      const hiddenFieldsFromOtherSections = initialData
        .filter(section => section.id !== itemId)
        .flatMap(section => section.fields.filter(field => !field.visible).map(field => field.id));

      return [...hiddenFieldsFromCurrentItem, ...hiddenFieldsFromOtherSections];
    },
    [initialData],
  );

  const handleSave = useCallback(
    async (itemId: string) => {
      const currentItem = dataMap.get(itemId);
      const originalItem = initialDataMap.get(itemId);
      if (!currentItem || !originalItem) return;

      const clonedOriginalItem = cloneSection(originalItem);
      const clonedCurrentItem = cloneSection(currentItem);

      const allFieldsUnselected = currentItem.fields.every(field => !field.visible);
      const shouldDisableParent = allFieldsUnselected && currentItem.enabled === false;

      setInitialData(prev =>
        prev.map(prevItem => (prevItem.id === itemId ? clonedCurrentItem : prevItem)),
      );

      const hiddenFields = buildHiddenFields(currentItem, itemId);

      try {
        await updateSummaryFields({ tenantId, hiddenFields }).unwrap();

        // If all fields are unselected, also disable the parent section via toggle API
        if (shouldDisableParent) {
          // Get all sections from initialData (saved state) and include current section as disabled
          const hiddenSections = initialData
            .filter(section => !section.enabled || section.id === itemId)
            .map(section => section.id);

          await updateSummarySections({ tenantId, hiddenSections }).unwrap();
          setInitialData(prev =>
            prev.map(prevItem =>
              prevItem.id === itemId ? { ...prevItem, enabled: false } : prevItem,
            ),
          );
        }
      } catch (error) {
        setInitialData(prev =>
          prev.map(prevItem => (prevItem.id === itemId ? clonedOriginalItem : prevItem)),
        );
        const errorMessage =
          error instanceof Error ? error.message : en.userManagement.failedToUpdateScribeSettings;
        toast.error(errorMessage);
      }
    },
    [
      dataMap,
      initialDataMap,
      tenantId,
      updateSummaryFields,
      updateSummarySections,
      buildHiddenFields,
    ],
  );

  const handleCancel = useCallback(
    (itemId: string) => {
      const originalItem = initialDataMap.get(itemId);
      if (!originalItem) return;

      const clonedOriginalItem = cloneSection(originalItem);
      setData(prev =>
        prev.map(prevItem => (prevItem.id === itemId ? clonedOriginalItem : prevItem)),
      );
    },
    [initialDataMap],
  );

  const renderScribeSettingsListData = useCallback(
    (field: ScribeSettingsItem, parentId: string) => {
      return (
        <label key={field.id} className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            onChange={() => handleChildToggle(parentId, field.id, !field.visible)}
            checked={field.visible}
            className="w-4 h-4 border border-[#D2D2D2] rounded cursor-pointer"
          />
          <span className="text-base leading-relaxed text-typography-900 font-normal">
            {field.label}
          </span>
        </label>
      );
    },
    [handleChildToggle],
  );

  const updateSectionFields = (itemId: string, visible: boolean) => {
    setData(prev =>
      prev.map(item =>
        item.id === itemId
          ? {
              ...item,
              enabled: item.enabled, // Preserve the current enabled state
              fields: item.fields.map(field => ({ ...field, visible })),
            }
          : item,
      ),
    );
  };

  const handleClearAll = (itemId: string) => {
    setData(prev =>
      prev.map(item =>
        item.id === itemId
          ? {
              ...item,
              enabled: false,
              fields: item.fields.map(field => ({ ...field, visible: false })),
            }
          : item,
      ),
    );
  };

  const handleSelectAll = (itemId: string) => {
    updateSectionFields(itemId, true);
  };

  const renderScribeSettingsListItem = useCallback(
    (item: ScribeSettingsList) => {
      const hasEnabledChild = isAnyChildEnabled(item.id);
      const selectedCount = item.fields.filter(field => field.visible).length;
      const totalCount = item.fields.length;
      const isChanged = hasItemChanged(item.id);

      const headerActions = (
        <>
          <div className={!hasEnabledChild ? "cursor-not-allowed" : ""}>
            <div className={!hasEnabledChild ? "pointer-events-none opacity-50" : ""}>
              <ToggleSwitch
                enabled={item.enabled}
                onChange={
                  hasEnabledChild ? enabled => handleParentToggle(item.id, enabled) : undefined
                }
                label={item.label}
              />
            </div>
          </div>
          <span className="text-sm text-typography-900 font-normal">
            {item.enabled ? en.userManagement.enabled : en.userManagement.disabled}
          </span>
        </>
      );

      return (
        <Accordion
          key={item.id}
          title={item.label}
          headerActions={headerActions}
          expandIcon={<ArrowSolid />}
        >
          <div className="mx-1 py-2 border-t-[0.5px] border-border-light flex flex-col gap-2 px-2.5">
            <div className="text-sm text-typography-900 font-normal flex flex-row justify-between items-center">
              <span className="text-typography-900 font-normal text-base">
                {en.userManagement.selectedCount(selectedCount, totalCount)}
              </span>
              <div className="flex flex-row gap-4">
                <div
                  className="text-primary-500 font-normal text-xs font-primary cursor-pointer"
                  onClick={() => handleClearAll(item.id)}
                >
                  {en.userManagement.clearAll}
                </div>
                <div
                  className="text-primary-500 font-normal text-xs font-primary cursor-pointer"
                  onClick={() => handleSelectAll(item.id)}
                >
                  {en.userManagement.selectAll}
                </div>
              </div>
            </div>
            <div className="border-y-[0.5px] border-border-light">
              <div className="grid grid-cols-2 gap-1.5 items-center py-2">
                {item.fields.map(field => renderScribeSettingsListData(field, item.id))}
              </div>
            </div>

            <div className="flex flex-row justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => handleCancel(item.id)}
                className="w-[180px] h-10"
              >
                {en.common.cancel}
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSave(item.id)}
                className="w-[180px] h-10"
                disabled={!isChanged || isUpdating}
              >
                {isUpdating ? en.userManagement.saving : en.common.save}
              </Button>
            </div>
          </div>
        </Accordion>
      );
    },
    [
      isAnyChildEnabled,
      handleParentToggle,
      handleClearAll,
      handleSelectAll,
      handleSave,
      handleCancel,
      hasItemChanged,
      isUpdating,
      renderScribeSettingsListData,
    ],
  );

  if (!FEATURE_FLAGS_MAP.SCRIBE_SETTINGS_FLAG) {
    return (
      <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0 w-full mt-4 pb-6">
        {en.userManagement.scribeSettingsNotEnabled}
      </div>
    );
  }

  if (isSummarySectionsLoading) {
    return <ScribeSettingsSkeleton />;
  }

  return (
    <div className="overflow-y-auto w-full py-4">
      <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0 w-[60%] mt-4 pb-2">
        <div className="text-base font-medium text-typography-900">
          {en.userManagement.additionalFields}
        </div>
        {data.map(item => renderScribeSettingsListItem(item))}
      </div>
    </div>
  );
};
