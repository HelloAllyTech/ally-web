import React, { useState, useCallback, useEffect } from "react";

import { DoubleArrowRight, Trash } from "@assets";
import { ActionConfirmationPopup, Button } from "@components";
import { ButtonVariant } from "@components/types";
import {
  en,
  GENDER_OPTIONS,
  GENDER_IDENTITY_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
} from "@constants";
import { useDebounce } from "@hooks";
import { CharacterData } from "@types";

interface CharacterSidePanelProps {
  selectedCharacter: CharacterData | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (characterId: string) => void;
  onSave: (character: CharacterData) => void;
  isNewCharacter?: boolean;
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}

const Field: React.FC<FieldProps> = ({ label, children, required = false }) => (
  <div className="flex flex-row items-center gap-4 mb-6">
    <label className="text-base font-regular text-typography-800 w-[40%] flex-shrink-0">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <div className="flex-1">{children}</div>
  </div>
);

const PanelHeader: React.FC<{
  characterId?: string;
  onClose: () => void;
  onDelete?: (characterId: string) => void;
  hasCharacter: boolean;
  isNewCharacter?: boolean;
}> = ({ characterId, onClose, onDelete, hasCharacter, isNewCharacter }) => (
  <div className="flex items-center justify-between p-6">
    <button
      onClick={onClose}
      className="flex flex-row items-center justify-center gap-2 text-typography-600 hover:text-neutral-800"
    >
      <DoubleArrowRight width={14} height={14} />
      <span className="text-base font-tertiary font-[500]">
        {isNewCharacter ? "Create character" : "Edit character"}
      </span>
    </button>
    {hasCharacter && !isNewCharacter && onDelete && (
      <button
        onClick={() => onDelete(characterId)}
        className="flex items-center gap-2 text-typography-900 hover:text-red-600"
      >
        <Trash width={14} height={14} />
        <span className="text-base font-tertiary font-medium">{en.common.delete}</span>
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
}) => {
  const [formData, setFormData] = useState<CharacterData>(
    selectedCharacter || {
      name: "",
      age: "",
      gender: "",
      profession: "",
      currentLocation: "",
      genderIdentity: "",
      sexualOrientation: "",
    },
  );
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (selectedCharacter) {
      setFormData(selectedCharacter);
      setHasChanges(false);
    }
  }, [selectedCharacter]);

  const debouncedUpdate = useDebounce(() => {
    if (!isNewCharacter && hasChanges) {
      onSave(formData);
    }
  }, 500);

  useEffect(() => {
    if (hasChanges) {
      debouncedUpdate();
    }
  }, [formData, hasChanges]);

  const handleFieldChange = useCallback(
    (fieldName: keyof CharacterData, value: string | number) => {
      setFormData(prev => ({
        ...prev,
        [fieldName]: value,
      }));
      setHasChanges(true);
    },
    [],
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

  const handleSave = useCallback(() => {
    onSave(formData);
    onClose();
  }, [formData, onSave, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  const isFormValid = () => {
    return (
      formData.name.trim() !== "" &&
      formData.age !== "" &&
      formData.gender !== "" &&
      formData.profession.trim() !== "" &&
      formData.currentLocation.trim() !== "" &&
      formData.genderIdentity !== "" &&
      formData.sexualOrientation !== ""
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={handleCancel} />

      <div className="w-[50%] min-w-[600px] max-w-[800px] bg-white shadow-xl flex flex-col">
        <PanelHeader
          characterId={selectedCharacter?.id}
          onClose={handleCancel}
          onDelete={handleDelete}
          hasCharacter={!!selectedCharacter}
          isNewCharacter={isNewCharacter}
        />

        <div className="flex px-10 pt-6 pb-6 overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar">
          <div className="space-y-4">
            <Field label="Name" required>
              <input
                type="text"
                value={formData.name}
                onChange={e => handleFieldChange("name", e.target.value)}
                placeholder="Enter name"
                className="w-full px-0 py-2 text-base border-none focus:outline-none"
              />
            </Field>

            <Field label="Age" required>
              <input
                type="number"
                value={formData.age}
                onChange={e => handleFieldChange("age", parseInt(e.target.value) || "")}
                placeholder="Enter age"
                min="0"
                max="150"
                className="w-full px-0 py-2 text-base border-none focus:outline-none"
              />
            </Field>

            <Field label="Gender" required>
              <select
                value={formData.gender}
                onChange={e => handleFieldChange("gender", e.target.value)}
                className="w-full px-0 py-2 text-base border-none focus:outline-none bg-white"
              >
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Profession" required>
              <input
                type="text"
                value={formData.profession}
                onChange={e => handleFieldChange("profession", e.target.value)}
                placeholder="Enter profession"
                className="w-full px-0 py-2 text-base border-none focus:outline-none"
              />
            </Field>

            <Field label="Current location" required>
              <input
                type="text"
                value={formData.currentLocation}
                onChange={e => handleFieldChange("currentLocation", e.target.value)}
                placeholder="Enter current location"
                className="w-full px-0 py-2 text-base border-none focus:outline-none"
              />
            </Field>

            <Field label="Gender identity" required>
              <select
                value={formData.genderIdentity}
                onChange={e => handleFieldChange("genderIdentity", e.target.value)}
                className="w-full px-0 py-2 text-base border-none focus:outline-none bg-white"
              >
                <option value="">Select gender identity</option>
                {GENDER_IDENTITY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Sexual orientation" required>
              <select
                value={formData.sexualOrientation}
                onChange={e => handleFieldChange("sexualOrientation", e.target.value)}
                className="w-full px-0 py-2 text-base border-none focus:outline-none bg-white"
              >
                <option value="">Select sexual orientation</option>
                {SEXUAL_ORIENTATION_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 p-6">
          <Button
            variant={ButtonVariant.PRIMARY}
            onClick={handleSave}
            disabled={!isFormValid()}
            className="min-w-[120px]"
          >
            {en.common.save}
          </Button>
          <Button
            variant={ButtonVariant.SECONDARY}
            onClick={handleCancel}
            className="min-w-[120px]"
          >
            {en.common.cancel}
          </Button>
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
