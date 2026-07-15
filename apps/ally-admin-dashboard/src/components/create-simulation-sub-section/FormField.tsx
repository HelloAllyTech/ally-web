import { FC, useEffect } from "react";

import { FILE_TYPE, FORM_FIELD_TYPES, en } from "@constants";
import { useIsPlaceholderUsed } from "@hooks";
import { FormFieldProps } from "@types";

import { Accordion } from "../accordion";
import { AutoTerminationRuleField } from "../auto-termination-rule-field";
import { BehavioursAndStatesInstruction } from "../behaviours-and-states-instruction";
import { ChallengeDescriptionPanel } from "../challenge-description";
import { CharacterProfileSelector } from "../character-profile-selector";
import { ComfortAudioDropdown } from "../comfort-audio-dropdown";
import { Competency } from "../competency";
import { CustomFieldGroup } from "../custom-field-group";
import { DropdownField } from "../dropdown-field";
import { EnhanceButton } from "../enhance-button";
import { FileUpload } from "../file-upload";
import { InputField } from "../input-field";
import { KnowledgeSource } from "../knowledge-source";
import { LanguageVoiceMapping } from "../language-voice-mapping";
import { LinguisticStyleSamples } from "../linguistic-style-samples";
import { MainAgentPromptPicker } from "../main-agent-prompt-picker";
import { OpeningDialoguesPanel } from "../opening-dialogues";
import { RadioButtonGroup } from "../radio-button-group";
import { SliderField } from "../slider-field";
import { StatesEditor } from "../states-editor";
import { TagSelector } from "../tag-selector";
import { TimeInput } from "../time-input";
import { TitleTranslationsPanel } from "../title-translations";
import { ToggleSection } from "../toggle-section";

export const FormField: FC<FormFieldProps> = ({ config, formMethods, readOnly = false }) => {
  const {
    label,
    placeholder,
    type,
    options,
    id,
    maxLength,
    multiline,
    isMandatory,
    defaultValue,
    note,
    enhanceType,
    promptVariable,
    hideWhenUnused,
    accordion,
    tooltipLocation,
    aiGenerate,
  } = config;
  const {
    formState: { errors },
  } = formMethods;

  // Single body-driven gate for placeholder presence — shared with
  // StatesEditor via useIsPlaceholderUsed. The hook returns isUsed=false
  // for "no_selection" and "missing" lookup states as well as the
  // "loaded-but-not-referenced" case; we only hide the field when the
  // variant is fully loaded AND doesn't reference the placeholder.
  const selectedMainPromptCode = formMethods.watch("selectedMainPromptCode") as string | undefined;
  const placeholderLookup = useIsPlaceholderUsed(selectedMainPromptCode, promptVariable);
  const isUnusedByPrompt =
    !!promptVariable && placeholderLookup.kind === "loaded" && !placeholderLookup.isUsed;

  // Surface variant-not-found once per field-render via a dev-console
  // warning so it shows up in QA / dev tools without an in-UI toast spam.
  // The misconfiguration is real but localized — runtime falls back to the
  // default prompt, so editing isn't blocked.
  useEffect(() => {
    if (placeholderLookup.kind === "missing" && promptVariable) {
      // eslint-disable-next-line no-console
      console.warn(
        `[FormField] selectedMainPromptCode "${placeholderLookup.missingCode}" is not in the ` +
          "loaded main_agent prompts list. Variant may have been deleted or sync hasn't run " +
          "yet. Falling back to default prompt at runtime; this field is rendered as 'used' " +
          "by default.",
      );
    }
  }, [placeholderLookup, promptVariable]);

  // Strict-hide for fields that exist purely to feed a prompt placeholder
  // (e.g. behavior_instructions_json, custom_fields_text). Bail before
  // rendering so the editor entirely disappears for variants that don't
  // reference the placeholder.
  //
  // Hard guard: a field marked `isMandatory: true` is NEVER hidden even
  // if it also carries `hideWhenUnused: true`. Mandatory means the
  // scenario can't save / activate without it, so silently removing
  // the input would corner the author into an un-fillable form. If a
  // field config asks for both, mandatory wins. The expectation is
  // that authors only set `hideWhenUnused` on optional fields; this
  // guard turns the inconsistency into a benign no-op instead of a
  // broken UX.
  if (isUnusedByPrompt && hideWhenUnused && !isMandatory) {
    return null;
  }

  const updateTriggerWarnings = triggerWarning => {
    formMethods.setValue("triggerWarningIds", triggerWarning);
  };

  // Field-level Enhance for simple TEXT inputs (e.g. Role instruction,
  // Character Backstory). Panels that manage their own per-language value
  // (Challenge Description, Opening Dialogues) render their own EnhanceButton
  // wired to the active tab — see those components.
  const watchedValueForEnhance = formMethods.watch(id);
  const enhanceButton = enhanceType ? (
    <EnhanceButton
      enhanceType={enhanceType}
      label={label}
      currentValue={typeof watchedValueForEnhance === "string" ? watchedValueForEnhance : ""}
      onApply={improved => formMethods.setValue(id, improved, { shouldDirty: true })}
    />
  ) : null;

  const getFieldElement = () => {
    switch (type) {
      case FORM_FIELD_TYPES.SELECT:
        return (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <label className="text-typography-900 text-base flex items-center gap-1">
                {label} {isMandatory && <span className="text-destructive-500">*</span>}
              </label>
            </div>
            <DropdownField
              id={id}
              label={label}
              formMethods={formMethods}
              options={options ?? []}
              isMandatory={isMandatory}
              allowDeselect={config.allowDeselect}
            />
            {errors && (
              <p className="text-destructive-500 text-sm mt-1">{errors[config.id]?.message}</p>
            )}
          </div>
        );
      case FORM_FIELD_TYPES.TEXT:
        return (
          <InputField
            label={accordion ? "" : label}
            id={id}
            formMethods={formMethods}
            maxLength={maxLength}
            placeholder={placeholder}
            multiline={multiline}
            isMandatory={isMandatory}
            defaultValue={defaultValue}
            enhanceButton={enhanceButton}
            tooltipLocation={tooltipLocation}
          />
        );
      case FORM_FIELD_TYPES.NUMBER:
        return (
          <InputField
            label={label}
            id={id}
            type={FORM_FIELD_TYPES.NUMBER}
            formMethods={formMethods}
            maxLength={maxLength}
            placeholder={placeholder}
            isMandatory={isMandatory}
            tooltipLocation={tooltipLocation}
          />
        );
      case FORM_FIELD_TYPES.IMAGE_UPLOAD:
        return (
          <div className="w-full">
            <FileUpload
              id={id}
              formMethods={formMethods}
              isMandatory={isMandatory}
              label={label}
              header={en.simulation.coverImage}
              fileType={FILE_TYPE.IMAGE}
              enableAiGeneration={aiGenerate}
            />
          </div>
        );

      case FORM_FIELD_TYPES.VIDEO_UPLOAD:
        return (
          <div className="w-full">
            <FileUpload
              id={id}
              formMethods={formMethods}
              isMandatory={isMandatory}
              label={label}
              header={en.simulation.coverVideo}
              fileType={FILE_TYPE.VIDEO}
            />
          </div>
        );

      case FORM_FIELD_TYPES.CUSTOM.AUTO_TERMINATION_RULE:
        return <AutoTerminationRuleField label={label} formMethods={formMethods} />;
      case FORM_FIELD_TYPES.TOGGLE_BUTTON:
        return (
          <div className="w-full">
            <ToggleSection
              label={label}
              name={id}
              formMethods={formMethods}
              tooltipLocation={tooltipLocation}
            />
          </div>
        );
      case FORM_FIELD_TYPES.SLIDER:
        return (
          <SliderField
            id={id}
            label={label}
            formMethods={formMethods}
            min={config.min}
            max={config.max}
            step={config.step}
            defaultValue={config.defaultValue as unknown as number}
            isMandatory={isMandatory}
            note={note}
          />
        );
      case FORM_FIELD_TYPES.TAG_AND_DROPDOWN:
        return (
          <div className="w-full">
            <TagSelector
              triggerWarnings={formMethods?.getValues()?.triggerWarningIds ?? []}
              updateTriggerWarnings={updateTriggerWarnings}
              label={label}
            />
          </div>
        );
      case FORM_FIELD_TYPES.CUSTOM.LANGUAGE_VOICE_MAPPING:
        return (
          <LanguageVoiceMapping
            id={id}
            label={label}
            formMethods={formMethods}
            isMandatory={isMandatory}
          />
        );
      case FORM_FIELD_TYPES.CUSTOM.COMFORT_AUDIO_TRACK:
        return (
          <ComfortAudioDropdown
            id={id}
            label={label}
            formMethods={formMethods}
            isMandatory={isMandatory}
          />
        );
      case FORM_FIELD_TYPES.CUSTOM.LINGUISTIC_STYLE_SAMPLES:
        return (
          <LinguisticStyleSamples
            id={id}
            label={label}
            formMethods={formMethods}
            isMandatory={isMandatory}
            readOnly={readOnly}
          />
        );
      case FORM_FIELD_TYPES.CUSTOM.OPENING_DIALOGUES:
        return (
          <OpeningDialoguesPanel
            formMethods={formMethods}
            isMandatory={isMandatory}
            enhanceType={enhanceType}
            readOnly={readOnly}
          />
        );
      case FORM_FIELD_TYPES.CUSTOM.MAIN_AGENT_PROMPT_PICKER:
        return (
          <MainAgentPromptPicker
            id={id}
            label={label}
            formMethods={formMethods}
            isMandatory={isMandatory}
          />
        );
      case FORM_FIELD_TYPES.CUSTOM.STATES_EDITOR:
        return (
          <StatesEditor id={id} label={label} formMethods={formMethods} isMandatory={isMandatory} />
        );
      case FORM_FIELD_TYPES.CUSTOM.TITLE_TRANSLATIONS:
        return <TitleTranslationsPanel formMethods={formMethods} readOnly={readOnly} />;
      case FORM_FIELD_TYPES.CUSTOM.TITLE_PANEL:
        return (
          <TitleTranslationsPanel
            formMethods={formMethods}
            label={label}
            isMandatory={isMandatory}
            enhanceType={enhanceType}
            readOnly={readOnly}
          />
        );
      case FORM_FIELD_TYPES.CUSTOM.CHALLENGE_DESCRIPTION:
        return (
          <ChallengeDescriptionPanel
            formMethods={formMethods}
            isMandatory={isMandatory}
            label={label}
            placeholder={placeholder}
            maxLength={maxLength}
            enhanceType={enhanceType}
            readOnly={readOnly}
          />
        );
      case FORM_FIELD_TYPES.CUSTOM_FIELDS:
        return <CustomFieldGroup formMethods={formMethods} />;
      case FORM_FIELD_TYPES.CUSTOM.RADIO_BUTTONS:
        return (
          <RadioButtonGroup
            label={label}
            id={id}
            options={options ?? []}
            formMethods={formMethods}
            isMandatory={isMandatory}
          />
        );
      case FORM_FIELD_TYPES.TIME_INPUT:
        return (
          <div>
            <div className="flex flex-col gap-4">
              {label && (
                <div className="flex items-center gap-2">
                  <label className="text-typography-900 text-base flex items-center gap-1">
                    {label} {isMandatory && <span className="text-destructive-500">*</span>}
                  </label>
                  {note && <span className="text-typography-500 text-sm">{note}</span>}
                </div>
              )}
              <TimeInput
                value={formMethods.watch(id) || defaultValue}
                onChange={value => formMethods.setValue(id, value)}
                placeholder={placeholder}
                disabled={false}
                minTime="00:05:00"
              />
            </div>
          </div>
        );
      case FORM_FIELD_TYPES.CUSTOM.CHARACTER_PROFILE_SELECTOR:
        return (
          <CharacterProfileSelector
            label={label}
            id={id}
            formMethods={formMethods}
            isMandatory={isMandatory}
          />
        );
      case FORM_FIELD_TYPES.CUSTOM.BEHAVIOURS_STATES_INSTRUCTION:
        return (
          <BehavioursAndStatesInstruction
            formMethods={formMethods}
            id={id}
            isMandatory={isMandatory}
          />
        );
      case FORM_FIELD_TYPES.COMPETENCY:
        return (
          <Competency formMethods={formMethods} id={id} isMandatory={isMandatory} label={label} />
        );
      case FORM_FIELD_TYPES.KNOWLEDGE_SOURCE:
        return (
          <KnowledgeSource
            formMethods={formMethods}
            id={id}
            isMandatory={isMandatory}
            label={accordion ? "" : label}
          />
        );
      default:
        return null;
    }
  };

  // Panels that understand `readOnly` themselves — all the per-language
  // tabbed editors. They keep their language tabs clickable in View Details
  // (so translations for every language stay inspectable) and make only
  // their inputs inert, so they must NOT get the blanket wrapper below.
  const READONLY_AWARE_TYPES: string[] = [
    FORM_FIELD_TYPES.CUSTOM.OPENING_DIALOGUES,
    FORM_FIELD_TYPES.CUSTOM.TITLE_PANEL,
    FORM_FIELD_TYPES.CUSTOM.TITLE_TRANSLATIONS,
    FORM_FIELD_TYPES.CUSTOM.CHALLENGE_DESCRIPTION,
    FORM_FIELD_TYPES.CUSTOM.LINGUISTIC_STYLE_SAMPLES,
  ];

  // View Details mode: the field content stays visible (accordions above
  // remain expandable) but every input inside is inert. pointer-events-none
  // is deliberately preferred over per-component `disabled` threading — the
  // ~20 custom field editors here don't share a disabled prop.
  const renderFieldElement = () =>
    readOnly && !READONLY_AWARE_TYPES.includes(type) ? (
      <div className="pointer-events-none select-text opacity-80" aria-disabled="true">
        {getFieldElement()}
      </div>
    ) : (
      getFieldElement()
    );

  if (accordion) {
    // A mandatory field rendered inside an accordion passes an empty label
    // to its inner input (see the TEXT case), so surface the required
    // asterisk on the accordion header itself — otherwise a mandatory
    // accordion field would show no required indicator at all.
    const headerTitle = isMandatory ? (
      <div className="text-base font-medium text-typography-900 flex items-center gap-1">
        {label}
        <span className="text-destructive-500">*</span>
      </div>
    ) : undefined;
    return (
      <Accordion title={label} headerTitle={headerTitle} defaultExpanded={false}>
        {renderFieldElement()}
      </Accordion>
    );
  }

  return <div>{renderFieldElement()}</div>;
};
