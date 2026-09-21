import React, { useEffect, useState } from "react";

import { toast } from "sonner";

import { NumberInput } from "@ally-ui-mono/ui-shared";
import { useGetTurnEndpointingQuery, useUpdateTurnEndpointingMutation } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import {
  en,
  TURN_ENDPOINTING_MIN_FLOOR,
  TURN_ENDPOINTING_MIN_CEILING,
  TURN_ENDPOINTING_MAX_FLOOR,
  TURN_ENDPOINTING_MAX_CEILING,
} from "@constants";

type NumberFieldValue = number | "";

/**
 * Global turn-detection timing for every Studio v1 roleplay session. Replaces
 * the deleted per-simulation "Min/Max Endpointing Delay" fields on
 * Create/Edit Simulation — this is now the single platform-wide knob.
 *
 * The two fields are one setting saved as a pair (the backend DTO validates
 * max > min), so unlike the Legal tab this panel has a single Save button, and
 * it sits below the fields rather than beside a heading: the tab strip already
 * names the panel, so there is nothing for a top-right button to align to.
 */
export const TurnDetectionTab: React.FC = () => {
  const { data, isFetching: isLoading } = useGetTurnEndpointingQuery();
  const [updateTurnEndpointing, { isLoading: isSaving }] = useUpdateTurnEndpointingMutation();

  const [minDelay, setMinDelay] = useState<NumberFieldValue>("");
  const [maxDelay, setMaxDelay] = useState<NumberFieldValue>("");

  // Seed the fields once the current global setting arrives from the server.
  useEffect(() => {
    if (!data) return;
    setMinDelay(data.turnMinEndpointingDelay);
    setMaxDelay(data.turnMaxEndpointingDelay);
  }, [data]);

  const hasBothValues = minDelay !== "" && maxDelay !== "";
  const isMaxGreaterThanMin = hasBothValues && Number(maxDelay) > Number(minDelay);
  const isValid = hasBothValues && isMaxGreaterThanMin;
  const showPairError = hasBothValues && !isMaxGreaterThanMin;

  const handleNumberChange =
    (setValue: React.Dispatch<React.SetStateAction<NumberFieldValue>>) =>
    (_event: unknown, state: { value: number | string } | undefined) => {
      const next = state?.value;
      setValue(next === "" || next === undefined ? "" : Number(next));
    };

  const handleSave = async () => {
    if (!isValid) return;
    try {
      await updateTurnEndpointing({
        turnMinEndpointingDelay: Number(minDelay),
        turnMaxEndpointingDelay: Number(maxDelay),
      }).unwrap();
      toast.success(en.settings.turnDetectionSaved);
    } catch {
      toast.error(en.settings.turnDetectionSaveFailed);
    }
  };

  return (
    <section className="flex flex-col gap-4 max-w-md">
      <div className="flex flex-col gap-1">
        <NumberInput
          id="turn-endpointing-min-delay"
          label={en.settings.turnDetectionMinLabel}
          value={minDelay}
          allowEmpty
          min={TURN_ENDPOINTING_MIN_FLOOR}
          max={TURN_ENDPOINTING_MIN_CEILING}
          step={0.05}
          hideSteppers
          disabled={isLoading}
          onChange={handleNumberChange(setMinDelay)}
        />
        <span className="text-xs text-typography-400">{en.settings.turnDetectionMinHelp}</span>
      </div>

      <div className="flex flex-col gap-1">
        <NumberInput
          id="turn-endpointing-max-delay"
          label={en.settings.turnDetectionMaxLabel}
          value={maxDelay}
          allowEmpty
          min={TURN_ENDPOINTING_MAX_FLOOR}
          max={TURN_ENDPOINTING_MAX_CEILING}
          step={0.05}
          hideSteppers
          disabled={isLoading}
          invalid={showPairError}
          invalidText={en.settings.turnDetectionPairError}
          onChange={handleNumberChange(setMaxDelay)}
        />
        <span className="text-xs text-typography-400">{en.settings.turnDetectionMaxHelp}</span>
      </div>

      <div>
        <Button
          variant={ButtonVariant.PRIMARY}
          onClick={handleSave}
          disabled={isSaving || isLoading || !isValid}
        >
          {isSaving ? en.settings.saving : en.settings.save}
        </Button>
      </div>
    </section>
  );
};
