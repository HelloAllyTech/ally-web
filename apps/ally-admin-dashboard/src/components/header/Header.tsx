import { FC } from "react";

import { toast } from "sonner";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { ArrowDown } from "@assets";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";

interface HeaderProps {
  isValid: boolean;
  onBack: () => void;
  onSaveDraft?: () => Promise<any[]>;
  onPublish?: () => void;
  onPreview?: () => void;
  isPublishing?: boolean;
  title: string;
  showPreview?: boolean;
  type?: "Simulation" | "Track" | "Case";
}

export const Header: FC<HeaderProps> = ({
  isValid,
  onBack,
  onSaveDraft,
  onPublish,
  onPreview,
  isPublishing = false,
  title,
  showPreview = true,
  type,
}) => {
  const handleSaveDraft = async () => {
    const response = await onSaveDraft();
    if (response) {
      toast.success(`${type} changes saved successfully!`);
    }
  };

  const publishButton = (
    <Button
      variant={ButtonVariant.PRIMARY}
      onClick={onPublish}
      disabled={!isValid || isPublishing}
      className="px-4 py-1 h-[40px] text-white"
    >
      {isPublishing ? en.simulation.publishing : en.simulation.publish}
    </Button>
  );
  const previewButton = (
    <Button
      variant={ButtonVariant.TEXT}
      onClick={onPreview}
      disabled={!isValid}
      className={`${isValid ? "text-primary-500" : "text-typography-600 cursor-not-allowed"}`}
    >
      {en.simulation.preview}
    </Button>
  );

  return (
    <>
      <div className="flex items-center px-2 py-4 gap-2">
        <span className="text-typography-800 cursor-pointer" onClick={onBack}>
          {en.simulation.rolePlays}
        </span>
        <span className="-rotate-90">
          <ArrowDown />
        </span>
        <span className="text-typography-900">{title}</span>
      </div>
      <div className="flex items-center justify-between w-full px-2 pb-2 h-[80px] relative">
        <h1 className="text-2xl text-typography-900 whitespace-nowrap">{title}</h1>
        <div className="flex items-center gap-3">
          <Button
            variant={ButtonVariant.TEXT}
            onClick={handleSaveDraft}
            className="px-4 py-1 h-[36px] text-typography-900"
          >
            {en.simulation.save}
          </Button>
          {showPreview &&
            (isValid ? (
              previewButton
            ) : (
              <Tooltip label={en.simulation.previewTooltipMessage} align="top">
                <span>{previewButton}</span>
              </Tooltip>
            ))}
          {isValid ? (
            publishButton
          ) : (
            <Tooltip label={en.simulation.publishTooltipMessage} align="top">
              <span>{publishButton}</span>
            </Tooltip>
          )}
        </div>
      </div>
    </>
  );
};
