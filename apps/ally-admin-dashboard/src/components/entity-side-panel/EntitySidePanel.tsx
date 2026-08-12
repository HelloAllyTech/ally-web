import React, { useCallback, useState } from "react";

import { DoubleArrowRight } from "@assets";
import { ActionConfirmationPopup, Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";

interface EntitySidePanelProps {
  isOpen: boolean;
  title: string;
  /** When true, closing prompts an "unsaved changes" confirmation. */
  dirty?: boolean;
  saveDisabled?: boolean;
  /** Shown as the Save button's tooltip while it is disabled — say WHY, not "invalid". */
  saveDisabledReason?: string;
  /**
   * Warning text for the unsaved-changes confirmation.
   *
   * A prop rather than a single shared string: three en.ts blocks (aiLab, tooltip, simulation)
   * already carry their own copy of this sentence, so consolidating them is a separate cleanup.
   * Passing it in lets each caller keep the string it already uses without this component picking a
   * winner.
   */
  unsavedChangesWarning?: string;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
}

/**
 * Shared slide-over shell for admin create/edit forms.
 *
 * Promoted from AI Lab's LabSidePanel rather than copied. Mirrors TooltipSidePanel's look (overlay +
 * right panel + Save/Cancel footer) and guards against discarding unsaved edits.
 */
export const EntitySidePanel: React.FC<EntitySidePanelProps> = ({
  isOpen,
  title,
  dirty = false,
  saveDisabled = false,
  saveDisabledReason,
  unsavedChangesWarning,
  onClose,
  onSave,
  children,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClose = useCallback(() => {
    if (dirty) {
      setShowConfirm(true);
    } else {
      onClose();
    }
  }, [dirty, onClose]);

  const confirmClose = useCallback(() => {
    setShowConfirm(false);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={handleClose} />
      <div className="w-[50%] min-w-[700px] bg-white shadow-xl border-l-[1px] border-border-light flex flex-col">
        <div className="flex items-center justify-between p-6">
          <button
            onClick={handleClose}
            className="flex flex-row items-center justify-center gap-2 text-typography-600 hover:text-neutral-800"
          >
            <DoubleArrowRight width={14} height={14} />
            <span className="text-base font-tertiary font-[500]">{title}</span>
          </button>
        </div>

        <div className="flex-1 min-h-0 px-10 pt-2 overflow-y-auto custom-scrollbar">
          <div className="space-y-4">{children}</div>

          <div className="flex gap-3 mt-8 pb-6 justify-center">
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={onSave}
              disabled={saveDisabled}
              title={saveDisabled ? saveDisabledReason : undefined}
            >
              {en.common.save}
            </Button>
            <Button variant={ButtonVariant.SECONDARY} onClick={handleClose}>
              {en.common.cancel}
            </Button>
          </div>
        </div>
      </div>

      <ActionConfirmationPopup
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Unsaved Changes"
        description={
          unsavedChangesWarning ?? "You have unsaved changes. Are you sure you want to close?"
        }
        primaryButton={{ label: "Close Anyway", onClick: confirmClose }}
        secondaryButton={{ label: "Keep Editing", onClick: () => setShowConfirm(false) }}
      />
    </div>
  );
};

/** Labelled field wrapper used inside the admin side panels. */
export const EntityField: React.FC<{
  label: string;
  required?: boolean;
  help?: string;
  children: React.ReactNode;
}> = ({ label, required, help, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm text-typography-900 font-primary">
      {label}
      {required && <span className="text-destructive-500 ml-1">*</span>}
    </label>
    {children}
    {help && <span className="text-xs text-typography-400">{help}</span>}
  </div>
);
