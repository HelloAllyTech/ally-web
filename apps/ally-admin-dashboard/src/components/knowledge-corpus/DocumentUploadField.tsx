import React, { useRef, useState } from "react";

import axios from "axios";
import { toast } from "sonner";

import { useCreateKbUploadUrlMutation } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { ACCEPT_ATTRIBUTES, DOCUMENT_UPLOAD_FORMATS, FILE_SIZE_LIMITS, en } from "@constants";
import { KbDocumentSourceType } from "@types";

type UploadableSource =
  | KbDocumentSourceType.PDF
  | KbDocumentSourceType.DOCX
  | KbDocumentSourceType.EPUB;

interface DocumentUploadFieldProps {
  sourceType: UploadableSource;
  /** Set once an upload completes, so the parent can create the document with it. */
  value: { fileUrl: string; fileName: string; contentType: string; sizeBytes: number } | null;
  onChange: (
    value: { fileUrl: string; fileName: string; contentType: string; sizeBytes: number } | null,
  ) => void;
  disabled?: boolean;
}

const ACCEPT_BY_SOURCE: Record<UploadableSource, string> = {
  [KbDocumentSourceType.PDF]: ACCEPT_ATTRIBUTES.PDF,
  [KbDocumentSourceType.DOCX]: ACCEPT_ATTRIBUTES.DOCX,
  [KbDocumentSourceType.EPUB]: ACCEPT_ATTRIBUTES.EPUB,
};

/**
 * Single-file upload: validate, presign, PUT straight to S3, hand the URL back.
 *
 * Follows the comfort-audio pattern (plain input + presigned PUT) rather than Carbon's FileUploader
 * or the app's FileUpload component, for three reasons:
 *
 *  - A corpus document has exactly ONE source, so a multi-file uploader has nothing to list.
 *  - Per-file progress belongs in the corpus table, not here: the real state is server-side ingest,
 *    and a local "complete" would be a lie the moment the PUT finishes but indexing has not started.
 *  - FileUploader is not exported from the ui-shared primitives barrel, and widening that public
 *    surface (which needs all three app suites to pass) for one internal admin form is a poor trade.
 *
 * The upload goes direct to S3 because ally-be applies `express.json({limit:'1mb'})` globally, so a
 * 25 MB multipart POST would be rejected long before it reached a controller.
 */
export const DocumentUploadField: React.FC<DocumentUploadFieldProps> = ({
  sourceType,
  value,
  onChange,
  disabled,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [createUploadUrl] = useCreateKbUploadUrlMutation();

  const format = DOCUMENT_UPLOAD_FORMATS[sourceType];

  const isAccepted = (file: File): boolean => {
    // EITHER the MIME type OR the extension. Browsers report .epub as application/octet-stream on
    // some platforms, so a MIME-only check rejects perfectly valid EPUBs.
    const name = file.name.toLowerCase();
    return file.type === format.mime || format.extensions.some(ext => name.endsWith(ext));
  };

  const handleFile = async (file: File) => {
    if (!isAccepted(file)) {
      toast.error(en.whatsappBot.corpus.invalidFileType);
      return;
    }
    if (file.size > FILE_SIZE_LIMITS.DOCUMENT) {
      toast.error(en.whatsappBot.corpus.fileTooLarge);
      return;
    }

    setIsUploading(true);
    try {
      const { presignedUrl, fileUrl } = await createUploadUrl({
        fileName: file.name,
        fileSize: file.size,
        // Always send the canonical MIME type, not file.type: the browser may report
        // application/octet-stream, and ally-be maps this value back to a source type.
        contentType: format.mime,
      }).unwrap();

      await axios.put(presignedUrl, file, {
        headers: { "Content-Type": format.mime },
      });

      onChange({
        fileUrl,
        fileName: file.name,
        contentType: format.mime,
        sizeBytes: file.size,
      });
    } catch {
      toast.error(en.whatsappBot.corpus.uploadFailed);
    } finally {
      setIsUploading(false);
      // Reset the input so re-picking the same file fires a change event again.
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={ACCEPT_BY_SOURCE[sourceType]}
        disabled={disabled || isUploading}
        onChange={event => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <div className="flex items-center gap-3">
        <Button
          variant={ButtonVariant.SECONDARY}
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isUploading}
        >
          {isUploading
            ? en.whatsappBot.corpus.uploading
            : value
              ? en.whatsappBot.corpus.uploadReplace
              : en.whatsappBot.corpus.uploadChoose}
        </Button>
        {value && (
          <span className="text-sm text-typography-700 truncate max-w-[320px]">
            {value.fileName}
          </span>
        )}
      </div>
      <span className="text-xs text-typography-400">{en.whatsappBot.corpus.uploadHelp}</span>
    </div>
  );
};
