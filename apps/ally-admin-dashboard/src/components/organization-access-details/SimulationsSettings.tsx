import { useMemo, useState } from "react";

import { useGetDashboardSettingsAllQuery } from "@src/api";
import { ToggleSwitch } from "@src/components/toggle-switch";
import { en } from "@src/constants";

import { SIMULATION_SETTINGS_ITEMS } from "./constants";

const SimulationsSettings = () => {
  const [enabledItems, setEnabledItems] = useState<string[]>([]);
  const { data: dashboardSettingsAll } = useGetDashboardSettingsAllQuery();

  const optionValues = useMemo(() => {
    return SIMULATION_SETTINGS_ITEMS.map(item => {
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
        label: item.label,
        type: item.type,
      };
    });
  }, [dashboardSettingsAll]);
  const handleToggle = (item: { id: string; type: string }) => {
    setEnabledItems(prev =>
      prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id],
    );
  };

  return (
    <div className="flex flex-col gap-4 w-1/2">
      {optionValues.map(item => (
        <div key={item.id} className="flex h-9 flex-row justify-between items-center font-primary">
          <div className="text-sm text-typography-700 font-normal">{item.label}</div>
          <div className="flex flex-row items-center gap-2">
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
  );
};

export { SimulationsSettings };
