import { useState, useCallback, useRef } from "react";

import axios from "axios";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { useGetCoverImageUrlMutation, useDeleteCoverImageMutation } from "@api";
import { DragUpload, Trash } from "@assets";
import { CustomImage } from "@components";
import { en, imageTypes } from "@constants";
import { isNonEmptyString } from "@utils";

const TWO_MP = 2 * 1024 * 1024;
const ASPECT_RATIO = 16 / 9;
const TOLERANCE = 0.01;
const ACCEPTED_IMAGE_TYPES = { "image/jpeg": [".jpeg", ".jpg"], "image/png": [".png"] };

export const FileUpload = ({ id, formMethods, isMandatory, label }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { setValue, setError, clearErrors, formState, register, watch } = formMethods;
  const [getCoverImageUrl] = useGetCoverImageUrlMutation();
  const [deleteCoverImage] = useDeleteCoverImageMutation();

  const requiredErrorMessage = isMandatory ? `${label} is required` : false;

  const uploadedImageUrl = watch(id);
  const initialImageUrlRef = useRef("");

  // set the initial image url only if it is not already set
  if (isNonEmptyString(uploadedImageUrl) && !isNonEmptyString(initialImageUrlRef.current)) {
    initialImageUrlRef.current = uploadedImageUrl;
  }

  const handleFileValidation = useCallback(
    (file: File) => {
      if (![imageTypes.JPEG, imageTypes.PNG].includes(file.type)) {
        setError(id, { type: "manual", message: "File must be JPEG or PNG." });
        toast.error("File must be JPEG or PNG.");
        return false;
      }
      if (file.size > TWO_MP) {
        setError(id, { type: "manual", message: "File must be under 2MB." });
        toast.error("File must be under 2MB.");
        return false;
      }
      return true;
    },
    [id, setError],
  );

  const uploadToS3 = useCallback(async (file: File, uploadUrl: string) => {
    try {
      const response = await axios.put(uploadUrl, file, {
        headers: { "Content-Type": file.type },
      });

      if (response.status !== 200) {
        throw new Error("Failed to upload file to S3");
      }

      return true;
    } catch (error) {
      toast.error("Failed to upload file. Please try again.");
      throw error;
    }
  }, []);

  const processImage = useCallback(
    async (file: File) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = async () => {
        const aspectRatio = img.width / img.height;
        const targetRatio = ASPECT_RATIO;
        const tolerance = TOLERANCE; // Allow small floating point differences

        if (Math.abs(aspectRatio - targetRatio) > tolerance) {
          setError(id, { type: "manual", message: "Image must have a 16:9 aspect ratio." });
          toast.error("Image must have a 16:9 aspect ratio.");
          return;
        }

        try {
          setIsUploading(true);
          clearErrors(id);

          // Get presigned URL
          const response = await getCoverImageUrl({
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type,
          }).unwrap();

          // Upload to S3
          await uploadToS3(file, response.presignedUrl);

          // Update state with S3 URL
          setUploadedFile(file);
          setValue(id, response.coverImageUrl, { shouldValidate: true });
        } catch {
          setError(id, { type: "manual", message: "Failed to upload file. Please try again." });
        } finally {
          setIsUploading(false);
        }
      };
    },
    [setError, id, clearErrors, setValue, getCoverImageUrl, uploadToS3],
  );
  // Dropzone logic
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      if (!handleFileValidation(file)) return;
      processImage(file);
    },
    [handleFileValidation, processImage],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true, // prevent auto opening when clicking the dropzone
    noKeyboard: true, // disable keyboard default behavior
    accept: ACCEPTED_IMAGE_TYPES,
    multiple: false,
  });

  // Handle manual file choose (for button click)
  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!handleFileValidation(file)) return;
    processImage(file);
  };

  const onDeleteClick = async () => {
    if (!isNonEmptyString(uploadedImageUrl)) return;

    try {
      if (uploadedImageUrl !== initialImageUrlRef.current) {
        // delete the image from the s3 only if it is not the initial image
        await deleteCoverImage({ coverImageUrl: uploadedImageUrl }).unwrap();
      }
      setUploadedFile(null);
      setValue(id, null);
    } catch {
      toast.error("Failed to delete image. Please try again.");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[#49454F] cursor-pointer flex items-center">
        {en.simulation.upload}
        {isMandatory && <span className="text-red-500">*</span>}
      </label>

      <div>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg text-center transition-colors h-64 relative overflow-hidden ${
            isDragActive ? "border-blue-600 bg-blue-50" : "border-gray-300 hover:border-blue-600"
          }`}
        >
          {/* Hidden input for manual choose */}
          <input
            {...register(id, { required: requiredErrorMessage })}
            id={id}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleManualChange}
            className="hidden"
          />

          {/* Dropzone input */}
          <input {...getInputProps()} />

          {/* Placeholder when no file */}
          {!uploadedFile && (
            <div
              className="cursor-pointer flex flex-col items-center justify-center h-full"
              onClick={open}
            >
              <DragUpload />
              <div className="mt-4 text-gray-500">
                {isUploading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Uploading...
                  </div>
                ) : (
                  <>
                    {en.simulation.dragDrop}{" "}
                    <span className="text-blue-600">{en.simulation.choose}</span>{" "}
                    {en.simulation.pngUploadGuidelines}
                    <br />
                    {en.simulation.resolution}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Preview */}
          {uploadedImageUrl && uploadedImageUrl.length > 0 && (
            <CustomImage
              src={uploadedImageUrl}
              alt="Uploaded file preview"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </div>

        {/* File info + delete */}
        {isNonEmptyString(uploadedImageUrl) && (
          <div className="flex items-center justify-between mt-2">
            <div className="flex flex-col">
              {uploadedFile && <span className="text-gray-700 truncate">{uploadedFile.name}</span>}
            </div>
            <button type="button" onClick={onDeleteClick}>
              <Trash />
            </button>
          </div>
        )}

        {/* Error message */}
        {formState.errors.upload && (
          <p className="text-red-500 text-sm mt-1">{formState.errors.upload.message}</p>
        )}
      </div>
    </div>
  );
};
