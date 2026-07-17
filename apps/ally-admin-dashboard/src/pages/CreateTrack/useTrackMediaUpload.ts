import { useState } from "react";

import axios from "axios";
import { toast } from "sonner";

import { useGetTrackMediaUploadUrlMutation } from "@api";
import { TrackMediaUploadUrlInput } from "@types";

/**
 * Two-step media upload for the track builder: mint a presigned URL from ally-be,
 * PUT the file straight to S3, then hand back the stored public URL. Shared by the
 * cover-image uploader, the article image button and the video uploader.
 */
export const useTrackMediaUpload = () => {
  const [getUploadUrl] = useGetTrackMediaUploadUrlMutation();
  const [isUploading, setIsUploading] = useState(false);

  const upload = async (
    file: File,
    kind: TrackMediaUploadUrlInput["kind"],
    durationSeconds?: number,
  ): Promise<string | null> => {
    try {
      setIsUploading(true);
      const { presignedUrl, publicUrl } = await getUploadUrl({
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
        kind,
        ...(durationSeconds != null ? { duration: durationSeconds } : {}),
      }).unwrap();

      await axios.put(presignedUrl, file, {
        headers: { "Content-Type": file.type },
      });

      return publicUrl;
    } catch (error: any) {
      toast.error(error?.data?.message || "Upload failed. Please try again.");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading };
};
