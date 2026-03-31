import { FC, useState } from "react";

import { DEFAULT_AUTOFILL_MODEL } from "@constants";

import { AllowedFillerWordsPanel } from "./AllowedFillerWordsPanel";
import { LinguisticStyleSamplesPanel } from "./LinguisticStyleSamplesPanel";

interface LinguisticStyleSamplesProps {
  id?: string;
  label?: string;
  formMethods: any;
  isMandatory?: boolean;
}

export const LinguisticStyleSamples: FC<LinguisticStyleSamplesProps> = ({
  id = "linguisticStyleSamples",
  label = "Linguistic Style Samples",
  formMethods,
  isMandatory = false,
}) => {
  const [selectedModel, setSelectedModel] = useState(DEFAULT_AUTOFILL_MODEL);

  return (
    <div className="w-full flex flex-col gap-8" data-testid="linguistic-style-samples">
      <LinguisticStyleSamplesPanel
        id={id}
        label={label}
        formMethods={formMethods}
        isMandatory={isMandatory}
        selectedModel={selectedModel}
        onSelectedModelChange={setSelectedModel}
      />
      <AllowedFillerWordsPanel
        formMethods={formMethods}
        selectedModel={selectedModel}
        onSelectedModelChange={setSelectedModel}
      />
    </div>
  );
};
