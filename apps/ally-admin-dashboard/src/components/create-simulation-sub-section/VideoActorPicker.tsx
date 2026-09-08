import { FC, useEffect, useMemo, useRef, useState } from "react";

import { UseFormReturn } from "react-hook-form";

import { useGetVideoActorFacesQuery, useImportVideoActorFaceCoverMutation } from "@api";
import { VideoActorFaceEntry } from "@types";

export interface VideoActorPickerProps {
  label: string;
  /** Rendered under the control in the same style every other field uses. */
  note?: string;
  formMethods: UseFormReturn<any>;
  readOnly?: boolean;
}

const PROVIDER_FIELD = "videoActorProvider";
const FACE_FIELD = "videoActorAvatarId";
const COVER_IMAGE_FIELD = "coverImageUrl";
const COVER_VIDEO_FIELD = "coverVideoUrl";

/**
 * Which face this roleplay's character wears — a strip of faces under the
 * cover fields.
 *
 * ## Why a strip, and no preview of its own
 *
 * Choosing a face sets Cover Image from that face, so the cover field sitting
 * directly above IS the preview: it shows the still at full size, and it is
 * what the learner actually sees. Every earlier shape here gave the selection its own preview pane, which put the same
 * portrait on screen twice — one fact at double visual weight, flattening the
 * hierarchy (Stacks: *Desert Oasis*, and the signal/noise argument beside
 * *Homogenous Redundancy*, whose own rule is to drop the duplicate once the
 * message has landed). It also left a tall pane mostly empty. A horizontal
 * strip carries the roster and nothing else.
 *
 * ## Why there is no vendor question
 *
 * An author picks a face; the vendor follows from it. Asking "Tavus or Beyond
 * Presence?" first is asking something they have no basis to answer — the
 * meaningful difference is which face suits the character, not whose API
 * renders it. ally-be returns one merged roster with each face carrying its own
 * `provider`, and this component stores that value back verbatim without ever
 * interpreting it. Adding a third vendor stays a backend change.
 *
 * ## What choosing a face does to the covers
 *
 * Cover IMAGE becomes that face's still, copied into our own storage under a
 * write-once key. Cover VIDEO is CLEARED.
 *
 * The clearing is the non-obvious half. We cannot import the face's own clip —
 * the vendors' run to 54 MB against the 15 MB the uploader allows, so a third
 * of the roster would need transcoding on a request path. But leaving a
 * previously uploaded video in place is worse than having none: the roleplay
 * then shows this face's photograph beside a different person's video, which is
 * exactly the mismatch an author reported. Empty is the honest state, and the
 * notice says so rather than removing it silently.
 */
export const VideoActorPicker: FC<VideoActorPickerProps> = ({
  label,
  note,
  formMethods,
  readOnly = false,
}) => {
  // No provider argument: the picker always browses every vendor's faces.
  const { data: faces, isFetching, isError } = useGetVideoActorFacesQuery(undefined as never);

  const selectedFace = formMethods.watch(FACE_FIELD) as string | undefined;

  const [importCover, { isLoading: importingCover }] = useImportVideoActorFaceCoverMutation();
  const [coverNotice, setCoverNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [manualEntry, setManualEntry] = useState(false);

  const listedFace = useMemo(
    () => faces?.find(face => face.value === selectedFace),
    [faces, selectedFace],
  );

  // Reopening a roleplay must not require scrolling the strip to find the face
  // it already uses.
  const selectedTileRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledToSelection = useRef(false);
  useEffect(() => {
    if (hasScrolledToSelection.current || !selectedTileRef.current) return;
    hasScrolledToSelection.current = true;
    selectedTileRef.current.scrollIntoView({ block: "nearest", inline: "center" });
  }, [faces, selectedFace]);

  const filteredFaces = useMemo(() => {
    if (!faces) return [];
    const needle = search.trim().toLowerCase();
    if (!needle) return faces;
    return faces.filter(face => face.label.toLowerCase().includes(needle));
  }, [faces, search]);

  /**
   * Point the cover fields at the chosen face's own media, copied into our
   * storage — never at the vendor's CDN, whose paths are account-scoped.
   */
  const applyFaceCover = async (face: VideoActorFaceEntry, clearedVideo = false) => {
    if (!face.thumbnailImageUrl) {
      setCoverNotice(
        `${face.label} has no picture to use as a cover.` +
          (clearedVideo ? " Cover video was cleared to match." : ""),
      );
      return;
    }
    try {
      const media = await importCover({
        provider: face.provider,
        faceId: face.value,
      }).unwrap();

      // The image half. The video was already cleared in onFaceSelect — see
      // the note there for why it cannot simply be left alone.
      formMethods.setValue(COVER_IMAGE_FIELD, media.coverImageUrl ?? undefined, {
        shouldDirty: true,
      });
      // Say that the video went, so a removal the author did not ask for is
      // never silent.
      const videoNote = clearedVideo ? " Cover video was cleared to match." : "";
      setCoverNotice(
        media.coverImageUrl
          ? `Cover image set from ${face.label}.${videoNote}`
          : `No picture could be copied from ${face.label}.${videoNote}`,
      );
    } catch {
      // Never block choosing a face on a cover copy: the face is the decision,
      // the cover is a convenience.
      setCoverNotice("Couldn't update the cover from this face. The face is still selected.");
    }
  };

  const onFaceSelect = (face: VideoActorFaceEntry) => {
    formMethods.setValue(FACE_FIELD, face.value, { shouldDirty: true });
    // The vendor is derived, never asked for.
    formMethods.setValue(PROVIDER_FIELD, face.provider, { shouldDirty: true });

    // Clear any cover video. The cover image is about to become this face, and
    // we cannot import the face's own clip (the vendors' run to 54 MB against a
    // 15 MB limit), so keeping the previous one leaves the roleplay showing one
    // person's photo beside a different person's video. Empty is the honest
    // state. Cleared here rather than inside applyFaceCover so it also happens
    // when the face has no picture or the import fails — the mismatch is just
    // as wrong in those cases.
    const hadVideo = !!formMethods.getValues(COVER_VIDEO_FIELD);
    if (hadVideo) {
      formMethods.setValue(COVER_VIDEO_FIELD, undefined, { shouldDirty: true });
    }

    setCoverNotice(null);
    void applyFaceCover(face, hadVideo);
  };

  const clearFace = () => {
    formMethods.setValue(FACE_FIELD, undefined, { shouldDirty: true });
    formMethods.setValue(PROVIDER_FIELD, undefined, { shouldDirty: true });
    setCoverNotice(null);
    setManualEntry(false);
    // The cover is left exactly as it is: those bytes are in our storage and
    // are a perfectly good cover, and silently blanking a roleplay's cover
    // because the avatar was turned off would be worse than leaving it.
  };

  const withPreview = useMemo(
    () => filteredFaces.filter(face => !!face.thumbnailImageUrl),
    [filteredFaces],
  );
  const withoutPreview = useMemo(
    () => filteredFaces.filter(face => !face.thumbnailImageUrl),
    [filteredFaces],
  );

  const renderTile = (face: VideoActorFaceEntry) => {
    const isSelected = face.value === selectedFace;
    return (
      <div
        key={`${face.provider}-${face.value}`}
        ref={isSelected ? selectedTileRef : undefined}
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        data-testid={`video-actor-face-${face.value}`}
        title={face.label}
        onClick={() => !readOnly && onFaceSelect(face)}
        onKeyDown={event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!readOnly) onFaceSelect(face);
          }
        }}
        className={`flex w-20 shrink-0 flex-col items-center gap-1 rounded-lg border p-2 transition-colors ${
          isSelected
            ? "border-blue-600 bg-blue-50"
            : "border-border-light hover:bg-background-secondary"
        } ${readOnly ? "cursor-default" : "cursor-pointer"}`}
      >
        {face.thumbnailImageUrl ? (
          <img
            src={face.thumbnailImageUrl}
            alt={face.label}
            loading="lazy"
            className="h-14 w-14 rounded-md object-cover"
          />
        ) : (
          // A neutral initial beats a broken image or a stock silhouette, which
          // would both read as "this is the face".
          // Dashed, initial-bearing, and deliberately NOT the grey block a
          // failed <img> leaves behind: this vendor publishes no preview media
          // at all, so the absence is permanent and should look intentional
          // rather than like something still loading.
          <div
            className="border-border-light text-typography-500 flex h-14 w-14 items-center justify-center rounded-md border border-dashed text-lg"
            aria-hidden="true"
          >
            {face.label.trim().charAt(0).toUpperCase() || "?"}
          </div>
        )}
        <span className="text-typography-700 w-full truncate text-center text-xs">
          {face.label}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2" data-testid="video-actor-picker">
      <label className="text-typography-900 text-base flex items-center gap-1">{label}</label>

      {isFetching && <span className="text-typography-500 text-sm">Loading faces…</span>}

      {!isFetching && (isError || !faces?.length) && (
        <span className="text-typography-500 text-sm">
          No faces could be listed right now. Enter a face id below — the roleplay will still work.
        </span>
      )}

      {!isFetching && !!faces?.length && (
        <>
          <div className="flex flex-row items-center gap-3">
            <input
              type="text"
              data-testid="video-actor-face-search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search faces"
              className="bg-background-secondary w-64 rounded px-3 py-2 text-sm focus:outline-none"
            />
            <span className="text-typography-500 text-sm">
              {selectedFace
                ? `Selected: ${listedFace?.label ?? selectedFace}`
                : `${faces.length} faces`}
            </span>
            {importingCover && <span className="text-typography-500 text-sm">Setting cover…</span>}
          </div>

          {filteredFaces.length ? (
            <div className="custom-scrollbar border-border-light flex flex-row items-stretch gap-2 overflow-x-auto rounded-sm border p-2">
              {withPreview.map(renderTile)}
              {!!withoutPreview.length && (
                <>
                  {/*
                    A labelled divider rather than interleaving. The backend
                    already sorts previewable faces first; without a marker the
                    strip just appears to degrade partway through, which reads
                    as a loading failure. Naming the boundary makes it a fact
                    about the vendor instead.
                  */}
                  {!!withPreview.length && (
                    <div className="border-border-light mx-1 flex shrink-0 flex-col items-center justify-center border-l pl-3">
                      <span className="text-typography-500 w-16 text-center text-xs leading-tight">
                        No preview from vendor
                      </span>
                    </div>
                  )}
                  {withoutPreview.map(renderTile)}
                </>
              )}
            </div>
          ) : (
            <span className="text-typography-500 text-sm">No face matches that name.</span>
          )}

          <div className="flex flex-row items-center gap-4">
            {selectedFace && (
              <button
                type="button"
                data-testid="video-actor-clear-face"
                disabled={readOnly}
                className="text-typography-600 hover:text-typography-900 text-sm underline"
                onClick={clearFace}
              >
                Clear face
              </button>
            )}
            <button
              type="button"
              className="text-typography-600 hover:text-typography-900 text-sm underline"
              onClick={() => setManualEntry(current => !current)}
            >
              {manualEntry ? "Hide face id" : "Enter a face id instead"}
            </button>
          </div>

          {coverNotice && (
            <span data-testid="video-actor-cover-notice" className="text-typography-500 text-sm">
              {coverNotice}
            </span>
          )}
        </>
      )}

      {(manualEntry || isError || !faces?.length) && (
        <input
          data-testid="video-actor-face-manual"
          type="text"
          readOnly={readOnly}
          value={selectedFace ?? ""}
          onChange={event =>
            formMethods.setValue(FACE_FIELD, event.target.value || undefined, {
              shouldDirty: true,
            })
          }
          placeholder="Face id"
          className="border-border-light w-64 rounded-md border p-2 text-sm"
        />
      )}

      {note && <span className="text-typography-500 text-sm">{note}</span>}
    </div>
  );
};
