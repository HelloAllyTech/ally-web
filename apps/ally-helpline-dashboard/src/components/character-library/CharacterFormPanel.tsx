import React, { useCallback, useEffect, useState } from "react";

import { toast } from "sonner";

import { Button, TextArea, TextInput } from "@ally-ui-mono/ui-shared";
import { useCreateCharacterMutation } from "@api";
import { ArrowLeft } from "@assets";
import {
  characterLibraryStrings as strings,
  GENDER_IDENTITY_OPTIONS,
  GENDER_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
} from "@constants";
import { CharacterData } from "@types";

import { CharacterKnowledgeSourcesField } from "./CharacterKnowledgeSourcesField";
import { DialectSamplesField } from "./DialectSamplesField";

const emptyCharacter: CharacterData = {
  name: "",
  age: "",
  gender: "",
  profession: "",
  currentLocation: "",
  genderIdentity: "",
  sexualOrientation: "",
  characterProfileText: "",
  languageCharacteristics: "",
  linguisticStyleSamples: [],
  knowledgeSources: [],
};

interface FieldProps {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}

const Field: React.FC<FieldProps> = ({ label, children, required = false }) => (
  <div className="flex flex-row items-start gap-4 mb-6">
    <label className="text-base font-regular text-typography-800 w-[40%] flex-shrink-0 mt-2">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <div className="flex-1 w-full">{children}</div>
  </div>
);

const NativeSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}> = ({ value, onChange, options, placeholder }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className="w-full text-base border-b border-border-light bg-transparent py-2 focus:outline-none focus:border-primary-500"
  >
    <option value="" disabled>
      {placeholder}
    </option>
    {options.map(option => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

interface CharacterFormPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (character: CharacterData) => void;
  /** Prefills the form (e.g. from the interview agent's finished draft). */
  initialCharacter?: CharacterData | null;
}

/**
 * Create-only character form for tenant admins — a leaner port of
 * ally-admin-dashboard's CharacterSidePanel. There is no edit/delete mode
 * here: the ADMIN group only holds view+create on scenario-character (see
 * ally-be migration 1905000000000-AddTenantScopedCharacterLibrary), so this
 * app never offers an affordance the backend would reject.
 *
 * Voice selection and cover image/video are intentionally left out of this
 * first pass — they call additional endpoints (scenario voices, file-upload
 * URL signing) whose permission gates for a tenant ADMIN haven't been
 * verified yet. Add them once that's confirmed.
 */
export const CharacterFormPanel: React.FC<CharacterFormPanelProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCharacter,
}) => {
  const [formData, setFormData] = useState<CharacterData>(initialCharacter || emptyCharacter);
  const [createCharacter, { isLoading: isCreating }] = useCreateCharacterMutation();

  useEffect(() => {
    if (isOpen) setFormData(initialCharacter || emptyCharacter);
  }, [isOpen, initialCharacter]);

  const handleFieldChange = useCallback((fieldName: keyof CharacterData, value: unknown) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  }, []);

  const isFormValid = () =>
    formData.name.trim() !== "" &&
    formData.age !== "" &&
    formData.gender !== "" &&
    (formData.profession || "").trim() !== "" &&
    formData.currentLocation.trim() !== "" &&
    formData.genderIdentity !== "" &&
    formData.sexualOrientation !== "";

  const handleSave = useCallback(async () => {
    try {
      // formData.id (a `temp-...` placeholder set by the interview draft, or
      // absent on a manually-started form) is never sent — this form only
      // ever creates.
      const data = {
        name: formData.name,
        age: formData.age,
        gender: formData.gender,
        profession: formData.profession,
        currentLocation: formData.currentLocation,
        genderIdentity: formData.genderIdentity,
        sexualOrientation: formData.sexualOrientation,
        characterProfileText: formData.characterProfileText,
        languageCharacteristics: formData.languageCharacteristics,
        // Drop rows the admin added but never filled in, rather than sending
        // the backend a title-less knowledge source (400) or a blank dialect
        // sample it would just have to ignore.
        linguisticStyleSamples: (formData.linguisticStyleSamples || []).filter(
          sample => sample.trim() !== "",
        ),
        knowledgeSources: (formData.knowledgeSources || []).filter(
          source => source.title.trim() !== "",
        ),
      };
      const newCharacter = await createCharacter(data).unwrap();
      toast.success(strings.characterCreatedSuccessfully);
      onSave(newCharacter);
      onClose();
    } catch {
      toast.error(strings.failedToCreateCharacter);
    }
  }, [formData, createCharacter, onSave, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={onClose} />

      <div className="w-[50%] relative min-w-[600px] max-w-[800px] h-full bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-6">
          <button
            onClick={onClose}
            className="flex flex-row items-center justify-center gap-2 text-typography-600 hover:text-neutral-800"
          >
            <ArrowLeft width={14} height={14} />
            <span className="text-base font-tertiary font-[500]">{strings.createNewCharacter}</span>
          </button>
        </div>

        <div className="flex-1 px-10 pt-6 pb-6 overflow-y-auto min-h-0 custom-scrollbar">
          <Field label="Name" required>
            <TextInput
              id="character-name"
              labelText="Name"
              hideLabel
              value={formData.name}
              onChange={e => handleFieldChange("name", e.target.value)}
              placeholder="Enter name"
              className="w-full"
            />
          </Field>

          <Field label="Age" required>
            <input
              type="number"
              value={formData.age}
              onChange={e => handleFieldChange("age", parseInt(e.target.value, 10) || "")}
              placeholder="0"
              min="0"
              max="150"
              className="min-w-[60px] px-0 py-2 text-base border-none focus:outline-none"
              // Scrolling over a focused number input silently changes its
              // value in the browser — blur so the page scrolls instead.
              onWheel={e => e.currentTarget.blur()}
            />
          </Field>

          <Field label="Gender" required>
            <NativeSelect
              value={formData.gender}
              onChange={value => handleFieldChange("gender", value)}
              options={GENDER_OPTIONS}
              placeholder="Select gender"
            />
          </Field>

          <Field label="Profession" required>
            <TextInput
              id="character-profession"
              labelText="Profession"
              hideLabel
              value={formData.profession || ""}
              onChange={e => handleFieldChange("profession", e.target.value)}
              placeholder="Enter profession"
              className="w-full"
            />
          </Field>

          <Field label="Current location" required>
            <TextInput
              id="character-current-location"
              labelText="Current location"
              hideLabel
              value={formData.currentLocation}
              onChange={e => handleFieldChange("currentLocation", e.target.value)}
              placeholder="Enter current location"
              className="w-full"
            />
          </Field>

          <Field label="Gender identity" required>
            <NativeSelect
              value={formData.genderIdentity}
              onChange={value => handleFieldChange("genderIdentity", value)}
              options={GENDER_IDENTITY_OPTIONS}
              placeholder="Select gender identity"
            />
          </Field>

          <Field label="Sexual orientation" required>
            <NativeSelect
              value={formData.sexualOrientation}
              onChange={value => handleFieldChange("sexualOrientation", value)}
              options={SEXUAL_ORIENTATION_OPTIONS}
              placeholder="Select sexual orientation"
            />
          </Field>

          <Field label="Character Backstory">
            <TextArea
              id="character-backstory"
              labelText="Character Backstory"
              hideLabel
              value={formData.characterProfileText || ""}
              onChange={e => handleFieldChange("characterProfileText", e.target.value)}
              maxLength={2500}
              placeholder="Enter character backstory"
              rows={3}
            />
          </Field>

          <Field label={strings.languageStyle}>
            <TextArea
              id="character-language-characteristics"
              labelText={strings.languageStyle}
              hideLabel
              value={formData.languageCharacteristics || ""}
              onChange={e => handleFieldChange("languageCharacteristics", e.target.value)}
              maxLength={1000}
              placeholder={strings.enterLanguageStyle}
              rows={2}
            />
          </Field>

          <Field label={strings.dialectSamples}>
            <DialectSamplesField
              samples={formData.linguisticStyleSamples || []}
              onChange={samples => handleFieldChange("linguisticStyleSamples", samples)}
            />
          </Field>

          <Field label={strings.knowledgeSources}>
            <CharacterKnowledgeSourcesField
              sources={formData.knowledgeSources || []}
              onChange={sources => handleFieldChange("knowledgeSources", sources)}
            />
          </Field>
        </div>

        <div className="flex items-center justify-center gap-4 p-4 bg-white shrink-0 mt-auto relative z-10 w-full">
          <Button
            kind="primary"
            onClick={handleSave}
            disabled={!isFormValid() || isCreating}
            className="min-w-[120px]"
          >
            {isCreating ? "Saving..." : strings.save}
          </Button>
          <Button
            kind="secondary"
            onClick={onClose}
            className="min-w-[120px]"
            disabled={isCreating}
          >
            {strings.cancel}
          </Button>
        </div>
      </div>
    </div>
  );
};
