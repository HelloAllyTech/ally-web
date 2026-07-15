import { useRef, useState } from "react";

import axios from "axios";
import { toast } from "sonner";

import {
  useAddComfortAudioTrackMutation,
  useCreateComfortAudioUploadUrlMutation,
  useDeleteComfortAudioTrackMutation,
  useGetComfortAudioTracksQuery,
  useUpdateComfortAudioTrackMutation,
} from "@api";
import { Archive, CheckCircle, Close, Edit, Trash, Unarchive } from "@assets";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { ComfortAudioTrack } from "@types";

const ACCEPTED_AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/x-m4a",
]);
const MAX_AUDIO_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Superadmin-only management of the shared comfort-audio library: upload named
 * audio tracks (presigned S3 upload → persist), preview, rename, archive /
 * unarchive, and delete. Rendered as a section of the SUPER_ADMIN-gated
 * Settings page.
 *
 * Archiving hides a track from the roleplay picker going forward without
 * breaking scenarios that already use it (playback resolves by URL), so it is
 * the safe alternative to deleting a track that is still in use.
 */
export const ComfortAudioSettings = () => {
  // includeArchived so the management screen can see and unarchive tracks
  // (the roleplay picker uses the default, active-only list).
  const { data, isLoading, isError } = useGetComfortAudioTracksQuery({
    includeArchived: true,
  });
  const [createUploadUrl] = useCreateComfortAudioUploadUrlMutation();
  const [addTrack] = useAddComfortAudioTrackMutation();
  const [updateTrack] = useUpdateComfortAudioTrackMutation();
  const [deleteTrack] = useDeleteComfortAudioTrackMutation();

  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Active tracks first, archived pushed to the bottom; stable otherwise.
  const tracks = [...(data?.tracks ?? [])].sort(
    (a, b) => Number(a.isArchived) - Number(b.isArchived),
  );

  const resetForm = () => {
    setName("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!name.trim()) {
      toast.error(en.comfortAudio.nameRequired);
      return;
    }
    if (!file) {
      toast.error(en.comfortAudio.fileRequired);
      return;
    }
    if (!ACCEPTED_AUDIO_TYPES.has(file.type)) {
      toast.error(en.comfortAudio.invalidFileType);
      return;
    }
    if (file.size > MAX_AUDIO_BYTES) {
      toast.error(en.comfortAudio.fileTooLarge);
      return;
    }

    try {
      setIsUploading(true);
      const { presignedUrl, audioUrl } = await createUploadUrl({
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
      }).unwrap();

      await axios.put(presignedUrl, file, {
        headers: { "Content-Type": file.type },
      });

      await addTrack({
        name: name.trim(),
        audioUrl,
        contentType: file.type,
        sizeBytes: file.size,
      }).unwrap();

      toast.success(en.comfortAudio.uploadSuccess);
      resetForm();
    } catch {
      toast.error(en.comfortAudio.uploadFailed);
    } finally {
      setIsUploading(false);
    }
  };

  const startRename = (track: ComfortAudioTrack) => {
    setEditingId(track.id);
    setEditingName(track.name);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleRename = async (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      toast.error(en.comfortAudio.nameRequired);
      return;
    }
    try {
      setBusyId(id);
      await updateTrack({ id, name: trimmed }).unwrap();
      toast.success(en.comfortAudio.renameSuccess);
      cancelRename();
    } catch {
      toast.error(en.comfortAudio.renameFailed);
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleArchive = async (track: ComfortAudioTrack) => {
    const nextArchived = !track.isArchived;
    try {
      setBusyId(track.id);
      await updateTrack({ id: track.id, isArchived: nextArchived }).unwrap();
      toast.success(
        nextArchived ? en.comfortAudio.archiveSuccess : en.comfortAudio.unarchiveSuccess,
      );
    } catch {
      toast.error(nextArchived ? en.comfortAudio.archiveFailed : en.comfortAudio.unarchiveFailed);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTrack(id).unwrap();
      toast.success(en.comfortAudio.deleteSuccess);
    } catch {
      toast.error(en.comfortAudio.deleteFailed);
    }
  };

  const renderRow = (track: ComfortAudioTrack) => {
    const isEditing = editingId === track.id;
    const isBusy = busyId === track.id;
    return (
      <div
        key={track.id}
        className={`flex items-center justify-between gap-4 border border-border-light rounded-md p-3 ${
          track.isArchived ? "opacity-60" : ""
        }`}
      >
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editingName}
                placeholder={en.comfortAudio.renamePlaceholder}
                onChange={e => setEditingName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleRename(track.id);
                  if (e.key === "Escape") cancelRename();
                }}
                autoFocus
                className="flex-1 min-w-0 rounded border border-border-light px-2 py-1 bg-white text-base"
              />
              <button
                type="button"
                aria-label={en.comfortAudio.save}
                title={en.comfortAudio.save}
                disabled={isBusy}
                onClick={() => handleRename(track.id)}
                className="text-typography-600 hover:text-success-500 shrink-0 disabled:opacity-50"
              >
                <CheckCircle />
              </button>
              <button
                type="button"
                aria-label={en.comfortAudio.cancel}
                title={en.comfortAudio.cancel}
                onClick={cancelRename}
                className="text-typography-600 hover:text-typography-900 shrink-0"
              >
                <Close />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-typography-900 truncate">{track.name}</span>
              {track.isArchived && (
                <span
                  title={en.comfortAudio.archivedHelp}
                  className="shrink-0 text-xs font-medium uppercase tracking-wide text-typography-600 border border-border-light rounded px-1.5 py-0.5"
                >
                  {en.comfortAudio.archivedBadge}
                </span>
              )}
            </div>
          )}
          <audio controls src={track.audioUrl} className="w-full max-w-md">
            <track kind="captions" />
          </audio>
        </div>

        {!isEditing && (
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              aria-label={en.comfortAudio.rename}
              title={en.comfortAudio.rename}
              disabled={isBusy}
              onClick={() => startRename(track)}
              className="text-typography-600 hover:text-primary-500 disabled:opacity-50"
            >
              <Edit />
            </button>
            <button
              type="button"
              aria-label={track.isArchived ? en.comfortAudio.unarchive : en.comfortAudio.archive}
              title={track.isArchived ? en.comfortAudio.unarchive : en.comfortAudio.archive}
              disabled={isBusy}
              onClick={() => handleToggleArchive(track)}
              className="text-typography-600 hover:text-primary-500 disabled:opacity-50"
            >
              {track.isArchived ? <Unarchive /> : <Archive />}
            </button>
            <button
              type="button"
              aria-label={en.comfortAudio.deleteSuccess}
              disabled={isBusy}
              onClick={() => handleDelete(track.id)}
              className="text-typography-600 hover:text-destructive-500 disabled:opacity-50"
            >
              <Trash />
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderList = () => {
    if (isLoading) {
      return <p className="text-sm text-typography-600">{en.comfortAudio.loadingTracks}</p>;
    }
    if (isError) {
      return <p className="text-sm text-destructive-500">{en.comfortAudio.listError}</p>;
    }
    if (tracks.length === 0) {
      return <p className="text-sm text-typography-600">{en.comfortAudio.empty}</p>;
    }
    return <div className="flex flex-col gap-3">{tracks.map(renderRow)}</div>;
  };

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-secondary text-typography-900">{en.comfortAudio.title}</h2>
        <p className="text-sm text-typography-600">{en.comfortAudio.description}</p>
      </div>

      <div className="flex flex-col gap-3 max-w-2xl border border-border-light rounded-md p-4">
        <input
          type="text"
          value={name}
          placeholder={en.comfortAudio.uploadNamePlaceholder}
          onChange={e => setName(e.target.value)}
          className="w-full rounded border border-border-light px-3 py-2 bg-white text-base"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,.mp3,.wav,.m4a"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-typography-700"
        />
        <div>
          <Button variant={ButtonVariant.PRIMARY} onClick={handleUpload} disabled={isUploading}>
            {isUploading ? en.comfortAudio.uploading : en.comfortAudio.upload}
          </Button>
        </div>
      </div>

      {renderList()}
    </section>
  );
};
