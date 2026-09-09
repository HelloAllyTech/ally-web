import { FC, useRef, useState } from "react";

import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { TextArea, Tooltip } from "@ally-ui-mono/ui-shared";
import { Plus, TooltipIcon, Trash } from "@assets";
import { SegmentedToggle } from "@components";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { QUIZ_QUESTION_TYPE_LABELS } from "@constants";
import {
  QuizQuestionType,
  TrackFormValues,
  TrackItemType,
  VideoContent,
  VideoInterjection,
} from "@types";

import { ItemEditorFrame } from "./ItemEditorFrame";
import {
  createQuestionOfType,
  getEmbedPlayerUrl,
  parseVideoEmbedUrl,
  QuestionPath,
} from "../../trackFormUtils";
import { useTrackMediaUpload } from "../../useTrackMediaUpload";
import { QUESTION_TYPE_ORDER, renderTypeBody } from "./quiz/QuizItemEditor";

/** Question types valid for an interjection — `open_ended` is LLM-graded and
 * doesn't fit a synchronous hard-pause, so it's excluded here (not in the
 * shared `QUESTION_TYPE_ORDER`, since a plain quiz question can still be
 * open-ended). */
const INTERJECTION_QUESTION_TYPES: QuizQuestionType[] = QUESTION_TYPE_ORDER.filter(
  type => type !== "open_ended",
);

const newInterjectionId = () => crypto.randomUUID();

/** `125` -> `"2:05"`, for the small helper label beside the seconds input. */
const formatTimestamp = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.round(totalSeconds || 0));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

interface VideoItemEditorProps {
  sectionIndex: number;
  itemIndex: number;
  onDelete: () => void;
}

type VideoMode = "upload" | "embed";

const VIDEO_MODE_OPTIONS = [
  { label: "Upload", value: "upload" as const },
  { label: "Embed", value: "embed" as const },
];

export const VideoItemEditor: FC<VideoItemEditorProps> = ({
  sectionIndex,
  itemIndex,
  onDelete,
}) => {
  const { control, setValue } = useFormContext<TrackFormValues>();
  const { upload, isUploading } = useTrackMediaUpload();
  const base = `sections.${sectionIndex}.items.${itemIndex}` as const;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const video = useWatch({ control, name: `${base}.video` }) as VideoContent | undefined;
  const source = video?.source ?? "s3";
  const url = video?.url ?? "";
  const durationSeconds = video?.durationSeconds;

  const [mode, setMode] = useState<VideoMode>(source === "s3" ? "upload" : "embed");
  const [embedInput, setEmbedInput] = useState(source === "s3" ? "" : url);
  const [embedError, setEmbedError] = useState<string | null>(null);
  const [showAddInterjectionMenu, setShowAddInterjectionMenu] = useState(false);

  const setVideo = (next: VideoContent) => {
    setValue(`${base}.video`, next, { shouldDirty: true });
  };

  const handleLoadedMetadata = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const duration = event.currentTarget.duration;
    if (Number.isFinite(duration) && duration > 0) {
      setValue(`${base}.video.durationSeconds`, duration, { shouldDirty: true });
    }
  };

  const {
    fields: interjectionFields,
    append: appendInterjection,
    remove: removeInterjection,
  } = useFieldArray({
    control,
    name: `${base}.video.interjections`,
    keyName: "fieldId",
  });

  const interjections = (useWatch({ control, name: `${base}.video.interjections` }) ??
    []) as VideoInterjection[];

  const addInterjection = (type: QuizQuestionType) => {
    appendInterjection({
      id: newInterjectionId(),
      timestampSeconds: 0,
      question: createQuestionOfType(type),
    });
    setShowAddInterjectionMenu(false);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Please choose a video file.");
      return;
    }
    const publicUrl = await upload(file, "video");
    if (publicUrl) {
      setVideo({ source: "s3", url: publicUrl });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEmbedApply = () => {
    const parsed = parseVideoEmbedUrl(embedInput);
    if (!parsed) {
      setEmbedError("Enter a valid YouTube, Vimeo or Loom link.");
      return;
    }
    setEmbedError(null);
    setVideo({ source: parsed.source, url: parsed.url });
  };

  const handleModeChange = (nextMode: VideoMode) => {
    setMode(nextMode);
    setEmbedError(null);
  };

  const embedPlayerUrl = video ? getEmbedPlayerUrl(video) : null;
  const isLoomEmbed = source === "loom";

  return (
    <ItemEditorFrame
      sectionIndex={sectionIndex}
      itemIndex={itemIndex}
      type={TrackItemType.VIDEO}
      onDelete={onDelete}
    >
      <div className="flex flex-col gap-4">
        <span className="inline-flex items-center gap-1">
          <span className="text-sm font-medium text-typography-800">Video source</span>
          <Tooltip
            label="Switching between Upload and Embed keeps whatever you already added in the other mode, so you can switch back without losing it."
            align="top"
          >
            <button type="button" className="cursor-pointer inline-flex items-center">
              <TooltipIcon />
            </button>
          </Tooltip>
        </span>
        <SegmentedToggle value={mode} options={VIDEO_MODE_OPTIONS} onChange={handleModeChange} />

        {mode === "upload" ? (
          <div className="flex flex-col gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant={ButtonVariant.SECONDARY}
              className="!h-10 w-fit text-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading
                ? "Uploading…"
                : source === "s3" && url
                  ? "Replace video"
                  : "Upload video"}
            </Button>
            {source === "s3" && url && (
              <video
                src={url}
                controls
                onLoadedMetadata={handleLoadedMetadata}
                className="w-full max-h-[320px] rounded-md bg-black"
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={embedInput}
                onChange={event => setEmbedInput(event.target.value)}
                placeholder="Paste a YouTube, Vimeo or Loom link"
                className="flex-1 border border-border-light rounded-md px-3 py-2 text-sm outline-none focus:border-primary-400"
              />
              <Button
                variant={ButtonVariant.SECONDARY}
                className="!h-10 text-sm"
                onClick={handleEmbedApply}
              >
                Apply
              </Button>
            </div>
            {embedError && <p className="text-xs text-destructive-500">{embedError}</p>}
            {embedPlayerUrl && (
              <div className="aspect-video w-full">
                <iframe
                  src={embedPlayerUrl}
                  title="Video preview"
                  className="w-full h-full rounded-md"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            {isLoomEmbed && (
              <p className="text-xs text-typography-500">
                Loom embeds use timed completion — the watch percentage below is measured against
                the video&apos;s duration.
              </p>
            )}
          </div>
        )}

        {source === "s3" && (
          <div className="flex flex-col gap-3 border-t border-border-light pt-4">
            <span className="inline-flex items-center gap-1">
              <span className="text-sm font-medium text-typography-800">
                Interjections ({interjectionFields.length})
              </span>
              <Tooltip
                label="A quiz question that pauses the video at a specific timestamp — the learner can't resume until they answer. Open-ended questions aren't available here since they need LLM grading, which doesn't fit a hard pause."
                align="top"
              >
                <button type="button" className="cursor-pointer inline-flex items-center">
                  <TooltipIcon />
                </button>
              </Tooltip>
            </span>

            {interjectionFields.map((field, index) => {
              const interjection = interjections[index];
              const question = interjection?.question;
              const questionPath = `${base}.video.interjections.${index}.question` as QuestionPath;
              const tsName = `${base}.video.interjections.${index}.timestampSeconds` as const;
              const overDuration =
                durationSeconds != null && (interjection?.timestampSeconds ?? 0) > durationSeconds;

              return (
                <div
                  key={field.fieldId}
                  className="border border-border-light rounded-md p-4 flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-typography-800">
                      Interjection {index + 1}
                      {question ? ` — ${QUIZ_QUESTION_TYPE_LABELS[question.type]}` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeInterjection(index)}
                      className="text-destructive-500 hover:text-destructive-600"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-typography-800">Show at</label>
                      <Controller
                        control={control}
                        name={tsName}
                        render={({ field: tsField }) => (
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={tsField.value ?? 0}
                            onChange={event => tsField.onChange(Number(event.target.value) || 0)}
                            onWheel={event => event.currentTarget.blur()}
                            className="w-24 border border-border-light rounded-md px-2 py-1 text-sm outline-none focus:border-primary-400"
                          />
                        )}
                      />
                      <span className="text-xs text-typography-500">
                        seconds ({formatTimestamp(interjection?.timestampSeconds ?? 0)}
                        {durationSeconds ? ` of ${formatTimestamp(durationSeconds)}` : ""})
                      </span>
                    </div>
                    {overDuration && (
                      <p className="text-xs text-destructive-500">
                        This is past the end of the video.
                      </p>
                    )}
                  </div>

                  {question && (
                    <>
                      {question.type !== "fill_blank" && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-medium text-typography-800">
                            Question
                          </label>
                          <Controller
                            control={control}
                            name={`${questionPath}.prompt`}
                            render={({ field: promptField }) => (
                              <TextArea
                                id={`${questionPath}.prompt`}
                                labelText="Question"
                                hideLabel
                                {...promptField}
                                value={promptField.value ?? ""}
                                rows={2}
                                placeholder="Question text"
                                className="w-full"
                              />
                            )}
                          />
                        </div>
                      )}

                      {renderTypeBody(question.type, questionPath)}

                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-typography-800">
                          Explanation (optional)
                        </label>
                        <Controller
                          control={control}
                          name={`${questionPath}.explanation`}
                          render={({ field: explanationField }) => (
                            <TextArea
                              id={`${questionPath}.explanation`}
                              labelText="Explanation (optional)"
                              hideLabel
                              {...explanationField}
                              value={explanationField.value ?? ""}
                              rows={2}
                              placeholder="Author-only for now — not yet shown to learners for interjections"
                              className="w-full"
                            />
                          )}
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-typography-800">Points</label>
                        <Controller
                          control={control}
                          name={`${questionPath}.points`}
                          render={({ field: pointsField }) => (
                            <input
                              type="number"
                              min={1}
                              className="w-20 border border-border-light rounded-md px-2 py-1 text-sm outline-none focus:border-primary-400"
                              value={pointsField.value ?? ""}
                              onChange={event =>
                                pointsField.onChange(
                                  event.target.value === ""
                                    ? undefined
                                    : Number(event.target.value),
                                )
                              }
                              onWheel={event => event.currentTarget.blur()}
                            />
                          )}
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            <div className="relative w-fit">
              <button
                type="button"
                onClick={() => setShowAddInterjectionMenu(prev => !prev)}
                className="inline-flex items-center gap-1 border border-dashed border-border-dark rounded-md px-3 py-2 text-sm text-typography-600 hover:bg-secondary-50"
              >
                <Plus className="w-4 h-4" />
                Add interjection
              </button>
              {showAddInterjectionMenu && (
                <div className="absolute z-20 left-0 mt-1 min-w-[220px] bg-white border border-border-light rounded-md shadow-lg py-1">
                  {INTERJECTION_QUESTION_TYPES.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addInterjection(type)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-secondary-50 text-typography-800"
                    >
                      {QUIZ_QUESTION_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ItemEditorFrame>
  );
};
