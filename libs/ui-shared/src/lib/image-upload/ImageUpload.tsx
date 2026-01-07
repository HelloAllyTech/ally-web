"use client";

import { useEffect, useRef, useState } from "react";

import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import { Trash, Upload } from "../../assets";

interface ImageUploadProps {
  formMethods?: UseFormReturn<any>;
  uploadId: string;
  uploadButtonName?: string;
  uploadTitle?: string;
  details?: any;
}

const ASPECT_RATIO_TOLERANCE = 0.01;
const PROFILE_ASPECT_RATIO = 1 / 1;

const imageTypes = {
  JPEG: "image/jpeg",
  PNG: "image/png",
};
const ImageUpload: React.FC<ImageUploadProps> = ({
  formMethods,
  uploadId,
  uploadButtonName,
  uploadTitle,
  details,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (details?.logo || details?.profile) {
      setPreviewUrl(details.logo || details.profile);
    } else {
      setPreviewUrl(null);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [details]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);

    if (fileInputRef.current) fileInputRef.current.value = "";
    formMethods?.setValue(uploadId, "", { shouldDirty: true });
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
      const aspectRatio = img.width / img.height;
      const isValidRatio = Math.abs(aspectRatio - PROFILE_ASPECT_RATIO) <= ASPECT_RATIO_TOLERANCE;

      if (!isValidRatio) {
        URL.revokeObjectURL(objectUrl);
        toast.error("Please upload an image with the correct aspect ratio");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      try {
        // TODO: Upload using presigned URL logic
        // await uploadFile(file);

        setPreviewUrl(objectUrl);
        formMethods?.setValue(uploadId, objectUrl, { shouldDirty: true });
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
            <img
              src={previewUrl}
              alt="Preview"
              className={`w-full h-full ${
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
        <span className="w-40 text-typography-700 text-xs">
          {"PNG or JPG files only (240x240 preferred)"}
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
