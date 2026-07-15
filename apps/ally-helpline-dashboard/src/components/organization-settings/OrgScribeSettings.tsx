import { FC, useCallback, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import {
  useGetOwnTenantQuery,
  useUpdateOwnTenantSettingsMutation,
  useGetOwnSummarySectionsQuery,
  useUpdateOwnSummarySectionsMutation,
  useUpdateOwnSummaryFieldsMutation,
  useGetOwnCustomFieldTypesQuery,
  useUpdateOwnCustomFieldTypesMutation,
  useGetOwnCustomFieldsEnabledQuery,
  useUpdateOwnCustomFieldsEnabledMutation,
  useGetOwnScribeNoteCreationEnabledQuery,
  useUpdateOwnScribeNoteCreationEnabledMutation,
  useGetOwnScribeVoiceNoteEnabledQuery,
  useUpdateOwnScribeVoiceNoteEnabledMutation,
} from "@api";
import { Button, ToggleSwitch } from "@components";
import { SummarySection, SummarySectionField, UpdateOwnTenantSettingsBody } from "@types";

import { CUSTOM_FIELD_TYPE_ITEMS, SCRIBE_TOGGLE_ITEMS, ScribeToggleId } from "./constants";
import OrgCustomFieldDefinitionsSection from "./OrgCustomFieldDefinitionsSection";
import OrgSettingsAccordion from "./OrgSettingsAccordion";

const cloneFields = (fields: SummarySectionField[]): SummarySectionField[] =>
  fields.map(field => ({ ...field }));

const cloneSection = (section: SummarySection): SummarySection => ({
  ...section,
  fields: cloneFields(section.fields),
});

const ScribeSettingsSkeleton = () => (
  <div className="flex-1 flex flex-col gap-4 min-h-0 w-3/4 mt-4 animate-pulse">
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
      </div>
    ))}
  </div>
);

/**
 * Scribe Settings tab for the org admin's own tenant.
 *
 * Mirrors the super-admin ScribeSettings interaction model but every call is
 * scoped server-side to the caller's tenant (no tenantId sent). The
 * dashboard-analytics toggles are omitted — see constants.ts for why.
 */
export const OrgScribeSettings: FC = () => {
  // --- Own-tenant feature toggles ----------------------------------------
  const { data: tenant } = useGetOwnTenantQuery();
  const [updateTenantSettings] = useUpdateOwnTenantSettingsMutation();
  const [enabledToggles, setEnabledToggles] = useState<ScribeToggleId[]>([]);

  useEffect(() => {
    if (!tenant) return;
    const next: ScribeToggleId[] = [];
    if (tenant.enableMicrophoneMode) next.push("enableMicrophoneMode");
    if (tenant.enableDictationMode) next.push("enableDictationMode");
    if (tenant.enableAudioUpload) next.push("enableAudioUpload");
    setEnabledToggles(next);
  }, [tenant]);

  const handleTenantToggle = async (id: ScribeToggleId) => {
    const willEnable = !enabledToggles.includes(id);
    // Send the full trio each time so the backend never clears a sibling flag.
    const body: UpdateOwnTenantSettingsBody = {
      enableMicrophoneMode: enabledToggles.includes("enableMicrophoneMode"),
      enableDictationMode: enabledToggles.includes("enableDictationMode"),
      enableAudioUpload: enabledToggles.includes("enableAudioUpload"),
      [id]: willEnable,
    };
    const previous = enabledToggles;
    setEnabledToggles(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    try {
      await updateTenantSettings(body).unwrap();
    } catch (error: any) {
      setEnabledToggles(previous);
      toast.error(error?.data?.message || "Failed to update setting");
    }
  };

  // --- Custom field types + toggles --------------------------------------
  const { data: enabledCustomFieldTypes } = useGetOwnCustomFieldTypesQuery();
  const [updateCustomFieldTypes] = useUpdateOwnCustomFieldTypesMutation();
  const { data: customFieldsEnabled } = useGetOwnCustomFieldsEnabledQuery();
  const [updateCustomFieldsEnabled] = useUpdateOwnCustomFieldsEnabledMutation();
  const { data: scribeNoteCreationEnabled } = useGetOwnScribeNoteCreationEnabledQuery();
  const [updateScribeNoteCreationEnabled] = useUpdateOwnScribeNoteCreationEnabledMutation();

  const { data: scribeVoiceNoteEnabled } = useGetOwnScribeVoiceNoteEnabledQuery();
  const [updateScribeVoiceNoteEnabled] = useUpdateOwnScribeVoiceNoteEnabledMutation();

  const [localCustomFieldsEnabled, setLocalCustomFieldsEnabled] = useState(false);
  const [localScribeNoteCreationEnabled, setLocalScribeNoteCreationEnabled] = useState(false);
  const [localScribeVoiceNoteEnabled, setLocalScribeVoiceNoteEnabled] = useState(false);
  const [localEnabledTypes, setLocalEnabledTypes] = useState<string[]>(
    CUSTOM_FIELD_TYPE_ITEMS.map(t => t.key),
  );

  useEffect(() => {
    if (customFieldsEnabled !== undefined) setLocalCustomFieldsEnabled(customFieldsEnabled);
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
    if (enabledCustomFieldTypes !== undefined) setLocalEnabledTypes(enabledCustomFieldTypes);
  }, [enabledCustomFieldTypes]);

  const handleCustomFieldsEnabledToggle = async (enabled: boolean) => {
    setLocalCustomFieldsEnabled(enabled);
    try {
      await updateCustomFieldsEnabled({ enabled }).unwrap();
    } catch (error: any) {
      setLocalCustomFieldsEnabled(!enabled);
      toast.error(error?.data?.message || "Failed to update setting");
    }
  };

  const handleScribeNoteCreationEnabledToggle = async (enabled: boolean) => {
    setLocalScribeNoteCreationEnabled(enabled);
    try {
      await updateScribeNoteCreationEnabled({ enabled }).unwrap();
    } catch (error: any) {
      setLocalScribeNoteCreationEnabled(!enabled);
      toast.error(error?.data?.message || "Failed to update setting");
    }
  };

  const handleScribeVoiceNoteEnabledToggle = async (enabled: boolean) => {
    setLocalScribeVoiceNoteEnabled(enabled);
    try {
      await updateScribeVoiceNoteEnabled({ enabled }).unwrap();
    } catch (error: any) {
      setLocalScribeVoiceNoteEnabled(!enabled);
      toast.error(error?.data?.message || "Failed to update setting");
    }
  };

  const handleCustomFieldTypeToggle = async (fieldType: string, enabled: boolean) => {
    const previous = localEnabledTypes;
    const updated = enabled
      ? [...localEnabledTypes, fieldType]
      : localEnabledTypes.filter(t => t !== fieldType);
    setLocalEnabledTypes(updated);
    try {
      await updateCustomFieldTypes({ enabledTypes: updated }).unwrap();
    } catch (error: any) {
      setLocalEnabledTypes(previous);
      toast.error(error?.data?.message || "Failed to update setting");
    }
  };

  // --- Summary sections / fields -----------------------------------------
  const { data: summarySectionsData, isLoading: isSummarySectionsLoading } =
    useGetOwnSummarySectionsQuery();
  const [updateSummarySections, { isLoading: isUpdatingSections }] =
    useUpdateOwnSummarySectionsMutation();
  const [updateSummaryFields, { isLoading: isUpdatingFields }] =
    useUpdateOwnSummaryFieldsMutation();

  const isUpdating = isUpdatingSections || isUpdatingFields;

  const [data, setData] = useState<SummarySection[]>([]);
  const [initialData, setInitialData] = useState<SummarySection[]>([]);

  const mergeSectionData = (
    newSections: SummarySection[],
    existingSections: SummarySection[],
  ): SummarySection[] => {
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

  const updateItemEnabled = (prev: SummarySection[], itemId: string, enabled: boolean) =>
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

        updateSummarySections({ hiddenSections })
          .unwrap()
          .then(() => {
            setInitialData(prevInit => updateItemEnabled(prevInit, itemId, enabled));
          })
          .catch(error => {
            setData(prevData => updateItemEnabled(prevData, itemId, originalEnabled));
            setInitialData(prevInit => updateItemEnabled(prevInit, itemId, originalEnabled));
            toast.error(
              error instanceof Error ? error.message : "Failed to update scribe settings",
            );
          });

        return updated;
      });
    },
    [initialData, updateSummarySections],
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

  const dataMap = useMemo(() => new Map(data.map(item => [item.id, item])), [data]);
  const initialDataMap = useMemo(
    () => new Map(initialData.map(item => [item.id, item])),
    [initialData],
  );

  const isAnyChildEnabled = useCallback(
    (parentId: string) => dataMap.get(parentId)?.fields.some(child => child.visible) ?? false,
    [dataMap],
  );

  const itemsAreEqual = (a: SummarySection, b: SummarySection): boolean => {
    if (a.id !== b.id || a.enabled !== b.enabled || a.fields.length !== b.fields.length) {
      return false;
    }
    const bMap = new Map(b.fields.map(f => [f.id, f.visible]));
    return a.fields.every(field => bMap.get(field.id) === field.visible);
  };

  const hasItemChanged = useCallback(
    (itemId: string) => {
      const currentItem = dataMap.get(itemId);
      const originalItem = initialDataMap.get(itemId);
      if (!currentItem || !originalItem) return false;
      return !itemsAreEqual(currentItem, originalItem);
    },
    [dataMap, initialDataMap],
  );

  const buildHiddenFields = useCallback(
    (currentItem: SummarySection, itemId: string): string[] => {
      const hiddenFromCurrent = currentItem.fields
        .filter(field => !field.visible)
        .map(field => field.id);
      const hiddenFromOthers = initialData
        .filter(section => section.id !== itemId)
        .flatMap(section => section.fields.filter(f => !f.visible).map(f => f.id));
      return [...hiddenFromCurrent, ...hiddenFromOthers];
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
        await updateSummaryFields({ hiddenFields }).unwrap();
        if (shouldDisableParent) {
          const hiddenSections = initialData
            .filter(section => !section.enabled || section.id === itemId)
            .map(section => section.id);
          await updateSummarySections({ hiddenSections }).unwrap();
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
        toast.error(error instanceof Error ? error.message : "Failed to update scribe settings");
      }
    },
    [
      dataMap,
      initialDataMap,
      initialData,
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

  const handleClearAll = (itemId: string) => {
    setData(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, enabled: false, fields: item.fields.map(f => ({ ...f, visible: false })) }
          : item,
      ),
    );
  };

  const handleSelectAll = (itemId: string) => {
    setData(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, fields: item.fields.map(f => ({ ...f, visible: true })) }
          : item,
      ),
    );
  };

  const renderField = (field: SummarySectionField, parentId: string) => (
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

  const renderSection = (item: SummarySection) => {
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
              onChange={enabled =>
                hasEnabledChild ? handleParentToggle(item.id, enabled) : undefined
              }
              label={item.label}
            />
          </div>
        </div>
        <span className="text-sm text-typography-900 font-normal">
          {item.enabled ? "Enabled" : "Disabled"}
        </span>
      </>
    );

    return (
      <OrgSettingsAccordion key={item.id} title={item.label} headerActions={headerActions}>
        <div className="mx-1 py-2 flex flex-col gap-2 px-2.5">
          <div className="text-sm text-typography-900 font-normal flex flex-row justify-between items-center">
            <span className="text-typography-900 font-normal text-base">
              {selectedCount} of {totalCount} selected
            </span>
            <div className="flex flex-row gap-4">
              <div
                className="text-primary-500 font-normal text-xs font-primary cursor-pointer"
                onClick={() => handleClearAll(item.id)}
              >
                Clear all
              </div>
              <div
                className="text-primary-500 font-normal text-xs font-primary cursor-pointer"
                onClick={() => handleSelectAll(item.id)}
              >
                Select all
              </div>
            </div>
          </div>
          <div className="border-y-[0.5px] border-border-light">
            <div className="grid grid-cols-2 gap-1.5 items-center py-2">
              {item.fields.map(field => renderField(field, item.id))}
            </div>
          </div>
          <div className="flex flex-row justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => handleCancel(item.id)}
              className="w-[180px] h-10"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => handleSave(item.id)}
              className="w-[180px] h-10"
              disabled={!isChanged || isUpdating}
            >
              {isUpdating ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </OrgSettingsAccordion>
    );
  };

  if (isSummarySectionsLoading) {
    return <ScribeSettingsSkeleton />;
  }

  return (
    <div className="w-[60%] flex flex-col gap-4 mb-4 pb-2">
      {/* Feature toggles */}
      <div className="flex flex-col pr-[16px] pl-[5px] gap-2 font-primary">
        {SCRIBE_TOGGLE_ITEMS.map(item => (
          <div key={item.id} className="flex h-9 flex-row justify-between items-center">
            <div className="text-sm text-typography-700 font-normal">{item.label}</div>
            <div className="flex flex-row items-center gap-3">
              <ToggleSwitch
                enabled={enabledToggles.includes(item.id)}
                onChange={() => handleTenantToggle(item.id)}
                label={item.label}
              />
              <span className="text-sm text-typography-900 font-normal">
                {enabledToggles.includes(item.id) ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary sections */}
      <div className="text-base font-medium text-typography-900">Configure summary settings</div>
      {data.map(item => renderSection(item))}

      {/* Custom fields */}
      <div className="text-base font-medium text-typography-900 mt-2">Custom fields</div>
      <div className="flex flex-col pr-[16px] pl-[5px] gap-2 font-primary">
        <div className="flex h-9 flex-row justify-between items-center">
          <div className="text-sm text-typography-700 font-normal">Custom fields enabled</div>
          <div className="flex flex-row items-center gap-3">
            <ToggleSwitch
              enabled={localCustomFieldsEnabled}
              onChange={handleCustomFieldsEnabledToggle}
              label="Custom fields enabled"
            />
            <span className="text-sm text-typography-900 font-normal">
              {localCustomFieldsEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>
        {localCustomFieldsEnabled && (
          <div className="flex flex-col gap-2 pl-4 border-l-2 border-border-light ml-1">
            {CUSTOM_FIELD_TYPE_ITEMS.map(({ key, label }) => {
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
                      {isEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {localCustomFieldsEnabled && (
        <OrgCustomFieldDefinitionsSection enabledTypes={localEnabledTypes} />
      )}

      {/* Scribe note creation */}
      <div className="flex flex-col pr-[16px] pl-[5px] gap-2 font-primary mt-2">
        <div className="flex h-9 flex-row justify-between items-center">
          <div className="text-sm text-typography-700 font-normal">
            Scribe note creation enabled
          </div>
          <div className="flex flex-row items-center gap-3">
            <ToggleSwitch
              enabled={localScribeNoteCreationEnabled}
              onChange={handleScribeNoteCreationEnabledToggle}
              label="Scribe note creation enabled"
            />
            <span className="text-sm text-typography-900 font-normal">
              {localScribeNoteCreationEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>
      </div>

      {/* Scribe voice note (mic dictation) */}
      <div className="flex flex-col pr-[16px] pl-[5px] gap-2 font-primary mt-2">
        <div className="flex h-9 flex-row justify-between items-center">
          <div className="text-sm text-typography-700 font-normal">Voice note (mic dictation)</div>
          <div className="flex flex-row items-center gap-3">
            <ToggleSwitch
              enabled={localScribeVoiceNoteEnabled}
              onChange={handleScribeVoiceNoteEnabledToggle}
              label="Voice note (mic dictation)"
            />
            <span className="text-sm text-typography-900 font-normal">
              {localScribeVoiceNoteEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrgScribeSettings;
