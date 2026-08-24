import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { toast } from "sonner";

import { Button, TextArea, TextInput } from "@ally-ui-mono/ui-shared";
import { useCreateCharacterMutation } from "@api";
import { ArrowLeft, CloseIcon } from "@assets";
import {
  characterLibraryStrings as strings,
  GENDER_IDENTITY_OPTIONS,
  GENDER_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
} from "@constants";
import { CharacterData } from "@types";

import { ButtonVariant } from "../button";
import ConfirmationDialog from "../confirmation-dialog";
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

/** The seven fields the backend rejects a create without. */
const REQUIRED_FIELDS = [
  "name",
  "age",
  "gender",
  "profession",
  "currentLocation",
  "genderIdentity",
  "sexualOrientation",
] as const;

type RequiredField = (typeof REQUIRED_FIELDS)[number];

const TITLE_ID = "character-form-panel-title";

interface FieldProps {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  /** Inline validation message, shown only after a save attempt. */
  error?: string;
}

const Field: React.FC<FieldProps> = ({ label, children, required = false, error }) => (
  <div className="flex flex-row items-start gap-4 mb-6">
    <label className="text-base font-regular text-typography-800 w-[40%] flex-shrink-0 mt-2">
      {label}
      {required && (
        <span aria-hidden className="text-red-500 ml-1">
          *
        </span>
      )}
    </label>
    <div className="flex-1 w-full">
      {children}
      {/* role="alert" so a screen reader hears why Save didn't go through —
          the button used to just sit there disabled, saying nothing. */}
      {error && (
        <p role="alert" className="mt-1 text-xs text-destructive-500">
          {error}
        </p>
      )}
    </div>
  </div>
);

const NativeSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  ariaLabel: string;
  invalid?: boolean;
}> = ({ value, onChange, options, placeholder, ariaLabel, invalid }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    aria-label={ariaLabel}
    aria-invalid={invalid || undefined}
    className={`w-full text-base border-b bg-transparent py-2 focus:outline-none focus:border-primary-500 ${
      invalid ? "border-destructive-500" : "border-border-light"
    }`}
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
  // Empty until the admin actually tries to save, so a half-filled form isn't
  // pre-shouted at.
  const [missingFields, setMissingFields] = useState<Set<RequiredField>>(new Set());
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);

  const baseline = useMemo(() => initialCharacter || emptyCharacter, [initialCharacter]);
  const fieldRefs = useRef<Partial<Record<RequiredField, HTMLElement | null>>>({});
  // Focus goes back where it came from on close, rather than to the top of
  // the document.
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    setFormData(baseline);
    setMissingFields(new Set());
    triggerRef.current = document.activeElement;
    // Land focus inside the panel on the first field, so keyboard and screen
    // reader users start in the dialog instead of behind it.
    const timer = setTimeout(() => fieldRefs.current.name?.focus(), 0);
    return () => clearTimeout(timer);
  }, [isOpen, baseline]);

  const handleFieldChange = useCallback((fieldName: keyof CharacterData, value: unknown) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    setMissingFields(prev => {
      if (!prev.has(fieldName as RequiredField)) return prev;
      const next = new Set(prev);
      next.delete(fieldName as RequiredField);
      return next;
    });
  }, []);

  const isDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(baseline),
    [formData, baseline],
  );

  const findMissingFields = useCallback(() => {
    const missing = new Set<RequiredField>();
    REQUIRED_FIELDS.forEach(field => {
      const value = formData[field];
      if (value === null || value === undefined || String(value).trim() === "") missing.add(field);
    });
    return missing;
  }, [formData]);

  /**
   * Closing discards everything typed — the backdrop used to swallow a
   * half-written character on a stray click with no warning. Only ask when
   * there's actually something to lose.
   */
  const requestClose = useCallback(() => {
    if (isCreating) return;
    if (isDirty) {
      setIsDiscardConfirmOpen(true);
      return;
    }
    onClose();
    (triggerRef.current as HTMLElement | null)?.focus?.();
  }, [isCreating, isDirty, onClose]);

  const confirmDiscard = useCallback(() => {
    setIsDiscardConfirmOpen(false);
    onClose();
    (triggerRef.current as HTMLElement | null)?.focus?.();
  }, [onClose]);

  // Escape closes the panel, the way every other dialog in the app does.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Let the discard confirmation own Escape while it's the top layer.
      if (isDiscardConfirmOpen) return;
      event.stopPropagation();
      requestClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isDiscardConfirmOpen, requestClose]);

  const handleSave = useCallback(async () => {
    // Save stays enabled and explains itself on click. Disabling it left the
    // admin staring at a greyed button with no clue which of seven required
    // fields — several of them scrolled out of sight — was still blank.
    const missing = findMissingFields();
    if (missing.size > 0) {
      setMissingFields(missing);
      toast.error(strings.requiredFieldsMissing);
      const firstMissing = REQUIRED_FIELDS.find(field => missing.has(field));
      if (firstMissing) {
        const node = fieldRefs.current[firstMissing];
        node?.scrollIntoView({ block: "center", behavior: "smooth" });
        node?.focus();
      }
      return;
    }

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
  }, [formData, findMissingFields, createCharacter, onSave, onClose]);

  const errorFor = (field: RequiredField) =>
    missingFields.has(field) ? strings.requiredField : undefined;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop is presentational: Escape and the two labelled close
          controls are the keyboard-reachable ways out. */}
      <div className="flex-1 bg-black bg-opacity-50" aria-hidden onClick={requestClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        // Full width below `sm`: min-w-[600px] alone overflowed a phone
        // viewport, pushing the panel's own footer buttons off-screen.
        className="w-full sm:w-[50%] relative sm:min-w-[600px] max-w-[800px] h-full bg-white shadow-xl flex flex-col"
      >
        <div className="flex items-center justify-between p-6">
          <button
            onClick={requestClose}
            className="flex flex-row items-center justify-center gap-2 text-typography-600 hover:text-neutral-800"
          >
            <ArrowLeft width={14} height={14} />
            <span id={TITLE_ID} className="text-base font-tertiary font-[500]">
              {strings.createNewCharacter}
            </span>
          </button>
          {/* The back arrow doubled as the title, which read as a heading
              rather than as the way out. Give the panel a real close control. */}
          <button
            type="button"
            onClick={requestClose}
            aria-label={strings.closeForm}
            className="rounded p-1 text-typography-600 hover:bg-surface-100 hover:text-neutral-800"
          >
            <CloseIcon width={14} height={14} />
          </button>
        </div>

        <div className="flex-1 px-10 pt-6 pb-6 overflow-y-auto min-h-0 custom-scrollbar">
          <Field label="Name" required error={errorFor("name")}>
            <TextInput
              id="character-name"
              labelText="Name"
              hideLabel
              ref={(node: HTMLInputElement | null) => {
                fieldRefs.current.name = node;
              }}
              value={formData.name}
              onChange={e => handleFieldChange("name", e.target.value)}
              placeholder="Enter name"
              invalid={missingFields.has("name")}
              className="w-full"
            />
          </Field>

          <Field label="Age" required error={errorFor("age")}>
            <input
              type="number"
              ref={node => {
                fieldRefs.current.age = node;
              }}
              value={formData.age}
              // Parse explicitly rather than `parseInt(...) || ""`, which
              // treated a typed 0 as empty.
              onChange={e => {
                const raw = e.target.value;
                if (raw === "") return handleFieldChange("age", "");
                const parsed = Number.parseInt(raw, 10);
                handleFieldChange("age", Number.isNaN(parsed) ? "" : parsed);
              }}
              placeholder="0"
              min="0"
              max="150"
              aria-label="Age"
              aria-invalid={missingFields.has("age") || undefined}
              // Matches the underline every sibling field has; this one used
              // to sit borderless in the middle of the form.
              className={`w-full px-0 py-2 text-base bg-transparent border-b focus:outline-none focus:border-primary-500 ${
                missingFields.has("age") ? "border-destructive-500" : "border-border-light"
              }`}
              // Scrolling over a focused number input silently changes its
              // value in the browser — blur so the page scrolls instead.
              onWheel={e => e.currentTarget.blur()}
            />
          </Field>

          <Field label="Gender" required error={errorFor("gender")}>
            <NativeSelect
              value={formData.gender}
              onChange={value => handleFieldChange("gender", value)}
              options={GENDER_OPTIONS}
              placeholder="Select gender"
              ariaLabel="Gender"
              invalid={missingFields.has("gender")}
            />
          </Field>

          <Field label="Profession" required error={errorFor("profession")}>
            <TextInput
              id="character-profession"
              labelText="Profession"
              hideLabel
              value={formData.profession || ""}
              onChange={e => handleFieldChange("profession", e.target.value)}
              placeholder="Enter profession"
              invalid={missingFields.has("profession")}
              className="w-full"
            />
          </Field>

          <Field label="Current location" required error={errorFor("currentLocation")}>
            <TextInput
              id="character-current-location"
              labelText="Current location"
              hideLabel
              value={formData.currentLocation}
              onChange={e => handleFieldChange("currentLocation", e.target.value)}
              placeholder="Enter current location"
              invalid={missingFields.has("currentLocation")}
              className="w-full"
            />
          </Field>

          <Field label="Gender identity" required error={errorFor("genderIdentity")}>
            <NativeSelect
              value={formData.genderIdentity}
              onChange={value => handleFieldChange("genderIdentity", value)}
              options={GENDER_IDENTITY_OPTIONS}
              placeholder="Select gender identity"
              ariaLabel="Gender identity"
              invalid={missingFields.has("genderIdentity")}
            />
          </Field>

          <Field label="Sexual orientation" required error={errorFor("sexualOrientation")}>
            <NativeSelect
              value={formData.sexualOrientation}
              onChange={value => handleFieldChange("sexualOrientation", value)}
              options={SEXUAL_ORIENTATION_OPTIONS}
              placeholder="Select sexual orientation"
              ariaLabel="Sexual orientation"
              invalid={missingFields.has("sexualOrientation")}
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
            disabled={isCreating}
            className="min-w-[120px]"
          >
            {isCreating ? "Saving..." : strings.save}
          </Button>
          <Button
            kind="secondary"
            onClick={requestClose}
            className="min-w-[120px]"
            disabled={isCreating}
          >
            {strings.cancel}
          </Button>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={isDiscardConfirmOpen}
        onClose={() => setIsDiscardConfirmOpen(false)}
        title={{ normal: strings.discardConfirmTitle, italic: strings.discardConfirmTitleItalic }}
        content={strings.discardConfirmDescription}
        buttonText={strings.discardConfirmLeave}
        buttonVariant={ButtonVariant.DESTRUCTIVE}
        onButtonClick={confirmDiscard}
        secondaryButtonText={strings.discardConfirmStay}
        secondaryButtonVariant={ButtonVariant.SECONDARY}
        onSecondaryButtonClick={() => setIsDiscardConfirmOpen(false)}
      />
    </div>
  );
};
