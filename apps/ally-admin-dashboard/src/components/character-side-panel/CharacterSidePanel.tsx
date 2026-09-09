import React, { useState, useCallback, useEffect, useRef } from "react";

import { toast } from "sonner";

import { TextArea, TextInput } from "@ally-ui-mono/ui-shared";
import {
  useCreateCharacterMutation,
  useGetAvailableLanguageVoicesQuery,
  useUpdateCharacterMutation,
} from "@api";
import { DoubleArrowRight, Trash } from "@assets";
import {
  ActionConfirmationPopup,
  Button,
  CustomDropdownField,
  DropdownField,
  FileUpload,
} from "@components";
import { LanguageTabPanel } from "@components/language-tab-panel";
import type { LanguageOption } from "@components/linguistic-style-samples/scenarioLanguageUtils";
import { ButtonVariant } from "@components/types";
import { createVoiceOptionRenderer } from "@components/voice-option";
import {
  en,
  GENDER_OPTIONS,
  GENDER_IDENTITY_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
  FILE_TYPE,
} from "@constants";
import { buildGroupedVoiceOptions } from "@constants/voiceProviders";
// Imported by module rather than through the `@hooks` barrel: the barrel pulls
// in hooks that reach `@store`, which reads `baseAPI.reducerPath` at module
// load — so any consumer's test that mocks `@api` fails to load the file.
import { useVoicePreview } from "@hooks/useVoicePreview";
import { CharacterData } from "@types";

import { CharacterKnowledgeSourcesField } from "./CharacterKnowledgeSourcesField";
import { DialectSamplesField } from "./DialectSamplesField";

/** A voice as the language catalog nests it (gender/age hoisted out of config). */
interface VoiceCatalogEntry {
  id: string;
  name: string;
  provider?: string;
  gender?: string | null;
  age?: string | null;
}

interface CharacterSidePanelProps {
  selectedCharacter: CharacterData | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (characterId: string) => void;
  onSave: (character: CharacterData) => void;
  isNewCharacter?: boolean;
  /**
   * View-only: every field is disabled and Save is replaced by Close. Used for
   * tenant admins, who may create a character and read it back but not change
   * one once saved. Purely presentational — the backend withholds
   * edit:scenario-character from them regardless.
   */
  readOnly?: boolean;
}

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

const PanelHeader: React.FC<{
  characterId?: string;
  onClose: () => void;
  onDelete?: (characterId: string) => void;
  hasCharacter: boolean;
  isNewCharacter?: boolean;
  readOnly?: boolean;
}> = ({ characterId, onClose, onDelete, hasCharacter, isNewCharacter, readOnly }) => (
  <div className="flex items-center justify-between p-6">
    <button
      onClick={onClose}
      className="flex flex-row items-center justify-center gap-2 text-typography-600 hover:text-neutral-800"
    >
      <DoubleArrowRight width={14} height={14} />
      <span className="text-base font-tertiary font-[500]">
        {isNewCharacter ? "Create character" : readOnly ? "Character" : "Edit character"}
      </span>
    </button>
    {hasCharacter && !isNewCharacter && !readOnly && onDelete && (
      <button onClick={() => onDelete(characterId)} className="flex items-center gap-2">
        <Trash width={14} height={14} />
        <span className="text-base font-tertiary font-medium text-typography-900">
          {en.simulation.deleteCharacter}
        </span>
      </button>
    )}
  </div>
);

export const CharacterSidePanel: React.FC<CharacterSidePanelProps> = ({
  selectedCharacter,
  isOpen,
  onClose,
  onDelete,
  onSave,
  isNewCharacter = false,
  readOnly = false,
}) => {
  const emptyCharacter: CharacterData = {
    name: "",
    age: "",
    gender: "",
    profession: "",
    currentLocation: "",
    genderIdentity: "",
    sexualOrientation: "",
    coverImageUrl: "",
    coverVideoUrl: "",
    characterProfileText: "",
    voices: {},
    languageCharacteristics: {},
    linguisticStyleSamples: {},
    knowledgeSources: [],
  };

  const [formData, setFormData] = useState<CharacterData>(selectedCharacter || emptyCharacter);
  const [initialData, setInitialData] = useState<CharacterData>(
    selectedCharacter || emptyCharacter,
  );
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const isSavingRef = useRef(false);

  const [createCharacter, { isLoading: isCreating }] = useCreateCharacterMutation();
  const [updateCharacter, { isLoading: isUpdating }] = useUpdateCharacterMutation();

  useEffect(() => {
    if (selectedCharacter) {
      setFormData(selectedCharacter);
      setInitialData(selectedCharacter);
    }
  }, [selectedCharacter]);

  const handleFieldChange = useCallback((fieldName: keyof CharacterData, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  }, []);

  /**
   * Characters are per-language: one voice, one style note and one set of
   * sample lines PER language they speak, mirroring the simulation they get
   * applied to. One tab strip governs all three, because they describe the
   * same thing — how this person sounds in that language.
   */
  const { data: catalogLanguages = [] } = useGetAvailableLanguageVoicesQuery({
    active: true,
    voicesNeeded: true,
  }) as { data: LanguageOption[] };
  const languageTabs = React.useMemo(
    () =>
      [...catalogLanguages]
        .map(language => ({
          id: String(language.language_id),
          label: language.label ?? `Language ${language.language_id}`,
          voices: (language as { voices?: VoiceCatalogEntry[] }).voices ?? [],
        }))
        .sort((a, b) => Number(a.id) - Number(b.id)),
    [catalogLanguages],
  );
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(null);
  const activeLanguageId =
    selectedLanguageId && languageTabs.some(tab => tab.id === selectedLanguageId)
      ? selectedLanguageId
      : (languageTabs[0]?.id ?? null);
  const activeLanguage = languageTabs.find(tab => tab.id === activeLanguageId);

  const [voiceSearchTerm, setVoiceSearchTerm] = useState("");
  /**
   * Only the active language's own voices. Previously the picker offered the
   * whole catalog regardless of language, so a character could be given a
   * Marathi voice that the simulation then used as its ENGLISH one. The
   * backend now rejects a voice filed under another language, so offering one
   * here would only produce a save error.
   *
   * Ordered against this character's age and gender by the same helper the
   * simulation studio's picker uses.
   */
  const allVoiceOptions = buildGroupedVoiceOptions(
    (activeLanguage?.voices ?? []).map(voice => ({
      id: voice.id,
      name: voice.name,
      provider: voice.provider,
      gender: voice.gender ?? undefined,
      age: voice.age ?? undefined,
    })),
    formData.gender,
    formData.age,
  );
  const voiceOptions = voiceSearchTerm
    ? allVoiceOptions.filter(option =>
        option.label.toLowerCase().includes(voiceSearchTerm.toLowerCase()),
      )
    : allVoiceOptions;

  const voicePreview = useVoicePreview();
  const activeVoiceId = activeLanguageId ? (formData.voices ?? {})[activeLanguageId] : undefined;
  const activeSamples = activeLanguageId
    ? ((formData.linguisticStyleSamples ?? {})[activeLanguageId] ?? [])
    : [];
  /**
   * What a previewed voice says: this character's own first line IN THIS
   * LANGUAGE. Hearing the voice deliver it is the point of auditioning, and
   * it is what makes two similar voices tell apart. Falls back to the
   * backend's per-language sample when this tab has no lines yet.
   */
  const auditionText = activeSamples.map(sample => String(sample ?? "").trim()).find(Boolean);
  const renderVoiceOption = createVoiceOptionRenderer({
    playingVoiceId: voicePreview.playingVoiceId,
    isLoading: voicePreview.isLoading,
    selectedValue: activeVoiceId,
    onPlay: voiceId => void voicePreview.play(voiceId, auditionText),
    onPause: voicePreview.pause,
  });

  /** Merge one language's value into a per-language map field. */
  const setForActiveLanguage = <T,>(
    field: "voices" | "languageCharacteristics" | "linguisticStyleSamples",
    value: T | undefined,
  ) => {
    if (!activeLanguageId) return;
    const current = { ...((formData[field] ?? {}) as Record<string, unknown>) };
    if (value === undefined || value === "") {
      delete current[activeLanguageId];
    } else {
      current[activeLanguageId] = value;
    }
    handleFieldChange(field, current as never);
  };

  const [fileErrors, setFileErrors] = useState<Record<string, any>>({});
  const formMethodsShim = React.useMemo(
    () => ({
      watch: (id: string) => formData[id as keyof CharacterData],
      setValue: (id: string, value: any) => handleFieldChange(id as keyof CharacterData, value),
      setError: (id: string, error: any) => setFileErrors(prev => ({ ...prev, [id]: error })),
      clearErrors: (id: string) =>
        setFileErrors(prev => {
          const newE = { ...prev };
          delete newE[id];
          return newE;
        }),
      formState: { errors: fileErrors },
      register: (id: string) => ({
        name: id,
        onChange: (e: any) => handleFieldChange(id as keyof CharacterData, e.target.value),
        onBlur: () => {},
        ref: () => {},
      }),
    }),
    [formData, handleFieldChange, fileErrors],
  );

  const handleDelete = useCallback(() => {
    setShowDeleteConfirmation(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (selectedCharacter?.id && onDelete) {
      onDelete(selectedCharacter.id);
      setShowDeleteConfirmation(false);
      onClose();
    }
  }, [selectedCharacter, onDelete, onClose]);

  const handleSave = useCallback(async () => {
    // Prevent multiple simultaneous save operations
    if (isSavingRef.current) {
      return;
    }

    isSavingRef.current = true;

    try {
      const { id, ...rest } = formData;
      const data = {
        ...rest,
        // Drop rows the trainer added but never filled in, rather than
        // sending the backend a title-less knowledge source (400) or a
        // blank dialect sample it would just have to ignore.
        // Per language: drop rows the trainer added but never filled, and drop
        // a language left with nothing rather than sending an empty array the
        // backend would only have to ignore.
        linguisticStyleSamples: Object.fromEntries(
          Object.entries(rest.linguisticStyleSamples || {})
            .map(([languageId, samples]) => [
              languageId,
              (samples ?? []).filter(sample => sample.trim() !== ""),
            ])
            .filter(([, samples]) => (samples as string[]).length > 0),
        ),
        knowledgeSources: (rest.knowledgeSources || []).filter(
          source => source.title.trim() !== "",
        ),
      };

      // If no ID exists or ID is temporary, create new character
      if (!id || id.startsWith("temp-")) {
        const newCharacter = await createCharacter(data).unwrap();
        toast.success(en.simulation.characterCreatedSuccessfully);
        onSave(newCharacter);
      } else {
        // If ID exists, update existing character
        const updatedCharacter = await updateCharacter({ id, data }).unwrap();
        toast.success(en.simulation.characterUpdatedSuccessfully);
        onSave(updatedCharacter);
      }
      onClose();
    } catch {
      const errorMessage =
        !formData.id || formData.id.startsWith("temp-")
          ? en.simulation.failedToCreateCharacter
          : en.simulation.failedToUpdateCharacter;
      toast.error(errorMessage);
    } finally {
      isSavingRef.current = false;
    }
  }, [formData, createCharacter, updateCharacter, onSave, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  const isFormValid = () => {
    return (
      formData.name.trim() !== "" &&
      formData.age !== "" &&
      formData.gender !== "" &&
      (formData.profession || "").trim() !== "" &&
      formData.currentLocation.trim() !== "" &&
      formData.genderIdentity !== "" &&
      formData.sexualOrientation !== ""
    );
  };

  const hasFormChanged = () => {
    if (isNewCharacter) {
      return true;
    }

    return (
      formData.name !== initialData.name ||
      formData.age !== initialData.age ||
      formData.gender !== initialData.gender ||
      (formData.profession || "") !== (initialData.profession || "") ||
      formData.currentLocation !== initialData.currentLocation ||
      formData.genderIdentity !== initialData.genderIdentity ||
      formData.sexualOrientation !== initialData.sexualOrientation ||
      (formData.coverImageUrl || "") !== (initialData.coverImageUrl || "") ||
      (formData.coverVideoUrl || "") !== (initialData.coverVideoUrl || "") ||
      (formData.characterProfileText || "") !== (initialData.characterProfileText || "") ||
      JSON.stringify(formData.voices || {}) !== JSON.stringify(initialData.voices || {}) ||
      JSON.stringify(formData.languageCharacteristics || {}) !==
        JSON.stringify(initialData.languageCharacteristics || {}) ||
      JSON.stringify(formData.linguisticStyleSamples || {}) !==
        JSON.stringify(initialData.linguisticStyleSamples || {}) ||
      JSON.stringify(formData.knowledgeSources || []) !==
        JSON.stringify(initialData.knowledgeSources || [])
    );
  };

  const dropdownCustomStyle = { border: "none", paddingLeft: "0", minWidth: 280 };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={handleCancel} />

      <div className="w-[50%] relative min-w-[600px] max-w-[800px] h-full bg-white shadow-xl flex flex-col">
        <PanelHeader
          characterId={selectedCharacter?.id}
          onClose={handleCancel}
          onDelete={handleDelete}
          hasCharacter={!!selectedCharacter}
          isNewCharacter={isNewCharacter}
          readOnly={readOnly}
        />

        <div className="flex-1 px-10 pt-6 pb-6 overflow-y-auto min-h-0 custom-scrollbar">
          <fieldset disabled={readOnly} className="space-y-4 min-w-0 border-0 p-0 m-0">
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
                onChange={e => handleFieldChange("age", parseInt(e.target.value) || "")}
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
              <CustomDropdownField
                customStyle={dropdownCustomStyle}
                options={GENDER_OPTIONS}
                placeholder="Select gender"
                defaultOption={
                  formData.gender ? GENDER_OPTIONS.find(opt => opt.value === formData.gender) : null
                }
                onHandleSelect={option => handleFieldChange("gender", option.value)}
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
              <CustomDropdownField
                customStyle={dropdownCustomStyle}
                options={GENDER_IDENTITY_OPTIONS}
                placeholder="Select gender identity"
                defaultOption={
                  formData.genderIdentity
                    ? GENDER_IDENTITY_OPTIONS.find(opt => opt.value === formData.genderIdentity)
                    : null
                }
                onHandleSelect={option => handleFieldChange("genderIdentity", option.value)}
              />
            </Field>

            <Field label="Sexual orientation" required>
              <CustomDropdownField
                customStyle={dropdownCustomStyle}
                options={SEXUAL_ORIENTATION_OPTIONS}
                placeholder="Select sexual orientation"
                defaultOption={
                  formData.sexualOrientation
                    ? SEXUAL_ORIENTATION_OPTIONS.find(
                        opt => opt.value === formData.sexualOrientation,
                      )
                    : null
                }
                onHandleSelect={option => handleFieldChange("sexualOrientation", option.value)}
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

            {/* Voice, style and samples are per language and describe the same
                thing — how this person sounds in that language — so one tab
                strip governs all three rather than three of them. */}
            {languageTabs.length > 0 && activeLanguageId && (
              <div className="flex flex-col gap-2 py-2">
                <span className="text-typography-900 text-base">
                  {en.simulation.voice} &amp; {en.simulation.languageStyle}
                </span>
                <LanguageTabPanel
                  tabs={languageTabs.map(tab => ({ id: tab.id, label: tab.label }))}
                  activeTabId={activeLanguageId}
                  onTabChange={setSelectedLanguageId}
                >
                  <div className="p-4 flex flex-col gap-4">
                    <Field label={en.simulation.voice}>
                      <DropdownField
                        id="character-voice"
                        label={en.simulation.voice}
                        isSearchable
                        handleSearchTextChange={setVoiceSearchTerm}
                        allowDeselect
                        borderless
                        options={voiceOptions}
                        optionsRenderer={renderVoiceOption}
                        value={activeVoiceId || ""}
                        onChange={value => setForActiveLanguage("voices", value || undefined)}
                        placeholder={en.simulation.selectVoice}
                      />
                    </Field>

                    <Field label={en.simulation.languageStyle}>
                      <TextArea
                        id="character-language-characteristics"
                        labelText={en.simulation.languageStyle}
                        hideLabel
                        value={
                          (activeLanguageId &&
                            (formData.languageCharacteristics ?? {})[activeLanguageId]) ||
                          ""
                        }
                        onChange={e =>
                          setForActiveLanguage("languageCharacteristics", e.target.value)
                        }
                        maxLength={1000}
                        placeholder={en.simulation.enterLanguageStyle}
                        rows={2}
                      />
                    </Field>

                    <Field label={en.simulation.dialectSamples}>
                      <DialectSamplesField
                        samples={activeSamples}
                        onChange={samples =>
                          setForActiveLanguage(
                            "linguisticStyleSamples",
                            samples.length ? samples : undefined,
                          )
                        }
                      />
                    </Field>
                  </div>
                </LanguageTabPanel>
              </div>
            )}

            <Field label={en.simulation.knowledgeSources}>
              <CharacterKnowledgeSourcesField
                sources={formData.knowledgeSources || []}
                onChange={sources => handleFieldChange("knowledgeSources", sources)}
              />
            </Field>

            <Field label="Cover Image">
              <div className="w-full">
                <FileUpload
                  id="coverImageUrl"
                  formMethods={formMethodsShim}
                  isMandatory={false}
                  label="Cover Image"
                  hideHeader={true}
                  fileType={FILE_TYPE.IMAGE}
                />
              </div>
            </Field>

            <Field label="Cover Video">
              <div className="w-full">
                <FileUpload
                  id="coverVideoUrl"
                  formMethods={formMethodsShim}
                  isMandatory={false}
                  label="Cover Video"
                  hideHeader={true}
                  fileType={FILE_TYPE.VIDEO}
                />
              </div>
            </Field>
          </fieldset>
        </div>

        <div className="flex items-center justify-center gap-4 p-4 bg-white shrink-0 mt-auto relative z-10 w-full">
          {readOnly ? (
            <Button
              variant={ButtonVariant.SECONDARY}
              onClick={handleCancel}
              className="min-w-[120px]"
            >
              {en.common.close}
            </Button>
          ) : (
            <>
              <Button
                variant={ButtonVariant.PRIMARY}
                onClick={handleSave}
                disabled={!isFormValid() || !hasFormChanged() || isCreating || isUpdating}
                className="min-w-[120px]"
              >
                {isCreating || isUpdating ? "Saving..." : en.common.save}
              </Button>
              <Button
                variant={ButtonVariant.SECONDARY}
                onClick={handleCancel}
                className="min-w-[120px]"
                disabled={isCreating || isUpdating}
              >
                {en.common.cancel}
              </Button>
            </>
          )}
        </div>
      </div>

      <ActionConfirmationPopup
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        title={en.common.delete}
        description={`${en.common.areYouSureYouWantToDelete} ${en.common.character}? ${en.common.thisActionCannotBeUndone}`}
        primaryButton={{
          label: en.common.delete,
          onClick: handleConfirmDelete,
          variant: ButtonVariant.DESTRUCTIVE,
        }}
        secondaryButton={{
          label: en.common.cancel,
          onClick: () => setShowDeleteConfirmation(false),
          variant: ButtonVariant.SECONDARY,
        }}
      />
    </div>
  );
};
