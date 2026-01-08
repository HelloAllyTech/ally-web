"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import axios from "axios";
import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import { Trash, Upload } from "../../assets";
import { CustomImage } from "../custom-image";
interface imageUploadType {
  fileName: string;
  fileSize: number;
  contentType: string;
}
interface ImageUploadProps {
  formMethods?: UseFormReturn<any>;
  uploadId: string;
  uploadButtonName?: string;
  uploadTitle?: string;
  onUpload: (payload: imageUploadType) => Promise<any>;
  onDelete: (profileImageUrl: any) => Promise<any>;
  details: any;
}

const ASPECT_RATIO_TOLERANCE = 0.01;
const PROFILE_ASPECT_RATIO = 1 / 1;
const maxFileSize = 2 * 1024 * 1024; // 2MB

const imageTypes = {
  JPEG: "image/jpeg",
  PNG: "image/png",
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value?.trim() !== "";
};

const ImageUpload: React.FC<ImageUploadProps> = ({
  formMethods,
  uploadId,
  uploadButtonName,
  uploadTitle,
  onUpload,
  onDelete,
  details,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  // Set the initial file URL only once

  useEffect(() => {
    setPreviewUrl(details?.[uploadId]);
  }, [details]);

  const uploadToS3 = useCallback(async (file: File, uploadUrl: string) => {
    try {
      const response = await axios.put(uploadUrl, file, {
        headers: { "Content-Type": file.type },
      });

      if (response.status !== 200) {
        throw new Error("fileUploadFailed");
      }

      return true;
    } catch (error) {
      toast.error("fileUploadFailed");
      throw error;
    }
  }, []);

  const handleUploadClick = async () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isNonEmptyString(previewUrl)) return;

    try {
      await onDelete({ [uploadId]: previewUrl });
      setPreviewUrl("");
    } catch {
      toast.error("Failed to delete image");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    formMethods?.setValue(uploadId, null, { shouldDirty: true });
  };

  const uploadFileToS3 = async (file: File) => {
    const response = await onUpload({
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type,
    });
    await uploadToS3(file, response.data.presignedUrl);
    if (uploadId === "profileImageUrl")
      formMethods?.setValue(uploadId, response.data.profileImageUrl, {
        shouldDirty: true,
      });
    else
      formMethods?.setValue(uploadId, response.data.logoUrl, {
        shouldDirty: true,
      });
    setPreviewUrl(response.data[uploadId]);
  };

  const validateImage = (objectUrl: string, img: HTMLImageElement, file: File) => {
    const aspectRatio = img.width / img.height;
    const isValidRatio = Math.abs(aspectRatio - PROFILE_ASPECT_RATIO) <= ASPECT_RATIO_TOLERANCE;

    if (!isValidRatio) {
      URL.revokeObjectURL(objectUrl);
      toast.error("Please upload an image with the correct aspect ratio");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > maxFileSize) {
      URL.revokeObjectURL(objectUrl);
      toast.error("File must be under 2MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (![imageTypes.JPEG, imageTypes.PNG].includes(file.type)) {
      toast.error("File must be JPEG or PNG.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      validateImage(objectUrl, img, file);
      try {
        await uploadFileToS3(file);
      } catch {
        URL.revokeObjectURL(objectUrl);
        toast.error("Failed to upload image");
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast.error("Failed to load image");
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    img.src = objectUrl;
  };
  return (
    <div className="flex gap-5">
      <div
        className={`relative flex border-2 border-border-light w-[120px] h-[120px] justify-center items-center cursor-pointer group ${
          uploadId === "profileImageUrl" ? "rounded-full" : "border-dashed"
        }`}
        onClick={handleUploadClick}
      >
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        {previewUrl ? (
          <>
            <CustomImage
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover "
              fallbackClassName={`w-full h-full flex justify-center items-center object-cover ${uploadId === "profileImageUrl" ? "rounded-full" : "rounded-md"}`}
              containerClassName={`w-full h-full bg-gray-200  overflow-hidden object-cover ${
                uploadId === "profileImageUrl" ? "rounded-full" : "border-dashed"
              }`}
            />
            <div
              className={`absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity
              ${uploadId === "profileImageUrl" ? "rounded-full" : "rounded-md"}`}
            >
              <button
                type="button"
                className="p-1.5 bg-white rounded-full"
                onClick={handleRemoveFile}
              >
                <Trash />
              </button>
            </div>
          </>
        ) : (
          <Upload />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-base">{uploadTitle || "Image"}</span>
        <span className="w-32 text-typography-700 text-xs">
          {"PNG or JPG files only 1:1 ratio (max 2mb)"}
        </span>
        <button
          type="button"
          className="border rounded-full text-base font-tertiary py-2 text-typography-900"
          onClick={handleUploadClick}
        >
          {uploadButtonName || "Upload"}
        </button>
      </div>
    </div>
  );
};

export default ImageUpload;
