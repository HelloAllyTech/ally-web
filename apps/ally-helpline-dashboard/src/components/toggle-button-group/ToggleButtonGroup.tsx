import { FC } from "react";

import { ContentSwitcher, Switch } from "@ally-ui-mono/ui-shared";
import { cn } from "@utils";

import { ToggleButtonGroupProps } from "./types";

const ToggleButtonGroup: FC<ToggleButtonGroupProps> = ({
  disabled,
  value,
  onValueChange,
  items,
  className,
  equalWidth,
}) => {
  const selectedIndex = Math.max(
    0,
    items.findIndex(item => item.value === value),
  );

  return (
    <ContentSwitcher
      selectedIndex={selectedIndex}
      onChange={({ index }) => {
        const next = items[index as number];
        if (next && next.value !== value) {
          onValueChange(next.value);
        }
      }}
      className={cn(
        "!rounded-[4px] bg-neutral-100 border-[0.5px] border-border-medium font-tertiary",
        equalWidth && "w-full",
        className,
      )}
    >
      {items.map(({ value: itemValue, label }) => (
        <Switch key={itemValue} name={itemValue} text={label} disabled={disabled} />
      ))}
    </ContentSwitcher>
  );
};

export default ToggleButtonGroup;
