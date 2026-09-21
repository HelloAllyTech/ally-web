import { FC, useRef, useState } from "react";

import { useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { TooltipIcon, Trash } from "@assets";
import { Button, SegmentedToggle } from "@components";
import { ButtonVariant } from "@components/types";
import {
  MAX_QUESTION_IMAGE_BYTES,
  MAX_QUESTION_MEDIA_ALT_LENGTH,
  MAX_QUESTION_VIDEO_BYTES,
  MAX_QUESTION_VIDEO_SECONDS,
  QUESTION_IMAGE_CONTENT_TYPES,
  QUESTION_VIDEO_CONTENT_TYPES,
} from "@constants";
import { QuestionMedia, TrackFormValues } from "@types";

import {
  getQuestionMediaEmbedUrl,
  parseVideoEmbedUrl,
  QuestionPath,
} from "../../../trackFormUtils";
import { useTrackMediaUpload } from "../../../useTrackMediaUpload";

interface QuestionMediaFieldProps {
  /** Absolute RHF path to the question node. */
  questionPath: QuestionPath;
}

type AddMode = "image" | "video" | "link";

const ADD_MODE_OPTIONS = [
  { label: "Image", value: "image" as const },
  { label: "Video", value: "video" as const },
  { label: "Video link", value: "link" as const },
];

const formatMb = (bytes: number) => `${Math.round(bytes / 1024 / 1024)} MB`;

/** Where in the clip to grab the poster frame. Frame zero is very often a
 *  fade-in, a slate or a black frame, which is exactly the uninformative
 *  thumbnail we are trying to avoid. */
const POSTER_SEEK_SECONDS = 1;
/** Cap on the captured frame's longest side — a poster is a preview, not a
 *  second copy of the video. */
const POSTER_MAX_EDGE = 960;
const POSTER_QUALITY = 0.8;

interface VideoProbe {
  durationSeconds?: number;
  /** A JPEG of one frame, or `undefined` if the browser could not decode. */
  poster?: File;
}

/**
 * Decodes a video file locally to learn two things before anything is
 * uploaded: how long it is (so an over-long clip is refused instantly rather
 * than after a 50MB round trip) and what one frame of it looks like (so the
 * learner gets a real thumbnail instead of whatever their player paints for
 * a paused-at-zero video).
 *
 * Every failure path resolves rather than rejects. A container the browser
 * cannot decode — some MOV/HEVC recordings — or a cross-origin taint on the
 * canvas should cost the trainer a nicety, not the upload: the server
 * enforces the duration ceiling independently, and a missing poster falls
 * back to the player's own behaviour.
 */
const probeVideo = (file: File): Promise<VideoProbe> =>
  new Promise(resolve => {
    const objectUrl = URL.createObjectURL(file);
    const probe = document.createElement("video");
    let settled = false;

    const finish = (result: VideoProbe) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(objectUrl);
      resolve(result);
    };

    const duration = () =>
      Number.isFinite(probe.duration) && probe.duration > 0 ? probe.duration : undefined;

    const capture = () => {
      try {
        const scale = Math.min(1, POSTER_MAX_EDGE / Math.max(probe.videoWidth, probe.videoHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(probe.videoWidth * scale);
        canvas.height = Math.round(probe.videoHeight * scale);
        const context = canvas.getContext("2d");
        if (!context || !canvas.width || !canvas.height) {
          finish({ durationSeconds: duration() });
          return;
        }
        context.drawImage(probe, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          blob =>
            finish({
              durationSeconds: duration(),
              poster: blob
                ? new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-poster.jpg`, {
                    type: "image/jpeg",
                  })
                : undefined,
            }),
          "image/jpeg",
          POSTER_QUALITY,
        );
      } catch {
        finish({ durationSeconds: duration() });
      }
    };

    probe.preload = "auto";
    probe.muted = true;
    probe.playsInline = true;
    probe.onloadeddata = () => {
      // Seeking past the clip's own length never fires `seeked`, so a clip
      // shorter than the seek point is captured where it already is.
      const target = Math.min(POSTER_SEEK_SECONDS, Math.max(0, (duration() ?? 0) - 0.1));
      if (target > 0) {
        probe.onseeked = capture;
        probe.currentTime = target;
      } else {
        capture();
      }
    };
    probe.onerror = () => finish({ durationSeconds: undefined });
    probe.src = objectUrl;
  });

/**
 * Attaches a picture or short clip to a question, so a trainer can assess what
 * the learner observes rather than only what they can read. The media is part
 * of the question stem: it is authored directly under the prompt and renders
 * above the answer controls on every client.
 *
 * Three ways in, because they are genuinely three different jobs — upload a
 * photo, upload a clip, or paste a link to a clip that already lives on
 * YouTube/Vimeo/Loom. The link option reuses the VIDEO component's parser, so
 * a trainer meets the same hosts and the same error in both places.
 */
export const QuestionMediaField: FC<QuestionMediaFieldProps> = ({ questionPath }) => {
  const { setValue, control } = useFormContext<TrackFormValues>();
  const { upload, isUploading } = useTrackMediaUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mediaName = `${questionPath}.media` as `sections.0.items.0.quiz.questions.0.media`;
  const media = useWatch({ control, name: mediaName }) as QuestionMedia | undefined;

  const [mode, setMode] = useState<AddMode>("image");
  const [linkInput, setLinkInput] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const setMedia = (next: QuestionMedia | undefined) =>
    setValue(mediaName, next, { shouldDirty: true });

  const openPicker = (nextMode: Exclude<AddMode, "link">) => {
    setMode(nextMode);
    // The accept attribute is derived from `mode` on render, so the picker has
    // to open after React has applied the new mode — otherwise switching from
    // Image to Video shows an image-only dialog the first time.
    requestAnimationFrame(() => fileInputRef.current?.click());
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    const isImage = mode === "image";
    const allowed = isImage ? QUESTION_IMAGE_CONTENT_TYPES : QUESTION_VIDEO_CONTENT_TYPES;
    if (!allowed.includes(file.type)) {
      toast.error(
        isImage ? "Choose a JPG, PNG, WebP or GIF image." : "Choose an MP4, WebM or MOV video.",
      );
      return;
    }

    const sizeLimit = isImage ? MAX_QUESTION_IMAGE_BYTES : MAX_QUESTION_VIDEO_BYTES;
    if (file.size > sizeLimit) {
      toast.error(
        `That file is ${formatMb(file.size)}. Question ${isImage ? "images" : "videos"} must be under ${formatMb(sizeLimit)}.`,
      );
      return;
    }

    let durationSeconds: number | undefined;
    let posterFile: File | undefined;
    if (!isImage) {
      const probe = await probeVideo(file);
      durationSeconds = probe.durationSeconds;
      posterFile = probe.poster;
      if (durationSeconds !== undefined && durationSeconds > MAX_QUESTION_VIDEO_SECONDS) {
        toast.error(
          `That clip is ${Math.round(durationSeconds)}s. Question videos must be under ${MAX_QUESTION_VIDEO_SECONDS / 60} minutes.`,
        );
        return;
      }
    }

    const publicUrl = await upload(
      file,
      isImage ? "question_image" : "question_video",
      durationSeconds,
    );
    if (!publicUrl) return;

    // The poster is a nicety on top of a clip that has already uploaded
    // successfully, so a failure here is swallowed rather than surfaced —
    // telling the trainer their upload failed when it did not would be
    // worse than the player falling back to its own first frame.
    const posterUrl = posterFile
      ? ((await upload(posterFile, "question_image", undefined, { silent: true })) ?? undefined)
      : undefined;

    setMedia({
      kind: isImage ? "image" : "video",
      source: "s3",
      url: publicUrl,
      // An uploaded image keeps whatever description was already written, so
      // swapping a photo for a better one does not silently drop its alt text.
      ...(isImage && media?.alt ? { alt: media.alt } : {}),
      ...(posterUrl ? { posterUrl } : {}),
    });
  };

  const handleLinkApply = () => {
    const parsed = parseVideoEmbedUrl(linkInput);
    if (!parsed) {
      setLinkError("Enter a valid YouTube, Vimeo or Loom link.");
      return;
    }
    setLinkError(null);
    setMedia({ kind: "video", source: parsed.source, url: parsed.url });
    setLinkInput("");
  };

  const embedUrl = media ? getQuestionMediaEmbedUrl(media) : null;
  const isLinkedVideo = media?.kind === "video" && media.source !== "s3";

  return (
    <div className="flex flex-col gap-2">
      <span className="inline-flex items-center gap-1">
        <label className="text-sm font-medium text-typography-800">Media (optional)</label>
        <Tooltip
          label={`A photo or short clip shown with the question, so you can ask what the learner notices — not just what they can recall. Images up to ${formatMb(MAX_QUESTION_IMAGE_BYTES)}, uploaded videos up to ${formatMb(MAX_QUESTION_VIDEO_BYTES)} and ${MAX_QUESTION_VIDEO_SECONDS / 60} minutes. Keep it small: the learner has to load it before they can answer.`}
          align="top"
        >
          <button type="button" className="cursor-pointer inline-flex items-center">
            <TooltipIcon />
          </button>
        </Tooltip>
      </span>

      <input
        ref={fileInputRef}
        type="file"
        accept={mode === "image" ? "image/*" : "video/*"}
        className="hidden"
        onChange={handleFileChange}
        data-testid="question-media-file-input"
      />

      {media ? (
        <div className="flex flex-col gap-2 border border-border-light rounded-md p-3">
          {media.kind === "image" ? (
            <img
              src={media.url}
              alt={media.alt || "Question media preview"}
              className="max-h-[220px] w-auto self-start rounded-md object-contain"
            />
          ) : media.source === "s3" ? (
            <video
              src={media.url}
              poster={media.posterUrl}
              controls
              preload="metadata"
              className="max-h-[240px] w-full rounded-md bg-black"
            />
          ) : embedUrl ? (
            <div className="aspect-video w-full">
              <iframe
                src={embedUrl}
                title="Question media preview"
                className="h-full w-full rounded-md"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <p className="text-xs text-typography-500 break-all">{media.url}</p>
          )}

          {media.kind === "image" && (
            <div className="flex flex-col gap-1">
              <span className="inline-flex items-center gap-1">
                <label
                  htmlFor={`${questionPath}.media.alt`}
                  className="text-xs font-medium text-typography-700"
                >
                  Describe the image
                </label>
                <span className="text-xs text-destructive-500">*</span>
                <Tooltip
                  label="Required. Read aloud to learners using a screen reader, and shown if the image fails to load. Describe what the picture shows — not what the answer is."
                  align="top"
                >
                  <button type="button" className="cursor-pointer inline-flex items-center">
                    <TooltipIcon />
                  </button>
                </Tooltip>
              </span>
              <input
                id={`${questionPath}.media.alt`}
                type="text"
                maxLength={MAX_QUESTION_MEDIA_ALT_LENGTH}
                value={media.alt ?? ""}
                onChange={event => setMedia({ ...media, alt: event.target.value })}
                placeholder="e.g. A swollen left ankle, bruised along the outer edge"
                className="w-full border border-border-light rounded-md px-2 py-1 text-sm outline-none focus:border-primary-400"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            {isLinkedVideo ? (
              // A linked clip has no file to replace, so "Replace" would
              // open a file picker and quietly turn the link into an
              // upload. Drop the trainer back into the link field with
              // the current URL instead.
              <Button
                variant={ButtonVariant.SECONDARY}
                className="!h-8 w-fit text-xs"
                onClick={() => {
                  setLinkInput(media.url);
                  setMode("link");
                  setMedia(undefined);
                }}
              >
                Change link
              </Button>
            ) : (
              <Button
                variant={ButtonVariant.SECONDARY}
                className="!h-8 w-fit text-xs"
                onClick={() => openPicker(media.kind === "image" ? "image" : "video")}
                disabled={isUploading}
              >
                {isUploading ? "Uploading…" : "Replace"}
              </Button>
            )}
            <button
              type="button"
              onClick={() => setMedia(undefined)}
              className="inline-flex items-center gap-1 text-xs text-destructive-500 hover:text-destructive-600"
            >
              <Trash className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <SegmentedToggle
            value={mode}
            options={ADD_MODE_OPTIONS}
            onChange={nextMode => {
              setMode(nextMode);
              setLinkError(null);
            }}
            label="Question media type"
          />
          {mode === "link" ? (
            <div className="flex flex-col gap-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={linkInput}
                  onChange={event => setLinkInput(event.target.value)}
                  placeholder="Paste a YouTube, Vimeo or Loom link"
                  className="flex-1 border border-border-light rounded-md px-3 py-2 text-sm outline-none focus:border-primary-400"
                />
                <Button
                  variant={ButtonVariant.SECONDARY}
                  className="!h-10 text-sm"
                  onClick={handleLinkApply}
                >
                  Add
                </Button>
              </div>
              {linkError && <p className="text-xs text-destructive-500">{linkError}</p>}
            </div>
          ) : (
            <Button
              variant={ButtonVariant.SECONDARY}
              className="!h-10 w-fit text-sm"
              onClick={() => openPicker(mode)}
              disabled={isUploading}
            >
              {isUploading ? "Uploading…" : mode === "image" ? "Upload image" : "Upload video"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
