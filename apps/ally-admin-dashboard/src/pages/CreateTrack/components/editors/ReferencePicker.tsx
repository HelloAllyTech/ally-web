import { FC, useState } from "react";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { SimulationSelectionModal } from "@components";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { GetScenarioType } from "@types";

interface ReferencePickerProps {
  entityType: "simulation" | "case";
  /** Currently picked reference, if any. */
  selected: {
    id: number | string | null;
    title?: string;
    coverImageUrl?: string;
  };
  onSelect: (row: GetScenarioType | null) => void;
  disabled?: boolean;
}

/**
 * Reusable "pick one simulation/case" control for the roleplay and case editors.
 * Wraps `SimulationSelectionModal` in single-select mode and renders the picked
 * card + a Change button (the caller owns the selected-card presentation).
 */
export const ReferencePicker: FC<ReferencePickerProps> = ({
  entityType,
  selected,
  onSelect,
  disabled = false,
}) => {
  const [showModal, setShowModal] = useState(false);

  const toggleModal = () => setShowModal(prev => !prev);

  // The single-select modal returns its picks through setSelectedSimulations.
  const handleSelectionChange = (rows: GetScenarioType[]) => {
    onSelect(rows.length > 0 ? rows[0] : null);
  };

  const selectedRows: GetScenarioType[] =
    selected.id != null
      ? [
          {
            scenarioId: Number(selected.id),
            order: 1,
            coverImageUrl: selected.coverImageUrl ?? "",
            title: selected.title ?? "",
            description: "",
            minimumScore: 0,
            messageTitle: "",
            messageContent: "",
          },
        ]
      : [];

  const label = entityType === "case" ? "case" : "simulation";

  return (
    <div className="flex flex-col gap-3">
      {selected.id != null ? (
        <div className="flex items-center gap-3 border border-border-light rounded-md p-3">
          <div className="w-24 h-14 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
            <CustomImage
              src={selected.coverImageUrl ?? ""}
              alt={selected.title ?? ""}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-typography-900 truncate">
              {selected.title || `Selected ${label}`}
            </p>
            <p className="text-xs text-typography-500 capitalize">{label}</p>
          </div>
          {!disabled && (
            <Button
              variant={ButtonVariant.SECONDARY}
              className="!h-9 !px-3 text-sm"
              onClick={toggleModal}
            >
              Change
            </Button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={toggleModal}
          disabled={disabled}
          className="w-full border border-dashed border-border-dark rounded-md py-6 text-sm text-typography-600 hover:bg-secondary-50 disabled:opacity-50"
        >
          + Select a {label}
        </button>
      )}

      <SimulationSelectionModal
        showSimulation={showModal}
        toggleSimulationModal={toggleModal}
        selectionMode="single"
        entityType={entityType}
        selectedSimulations={selectedRows}
        setSelectedSimulations={handleSelectionChange}
      />
    </div>
  );
};
