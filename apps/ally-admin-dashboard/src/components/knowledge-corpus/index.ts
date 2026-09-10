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
// The audience editor and the table cell that summarises it. Shared for the same reason as
// the uploader: both corpora carry `isGlobal`/`tenantIds`, and only the WhatsApp corpus
// filters retrieval on them today — so one implementation, shown where it means something.
export { CorpusAudienceField, audienceSummary } from "./CorpusAudienceField";
export { DocumentStatusBadge } from "./DocumentStatusBadge";
