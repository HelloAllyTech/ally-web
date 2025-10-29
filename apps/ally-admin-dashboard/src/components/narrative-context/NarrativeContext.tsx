import { FC } from "react";

import { InputField } from "@components";
import { NarrativeContextProps } from "@components/types";
import { en, minInputHeight } from "@constants";

export const NarrativeContext: FC<NarrativeContextProps> = ({ formMethods }) => {
  return (
    <div className="flex flex-col h-full gap-5 w-[60%] min-w-[500px]">
      <InputField
        label={en.simulation.keyLifeEvents}
        id={"keyLifeEvents"}
        formMethods={formMethods}
        multiline={true}
        placeholder={en.simulation.keyLifeEventsPlaceholder}
        minHeight={minInputHeight.narrativeContext}
      />
      <InputField
        label={en.simulation.familyBackground}
        id={"familyBackground"}
        formMethods={formMethods}
        multiline={true}
        placeholder={en.simulation.familyBackgroundPlaceholder}
        minHeight={minInputHeight.narrativeContext}
      />
    </div>
  );
};
