import React, { useCallback, useRef, useState } from "react";

import { Close, TooltipIcon, UploadImage } from "@icons";
import axios from "axios";
import { toast } from "sonner";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { useGetRoadmapReferenceImageUploadUrlMutation } from "@api";
import { RoadmapReferenceImage } from "@types";

/**
 * Mirrors ROADMAP_LIMITS.REFERENCE_IMAGES_MAX and ROADMAP_REFERENCE_IMAGE_MAX_SIZE_BYTES in
 * ally-be. Duplicated rather than fetched: they bound what this control lets somebody DO, and a
 * cap the UI learns about only from a rejection is a cap that reads as a bug. The server still
 * enforces both — this only decides whether the request is worth making.
 */
export const REFERENCE_IMAGES_MAX = 6;
export const REFERENCE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const CAPTION_MAX = 200;

/**
 * The types the presign endpoint accepts. SVG is deliberately absent even though the blog editor
 * accepts it — an SVG is a document that can carry script, and it is rendered inline here for
 * every roadmap viewer. Nothing anyone attaches to an opportunity needs to be one.
 */
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface ReferenceImagesFieldProps {
  images: RoadmapReferenceImage[];
  /** Receives the FULL resulting list, matching what the API takes — never a delta. */
  onChange: (images: RoadmapReferenceImage[]) => void;
  /** False renders the same thumbnails with no controls, for a reader who cannot edit. */
  canEdit: boolean;
}

/**
 * Attach screenshots, mocks or photos to an opportunity.
 *
 * Shared by both drawers on purpose. Filing and editing are two different screens with two
 * different save models — one explicit button, one debounced autosave — and an attachment control
 * that behaved differently between them would be the kind of difference nobody can explain later.
 * It owns no state but the in-flight upload: the list lives in whichever drawer is rendering it,
 * which is what lets the create drawer hold images for a row that does not exist yet and the edit
 * drawer fold them into its dirty check.
 *
 * ## Upload, then attach — two steps, deliberately
 *
 * The file goes straight to S3 through a presigned PUT, so a 5 MB screenshot never travels
 * through the API. Only the returned URL comes back here, and only the drawer's own save actually
 * attaches it. Abandoning the drawer therefore leaves an unreferenced object rather than a row
 * pointing at a picture nobody meant to keep.
 *
 * ## Errors are per file, not per batch
 *
 * Selecting five images where the third is a 12 MB TIFF uploads the other four and names the one
 * that failed. The alternative — refusing the batch — makes the person pick them all again to
 * lose one, and the cap means they may not have room to retry the whole set anyway.
 *
 * ## No drag-to-reorder
 *
 * The order is stored and honoured (it is the order they were added), but there is no handle to
 * change it. Reordering evidence is not a thing anyone has needed, and a drag surface here would
 * sit inside a drawer that is itself a drop target for files — two drag behaviours in one box,
 * for a rearrangement that remove-and-re-add already covers. Worth revisiting only if somebody
 * asks.
 */
export const ReferenceImagesField: React.FC<ReferenceImagesFieldProps> = ({
  images,
  onChange,
  canEdit,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [getUploadUrl] = useGetRoadmapReferenceImageUploadUrlMutation();

  const remaining = REFERENCE_IMAGES_MAX - images.length;

  const uploadOne = useCallback(
    async (file: File): Promise<RoadmapReferenceImage | null> => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`${file.name} is not a JPG, PNG, WEBP or GIF.`);
        return null;
      }
      if (file.size > REFERENCE_IMAGE_MAX_BYTES) {
        toast.error(`${file.name} is larger than 5 MB.`);
        return null;
      }
      try {
        const { presignedUrl, imageUrl } = await getUploadUrl({
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
        }).unwrap();
        await axios.put(presignedUrl, file, { headers: { "Content-Type": file.type } });
        return { url: imageUrl };
      } catch {
        toast.error(`Could not upload ${file.name}.`);
        return null;
      }
    },
    [getUploadUrl],
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const selected = Array.from(files);

      // Trim to what will fit BEFORE uploading rather than after: uploading a file only to
      // discard it leaves an object in the bucket nothing will ever point at.
      const accepted = selected.slice(0, remaining);
      if (selected.length > accepted.length) {
        toast.error(
          `Only ${REFERENCE_IMAGES_MAX} images fit on an opportunity, so ${
            selected.length - accepted.length
          } were skipped.`,
        );
      }
      if (!accepted.length) return;

      setIsUploading(true);
      try {
        const uploaded = (await Promise.all(accepted.map(uploadOne))).filter(
          (image): image is RoadmapReferenceImage => image !== null,
        );
        // One onChange for the batch, from the CURRENT props: appending inside the loop would
        // make each call overwrite the last on a stale `images`.
        if (uploaded.length) onChange([...images, ...uploaded]);
      } finally {
        setIsUploading(false);
      }
    },
    [images, onChange, remaining, uploadOne],
  );

  const setCaption = (index: number, caption: string) =>
    onChange(images.map((image, i) => (i === index ? { ...image, caption } : image)));

  // Removing drops the reference, not the object — see the API note. An accidental removal is
  // recoverable by re-uploading; a delete that broke another row pointing at the same object
  // would not be.
  const removeAt = (index: number) => onChange(images.filter((_image, i) => i !== index));

  // Nothing to show and nothing to add: render nothing rather than an empty box telling a reader
  // who cannot act that there is nothing there.
  if (!canEdit && images.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <h3 className="text-typography-primary text-sm">Reference images</h3>
        {canEdit && (
          <Tooltip
            label="Screenshots, mocks or a photo of a whiteboard — anything that shows what the words are describing. Up to 6, 5 MB each. Removing one here leaves the uploaded file in place; it just stops being shown."
            align="top"
          >
            <button type="button" className="inline-flex cursor-pointer items-center">
              <TooltipIcon />
            </button>
          </Tooltip>
        )}
      </div>

      {images.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {images.map((image, index) => (
            <li key={image.url} className="flex flex-col gap-1">
              <div className="border-border-light relative border">
                {/* Opens the full-size object in a new tab: the thumbnail is small enough that
                    "is the row really wrapping?" cannot be answered from it, and a lightbox is a
                    lot of machinery for what a new tab already does. */}
                <a href={image.url} target="_blank" rel="noreferrer noopener">
                  <img
                    src={image.url}
                    // The caption when there is one, so a screen reader gets the sentence the
                    // person actually wrote rather than "Reference image 2". The numbered
                    // fallback is only for images nobody captioned.
                    alt={image.caption || `Reference image ${index + 1}`}
                    className="h-24 w-full object-cover"
                    loading="lazy"
                  />
                </a>
                {canEdit && (
                  <button
                    type="button"
                    aria-label={`Remove ${image.caption || `reference image ${index + 1}`}`}
                    onClick={() => removeAt(index)}
                    className="bg-white/90 text-typography-700 hover:text-destructive-500 absolute top-1 right-1 inline-flex cursor-pointer items-center rounded-full p-1 transition-colors"
                  >
                    <Close size={14} />
                  </button>
                )}
              </div>
              {canEdit ? (
                <input
                  type="text"
                  value={image.caption ?? ""}
                  maxLength={CAPTION_MAX}
                  onChange={event => setCaption(index, event.target.value)}
                  placeholder="Caption (optional)"
                  aria-label={`Caption for reference image ${index + 1}`}
                  className="border-border-light text-typography-primary w-full border px-2 py-1 text-xs"
                />
              ) : (
                image.caption && (
                  <span className="text-typography-secondary text-xs">{image.caption}</span>
                )
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            multiple
            // Named even though it is visually hidden and driven by the button: a file input
            // with no accessible name is what a keyboard or screen-reader user actually lands on
            // if focus ever reaches it.
            aria-label="Add reference images"
            aria-hidden="true"
            tabIndex={-1}
            accept={ACCEPTED_TYPES.join(",")}
            className="hidden"
            onChange={event => {
              void handleFiles(event.target.files);
              // Reset, or picking the same file twice in a row fires no change event — which
              // reads as the button having stopped working.
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            // Disabled at the cap rather than hidden: a control that vanishes leaves nothing to
            // explain why, and the count beside it says how to get one back.
            disabled={isUploading || remaining <= 0}
            className="border-border-light text-typography-primary inline-flex cursor-pointer items-center gap-1 border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UploadImage size={14} />
            {isUploading ? "Uploading…" : "Add images"}
          </button>
          <span className="text-typography-secondary text-xs">
            {remaining > 0
              ? `${images.length} of ${REFERENCE_IMAGES_MAX} · JPG, PNG, WEBP or GIF, up to 5 MB`
              : `${REFERENCE_IMAGES_MAX} of ${REFERENCE_IMAGES_MAX} — remove one to add another`}
          </span>
        </div>
      )}
    </section>
  );
};
