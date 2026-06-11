import { ToggleSwitch } from "@components";

import { SwitchProps } from "./types";

export const Switch = ({ checked, onChange, disabled }: SwitchProps) => {
  return (
    <div className="w-full px-2 py-1 flex items-center justify-center">
      <ToggleSwitch enabled={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
};
