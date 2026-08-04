import { UseFormReturn, useController } from "react-hook-form";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { useGetActiveTooltipsQuery } from "@api";
import { TooltipIcon } from "@assets";
import { en } from "@constants";

import { ToggleSwitch } from "../toggle-switch";

interface ToggleSectionProps {
  label: string;
  name: string;
  formMethods: UseFormReturn<any>;
  /**
   * `location` slug of a row in the data-driven tooltips system. When set and a
   * matching active tooltip exists, an info icon + tooltip renders next to the
   * label. Superadmins author the text under Manage Tooltips.
   */
  tooltipLocation?: string;
}

export const ToggleSection = ({
  label,
  name,
  formMethods,
  tooltipLocation,
}: ToggleSectionProps) => {
  const {
    field: { value, onChange },
  } = useController({
    name,
    control: formMethods.control,
  });

  const { data: tooltips = [] } = useGetActiveTooltipsQuery(undefined, {
    skip: !tooltipLocation,
  });
  const tooltip = tooltipLocation ? tooltips.find(t => t.location === tooltipLocation) : undefined;
  const tooltipTitle = tooltip?.tipText ?? "";

  return (
    <div className="flex justify-between items-center py-2 w-full">
      <span className="flex items-center gap-2 font-regular text-base text-typography-900">
        {label}
        {tooltipTitle && (
          <Tooltip label={tooltipTitle} align="top">
            <button type="button" className="cursor-pointer inline-flex items-center">
              <TooltipIcon />
            </button>
          </Tooltip>
        )}
      </span>
      <span className="flex gap-3 text-base">
        <ToggleSwitch enabled={!!value} onChange={onChange} label={label} />
        {value ? en.common.enabled : en.common.disabled}
      </span>
    </div>
  );
};
