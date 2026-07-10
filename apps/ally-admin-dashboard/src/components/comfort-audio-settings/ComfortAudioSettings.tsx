import { useRef, useState } from "react";

import axios from "axios";
import { toast } from "sonner";

import {
  useAddComfortAudioTrackMutation,
  useCreateComfortAudioUploadUrlMutation,
  useDeleteComfortAudioTrackMutation,
  useGetComfortAudioTracksQuery,
} from "@api";
import { Trash } from "@assets";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";

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
 * audio tracks (presigned S3 upload → persist), preview, and delete. Rendered as
 * a section of the SUPER_ADMIN-gated Settings page.
 */
export const ComfortAudioSettings = () => {
  const { data, isLoading, isError } = useGetComfortAudioTracksQuery();
  const [createUploadUrl] = useCreateComfortAudioUploadUrlMutation();
  const [addTrack] = useAddComfortAudioTrackMutation();
  const [deleteTrack] = useDeleteComfortAudioTrackMutation();

  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tracks = data?.tracks ?? [];

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

  const handleDelete = async (id: string) => {
    try {
      await deleteTrack(id).unwrap();
      toast.success(en.comfortAudio.deleteSuccess);
    } catch {
      toast.error(en.comfortAudio.deleteFailed);
    }
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
    return (
      <div className="flex flex-col gap-3">
        {tracks.map(track => (
          <div
            key={track.id}
            className="flex items-center justify-between gap-4 border border-border-light rounded-md p-3"
          >
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <span className="text-typography-900 truncate">{track.name}</span>
              <audio controls src={track.audioUrl} className="w-full max-w-md">
                <track kind="captions" />
              </audio>
            </div>
            <button
              type="button"
              aria-label={en.comfortAudio.deleteSuccess}
              onClick={() => handleDelete(track.id)}
              className="text-typography-600 hover:text-destructive-500 shrink-0"
            >
              <Trash />
            </button>
          </div>
        ))}
      </div>
    );
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
          <Button
            variant={ButtonVariant.PRIMARY}
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? en.comfortAudio.uploading : en.comfortAudio.upload}
          </Button>
        </div>
      </div>

      {renderList()}
    </section>
  );
};
