import { FC, useCallback } from "react";

import { Accept, FileRejection, useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { FileUpload } from "@assets";
import { formatSizeByByteSize, getErrorToastMessageForFileUpload } from "@utils";

import { DraggableAreaProps } from "./types";

// Returns a human-readable list of allowed unique extensions from react-dropzone Accept map
const getAllowedUniqueExtensionsDisplay = (accept: Accept): string => {
  const extensions = Object.values(accept)
    .flat()
    .map(ext => ext.replace(/^\./, "").toUpperCase())
    .filter((ext, index, self) => self.indexOf(ext) === index);

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
    if (rejectedFiles?.length > 0) {
      toast.error(getErrorToastMessageForFileUpload(rejectedFiles?.[0]?.errors?.[0]?.code));
      onDropRejected(rejectedFiles);
    }
    if (acceptedFiles.length) {
      onDropAccepted(acceptedFiles);
    }
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    noKeyboard: true,
    multiple: allowMultiple,
    onDrop,
    accept: supportedExtensions,
    maxSize: sizeInBytes,
  });
  return (
    <div
      className="rounded-[8px] border border-dashed border-[#D9D9D9] h-[200px] flex flex-col gap-5 items-center justify-center cursor-pointer"
      {...getRootProps()}
    >
      <input {...getInputProps()} />
      <FileUpload />
      <span className="text-typography-800 font-primary text-sm">
        Drag & drop or <span className="text-primary-500 font-medium">choose</span> a{" "}
        {getAllowedUniqueExtensionsDisplay(supportedExtensions)} file under{" "}
        {formatSizeByByteSize(sizeInBytes)}
      </span>
    </div>
  );
};

export default DraggableArea;
