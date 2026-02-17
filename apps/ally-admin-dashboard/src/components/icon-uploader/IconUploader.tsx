import React, { useState, useCallback, useRef } from "react";

import axios from "axios";
import { toast } from "sonner";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { UploadImage, Edit } from "@assets";
import { en } from "@constants";

export interface IconUploaderProps {
  imageUrl: string;
  onImageChange: (url: string) => void;
  onImageDelete: (url: string) => void;
  onUpload: (payload: { fileName: string; fileSize: number; contentType: string }) => Promise<{
    presignedUrl: string;
    imageUrl: string;
  }>;
}

export const IconUploader: React.FC<IconUploaderProps> = ({
  imageUrl,
  onImageChange,
  onUpload,
  onImageDelete,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(imageUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [previousUrl, setPreviousUrl] = useState<string>(imageUrl);

  const validateAspectRatio = useCallback((file: File): Promise<boolean> => {
    return new Promise(resolve => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const aspectRatio = img.width / img.height;
        // Check if aspect ratio is 1:1 (with small tolerance for rounding)
        const isSquare = Math.abs(aspectRatio - 1) <= 0.01;
        if (!isSquare) {
          toast.error(en.badge.iconMustBeSquare);
        }
        resolve(isSquare);
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        resolve(false);
      };
    });
  }, []);

  const uploadToS3 = useCallback(async (file: File, uploadUrl: string) => {
    const response = await axios.put(uploadUrl, file, {
      headers: { "Content-Type": file.type },
    });

    if (response.status !== 200) {
      throw new Error("File upload failed");
    }

    return true;
  }, []);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file) return;

      // Validate file type
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        toast.error(en.badge.iconMustBeImageFile);
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error(en.badge.iconFileTooLarge);
        return;
      }

      // Validate aspect ratio (1:1)
      const isValidAspectRatio = await validateAspectRatio(file);
      if (!isValidAspectRatio) {
        return;
      }
      // Create preview URL for immediate feedback
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Upload to server
      setIsUploading(true);
      try {
        const response = await onUpload({
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
        });

        await uploadToS3(file, response.presignedUrl);
        onImageChange(response.imageUrl);

        // Delete previous image if it existed (and wasn't a blob URL)
        if (previousUrl && !previousUrl.startsWith("blob:")) {
          onImageDelete?.(previousUrl);
        }
        setPreviousUrl(response.imageUrl);
      } catch {
        URL.revokeObjectURL(objectUrl);
        setPreviewUrl(previousUrl); // Restore previous preview on error
        toast.error(en.badge.iconUploadFailed);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } finally {
        setIsUploading(false);
      }
    },
    [onImageChange, onImageDelete, validateAspectRatio, onUpload, uploadToS3, previewUrl],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="flex flex-row items-start gap-6">
      {/* Upload Box */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative w-[120px] h-[120px] border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden transition-all ${
          isDragging
            ? "border-primary-500 bg-primary-50"
            : previewUrl
              ? "border-none "
              : "border-border-light bg-white"
        }`}
        onClick={!previewUrl ? handleClick : undefined}
      >
        {previewUrl ? (
          <div className="group relative w-full h-full">
            <CustomImage src={previewUrl} alt="Badge icon" className="w-full h-full object-cover" />
            {/* Hover overlay with edit button */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                onClick={e => {
                  e.stopPropagation();
                  handleClick();
                }}
                className="p-2 bg-white rounded-full shadow-md hover:bg-primary-50 transition-colors"
              >
                <Edit width={16} height={16} className="text-primary-600" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-typography-400">
            <UploadImage width={28} height={28} />
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {/* Label and Upload Button */}
      <div className="flex flex-col gap-2 pt-2">
        <div className="flex items-center gap-1 font-primary">
          <span className="text-base font-regular text-typography-800">{en.badge.icon}</span>
          <span className="text-red-500">*</span>
        </div>
        <p className="text-sm text-typography-500">{en.badge.iconUploadHint}</p>
        <button
          type="button"
          onClick={handleClick}
          disabled={isUploading}
          className="text-primary-600 font-medium text-base hover:text-primary-700 text-left disabled:text-typography-400 disabled:cursor-not-allowed"
        >
          {isUploading
            ? en.badge.uploading
            : previewUrl
              ? en.badge.changeIcon
              : en.badge.uploadIcon}
        </button>
      </div>
    </div>
  );
};
