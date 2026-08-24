import React, { useEffect, useState } from "react";

import { toast } from "sonner";

import { NumberInput } from "@ally-ui-mono/ui-shared";
import {
  useGetTermsQuery,
  useGetPrivacyQuery,
  useUpdateTermsMutation,
  useUpdatePrivacyMutation,
  useGetTurnEndpointingQuery,
  useUpdateTurnEndpointingMutation,
} from "@api";
import { Button, ComfortAudioSettings } from "@components";
import { RichTextEditor } from "@components/rich-text-editor";
import { ButtonVariant } from "@components/types";
import {
  TURN_ENDPOINTING_MIN_FLOOR,
  TURN_ENDPOINTING_MIN_CEILING,
  TURN_ENDPOINTING_MAX_FLOOR,
  TURN_ENDPOINTING_MAX_CEILING,
} from "@constants";

type LegalEditorProps = {
  title: string;
  value: string;
  onChange: (html: string) => void;
  onSave: () => void;
  isSaving: boolean;
  isLoading: boolean;
};

const LegalEditor: React.FC<LegalEditorProps> = ({
  title,
  value,
  onChange,
  onSave,
  isSaving,
  isLoading,
}) => (
  <section className="flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-secondary text-typography-900">{title}</h2>
      <Button variant={ButtonVariant.PRIMARY} onClick={onSave} disabled={isSaving || isLoading}>
        {isSaving ? "Saving..." : "Save"}
      </Button>
    </div>
    <RichTextEditor
      value={value}
      onChange={onChange}
      placeholder={`Write the ${title} content...`}
    />
  </section>
);

type NumberFieldValue = number | "";

/**
 * Global turn-detection timing for every Studio v1 roleplay session. Replaces
 * the deleted per-simulation "Min/Max Endpointing Delay" fields on
 * Create/Edit Simulation — this is now the single platform-wide knob.
 */
const TurnEndpointingSettings: React.FC = () => {
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
      toast.success("Turn detection timing updated");
    } catch {
      toast.error("Failed to update turn detection timing");
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-secondary text-typography-900">Turn Detection Timing</h2>
          <p className="text-sm text-typography-600">
            Applies to every Studio v1 roleplay session, platform-wide. There is no more
            per-simulation override.
          </p>
        </div>
        <Button
          variant={ButtonVariant.PRIMARY}
          onClick={handleSave}
          disabled={isSaving || isLoading || !isValid}
        >
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="flex flex-col gap-4 max-w-md">
        <div className="flex flex-col gap-1">
          <NumberInput
            id="turn-endpointing-min-delay"
            label="Minimum reply delay (seconds)"
            value={minDelay}
            allowEmpty
            min={TURN_ENDPOINTING_MIN_FLOOR}
            max={TURN_ENDPOINTING_MIN_CEILING}
            step={0.05}
            hideSteppers
            disabled={isLoading}
            onChange={handleNumberChange(setMinDelay)}
          />
          <span className="text-xs text-typography-400">
            How fast the agent may reply once it&apos;s confident the learner has finished. Lower =
            snappier, more risk of cutting the learner off.
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <NumberInput
            id="turn-endpointing-max-delay"
            label="Maximum reply delay (seconds)"
            value={maxDelay}
            allowEmpty
            min={TURN_ENDPOINTING_MAX_FLOOR}
            max={TURN_ENDPOINTING_MAX_CEILING}
            step={0.05}
            hideSteppers
            disabled={isLoading}
            invalid={showPairError}
            invalidText="Maximum delay must be greater than the minimum delay."
            onChange={handleNumberChange(setMaxDelay)}
          />
          <span className="text-xs text-typography-400">
            How long the agent waits for a learner who seems mid-thought before replying anyway.
            Higher = fewer interruptions, more perceived dead air.
          </span>
        </div>
      </div>
    </section>
  );
};

export const Settings: React.FC = () => {
  const { data: terms, isFetching: isTermsLoading } = useGetTermsQuery();
  const { data: privacy, isFetching: isPrivacyLoading } = useGetPrivacyQuery();

  const [updateTerms, { isLoading: isSavingTerms }] = useUpdateTermsMutation();
  const [updatePrivacy, { isLoading: isSavingPrivacy }] = useUpdatePrivacyMutation();

  const [termsHtml, setTermsHtml] = useState("");
  const [privacyHtml, setPrivacyHtml] = useState("");

  // Seed the editors once content arrives from the server.
  useEffect(() => {
    setTermsHtml(terms?.html ?? "");
  }, [terms?.html]);

  useEffect(() => {
    setPrivacyHtml(privacy?.html ?? "");
  }, [privacy?.html]);

  const handleSaveTerms = async () => {
    try {
      await updateTerms({ html: termsHtml }).unwrap();
      toast.success("Terms of Service updated");
    } catch {
      toast.error("Failed to update Terms of Service");
    }
  };

  const handleSavePrivacy = async () => {
    try {
      await updatePrivacy({ html: privacyHtml }).unwrap();
      toast.success("Privacy Policy updated");
    } catch {
      toast.error("Failed to update Privacy Policy");
    }
  };

  return (
    <div className="py-[2px] font-primary h-full flex flex-col">
      <h1 className="text-2xl text-typography-900 pb-2 font-secondary">Settings</h1>
      <p className="text-sm text-typography-600 pb-6">
        Edit the content shown on the public Terms of Service and Privacy Policy pages.
      </p>

      {/* The page lives inside a fixed-height layout, so the editors (which grow
          with their content) need their own scroll area. min-h-0 lets this flex
          child shrink below its content height so overflow-y-auto can kick in. */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="flex flex-col gap-10 max-w-3xl pb-6">
          <LegalEditor
            title="Terms of Service"
            value={termsHtml}
            onChange={setTermsHtml}
            onSave={handleSaveTerms}
            isSaving={isSavingTerms}
            isLoading={isTermsLoading}
          />
          <LegalEditor
            title="Privacy Policy"
            value={privacyHtml}
            onChange={setPrivacyHtml}
            onSave={handleSavePrivacy}
            isSaving={isSavingPrivacy}
            isLoading={isPrivacyLoading}
          />
          <ComfortAudioSettings />
          <TurnEndpointingSettings />
        </div>
      </div>
    </div>
  );
};
