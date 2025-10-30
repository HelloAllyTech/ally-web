import { ToggleSwitch } from "@components";

import { SwitchProps } from "./types";

export const Switch = ({ checked, onChange, disabled = false, className = "" }: SwitchProps) => {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <div className="w-full px-2 py-1 gap-2 flex items-center justify-center">
      <ToggleSwitch enabled={checked} onChange={onChange} label={checked ? "On" : "Off"} />
      <div>{checked ? "On" : "Off"}</div>
    </div>
  );
};
