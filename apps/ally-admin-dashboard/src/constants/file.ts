export const imageTypes = {
  JPEG: "image/jpeg",
  PNG: "image/png",
};

export const FILE_TYPE = {
  IMAGE: "image",
  VIDEO: "video",
  ANY: "any",
};

export const FILE_SIZE_LIMITS = {
  IMAGE: 2 * 1024 * 1024, // 2MB
  VIDEO: 15 * 1024 * 1024, // 15MB
  // Knowledge-corpus documents. 25MB client-side against ally-be's 50MB server cap, so an
  // oversized file is rejected before the upload starts rather than after it completes.
  DOCUMENT: 25 * 1024 * 1024, // 25MB
};

export const ASPECT_RATIO = 16 / 9;
export const ASPECT_RATIO_TOLERANCE = 0.01;
export const PROFILE_ASPECT_RATIO = 1 / 1;

export const ACCEPTED_FILE_TYPES = {
  IMAGE: { "image/jpeg": [".jpeg", ".jpg"], "image/png": [".png"] },
  VIDEO: {
    "video/mp4": [".mp4"],
    "video/quicktime": [".mov"],
    "video/x-msvideo": [".avi"],
  },
};

export const ACCEPT_ATTRIBUTES = {
  IMAGE: "image/jpeg,image/png",
  VIDEO: "video/mp4,video/quicktime,video/x-msvideo",
  ANY: "image/jpeg,image/png,video/mp4,video/quicktime,video/x-msvideo",
  // Extensions are listed alongside the MIME types on purpose: browsers report .epub as
  // application/octet-stream on some platforms, so a MIME-only accept attribute (and a MIME-only
  // validation check) rejects perfectly valid EPUBs.
  PDF: "application/pdf,.pdf",
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx",
  EPUB: "application/epub+zip,.epub",
};

/**
 * MIME type and extension per corpus document format.
 *
 * Validation accepts a file when EITHER the MIME type or the extension matches — see the note on
 * ACCEPT_ATTRIBUTES. `mime` is what gets sent to ally-be, which maps it back to a source type.
 */
export const DOCUMENT_UPLOAD_FORMATS = {
  pdf: { mime: "application/pdf", extensions: [".pdf"] },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extensions: [".docx"],
  },
  epub: { mime: "application/epub+zip", extensions: [".epub"] },
} as const;

/** Max characters for a pasted corpus document, matching ally-be's cap. */
export const DOCUMENT_MAX_PASTE_CHARS = 200_000;
