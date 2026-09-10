/**
 * Widgets shared by every knowledge-corpus screen.
 *
 * The SCREENS are deliberately separate — the WhatsApp bot's Corpus tab and the character
 * library's reference panel are different jobs for different people, and one UI trying to be
 * both would serve neither. These two are not screens. `CorpusDocumentPanel` is the uploader,
 * and sharing it is how format parity across paste / PDF / DOCX / EPUB / URL (and the S3
 * presign dance behind three of them) stays a fact rather than a promise; `DocumentStatusBadge`
 * renders one shared status enum, and two implementations of it would drift.
 */
export { CorpusDocumentPanel } from "./CorpusDocumentPanel";
export { DocumentStatusBadge } from "./DocumentStatusBadge";
