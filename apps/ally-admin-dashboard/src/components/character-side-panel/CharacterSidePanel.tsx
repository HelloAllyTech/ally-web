import React, { useState, useCallback, useEffect, useRef } from "react";

import { toast } from "sonner";

import { useCreateCharacterMutation, useUpdateCharacterMutation } from "@api";
import { DoubleArrowRight, Trash } from "@assets";
import { ActionConfirmationPopup, Button, CustomDropdownField } from "@components";
import { ButtonVariant } from "@components/types";
import {
  en,
  GENDER_OPTIONS,
  GENDER_IDENTITY_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
} from "@constants";
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
  const [initialData, setInitialData] = useState<CharacterData>(
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
  const isSavingRef = useRef(false);

  const [createCharacter, { isLoading: isCreating }] = useCreateCharacterMutation();
  const [updateCharacter, { isLoading: isUpdating }] = useUpdateCharacterMutation();

  useEffect(() => {
    if (selectedCharacter) {
      setFormData(selectedCharacter);
      setInitialData(selectedCharacter);
    }
  }, [selectedCharacter]);

  const handleFieldChange = useCallback(
    (fieldName: keyof CharacterData, value: string | number) => {
      setFormData(prev => ({
        ...prev,
        [fieldName]: value,
      }));
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

  const handleSave = useCallback(async () => {
    // Prevent multiple simultaneous save operations
    if (isSavingRef.current) {
      return;
    }

    isSavingRef.current = true;

    try {
      const { id, ...data } = formData;

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
      formData.sexualOrientation !== initialData.sexualOrientation
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
        />

        <div className="flex px-10 pt-6 pb-6 overflow-y-auto h-full custom-scrollbar">
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
                placeholder="0"
                min="0"
                max="150"
                className="min-w-[60px] px-0 py-2 text-base border-none focus:outline-none"
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

            <Field label="Profession">
              <input
                type="text"
                value={formData.profession || ""}
                onChange={e => handleFieldChange("profession", e.target.value || null)}
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
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 p-6">
          <Button
            variant={ButtonVariant.PRIMARY}
            onClick={handleSave}
            disabled={!isFormValid() || !hasFormChanged() || isCreating || isUpdating}
            className="min-w-[120px]"
          >
            {isCreating || isUpdating
              ? "Saving..."
              : isNewCharacter
                ? en.common.create
                : en.common.update}
          </Button>
          <Button
            variant={ButtonVariant.SECONDARY}
            onClick={handleCancel}
            className="min-w-[120px]"
            disabled={isCreating || isUpdating}
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
