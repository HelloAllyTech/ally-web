import { useGetScenarioVoicesQuery } from "@api/simulationStudio";
import { en } from "@constants";
import { getSimulationVoiceOptions } from "@utils";

import { DropdownField } from "../dropdown-field/DropdownField";

interface VoiceDropdownProps {
  id?: string;
  label?: string;
  formMethods: any;
  isMandatory?: boolean;
}

export const VoiceDropdown: React.FC<VoiceDropdownProps> = ({
  id = "voiceId",
  label = en.simulation.voice,
  formMethods,
  isMandatory,
}) => {
  const { data } = useGetScenarioVoicesQuery();

  const {
    formState: { errors },
  } = formMethods;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[#49454F] cursor-pointer flex items-center gap-1">
        {label}
        <span className="text-red-500">*</span>
      </label>
      <DropdownField
        id={id}
        label={label}
        formMethods={formMethods}
        options={getSimulationVoiceOptions(data ?? [])}
        placeholder={en.simulation.selectVoice}
        isMandatory={isMandatory}
      />
      {errors[id]?.message.length && <p className="text-red-500 text-sm">{errors[id].message}</p>}
    </div>
  );
};
