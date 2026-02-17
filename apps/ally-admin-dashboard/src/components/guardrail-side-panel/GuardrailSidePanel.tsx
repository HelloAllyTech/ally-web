import React, { useEffect, useState } from "react";

import { toast } from "sonner";

import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import { DoubleArrowRight, Trash } from "@assets";
import { Button } from "@components/button/Button";
import { ToggleSwitch } from "@components/toggle-switch/ToggleSwitch";
import { ButtonVariant } from "@components/types";

interface GuardrailSidePanelProps {
  selectedGuardrail: any | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: any) => Promise<void>;
  onCreate: (guardrail: any) => Promise<void>;
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
  multiline?: boolean;
  required?: boolean;
}

const Field: React.FC<FieldProps> = ({ label, children, multiline = false, required = false }) => (
  <div
    className={`flex flex-row min-h-[40px] ${multiline ? "items-start" : "items-center"} text-base justify-between`}
  >
    <div className={`w-[40%] ${multiline && "mt-[8px]"}`}>
      <span className="text-base font-regular text-typography-800">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </span>
    </div>
    <div className="w-[60%] flex text-left justify-start text-neutral-800">{children}</div>
  </div>
);

const PanelHeader: React.FC<{
  onClose: () => void;
  isNew: boolean;
  onDelete?: () => void;
}> = ({ onClose, isNew, onDelete }) => (
  <div className="flex items-center justify-between p-6">
    <button
      onClick={onClose}
      className="flex flex-row items-center justify-center gap-2 text-typography-600 hover:text-neutral-800"
    >
      <DoubleArrowRight width={14} height={14} />
      <span className="text-base font-tertiary font-[500]">
        {isNew ? "Create guardrail" : "Edit guardrail"}
      </span>
    </button>
    {!isNew && onDelete && (
      <button onClick={onDelete} className="flex items-center gap-2 text-red-600">
        <Trash width={14} height={14} />
        <span className="text-base font-medium">Delete</span>
      </button>
    )}
  </div>
);

export const GuardrailSidePanel: React.FC<GuardrailSidePanelProps> = ({
  selectedGuardrail,
  isOpen,
  onClose,
  onDelete,
  onUpdate,
  onCreate,
}) => {
  const [formData, setFormData] = useState<any>(selectedGuardrail || {});

  useEffect(() => {
    if (selectedGuardrail) {
      setFormData(selectedGuardrail);
    }
  }, [selectedGuardrail]);

  if (!isOpen) return null;

  const isNew = !formData.id;

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (
      !formData.name?.trim() ||
      !formData.helperDialogue?.trim() ||
      !formData.actorDialogue?.trim()
    ) {
      toast.error("Name, Helper Dialogue and Actor Dialogue are mandatory fields.");
      return;
    }

    try {
      if (isNew) {
        await onCreate(formData);
      } else {
        await onUpdate(formData.id, formData);
        toast.success("Guardrail updated successfully");
      }
      onClose();
    } catch {
      toast.error("Failed to save guardrail");
    }
  };

  const isFormValid =
    formData.name?.trim() && formData.helperDialogue?.trim() && formData.actorDialogue?.trim();

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={onClose} />
      <div className="w-[50%] min-w-[700px] bg-white shadow-xl border-l-[1px] border-border-light overflow-y-auto custom-scrollbar">
        <PanelHeader
          onClose={onClose}
          isNew={isNew}
        />

        <div className="h-[calc(100vh-100px)] px-10 pl-[46px] pt-2 overflow-y-auto custom-scrollbar">
          <div className="mb-4">
            <input
              type="text"
              value={formData.name || ""}
              onChange={e => handleChange("name", e.target.value)}
              placeholder={isNew ? "New Guardrail" : "Edit Guardrail"}
              className="text-2xl font-light text-typography-900 bg-transparent border-none outline-none w-full placeholder-typography-400 focus:placeholder-typography-300"
              autoFocus={isNew}
            />
          </div>

          <div className="space-y-3">
            <Field
              label="Helper Dialogue (If helper said something that can be classified as)"
              multiline={true}
              required={true}
            >
              <AutoExpandableTextarea
                value={formData.helperDialogue || ""}
                onChange={val => handleChange("helperDialogue", val)}
                placeholder="e.g. rude"
                minHeight={20}
                className="py-2 pt-[16px] px-0 border-none focus:outline-none text-base w-full resize-none"
              />
            </Field>

            <Field
              label="Actor Dialogue (Actor should start by saying)"
              multiline={true}
              required={true}
            >
              <AutoExpandableTextarea
                value={formData.actorDialogue || ""}
                onChange={val => handleChange("actorDialogue", val)}
                placeholder="e.g. why are you talking to me like that?"
                minHeight={20}
                className="py-2 pt-[16px] px-0 border-none focus:outline-none text-base w-full resize-none"
              />
            </Field>

            <Field label="Active">
              <ToggleSwitch
                enabled={formData.active !== false}
                onChange={enabled => handleChange("active", enabled)}
              />
            </Field>
          </div>

          <div className="flex gap-3 mt-8 pb-6 justify-center">
            <Button variant={ButtonVariant.PRIMARY} onClick={handleSave} disabled={!isFormValid}>
              {isNew ? "Save" : "Save"}
            </Button>
            <Button variant={ButtonVariant.SECONDARY} onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
