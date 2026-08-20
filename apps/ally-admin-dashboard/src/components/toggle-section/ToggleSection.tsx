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
  /**
   * Initial value used when the form holds nothing for this field yet — i.e. a
   * brand-new record, where no response has been `reset()` in. Mirrors
   * SliderField. Without it the controller starts `undefined`, so a field
   * config declaring `defaultValue: true` still rendered OFF, the author's
   * first click on it read as "turn on" (they had to click twice to actually
   * turn it off), and saving without touching it persisted `false` — the exact
   * opposite of the declared default.
   */
  defaultValue?: boolean;
}

export const ToggleSection = ({
  label,
  name,
  formMethods,
  tooltipLocation,
  defaultValue,
}: ToggleSectionProps) => {
  const {
    field: { value, onChange },
  } = useController({
    name,
    control: formMethods.control,
    // Always an explicit boolean: a field with no declared default is OFF, and
    // seeding `false` rather than leaving the key absent keeps what the author
    // sees and what the save payload carries in step.
    defaultValue: defaultValue === true,
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
