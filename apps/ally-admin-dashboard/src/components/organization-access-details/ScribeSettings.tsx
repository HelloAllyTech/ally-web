import { FC, useState, useEffect, useMemo, useCallback } from "react";

import { toast } from "sonner";

import {
  useGetSummarySectionsQuery,
  useUpdateSummarySectionsMutation,
  useUpdateSummaryFieldsMutation,
  useGetDashboardSettingsAllQuery,
  useGetTenantByIdQuery,
  useUpdateTenantMutation,
  useGetCustomFieldTypesQuery,
  useUpdateCustomFieldTypesMutation,
  useGetCustomFieldsEnabledQuery,
  useUpdateCustomFieldsEnabledMutation,
  useGetScribeNoteCreationEnabledQuery,
  useUpdateScribeNoteCreationEnabledMutation,
  useGetScribeVoiceNoteEnabledQuery,
  useUpdateScribeVoiceNoteEnabledMutation,
} from "@api";
import { ArrowSolid } from "@assets";
import { ToggleSwitch, Accordion, Button } from "@components";
import { en } from "@constants";
import { SCRIBE_SETTINGS_ITEMS } from "@src/components/organization-access-details/constants";
import { CreateTenantBody, ScribeSettingsItem, ScribeSettingsList } from "@types";

import CustomFieldDefinitionsSection from "./CustomFieldDefinitionsSection";

interface ScribeSettingsProps {
  tenantId: string;
  onUpdateTenant: () => void;
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

export const ScribeSettings: FC<ScribeSettingsProps> = ({ tenantId, onUpdateTenant }) => {
  const [enabledItems, setEnabledItems] = useState<string[]>([]);
  const [enabledDashboardIds, setEnabledDashboardIds] = useState<string[]>([]);
  const [updateTenant] = useUpdateTenantMutation();

  const handleToggle = async (item: { id: string; type: string }) => {
    try {
      const dataVal: Partial<CreateTenantBody> = {};
      if (item.type) {
        if (enabledDashboardIds.includes(item.id)) {
          dataVal.enabledDashboardIds = enabledDashboardIds.filter(id => id !== item.id);
        } else {
          dataVal.enabledDashboardIds = [...enabledDashboardIds, item.id];
        }
        setEnabledDashboardIds(dataVal.enabledDashboardIds);
      } else {
        dataVal[item.id] = !enabledItems.includes(item.id);
        if (item.id === "enableMicrophoneMode") {
          dataVal.enableAudioUpload = enabledItems.includes("enableAudioUpload");
          dataVal.enableDictationMode = enabledItems.includes("enableDictationMode");
        } else if (item.id === "enableAudioUpload") {
          dataVal.enableMicrophoneMode = enabledItems.includes("enableMicrophoneMode");
          dataVal.enableDictationMode = enabledItems.includes("enableDictationMode");
        } else if (item.id === "enableDictationMode") {
          dataVal.enableMicrophoneMode = enabledItems.includes("enableMicrophoneMode");
          dataVal.enableAudioUpload = enabledItems.includes("enableAudioUpload");
        }
      }
      await updateTenant({ id: tenantId, data: dataVal });
      onUpdateTenant?.();
      setEnabledItems(prev =>
        prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id],
      );
    } catch (error: any) {
      toast.error(error?.data?.message || en.errors.failedUpdateAccess);
      throw error;
    }
  };

  const { data: dashboardSettingsAll } = useGetDashboardSettingsAllQuery();
  const { data: tenant } = useGetTenantByIdQuery(tenantId);
  const { data: enabledCustomFieldTypes } = useGetCustomFieldTypesQuery(tenantId);
  const [updateCustomFieldTypes] = useUpdateCustomFieldTypesMutation();
  const { data: customFieldsEnabled } = useGetCustomFieldsEnabledQuery(tenantId);
  const [updateCustomFieldsEnabled] = useUpdateCustomFieldsEnabledMutation();
  const { data: scribeNoteCreationEnabled } = useGetScribeNoteCreationEnabledQuery(tenantId);
  const [updateScribeNoteCreationEnabled] = useUpdateScribeNoteCreationEnabledMutation();
  const { data: scribeVoiceNoteEnabled } = useGetScribeVoiceNoteEnabledQuery(tenantId);
  const [updateScribeVoiceNoteEnabled] = useUpdateScribeVoiceNoteEnabledMutation();

  const allCustomFieldTypes = [
    { key: "SINGLE_SELECT", label: en.userManagement.singleSelectFieldType },
    { key: "MULTI_SELECT", label: en.userManagement.multiSelectFieldType },
    { key: "DATE", label: en.userManagement.dateFieldType },
    { key: "TEXT", label: en.userManagement.textFieldType },
    { key: "NUMBER", label: en.userManagement.numberFieldType },
    { key: "BOOLEAN", label: en.userManagement.booleanFieldType },
  ];

  const [localCustomFieldsEnabled, setLocalCustomFieldsEnabled] = useState<boolean>(false);
  const [localScribeNoteCreationEnabled, setLocalScribeNoteCreationEnabled] =
    useState<boolean>(false);
  const [localScribeVoiceNoteEnabled, setLocalScribeVoiceNoteEnabled] = useState<boolean>(false);
  const [localEnabledTypes, setLocalEnabledTypes] = useState<string[]>(
    allCustomFieldTypes.map(t => t.key),
  );

  useEffect(() => {
    if (customFieldsEnabled !== undefined) {
      setLocalCustomFieldsEnabled(customFieldsEnabled);
    }
  }, [customFieldsEnabled]);

  useEffect(() => {
    if (scribeNoteCreationEnabled !== undefined) {
      setLocalScribeNoteCreationEnabled(scribeNoteCreationEnabled);
    }
  }, [scribeNoteCreationEnabled]);

  useEffect(() => {
    if (scribeVoiceNoteEnabled !== undefined) {
      setLocalScribeVoiceNoteEnabled(scribeVoiceNoteEnabled);
    }
  }, [scribeVoiceNoteEnabled]);

  useEffect(() => {
    if (enabledCustomFieldTypes !== undefined) {
      setLocalEnabledTypes(enabledCustomFieldTypes);
    }
  }, [enabledCustomFieldTypes]);

  const handleCustomFieldsEnabledToggle = async (enabled: boolean) => {
    setLocalCustomFieldsEnabled(enabled);
    try {
      await updateCustomFieldsEnabled({ tenantId, enabled }).unwrap();
    } catch (error: any) {
      setLocalCustomFieldsEnabled(!enabled);
      toast.error(error?.data?.message || en.errors.failedUpdateAccess);
    }
  };

  const handleScribeNoteCreationEnabledToggle = async (enabled: boolean) => {
    setLocalScribeNoteCreationEnabled(enabled);
    try {
      await updateScribeNoteCreationEnabled({ tenantId, enabled }).unwrap();
    } catch (error: any) {
      setLocalScribeNoteCreationEnabled(!enabled);
      toast.error(error?.data?.message || en.errors.failedUpdateAccess);
    }
  };

  const handleScribeVoiceNoteEnabledToggle = async (enabled: boolean) => {
    setLocalScribeVoiceNoteEnabled(enabled);
    try {
      await updateScribeVoiceNoteEnabled({ tenantId, enabled }).unwrap();
    } catch (error: any) {
      setLocalScribeVoiceNoteEnabled(!enabled);
      toast.error(error?.data?.message || en.errors.failedUpdateAccess);
    }
  };

  const handleCustomFieldTypeToggle = async (fieldType: string, enabled: boolean) => {
    const updated = enabled
      ? [...localEnabledTypes, fieldType]
      : localEnabledTypes.filter(t => t !== fieldType);
    setLocalEnabledTypes(updated);
    try {
      await updateCustomFieldTypes({ tenantId, enabledTypes: updated }).unwrap();
    } catch (error: any) {
      setLocalEnabledTypes(localEnabledTypes);
      toast.error(error?.data?.message || en.errors.failedUpdateAccess);
    }
  };

  const { data: summarySectionsData, isLoading: isSummarySectionsLoading } =
    useGetSummarySectionsQuery(tenantId);
  const [updateSummarySections, { isLoading: isUpdatingSections }] =
    useUpdateSummarySectionsMutation();
  const [updateSummaryFields, { isLoading: isUpdatingFields }] = useUpdateSummaryFieldsMutation();

  const isUpdating = isUpdatingSections || isUpdatingFields;

  const [data, setData] = useState<ScribeSettingsList[]>([]);
  const [initialData, setInitialData] = useState<ScribeSettingsList[]>([]);

  useEffect(() => {
    if (tenant && dashboardSettingsAll) {
      setEnabledDashboardIds(tenant.enabledDashboardIds ?? []);
      const newEnabledItems = [];
      if (tenant.enableMicrophoneMode) {
        newEnabledItems.push("enableMicrophoneMode");
      }
      if (tenant.enableDictationMode) {
        newEnabledItems.push("enableDictationMode");
      }
      if (tenant.enableAudioUpload) {
        newEnabledItems.push("enableAudioUpload");
      }
      setEnabledItems(newEnabledItems);
      for (const dashboardId of tenant.enabledDashboardIds) {
        const dashboard = dashboardSettingsAll?.find(setting => setting.id === dashboardId);
        if (dashboard) {
          newEnabledItems.push(dashboard.id);
        }
      }
      setEnabledItems(newEnabledItems);
    }
  }, [tenant, dashboardSettingsAll]);

  const optionValues = useMemo(() => {
    return SCRIBE_SETTINGS_ITEMS.map(item => {
      let id = "";
      if (item.id !== "") {
        id = item.id;
      } else {
        const dashboardId =
          dashboardSettingsAll?.find(setting => setting.analyticsType === item.type)?.id ?? "";
        id = dashboardId;
      }
      return {
        id,
        value: enabledItems.includes(id),
        label: item.label,
        type: item.type,
      };
    });
  }, [dashboardSettingsAll, enabledItems]);
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

  if (isSummarySectionsLoading) {
    return <ScribeSettingsSkeleton />;
  }

  return (
    <div className="w-[60%] flex flex-col gap-4 mb-4 pb-2">
      <div className="flex flex-col pr-[16px] pl-[5px] gap-2 font-primary">
        {optionValues.map(item => (
          <div key={item.id} className="flex h-9 flex-row justify-between items-center">
            <div className="text-sm text-typography-700 font-normal">{item.label}</div>
            <div className="flex flex-row items-center gap-3">
              <ToggleSwitch
                enabled={enabledItems.includes(item.id)}
                onChange={() => handleToggle(item)}
              />
              <span className="text-sm text-typography-900 font-normal">
                {enabledItems.includes(item.id) ? en.common.enabled : en.common.disabled}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="text-base font-medium text-typography-900">
        {en.userManagement.configureSimulationSettings}
      </div>
      {data.map(item => renderScribeSettingsListItem(item))}

      <div className="text-base font-medium text-typography-900 mt-2">
        {en.userManagement.customFields}
      </div>
      <div className="flex flex-col pr-[16px] pl-[5px] gap-2 font-primary">
        <div className="flex h-9 flex-row justify-between items-center">
          <div className="text-sm text-typography-700 font-normal">
            {en.userManagement.customFieldsEnabled}
          </div>
          <div className="flex flex-row items-center gap-3">
            <ToggleSwitch
              enabled={localCustomFieldsEnabled}
              onChange={handleCustomFieldsEnabledToggle}
              label={en.userManagement.customFieldsEnabled}
            />
            <span className="text-sm text-typography-900 font-normal">
              {localCustomFieldsEnabled ? en.common.enabled : en.common.disabled}
            </span>
          </div>
        </div>
        {localCustomFieldsEnabled && (
          <div className="flex flex-col gap-2 pl-4 border-l-2 border-border-light ml-1">
            {allCustomFieldTypes.map(({ key, label }) => {
              const isEnabled = localEnabledTypes.includes(key);
              return (
                <div key={key} className="flex h-9 flex-row justify-between items-center">
                  <div className="text-sm text-typography-700 font-normal">{label}</div>
                  <div className="flex flex-row items-center gap-3">
                    <ToggleSwitch
                      enabled={isEnabled}
                      onChange={enabled => handleCustomFieldTypeToggle(key, enabled)}
                      label={label}
                    />
                    <span className="text-sm text-typography-900 font-normal">
                      {isEnabled ? en.common.enabled : en.common.disabled}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {localCustomFieldsEnabled && (
        <CustomFieldDefinitionsSection tenantId={tenantId} enabledTypes={localEnabledTypes} />
      )}

      <div className="flex flex-col pr-[16px] pl-[5px] gap-2 font-primary mt-2">
        <div className="flex h-9 flex-row justify-between items-center">
          <div className="text-sm text-typography-700 font-normal">
            {en.userManagement.scribeNoteCreationEnabled}
          </div>
          <div className="flex flex-row items-center gap-3">
            <ToggleSwitch
              enabled={localScribeNoteCreationEnabled}
              onChange={handleScribeNoteCreationEnabledToggle}
              label={en.userManagement.scribeNoteCreationEnabled}
            />
            <span className="text-sm text-typography-900 font-normal">
              {localScribeNoteCreationEnabled ? en.common.enabled : en.common.disabled}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col pr-[16px] pl-[5px] gap-2 font-primary mt-2">
        <div className="flex h-9 flex-row justify-between items-center">
          <div className="text-sm text-typography-700 font-normal">
            {en.userManagement.voiceNoteEnabled}
          </div>
          <div className="flex flex-row items-center gap-3">
            <ToggleSwitch
              enabled={localScribeVoiceNoteEnabled}
              onChange={handleScribeVoiceNoteEnabledToggle}
              label={en.userManagement.voiceNoteEnabled}
            />
            <span className="text-sm text-typography-900 font-normal">
              {localScribeVoiceNoteEnabled ? en.common.enabled : en.common.disabled}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
