import { FC, useRef, useState } from "react";

import { useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { SegmentedToggle } from "@components";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { TrackFormValues, TrackItemType, VideoContent } from "@types";

import { ItemEditorFrame } from "./ItemEditorFrame";
import { getEmbedPlayerUrl, parseVideoEmbedUrl } from "../../trackFormUtils";
import { useTrackMediaUpload } from "../../useTrackMediaUpload";

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

  const [mode, setMode] = useState<VideoMode>(source === "s3" ? "upload" : "embed");
  const [embedInput, setEmbedInput] = useState(source === "s3" ? "" : url);
  const [embedError, setEmbedError] = useState<string | null>(null);

  const setVideo = (next: VideoContent) => {
    setValue(`${base}.video`, next, { shouldDirty: true });
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
              <video src={url} controls className="w-full max-h-[320px] rounded-md bg-black" />
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
      </div>
    </ItemEditorFrame>
  );
};
