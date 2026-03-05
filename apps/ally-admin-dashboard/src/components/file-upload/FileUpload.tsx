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
} from "@api";
import { DragUpload, Trash, VideoCamera } from "@assets";
import { ImageLibrary } from "@components";
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
import { isNonEmptyString } from "@utils";

interface FileUploadProps {
  id: string;
  formMethods: any;
  isMandatory: boolean;
  label: string;
  header?: React.ReactNode;
  fileType?: string;
}

export const FileUpload = ({
  id,
  formMethods,
  isMandatory,
  label,
  header,
  fileType = FILE_TYPE.IMAGE,
}: FileUploadProps) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isImageLibraryOpen, setIsImageLibraryOpen] = useState(false);
  const { setValue, setError, clearErrors, formState, register, watch } = formMethods;
  const [getCoverImageUrl] = useGetCoverImageUrlMutation();
  const [deleteCoverImage] = useDeleteCoverImageMutation();
  const [getCoverVideoUrl] = useGetCoverVideoUrlMutation();
  const [deleteCoverVideo] = useDeleteCoverVideoMutation();

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

      if (response.status !== 200) {
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
          setValue(id, response.coverVideoUrl, { shouldValidate: true });
        } catch (error) {
          toast.error((error as any)?.data?.message || en.errors.videoUploadFailed);
        }
      } else {
        const response = await getCoverImageUrl({
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
        }).unwrap();

        await uploadToS3(file, response.presignedUrl);

        setUploadedFile(file);
        setValue(id, response.coverImageUrl, { shouldValidate: true });
      }
    } catch {
      setError(id, { type: "manual", message: en.errors.fileUploadFailed });
    } finally {
      setIsUploading(false);
    }
  };

  const validateImageAspectRatio = (file: File): Promise<boolean> => {
    return new Promise(resolve => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        const isValidRatio = Math.abs(aspectRatio - ASPECT_RATIO) <= ASPECT_RATIO_TOLERANCE;

        if (!isValidRatio) {
          const errorMessage = en.errors.imageMustHave169AspectRatio;
          setError(id, { type: "manual", message: errorMessage });
          toast.error(errorMessage);
        }

        resolve(isValidRatio);
      };
      img.onerror = () => resolve(false);
    });
  };

  const processFile = useCallback(
    async (file: File) => {
      if (fileType === FILE_TYPE.IMAGE) {
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
      setValue(id, null);
    } catch {
      toast.error(en.errors.fileDeleteFailed);
    }
  };

  const openImageLibrary = event => {
    event.stopPropagation();
    setIsImageLibraryOpen(true);
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
      <label
        htmlFor={id}
        className="text-typography-900 text-base cursor-pointer flex items-center"
      >
        {header || en.simulation.file}
        {isMandatory && <span className="text-destructive-500">*</span>}
      </label>

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

          {!uploadedFile && renderUploadPlaceholder()}
          {renderFilePreview()}
        </div>

        {renderFileInfo()}

        {formState.errors.upload && (
          <p className="text-destructive-500 text-sm mt-1">{formState.errors.upload.message}</p>
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
