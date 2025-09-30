import { FC, useCallback } from "react";

import { Accept, FileRejection, useDropzone } from "react-dropzone";

import { FileUpload } from "@assets";
import { formatSizeInBytes } from "@utils";

import { DraggableAreaProps } from "./types";

// Returns a human-readable list of allowed extensions from react-dropzone Accept map
const getAllowedExtensionsDisplay = (accept: Accept): string => {
  const extensions = Object.values(accept)
    .flat()
    .map(ext => ext.replace(/^\./, "").toUpperCase());

  if (extensions.length === 0) return "";
  if (extensions.length === 1) return extensions[0];
  return `${extensions.slice(0, -1).join(", ")} or ${extensions[extensions.length - 1]}`;
};

const DraggableArea: FC<DraggableAreaProps> = ({
  allowMultiple = false,
  onDropAccepted,
  onDropRejected,
  supportedExtensions,
  sizeInBytes,
}) => {
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    if (acceptedFiles.length) {
      onDropAccepted(acceptedFiles);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    noKeyboard: true,
    multiple: allowMultiple,
    onDrop,
    accept: supportedExtensions,
    maxSize: sizeInBytes,
  });
  return (
    <div
      className="rounded-[8px] border border-dashed border-[#D9D9D9] h-[200px] flex flex-col gap-5 items-center justify-center"
      {...getRootProps()}
    >
      <input {...getInputProps()} />
      <FileUpload />
      <span className="text-[#8A8A8A] font-['IBM_Plex_Serif'] text-sm">
        Drag & drop or <span className="text-[#0957D0] font-medium">choose</span> a{" "}
        {getAllowedExtensionsDisplay(supportedExtensions)} file under{" "}
        {formatSizeInBytes(sizeInBytes, "MB")}MB.
      </span>
    </div>
  );
};

export default DraggableArea;
