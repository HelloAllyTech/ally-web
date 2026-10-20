import { FC, useRef, useState } from "react";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { CustomImage, Tooltip } from "@ally-ui-mono/ui-shared";
import { TooltipIcon, Trash, WandStars } from "@assets";
import { Button, ToggleSwitch } from "@components";
import { RichTextEditor } from "@components/rich-text-editor";
import { ButtonVariant } from "@components/types";
import { TrackFormValues } from "@types";

import { buildDefaultCoverPrompt } from "../coverImagePrompt";
import { useTrackMediaUpload } from "../useTrackMediaUpload";
import { CourseShareLink, CourseShareLinkState } from "./CourseShareLink";
import { GenerateCoverImageModal } from "./GenerateCoverImageModal";
import { TrackCompetenciesField } from "./TrackCompetenciesField";

const labelClass = "text-sm font-medium text-typography-800";
const inputClass =
  "w-full border border-border-light rounded-md px-3 py-2 text-sm outline-none focus:border-primary-400";

interface TrackSettingsEditorProps {
  /** Null until a brand-new course is first saved. */
  trackId?: string | null;
  /** The saved course is published (ACTIVE) — its share link only resolves then. */
  isPublished?: boolean;
}

/**
 * Editor for track-level metadata: title, description, cover image, visibility,
 * public view (share link), duration, and the competencies the course teaches.
 */
export const TrackSettingsEditor: FC<TrackSettingsEditorProps> = ({
  trackId = null,
  isPublished = false,
}) => {
  const {
    control,
    setValue,
    formState: { dirtyFields },
  } = useFormContext<TrackFormValues>();
  const { upload, isUploading } = useTrackMediaUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  // The trainer's last prompt survives closing the pop-up; until they edit,
  // the default is rebuilt from the course as it is now.
  const [editedCoverPrompt, setEditedCoverPrompt] = useState<string | null>(null);

  const coverImageUrl = useWatch({ control, name: "coverImageUrl" });
  const title = useWatch({ control, name: "title" });
  const description = useWatch({ control, name: "description" });
  const isPublicView = useWatch({ control, name: "isPublicView" }) ?? false;
  const publicViewUnsaved = !!dirtyFields.isPublicView;

  const shareLinkState: CourseShareLinkState = !trackId
    ? "unsaved"
    : publicViewUnsaved
      ? "pending"
      : isPublished
        ? "live"
        : "draft";

  const handleCoverChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    const publicUrl = await upload(file, "image");
    if (publicUrl) {
      setValue("coverImageUrl", publicUrl, { shouldDirty: true });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const defaultCoverPrompt = buildDefaultCoverPrompt(title, description);

  const handleGeneratedCoverAccepted = (imageUrl: string) => {
    setValue("coverImageUrl", imageUrl, { shouldDirty: true });
    setIsGenerateOpen(false);
    toast.success("Cover image applied. Save the course to keep it.");
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-typography-900">Track settings</h2>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Title</label>
        <Controller
          control={control}
          name="title"
          render={({ field }) => (
            <input {...field} placeholder="Track title" className={inputClass} />
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Description</label>
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <RichTextEditor
              value={field.value ?? ""}
              onChange={field.onChange}
              placeholder="What will the learner get out of this track?"
            />
          )}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <label className={labelClass}>Cover image</label>
          <Tooltip
            label="Generate a cover image with AI from a prompt you can edit. You see the result first and choose whether to use it."
            align="top"
          >
            <button
              type="button"
              onClick={() => setIsGenerateOpen(true)}
              disabled={isUploading}
              aria-label="Generate cover image with AI"
              className="inline-flex items-center justify-center w-8 h-8 rounded-md text-primary-500 hover:bg-secondary-50 hover:text-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <WandStars className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCoverChange}
        />
        {coverImageUrl ? (
          <div className="flex items-center gap-3">
            <div className="w-40 h-24 rounded-md overflow-hidden bg-gray-100">
              <CustomImage src={coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant={ButtonVariant.SECONDARY}
                className="!h-9 text-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? "Uploading…" : "Replace"}
              </Button>
              <button
                type="button"
                onClick={() => setValue("coverImageUrl", "", { shouldDirty: true })}
                className="inline-flex items-center gap-1 text-xs text-destructive-500 hover:text-destructive-600"
              >
                <Trash className="w-3.5 h-3.5" />
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full border border-dashed border-border-dark rounded-md py-8 text-sm text-typography-600 hover:bg-secondary-50 disabled:opacity-50"
          >
            {isUploading ? "Uploading…" : "+ Upload cover image"}
          </button>
        )}
        {isGenerateOpen && (
          <GenerateCoverImageModal
            initialPrompt={editedCoverPrompt ?? defaultCoverPrompt}
            defaultPrompt={defaultCoverPrompt}
            trackTitle={title}
            onPromptChange={prompt =>
              setEditedCoverPrompt(prompt === defaultCoverPrompt ? null : prompt)
            }
            onAccept={handleGeneratedCoverAccepted}
            onClose={() => setIsGenerateOpen(false)}
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="inline-flex items-center gap-1">
            <span className={labelClass}>Global track</span>
            <Tooltip
              label="Makes this course available to every organization on the platform, not just yours. Only super admins can turn this on."
              align="top"
            >
              <button type="button" className="cursor-pointer inline-flex items-center">
                <TooltipIcon />
              </button>
            </Tooltip>
          </span>
          <span className="text-xs text-typography-500">
            Available to every organization (super-admin library).
          </span>
        </div>
        <Controller
          control={control}
          name="isGlobal"
          render={({ field }) => (
            <ToggleSwitch enabled={field.value ?? false} onChange={field.onChange} />
          )}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="inline-flex items-center gap-1">
              <span className={labelClass}>Public view</span>
              <Tooltip
                label="Gives the course a link anyone can open to see its outline, without logging in. They log in when they press Start, and only learners the course is assigned to can take it."
                align="top"
              >
                <button type="button" className="cursor-pointer inline-flex items-center">
                  <TooltipIcon />
                </button>
              </Tooltip>
            </span>
            <span className="text-xs text-typography-500">
              {isPublicView
                ? "Anyone with the link can see this course's outline."
                : publicViewUnsaved
                  ? "Save your changes to turn the link off. Anyone who opens it after that is told the course isn't available."
                  : "Off — the course has no public link."}
            </span>
          </div>
          <Controller
            control={control}
            name="isPublicView"
            render={({ field }) => (
              <ToggleSwitch
                enabled={field.value ?? false}
                onChange={field.onChange}
                label="Public view"
              />
            )}
          />
        </div>
        {isPublicView && <CourseShareLink trackId={trackId} state={shareLinkState} />}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="inline-flex items-center gap-1">
          <label className={labelClass}>Estimated duration (minutes, optional)</label>
          <Tooltip
            label="Shown to learners as a time estimate on the course card. It's informational only — it doesn't gate progress or completion."
            align="top"
          >
            <button type="button" className="cursor-pointer inline-flex items-center">
              <TooltipIcon />
            </button>
          </Tooltip>
        </span>
        <Controller
          control={control}
          name="estimatedDurationMinutes"
          render={({ field }) => (
            <input
              type="number"
              min={0}
              className="w-32 border border-border-light rounded-md px-3 py-2 text-sm outline-none focus:border-primary-400"
              value={field.value ?? ""}
              onChange={event =>
                field.onChange(event.target.value === "" ? null : Number(event.target.value))
              }
              onWheel={event => event.currentTarget.blur()}
            />
          )}
        />
      </div>

      <TrackCompetenciesField />
    </div>
  );
};
