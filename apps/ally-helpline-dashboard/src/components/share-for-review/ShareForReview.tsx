import { useCallback, useEffect, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { CustomImage, CustomVideo } from "@ally-ui-mono/ui-shared/index";
import { ArrowDownBlue, CloseIcon } from "@assets";
import { Button } from "@components";
import { useClickOutside } from "@hooks";
import { getFormattedDateTime, getFormattedTimeFromDuration } from "@utils";

export interface ShareForReviewProps {
  isOpen: boolean;
  onClose: () => void;
  summaryDetails: any;
  onNoteChange: (note: string) => void;
}

interface ScenarioDetailsScenario {
  title?: string;
  description?: string;
  coverVideoUrl?: string | null;
  coverImageUrl?: string;
}

const formatCallDuration = (callDurationMs: number | undefined): string => {
  const ms = callDurationMs ?? 0;
  const seconds = Math.floor(ms / 1000);
  return seconds < 60 ? `${seconds} sec` : `${getFormattedTimeFromDuration(seconds, "mm:ss")} min`;
};

const ModalHeader = ({ title, onClose }: { title: string; onClose: () => void }) => (
  <div className="flex items-center justify-between border-b border-border pb-3 text-lg">
    {title}
    <button type="button" onClick={onClose} aria-label="Close">
      <CloseIcon />
    </button>
  </div>
);

const NoteTextarea = ({
  note,
  onNoteChange,
}: {
  note?: string;
  onNoteChange: (note: string) => void;
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      onNoteChange(value);
      const el = textareaRef.current;
      if (el) {
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      }
    },
    [onNoteChange],
  );

  return (
    <textarea
      ref={textareaRef}
      placeholder="Add a note..."
      rows={1}
      onChange={handleInput}
      className="outline-none border-none placeholder:text-typography-400 placeholder:text-md font-primary text-lg font-normal overflow-hidden resize-none"
      value={note ?? ""}
    />
  );
};

const SubSection = ({
  createdAt,
  callDurationMs,
}: {
  createdAt: string | undefined;
  callDurationMs: number | undefined;
}) => {
  const { t } = useTranslation();
  const formattedDate = getFormattedDateTime(createdAt, "MMM dd, yyyy hh:mm a");
  const formattedDuration = formatCallDuration(callDurationMs);

  return (
    <div className="flex items-center gap-1 text-typography-600 font-primary text-sm">
      {t("review.details.dateAndTime")}: {formattedDate}
      <span className="w-1 h-1 bg-neutral-500 rounded-full mx-1" aria-hidden />
      <span className="font-primary leading-4">{formattedDuration}</span>
    </div>
  );
};

const ScenarioMedia = ({ scenario }: { scenario: ScenarioDetailsScenario }) => {
  if (!scenario) return null;
  if (scenario.coverVideoUrl != null) {
    return (
      <CustomVideo
        src={scenario.coverVideoUrl}
        alt="Scenario Cover Video"
        className="w-full h-1/2 object-cover"
      />
    );
  }
  return (
    <CustomImage
      src={scenario.coverImageUrl}
      alt="Scenario Cover Image"
      className="w-full h-1/2 object-cover"
    />
  );
};

const DescriptionToggle = ({
  description,
  isExpanded,
  onToggle,
}: {
  description: string | undefined;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  if (!description) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="text-md font-medium text-primary-600 hover:text-primary-700 text-left"
    >
      {isExpanded ? (
        <span className="flex">
          View less <ArrowDownBlue className="rotate-180 w-8 h-8" />
        </span>
      ) : (
        <span className="flex items-center">
          View more
          <ArrowDownBlue className="w-8 h-8" />
        </span>
      )}
    </button>
  );
};

const ScenarioDetails = ({
  scenario,
}: {
  scenario: ScenarioDetailsScenario | undefined | null;
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const toggleDescription = useCallback(() => {
    setIsDescriptionExpanded(prev => !prev);
  }, []);

  if (!scenario) return null;

  return (
    <div className="rounded-lg flex gap-4 border border-border-light p-5 items-start">
      <div className="w-1/3">
        <ScenarioMedia scenario={scenario} />
      </div>
      <div className="flex flex-col gap-2 w-2/3">
        <h3 className="text-lg text-typography-900">{scenario.title}</h3>
        <div className="flex flex-col gap-1">
          <p
            className={`text-base text-typography-800 leading-relaxed ${
              isDescriptionExpanded ? "" : "line-clamp-2"
            }`}
          >
            {scenario.description}
          </p>
          <DescriptionToggle
            description={scenario.description}
            isExpanded={isDescriptionExpanded}
            onToggle={toggleDescription}
          />
        </div>
      </div>
    </div>
  );
};

const ModalActions = ({
  onCancel,
  onShare,
  cancelLabel = "Cancel",
  shareLabel = "Share",
}: {
  onCancel: () => void;
  onShare: () => void;
  cancelLabel?: string;
  shareLabel?: string;
}) => (
  <div className="flex gap-2 justify-end border-t border-border-light pt-4">
    <Button variant="secondary" onClick={onCancel} className="font-tertiary">
      {cancelLabel}
    </Button>
    <Button variant="primary" onClick={onShare} className="font-tertiary">
      {shareLabel}
    </Button>
  </div>
);

export const ShareForReview = ({
  isOpen,
  onClose,
  summaryDetails,
  onNoteChange,
}: ShareForReviewProps) => {
  const shareForReviewRef = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (isOpen) {
      setNote(summaryDetails?.note ?? "");
    }
  }, [isOpen, summaryDetails?.note]);

  const handleClose = useCallback(() => onClose(), [onClose]);
  useClickOutside(shareForReviewRef, handleClose);

  const handleNoteChange = useCallback((newNote: string) => {
    setNote(newNote);
  }, []);

  const handleShare = useCallback(() => {
    onNoteChange(note);
    onClose();
  }, [note, onNoteChange, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={shareForReviewRef}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] font-primary overflow-y-auto custom-scrollbar"
      >
        <div className="p-6 pb-4">
          <div className="flex flex-col gap-4 font-primary font-medium text-typography-900">
            <ModalHeader title="Share this for review" onClose={onClose} />

            <NoteTextarea note={note} onNoteChange={handleNoteChange} />

            <SubSection
              createdAt={summaryDetails?.details?.createdAt}
              callDurationMs={summaryDetails?.details?.callDuration}
            />

            <ScenarioDetails scenario={summaryDetails?.scenario} />

            <ModalActions onCancel={onClose} onShare={handleShare} />
          </div>
        </div>
      </div>
    </div>
  );
};
