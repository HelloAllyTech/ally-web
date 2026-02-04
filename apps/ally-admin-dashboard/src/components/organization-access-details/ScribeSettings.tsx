import { FC, useState } from "react";

import { ArrowSolid } from "@assets";
import { ToggleSwitch, Accordion } from "@components";
import { en } from "@constants";
import { ScribeSettingsItem, ScribeSettingsListResponse } from "@types";

export const ScribeSettings: FC = () => {
  const mockData = [
    {
      id: 1,
      title: "Intake",
      isEnabled: true,
      data: [
        {
          id: 1,
          title: "Intake Notes",
          isEnabled: true,
        },
        {
          id: 2,
          title: "Risk, Self Harm",
          isEnabled: false,
        },
        {
          id: 3,
          title: "Risk, Self Harm Notes",
          isEnabled: false,
        },
      ],
    },
    {
      id: 2,
      title: "Ongoing Risks",
      isEnabled: false,
      data: [
        {
          id: 1,
          title: "Risk, Self Harm Notes",
          isEnabled: false,
        },
      ],
    },
  ];
  const [data, setData] = useState<ScribeSettingsListResponse[]>(mockData);

  const handleParentToggle = (itemId: number, enabled: boolean) => {
    setData(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            isEnabled: enabled,
            data: item.data.map(child => ({
              ...child,
              isEnabled: enabled ? child.isEnabled : false,
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
          const updatedData = item.data.map(child =>
            child.id === childId ? { ...child, isEnabled: enabled } : child,
          );
          const allChildrenDisabled = updatedData.every(child => !child.isEnabled);
          return {
            ...item,
            isEnabled: allChildrenDisabled ? false : item.isEnabled,
            data: updatedData,
          };
        }
        return item;
      }),
    );
  };

  const isAnyChildEnabled = (parentId: number) => {
    return data.find(item => item.id === parentId)?.data.some(child => child.isEnabled);
  };

  const renderScribeSettingsListData = (data: ScribeSettingsItem, parentId: number) => {
    return (
      <div className="px-4 pb-4 pt-2 border-t-[0.5px]">
        <div className="flex flex-row justify-between text-sm text-typography-600 font-normal">
          <div className="text-typography-900 font-normal text-base">{data.title}</div>
          <div className="flex flex-row gap-[18px] items-center">
            <ToggleSwitch
              enabled={data.isEnabled}
              onChange={enabled => handleChildToggle(parentId, data.id, enabled)}
              label={data.title}
            />
            <span className="text-sm text-typography-900 font-normal">
              {data.isEnabled ? en.userManagement.enabled : en.userManagement.disabled}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderScribeSettingsListItem = (item: ScribeSettingsListResponse) => {
    const isDisabled = !isAnyChildEnabled(item.id);
    const headerActions = (
      <>
        <div className={isDisabled ? "cursor-not-allowed" : ""}>
          <div className={isDisabled ? "pointer-events-none opacity-50" : ""}>
            <ToggleSwitch
              enabled={item.isEnabled}
              onChange={
                isAnyChildEnabled(item.id)
                  ? enabled => handleParentToggle(item.id, enabled)
                  : () => {}
              }
              label={item.title}
            />
          </div>
        </div>
        <span className="text-sm text-typography-900 font-normal">
          {item.isEnabled ? en.userManagement.enabled : en.userManagement.disabled}
        </span>
      </>
    );

    return (
      <Accordion
        key={item.id}
        title={item.title}
        headerActions={headerActions}
        expandIcon={<ArrowSolid />}
      >
        {item.data.map(data => (
          <div key={data.id}>{renderScribeSettingsListData(data, item.id)}</div>
        ))}
      </Accordion>
    );
  };

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0 w-1/2 mt-4">
      <div className="text-base font-medium text-typography-900">
        {en.userManagement.additionalFields}
      </div>
      {data.map(item => renderScribeSettingsListItem(item))}
    </div>
  );
};
