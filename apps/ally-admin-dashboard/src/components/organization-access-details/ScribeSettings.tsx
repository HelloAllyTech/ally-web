import { FC, useState, useEffect } from "react";

import { useGetSummarySectionsQuery } from "@api";
import { ArrowSolid } from "@assets";
import { ToggleSwitch, Accordion } from "@components";
import { en } from "@constants";
import { ScribeSettingsItem, ScribeSettingsList } from "@types";

interface ScribeSettingsProps {
  tenantId: string;
}

export const ScribeSettings: FC<ScribeSettingsProps> = ({ tenantId }) => {
  const { data: summarySectionsData, isLoading: isSummarySectionsLoading } =
    useGetSummarySectionsQuery(tenantId);

  const [data, setData] = useState<ScribeSettingsList[]>([]);

  useEffect(() => {
    if (!summarySectionsData) {
      return;
    }
    setData(summarySectionsData.sections ?? []);
  }, [summarySectionsData]);

  const handleParentToggle = (itemId: number, enabled: boolean) => {
    setData(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            enabled: enabled,
            fields: item.fields.map(child => ({
              ...child,
              visible: enabled,
            })),
          };
        }
        return item;
      }),
    );
  };

  const handleChildToggle = (parentId: number, childId: number, enabled: boolean) => {
    setData(prev =>
      prev.map(item => {
        if (item.id === parentId) {
          const updatedFields = item.fields.map(child =>
            child.id === childId ? { ...child, visible: enabled } : child,
          );
          const allChildrenDisabled = updatedFields.every(dataItem => !dataItem.visible);
          return {
            ...item,
            enabled: allChildrenDisabled ? false : item.enabled,
            fields: updatedFields,
          };
        }
        return item;
      }),
    );
  };

  const isAnyChildEnabled = (parentId: number) => {
    return data.find(item => item.id === parentId)?.fields.some(child => child.visible);
  };

  const renderScribeSettingsListData = (data: ScribeSettingsItem, parentId: number) => {
    return (
      <div className="px-4 pb-4 pt-2 border-t-[0.5px]">
        <div className="flex flex-row justify-between text-sm text-typography-600 font-normal">
          <div className="text-typography-900 font-normal text-base">{data.label}</div>
          <div className="flex flex-row gap-[18px] items-center">
            <ToggleSwitch
              enabled={data.visible}
              onChange={enabled => handleChildToggle(parentId, data.id, enabled)}
              label={data.label}
            />
            <span className="text-sm text-typography-900 font-normal">
              {data.visible ? en.userManagement.enabled : en.userManagement.disabled}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderScribeSettingsListItem = (item: ScribeSettingsList) => {
    const isDisabled = !isAnyChildEnabled(item.id);
    const headerActions = (
      <>
        <div className={isDisabled ? "cursor-not-allowed" : ""}>
          <div className={isDisabled ? "pointer-events-none opacity-50" : ""}>
            <ToggleSwitch
              enabled={item.enabled}
              onChange={
                isAnyChildEnabled(item.id)
                  ? enabled => handleParentToggle(item.id, enabled)
                  : () => {}
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
        {item.fields.map(data => (
          <div key={data.id}>{renderScribeSettingsListData(data, item.id)}</div>
        ))}
      </Accordion>
    );
  };

  const ScribeSettingsSkeleton = () => {
    return (
      <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0 w-1/2 mt-4 animate-pulse">
        {/* Title Skeleton */}
        <div className="h-5 bg-neutral-200 rounded w-40" />

        {/* Accordion Skeletons */}
        {[1, 2, 3].map(item => (
          <div key={item} className="border border-border-light rounded">
            {/* Accordion Header Skeleton */}
            <div className="flex flex-row justify-between items-center p-4">
              <div className="h-5 bg-neutral-200 rounded w-32" />
              <div className="flex flex-row gap-[18px] items-center">
                <div className="h-6 bg-neutral-200 rounded-full w-12" />
                <div className="h-4 bg-neutral-200 rounded w-16" />
              </div>
            </div>

            {/* Accordion Content Skeleton */}
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

  if (isSummarySectionsLoading) {
    return <ScribeSettingsSkeleton />;
  }

  return (
    <div className="overflow-y-auto w-full py-4">
      <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0 w-1/2 mt-4 pb-6">
        <div className="text-base font-medium text-typography-900">
          {en.userManagement.additionalFields}
        </div>
        {data.map(item => renderScribeSettingsListItem(item))}
      </div>
    </div>
  );
};
