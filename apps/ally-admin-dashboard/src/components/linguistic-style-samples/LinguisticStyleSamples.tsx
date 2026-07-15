import { FC } from "react";

import { useIsPlaceholderUsed } from "@hooks";

import { AllowedFillerWordsPanel } from "./AllowedFillerWordsPanel";
import { LinguisticStyleSamplesPanel } from "./LinguisticStyleSamplesPanel";

interface LinguisticStyleSamplesProps {
  id?: string;
  label?: string;
  formMethods: any;
  isMandatory?: boolean;
  /** View Details mode: forwarded to both sub-panels. */
  readOnly?: boolean;
}

export const LinguisticStyleSamples: FC<LinguisticStyleSamplesProps> = ({
  id = "linguisticStyleSamples",
  label = "Linguistic Style Samples",
  formMethods,
  isMandatory = false,
  readOnly = false,
}) => {
  // Body-driven gates per sub-panel. Each renders iff its own placeholder
  // is referenced by the picked main-agent variant — authors who remove
  // only the filler-words line from the prompt can keep using samples,
  // and vice versa. Defaults match useIsPlaceholderUsed's behavior:
  // unloaded / no-selection → kind != "loaded" → treat as USED so the
  // panels render during initial load (no flicker). Strict-hide only
  // when we've definitively loaded a variant that doesn't reference
  // the placeholder.
  const selectedMainPromptCode = formMethods.watch("selectedMainPromptCode") as string | undefined;
  const samplesLookup = useIsPlaceholderUsed(selectedMainPromptCode, "linguistic_samples");
  const fillersLookup = useIsPlaceholderUsed(selectedMainPromptCode, "allowed_fillers");
  const showSamplesPanel = !(samplesLookup.kind === "loaded" && !samplesLookup.isUsed);
  const showFillersPanel = !(fillersLookup.kind === "loaded" && !fillersLookup.isUsed);

  // Both sub-panels hidden → the whole field is a no-op; collapse the
  // outer wrapper so the form doesn't leave an empty section header.
  if (!showSamplesPanel && !showFillersPanel) {
    return null;
  }

  return (
    <div className="w-full flex flex-col gap-8" data-testid="linguistic-style-samples">
      {showSamplesPanel && (
        <LinguisticStyleSamplesPanel
          id={id}
          label={label}
          formMethods={formMethods}
          isMandatory={isMandatory}
          readOnly={readOnly}
        />
      )}
      {showFillersPanel && (
        <AllowedFillerWordsPanel formMethods={formMethods} readOnly={readOnly} />
      )}
    </div>
  );
};
