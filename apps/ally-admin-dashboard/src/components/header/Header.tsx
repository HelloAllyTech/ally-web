import { FC } from "react";

import { Tooltip } from "@mui/material";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { ArrowDown } from "@assets";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en, toolTipStyles } from "@constants";

interface HeaderProps {
  isValid: boolean;
  onBack: () => void;
  onSaveDraft: () => Promise<any[]>;
  onPublish: () => void;
  onPreview: () => void;
  isPublishing?: boolean;
}

export const Header: FC<HeaderProps> = ({
  isValid,
  onBack,
  onSaveDraft,
  onPublish,
  onPreview,
  isPublishing = false,
}) => {
  const id = useParams();

  const handleSaveDraft = async () => {
    const response = await onSaveDraft();
    if (response) {
      toast.success("Simulation changes saved successfully!");
    } else {
      toast.error("Failed to save simulation changes!");
    }
  };

  const publishButton = (
    <Button
      variant={ButtonVariant.SECONDARY}
      onClick={onPublish}
      disabled={!isValid || isPublishing}
      className={`px-4 py-1 h-[40px] text-white border-gray-200  ${isValid && !isPublishing ? "bg-blue-700 hover:bg-blue-800" : "bg-gray-300 cursor-not-allowed"}`}
    >
      {isPublishing ? en.simulation.publishing : en.simulation.publish}
    </Button>
  );
  const previewButton = (
    <Button
      variant={ButtonVariant.TEXT}
      onClick={onPreview}
      disabled={!isValid}
      className={`${isValid ? "text-blue-700" : "text-gray-400 cursor-not-allowed"}`}
    >
      {en.simulation.preview}
    </Button>
  );

  return (
    <>
      <div className="flex items-center px-2 py-4 gap-2">
        <span className="text-gray-600 cursor-pointer" onClick={onBack}>
          {en.simulation.simulationstudio}
        </span>
        <span className="-rotate-90">
          <ArrowDown />
        </span>
        <span className="text-blue-700">
          {id.id ? en.simulation.editSimulation : en.simulation.createSimulation}
        </span>
      </div>
      <div className="flex items-center justify-between w-full px-2 pb-2 h-[80px] relative">
        <h1 className="text-[24px] text-gray-900 whitespace-nowrap">
          {id.id ? en.simulation.editSimulation : en.simulation.createNewSimulation}
        </h1>
        <div className="flex items-center gap-3">
          <Button
            variant={ButtonVariant.TEXT}
            onClick={handleSaveDraft}
            className="px-4 py-1 h-[36px]"
          >
            {en.simulation.save}
          </Button>
          {isValid ? (
            previewButton
          ) : (
            <Tooltip
              title={en.simulation.previewTooltipMessage}
              placement="top"
              arrow
              slotProps={toolTipStyles}
            >
              {previewButton}
            </Tooltip>
          )}
          {isValid ? (
            publishButton
          ) : (
            <Tooltip
              title={en.simulation.publishTooltipMessage}
              placement="top"
              arrow
              slotProps={toolTipStyles}
            >
              {publishButton}
            </Tooltip>
          )}
        </div>
      </div>
    </>
  );
};
