import { useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { Trash, Upload } from "@assets";
import { ASPECT_RATIO_TOLERANCE, en, imageTypes, PROFILE_ASPECT_RATIO } from "@constants";

export const ImageUpload = ({ formMethods, uploadId, uploadButtonName, uploadTitle, details }) => {
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
      toast.error(en.errors.fileMustBeJPEGOrPNG);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      const aspectRatio = img.width / img.height;
      const isValidRatio = Math.abs(aspectRatio - PROFILE_ASPECT_RATIO) <= ASPECT_RATIO_TOLERANCE;

      if (!isValidRatio) {
        URL.revokeObjectURL(objectUrl);
        toast.error(en.errors.imageMustHave1AspectRatio);
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
        toast.error(en.errors.failedToUploadImage);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast.error(en.errors.failedToLoadImage);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    img.src = objectUrl;
  };
  return (
    <div className="flex gap-5">
      <div
        className="relative flex border-2 border-dashed border-border-light hover:border-primary w-[100px] h-[100px] justify-center items-center cursor-pointer group rounded-md"
        onClick={handleUploadClick}
      >
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        {previewUrl ? (
          <>
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover rounded-md" />
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
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
        <span className="text-base">{uploadTitle || en.userManagement.logo}</span>
        <span className="w-40 text-typography-500 text-xs">
          {en.userManagement.logoDescription}
        </span>
        <button
          type="button"
          className="border rounded-full text-base font-tertiary py-1 px-4 text-typography-900"
          onClick={handleUploadClick}
        >
          {uploadButtonName || en.userManagement.uploadLogo}
        </button>
      </div>
    </div>
  );
};
