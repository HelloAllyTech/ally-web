import { useState, useCallback, useRef } from "react";

import axios from "axios";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { CustomVideo, CustomImage } from "@ally-ui-mono/ui-shared";
import {
  useGetCoverImageUrlMutation,
  useDeleteCoverImageMutation,
  useGetCoverVideoUrlMutation,
  useDeleteCoverVideoMutation,
  useGenerateCoverImageMutation,
} from "@api";
import { DragUpload, Trash, VideoCamera } from "@assets";
import { Button, CustomDropdownField, ImageLibrary } from "@components";
import { ButtonVariant } from "@components/types";
import {
  en,
  imageTypes,
  FILE_TYPE,
  ACCEPTED_FILE_TYPES,
  FILE_SIZE_LIMITS,
  ACCEPT_ATTRIBUTES,
  ASPECT_RATIO,
  ASPECT_RATIO_TOLERANCE,
} from "@constants";
import { CoverImageProvider } from "@types";
import { isNonEmptyString } from "@utils";

/** Local/dev only: set `VITE_BYPASS_COVER_IMAGE_VALIDATION=true` in `.env` to skip 16:9 checks. */
const bypassCoverImageAspectCheck = import.meta.env.VITE_BYPASS_COVER_IMAGE_VALIDATION === "true";

const IMAGE_PROVIDER_OPTIONS: { value: CoverImageProvider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Gemini" },
];

const IMAGE_STYLE_OPTIONS = [
  { value: "", label: "Default style" },
  { value: "Photorealistic", label: "Photorealistic" },
  { value: "Illustration", label: "Illustration" },
  { value: "3D render", label: "3D render" },
];

interface FileUploadProps {
  id: string;
  formMethods: any;
  isMandatory: boolean;
  label: string;
  header?: React.ReactNode;
  fileType?: string;
  hideHeader?: boolean;
  /**
   * Render "Generate with AI" controls under the tile (image slots only).
   * Generation reads the form's `title`/`description` values and substitutes
   * them into the backend's managed `cover_image_generation` prompt.
   */
  enableAiGeneration?: boolean;
}

export const FileUpload = ({
  id,
  formMethods,
  isMandatory,
  label,
  header,
  fileType = FILE_TYPE.IMAGE,
  hideHeader = false,
  enableAiGeneration = false,
}: FileUploadProps) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  // The File a failed upload was for, kept around so Retry can re-run the
  // exact same upload instead of forcing a full drag/browse re-pick — no
  // upload path used to retain this on failure, it was simply discarded.
  const [pendingRetryFile, setPendingRetryFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isImageLibraryOpen, setIsImageLibraryOpen] = useState(false);
  const { setValue, setError, clearErrors, formState, register, watch } = formMethods;
  const [getCoverImageUrl] = useGetCoverImageUrlMutation();
  const [deleteCoverImage] = useDeleteCoverImageMutation();
  const [getCoverVideoUrl] = useGetCoverVideoUrlMutation();
  const [deleteCoverVideo] = useDeleteCoverVideoMutation();
  const [generateCoverImage, { isLoading: isGeneratingImage }] = useGenerateCoverImageMutation();

  const [aiProvider, setAiProvider] = useState<CoverImageProvider>("openai");
  const [aiStyleHint, setAiStyleHint] = useState("");

  const uploadedFileUrl = watch(id);
  const initialFileUrlRef = useRef("");
  // Set the initial file URL only once
  if (isNonEmptyString(uploadedFileUrl) && !isNonEmptyString(initialFileUrlRef.current)) {
    initialFileUrlRef.current = uploadedFileUrl;
  }

  // Helper functions
  const getAcceptedTypes = () => {
    if (fileType === FILE_TYPE.IMAGE) return ACCEPTED_FILE_TYPES.IMAGE;
    if (fileType === FILE_TYPE.VIDEO) return ACCEPTED_FILE_TYPES.VIDEO;
    return { ...ACCEPTED_FILE_TYPES.IMAGE, ...ACCEPTED_FILE_TYPES.VIDEO };
  };

  const getAcceptAttribute = () => {
    if (fileType === FILE_TYPE.IMAGE) return ACCEPT_ATTRIBUTES.IMAGE;
    if (fileType === FILE_TYPE.VIDEO) return ACCEPT_ATTRIBUTES.VIDEO;
    return ACCEPT_ATTRIBUTES.ANY;
  };

  const isVideoFile = id === "coverVideoUrl";
  const requiredErrorMessage = isMandatory ? `${label} is required` : false;

  // Validation
  const validateFileType = (file: File): boolean => {
    if (fileType === FILE_TYPE.IMAGE) {
      if (![imageTypes.JPEG, imageTypes.PNG].includes(file.type)) {
        const errorMessage = en.errors.fileMustBeJPEGOrPNG;
        setError(id, { type: "manual", message: errorMessage });
        toast.error(errorMessage);
        return false;
      }
    } else if (fileType === FILE_TYPE.VIDEO) {
      if (!file.type.startsWith("video/")) {
        const errorMessage = en.errors.fileMustBeVideo;
        setError(id, { type: "manual", message: errorMessage });
        toast.error(errorMessage);
        return false;
      }
    }
    return true;
  };

  const validateFileSize = (file: File): boolean => {
    const maxFileSize =
      fileType === FILE_TYPE.IMAGE ? FILE_SIZE_LIMITS.IMAGE : FILE_SIZE_LIMITS.VIDEO;
    const maxFileSizeLabel =
      fileType === FILE_TYPE.IMAGE
        ? en.simulation.imageMaxSizeLabel
        : en.simulation.videoMaxSizeLabel;

    if (file.size > maxFileSize) {
      const errorMessage = `File must be under ${maxFileSizeLabel}.`;
      setError(id, { type: "manual", message: errorMessage });
      toast.error(errorMessage);
      return false;
    }
    return true;
  };

  const handleFileValidation = useCallback(
    (file: File): boolean => {
      return validateFileType(file) && validateFileSize(file);
    },
    [id, setError, fileType],
  );

  // Upload handlers
  const uploadToS3 = useCallback(async (file: File, uploadUrl: string) => {
    try {
      const response = await axios.put(uploadUrl, file, {
        headers: { "Content-Type": file.type },
      });

      if (response.status < 200 || response.status >= 300) {
        throw new Error(en.errors.fileUploadFailed);
      }

      return true;
    } catch (error) {
      toast.error(en.errors.fileUploadFailed);
      throw error;
    }
  }, []);

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(Math.round(video.duration));
      };
      video.onerror = () => reject(new Error(en.errors.fileMetadataLoadFailed));
      video.src = URL.createObjectURL(file);
    });
  };

  const uploadFile = async (file: File) => {
    try {
      setIsUploading(true);
      clearErrors(id);

      const isVideo = file.type.startsWith("video/");

      if (isVideo) {
        try {
          const duration = await getVideoDuration(file);

          const response = await getCoverVideoUrl({
            fileName: file.name,
            fileSize: file.size,
            duration,
            contentType: file.type,
          }).unwrap();
          await uploadToS3(file, response.presignedUrl);

          setUploadedFile(file);
          setPendingRetryFile(null);
          setValue(id, response.coverVideoUrl, { shouldValidate: true });
        } catch (error) {
          // Previously toast-only — the one upload path with no inline field
          // error, unlike the image path below (via the outer catch). The
          // toast fades; the field error is what's still there when the
          // admin looks back at the form.
          const message = (error as any)?.data?.message || en.errors.videoUploadFailed;
          setError(id, { type: "manual", message });
          toast.error(message);
          setPendingRetryFile(file);
        }
      } else {
        const response = await getCoverImageUrl({
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
        }).unwrap();

        if (response.presignedUrl) {
          await uploadToS3(file, response.presignedUrl);
        }

        setUploadedFile(file);
        setPendingRetryFile(null);
        setValue(id, response.coverImageUrl, { shouldValidate: true });
      }
    } catch {
      setError(id, { type: "manual", message: en.errors.fileUploadFailed });
      setPendingRetryFile(file);
    } finally {
      setIsUploading(false);
    }
  };

  const validateImageAspectRatio = (file: File): Promise<boolean> => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        const isValidRatio = Math.abs(aspectRatio - ASPECT_RATIO) <= ASPECT_RATIO_TOLERANCE;
        if (!isValidRatio) {
          const errorMessage = en.errors.imageMustHave169AspectRatio;
          setError(id, { type: "manual", message: errorMessage });
          toast.error(errorMessage);
          resolve(false);
        } else {
          resolve(true);
        }
      };
      img.onerror = () => {
        toast.error(en.errors.fileUploadFailed);
        resolve(false);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const processFile = useCallback(
    async (file: File) => {
      if (fileType === FILE_TYPE.IMAGE && !bypassCoverImageAspectCheck) {
        const isValidAspectRatio = await validateImageAspectRatio(file);
        if (!isValidAspectRatio) return;
      }

      await uploadFile(file);
    },
    [fileType, id, setError],
  );
  // File handlers
  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file) return;
      if (!handleFileValidation(file)) return;
      await processFile(file);
    },
    [handleFileValidation, processFile],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      handleFileSelect(acceptedFiles[0]);
    },
    [handleFileSelect],
  );

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files?.[0] as File);
  };

  const handleImageLibrarySelect = useCallback(
    (imageUrl: string) => {
      clearErrors(id);
      setUploadedFile(null);
      setPendingRetryFile(null);
      setValue(id, imageUrl, { shouldValidate: true });
    },
    [id, clearErrors, setValue],
  );

  const handleDeleteFile = async () => {
    if (!isNonEmptyString(uploadedFileUrl)) return;

    try {
      if (uploadedFileUrl !== initialFileUrlRef.current) {
        const isVideo = uploadedFile?.type.startsWith("video/");
        if (isVideo) {
          await deleteCoverVideo({ coverVideoUrl: uploadedFileUrl }).unwrap();
        } else {
          await deleteCoverImage({ coverImageUrl: uploadedFileUrl }).unwrap();
        }
      }
      setUploadedFile(null);
      setPendingRetryFile(null);
      setValue(id, null);
    } catch {
      toast.error(en.errors.fileDeleteFailed);
    }
  };

  // Re-runs the same upload for the file a previous attempt failed on,
  // instead of forcing the admin to re-pick it from disk.
  const handleRetryUpload = useCallback(() => {
    if (!pendingRetryFile || isUploading) return;
    processFile(pendingRetryFile);
  }, [pendingRetryFile, isUploading, processFile]);

  const openImageLibrary = event => {
    event.stopPropagation();
    setIsImageLibraryOpen(true);
  };

  // AI generation reads the scenario form's title/description and persona
  // fields (name, age, gender, profession, currentLocation); the backend
  // substitutes them into the managed `cover_image_generation` prompt.
  const showAiGeneration = enableAiGeneration && fileType === FILE_TYPE.IMAGE;
  const scenarioTitle = showAiGeneration ? watch("title") : undefined;
  const personaName = showAiGeneration ? watch("name") : undefined;
  // The default template is a portrait of the scenario persona, so require
  // the persona name as well as the title (used for the stored filename).
  const canGenerate =
    typeof scenarioTitle === "string" &&
    scenarioTitle.trim() !== "" &&
    typeof personaName === "string" &&
    personaName.trim() !== "";

  const handleGenerateImage = async () => {
    if (!canGenerate || isGeneratingImage) return;
    const description = watch("description");
    const age = watch("age");
    const gender = watch("gender");
    const profession = watch("profession");
    const currentLocation = watch("currentLocation");

    try {
      const result = await generateCoverImage({
        title: scenarioTitle.trim(),
        name: personaName.trim(),
        ...(typeof description === "string" &&
          description.trim() && { description: description.trim() }),
        ...(age !== "" && age != null && !Number.isNaN(Number(age)) && { age: Number(age) }),
        ...(typeof gender === "string" && gender.trim() && { gender: gender.trim() }),
        ...(typeof profession === "string" &&
          profession.trim() && { profession: profession.trim() }),
        ...(typeof currentLocation === "string" &&
          currentLocation.trim() && { currentLocation: currentLocation.trim() }),
        ...(aiStyleHint && { styleHints: aiStyleHint }),
        provider: aiProvider,
      }).unwrap();

      clearErrors(id);
      setUploadedFile(null);
      setValue(id, result.imageUrl, { shouldValidate: true, shouldDirty: true });
      toast.success(en.simulation.imageGeneratedSuccessfully);
    } catch (error) {
      toast.error((error as any)?.data?.message || en.simulation.imageGenerationFailed);
    }
  };

  // Dropzone setup
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    accept: getAcceptedTypes(),
    multiple: false,
  });

  // Render helpers
  const renderUploadPlaceholder = () => {
    let uploadText = (
      <>
        {en.simulation.dragDrop}{" "}
        <span className="text-primary text-primary-500">{en.simulation.choose}</span>
      </>
    );

    if (fileType === FILE_TYPE.IMAGE) {
      uploadText = (
        <div>
          {en.simulation.dragDrop}{" "}
          <span className="text-primary text-primary-500">{en.simulation.choose}</span>{" "}
          {en.simulation.pngUploadGuidelines}
          <div
            role="button"
            className="text-primary z-10 text-primary-500 cursor-pointer hover:text-primary-600"
            onClick={openImageLibrary}
          >
            {en.simulation.uploadFromImageLibrary}
          </div>
        </div>
      );
    }

    if (fileType === FILE_TYPE.VIDEO) {
      uploadText = (
        <>
          {en.simulation.dragDrop}{" "}
          <span className="text-primary text-primary-500">{en.simulation.choose}</span>{" "}
          {en.simulation.mp4UploadGuidelines}
          <br />
          {en.simulation.videoUploadGuidelines}
        </>
      );
    }

    return (
      <div
        className="cursor-pointer flex flex-col items-center justify-center h-full"
        onClick={open}
      >
        {fileType === FILE_TYPE.VIDEO ? <VideoCamera /> : <DragUpload />}
        <div className="mt-4 text-typography-600">
          {isUploading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              {en.common.uploading}
            </div>
          ) : (
            uploadText
          )}
        </div>
      </div>
    );
  };

  const renderFilePreview = () => {
    if (!isNonEmptyString(uploadedFileUrl)) return null;

    return isVideoFile ? (
      <CustomVideo
        src={uploadedFileUrl}
        alt="Uploaded file preview"
        className="absolute inset-0 w-full h-full object-cover aspect-video"
      />
    ) : (
      <CustomImage
        src={uploadedFileUrl}
        alt="Uploaded file preview"
        className="absolute inset-0 w-full h-full object-cover aspect-video"
      />
    );
  };

  const renderFileInfo = () => {
    if (!isNonEmptyString(uploadedFileUrl)) return null;

    return (
      <div className="flex items-center justify-between mt-2">
        <div className="flex flex-col">
          {uploadedFile && (
            <span className="text-typography-900 truncate">{uploadedFile.name}</span>
          )}
        </div>
        <button type="button" onClick={handleDeleteFile}>
          <Trash />
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {!hideHeader && (
        <label
          htmlFor={id}
          className="text-typography-900 text-base cursor-pointer flex items-center"
        >
          {header || en.simulation.file}
          {isMandatory && <span className="text-destructive-500">*</span>}
        </label>
      )}

      <div>
        <div
          {...getRootProps()}
          className={`text-center transition-colors h-64 relative overflow-hidden rounded-lg 
          ${!isNonEmptyString(uploadedFileUrl) && "border-2 border-dashed border-border-light hover:border-primary"}
          ${isDragActive && "border-primary-500 bg-primary-50"}`}
        >
          <input
            {...register(id, { required: requiredErrorMessage })}
            id={id}
            type="file"
            accept={getAcceptAttribute()}
            onChange={handleManualChange}
            className="hidden"
          />

          <input {...getInputProps()} />

          {!isNonEmptyString(uploadedFileUrl) && !isUploading && renderUploadPlaceholder()}
          {isUploading && renderUploadPlaceholder()}
          {renderFilePreview()}

          {isGeneratingImage && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80">
              <div className="flex items-center gap-2 text-typography-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                {en.simulation.generatingImage}
              </div>
            </div>
          )}
        </div>

        {showAiGeneration && (
          // The tile is only ~48% of the panel wide (paired with Cover
          // Video), so the controls must wrap instead of overflowing into
          // the neighbouring tile, which would paint over the button and
          // swallow its clicks.
          <div className="relative z-10 flex flex-wrap items-center gap-2 mt-2 w-full">
            <CustomDropdownField
              customStyle={{ border: "none", paddingLeft: "0", minWidth: 90 }}
              options={IMAGE_PROVIDER_OPTIONS}
              placeholder="Provider"
              defaultOption={IMAGE_PROVIDER_OPTIONS.find(opt => opt.value === aiProvider)}
              onHandleSelect={option => setAiProvider(option.value as CoverImageProvider)}
            />
            <CustomDropdownField
              customStyle={{ border: "none", paddingLeft: "0", minWidth: 120 }}
              options={IMAGE_STYLE_OPTIONS}
              placeholder="Style"
              defaultOption={IMAGE_STYLE_OPTIONS.find(opt => opt.value === aiStyleHint)}
              onHandleSelect={option => setAiStyleHint(option.value)}
            />
            <Button
              type="button"
              variant={ButtonVariant.SECONDARY}
              onClick={handleGenerateImage}
              disabled={!canGenerate || isGeneratingImage}
              className="whitespace-nowrap"
            >
              {isGeneratingImage ? en.simulation.generatingImage : en.simulation.generateWithAi}
            </Button>
          </div>
        )}

        {renderFileInfo()}

        {formState.errors[id]?.message && (
          <div className="flex items-center gap-2 mt-1">
            <p className="text-destructive-500 text-sm">
              {String(formState.errors[id]?.message)}
            </p>
            {pendingRetryFile && (
              <button
                type="button"
                onClick={handleRetryUpload}
                disabled={isUploading}
                className="text-sm text-primary-600 underline hover:text-primary-700 whitespace-nowrap disabled:opacity-50"
              >
                {en.common.retry}
              </button>
            )}
          </div>
        )}
      </div>

      {fileType === FILE_TYPE.IMAGE && (
        <ImageLibrary
          isOpen={isImageLibraryOpen}
          onClose={() => setIsImageLibraryOpen(false)}
          onSelect={handleImageLibrarySelect}
        />
      )}
    </div>
  );
};
