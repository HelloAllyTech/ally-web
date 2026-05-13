import { useCallback, useEffect, useRef, useState } from "react";

import { differenceInMinutes } from "date-fns";
import { useTranslation } from "react-i18next";

import { CustomImage, CustomVideo, htmlToPlainText } from "@ally-ui-mono/ui-shared/index";
import { ArrowDownBlue, CloseIcon, ScribeImage } from "@assets";
import { Button, EmojiPickerTrigger } from "@components";
import { getFormattedDate, getFormattedTimeFromDuration } from "@utils";

export interface ShareForReviewProps {
  isOpen: boolean;
  onClose: () => void;
  summaryDetails: any;
  onNoteChange: (note: string) => void;
  shareLabel?: string;
  modalHeader?: string;
  sessionCreatedAt?: string;
  sessionCallDuration?: number;
  sessionReviewCreatedAt?: string;
  tag?: string;
}

interface ScenarioDetailsScenario {
  title?: string;
  description?: string;
  coverVideoUrl?: string | null;
  coverImageUrl?: string;
}

export enum TagType {
  SIMULATION = "Simulation",
  SCRIBE = "Scribe",
}

const ModalHeader = ({ title, onClose }: { title: string; onClose: () => void }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between border-b border-border pb-3 text-lg">
      {title}
      <button type="button" onClick={onClose} aria-label={t("common.close")}>
        <CloseIcon />
      </button>
    </div>
  );
};

const NOTE_MAX_LENGTH = 250;

const NoteTextarea = ({
  note,
  onNoteChange,
  isExpired,
  textareaRef,
}: {
  note?: string;
  onNoteChange: (note: string) => void;
  isExpired: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) => {
  const { t } = useTranslation();
  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      onNoteChange(value.length > NOTE_MAX_LENGTH ? value.slice(0, NOTE_MAX_LENGTH) : value);
    },
    [onNoteChange],
  );

  const currentLength = (note ?? "").length;

  return (
    <div className="flex flex-col gap-2 relative">
      <textarea
        ref={textareaRef}
        placeholder={t("review.details.addNotePlaceholder")}
        maxLength={NOTE_MAX_LENGTH}
        onChange={handleInput}
        disabled={isExpired}
        className={`flex-1 pr-[40px] max-h-40 outline-none border-none placeholder:text-typography-400 placeholder:text-md font-primary text-md font-normal overflow-y-auto resize-none custom-scrollbar ${isExpired ? "opacity-50 cursor-not-allowed bg-white" : ""}`}
        value={note ?? ""}
      />
      {!isExpired && (
        <span className="text-typography-500 absolute bottom-0 right-0 text-sm font-primary text-right">
          {currentLength}/{NOTE_MAX_LENGTH}
        </span>
      )}
    </div>
  );
};

const SubSection = ({
  createdAt,
  callDuration,
}: {
  createdAt: string | undefined;
  callDuration: number | undefined;
}) => {
  const { t, i18n } = useTranslation();
  const formattedDate = createdAt ? getFormattedDate(createdAt, i18n.language) : "--";
  const formattedCallDuration =
    callDuration < 60
      ? `${callDuration} ${t("review.feedCard.sec")}`
      : `${getFormattedTimeFromDuration(callDuration, "mm:ss")} ${t("review.feedCard.min")}`;

  return (
    <div className="flex items-center gap-1 text-typography-600 font-primary text-sm">
      {t("review.details.dateAndTime")}: {formattedDate}
      <span className="w-1 h-1 bg-neutral-500 rounded-full mx-1" aria-hidden />
      <span className="font-primary leading-4">
        {t("review.feedCard.duration")}: {formattedCallDuration}
      </span>
    </div>
  );
};

const ScenarioMedia = ({ scenario }: { scenario: ScenarioDetailsScenario }) => {
  if (!scenario) return null;
  if (scenario.coverVideoUrl != null) {
    return (
      <CustomVideo
        src={scenario.coverVideoUrl}
        alt={scenario.title ?? ""}
        className="w-full h-[110px] object-cover"
      />
    );
  }
  return (
    <CustomImage
      src={scenario.coverImageUrl}
      alt={scenario.title ?? ""}
      className="w-full h-[110px] object-cover"
    />
  );
};

const DescriptionToggle = ({
  description,
  isExpanded,
  onToggle,
}: {
  description: string;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const { t } = useTranslation();
  if (!description) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="text-md font-medium text-primary-600 hover:text-primary-700 text-left"
    >
      {isExpanded ? (
        <span className="flex">
          {t("common.viewLess")} <ArrowDownBlue className="rotate-180 w-8 h-8" />
        </span>
      ) : (
        <span className="flex items-center">
          {t("common.viewMore")}
          <ArrowDownBlue className="w-8 h-8" />
        </span>
      )}
    </button>
  );
};

const ScenarioDetails = ({
  scenario,
  tag,
}: {
  scenario: ScenarioDetailsScenario | null;
  tag?: string;
}) => {
  const { t } = useTranslation();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  const toggleDescription = useCallback(() => {
    setIsDescriptionExpanded(prev => !prev);
  }, []);

  useEffect(() => {
    const el = descriptionRef.current;
    if (el) {
      setIsClamped(el.scrollHeight > el.clientHeight);
    }
  }, [scenario?.description]);

  if (!scenario)
    return (
      <div className="rounded-lg flex gap-4 border border-border-light p-5 items-start animate-pulse">
        <div className="w-1/3 aspect-video bg-neutral-200 rounded" />
        <div className="flex flex-col gap-2 w-2/3">
          <div className="h-5 w-3/4 bg-neutral-200 rounded" />
          <div className="flex flex-col gap-1.5">
            <div className="h-3 w-full bg-neutral-200 rounded" />
            <div className="h-3 w-full bg-neutral-200 rounded" />
            <div className="h-3 w-2/3 bg-neutral-200 rounded" />
          </div>
        </div>
      </div>
    );

  return (
    <div className="rounded-lg flex gap-4 border border-border-light p-5 items-start">
      <div className="w-1/3">
        <ScenarioMedia scenario={scenario} />
      </div>
      <div className="flex flex-col gap-2 w-2/3">
        <div className="text-xs bg-[#EDE7F6] text-[#7E57C2] px-2 w-fit font-normal rounded-[3px]">
          {tag === TagType.SIMULATION ? t("common.simulation") : t("common.scribe")}
        </div>
        <h3 className="text-lg text-typography-900">{scenario.title}</h3>
        <div className="flex flex-col gap-1">
          <p
            ref={descriptionRef}
            className={`text-base text-typography-800 leading-relaxed ${
              isDescriptionExpanded ? "" : "line-clamp-2"
            }`}
          >
            {htmlToPlainText(scenario.description)}
          </p>
          {isClamped && (
            <DescriptionToggle
              description={scenario.description}
              isExpanded={isDescriptionExpanded}
              onToggle={toggleDescription}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const ScribeDetails = ({ scribeSession, tag }: { scribeSession: any; tag: TagType }) => {
  const { t, i18n } = useTranslation();
  const formattedCallDuration =
    scribeSession?.details?.callDuration < 60
      ? `${scribeSession?.details?.callDuration} ${t("review.feedCard.sec")}`
      : `${getFormattedTimeFromDuration(scribeSession?.details?.callDuration || scribeSession?.scribeSession?.duration, "mm:ss")} ${t("review.feedCard.min")}`;
  if (!scribeSession)
    return (
      <div className="rounded-lg flex gap-4 border border-border-light p-5 items-start animate-pulse">
        <div className="w-1/3 aspect-video bg-neutral-200 rounded" />
        <div className="flex flex-col gap-2 w-2/3">
          <div className="h-5 w-3/4 bg-neutral-200 rounded" />
          <div className="flex flex-col gap-1.5">
            <div className="h-3 w-full bg-neutral-200 rounded" />
            <div className="h-3 w-full bg-neutral-200 rounded" />
            <div className="h-3 w-2/3 bg-neutral-200 rounded" />
          </div>
        </div>
      </div>
    );
  return (
    <div className="rounded-lg flex gap-4 border border-border-light p-5 items-start">
      <div className="w-1/3">
        <ScribeImage />
      </div>
      <div className="flex flex-col gap-2 w-2/3">
        <div className="text-xs bg-[#FFF3E0] text-[#E65100] px-2 w-fit font-normal rounded-[3px]">
          {tag === TagType.SCRIBE ? t("common.scribe") : t("common.simulation")}
        </div>
        <h3 className="text-lg text-typography-900">
          {scribeSession?.details?.callInfo?.summaryName}
        </h3>
        <div className="flex flex-col gap-1 font-normal">
          <p className="text-typography-800 leading-relaxed text-sm">
            {t("review.details.dateAndTime")}:{" "}
            {getFormattedDate(
              scribeSession?.details?.createdAt || scribeSession?.scribeSession?.createdAt,
              i18n.language,
            )}
          </p>
          <p className="text-typography-800 leading-relaxed text-sm">
            {t("review.feedCard.duration")}: {formattedCallDuration}
          </p>
        </div>
      </div>
    </div>
  );
};
const ModalActions = ({
  onCancel,
  onShare,
  cancelLabel,
  shareLabel,
}: {
  onCancel: () => void;
  onShare: () => void;
  cancelLabel?: string;
  shareLabel?: string;
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex gap-2 justify-end border-t border-border-light pt-4">
      <Button variant="secondary" onClick={onCancel} className="font-tertiary">
        {cancelLabel || t("common.cancel")}
      </Button>
      <Button variant="primary" onClick={onShare} className="font-tertiary">
        {shareLabel || t("common.share")}
      </Button>
    </div>
  );
};

export const ShareForReview = ({
  isOpen,
  onClose,
  summaryDetails,
  onNoteChange,
  shareLabel,
  modalHeader,
  sessionCreatedAt,
  sessionCallDuration,
  sessionReviewCreatedAt,
  tag,
}: ShareForReviewProps) => {
  const { t } = useTranslation();
  const shareForReviewRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [note, setNote] = useState("");

  const timeDiff = differenceInMinutes(
    new Date(),
    new Date(sessionReviewCreatedAt || summaryDetails?.reviewCreatedAt),
  );

  useEffect(() => {
    if (isOpen) {
      setNote(summaryDetails?.note ?? summaryDetails?.reviewNote ?? "");
    }
  }, [isOpen, summaryDetails?.note, summaryDetails?.reviewNote]);

  const handleNoteChange = useCallback((newNote: string) => {
    setNote(newNote.length > NOTE_MAX_LENGTH ? newNote.slice(0, NOTE_MAX_LENGTH) : newNote);
  }, []);

  const insertEmoji = useCallback(
    (emoji: string) => {
      const el = textareaRef.current;
      const currentNote = el?.value ?? note ?? "";
      const start = el?.selectionStart ?? currentNote.length;
      const end = el?.selectionEnd ?? currentNote.length;
      let newNote = currentNote.slice(0, start) + emoji + currentNote.slice(end);
      if (newNote.length > NOTE_MAX_LENGTH) newNote = newNote.slice(0, NOTE_MAX_LENGTH);
      setNote(newNote);
      setTimeout(() => {
        if (textareaRef.current) {
          const input = textareaRef.current;
          input.focus();
          const newPos = Math.min(start + emoji.length, newNote.length);
          input.setSelectionRange(newPos, newPos);
        }
      }, 0);
    },
    [note],
  );

  const handleShare = useCallback(() => {
    if (timeDiff >= 10) {
      onNoteChange(note);
      onClose();
      return;
    }
    onNoteChange(note);
    onClose();
  }, [note, timeDiff, onNoteChange, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={shareForReviewRef}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] font-primary overflow-y-auto custom-scrollbar"
      >
        <div className="p-6 pb-4">
          <div className="flex flex-col gap-4 font-primary font-medium text-typography-900">
            <ModalHeader
              title={modalHeader || t("review.details.shareModalHeader")}
              onClose={onClose}
            />

            <NoteTextarea
              note={note}
              onNoteChange={handleNoteChange}
              isExpired={timeDiff >= 10}
              textareaRef={textareaRef}
            />

            {tag === TagType.SIMULATION && (
              <SubSection
                createdAt={sessionCreatedAt || summaryDetails?.details?.createdAt}
                callDuration={sessionCallDuration || summaryDetails?.details?.callDuration}
              />
            )}

            {tag === TagType.SIMULATION && (
              <ScenarioDetails scenario={summaryDetails?.scenario} tag={tag} />
            )}
            {tag === TagType.SCRIBE && <ScribeDetails scribeSession={summaryDetails} tag={tag} />}

            <EmojiPickerTrigger onEmojiClick={insertEmoji} isExpired={timeDiff >= 10} />

            <ModalActions
              onCancel={onClose}
              onShare={handleShare}
              shareLabel={shareLabel}
              cancelLabel={t("common.cancel")}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
