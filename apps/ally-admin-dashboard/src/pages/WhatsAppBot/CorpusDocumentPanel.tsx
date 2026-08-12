import React, { useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import {
  AutoExpandableTextarea,
  ContentSwitcher,
  Switch,
  TextInput,
} from "@ally-ui-mono/ui-shared";
import {
  useCreateKbDocumentMutation,
  useReplaceKbDocumentContentMutation,
  useUpdateKbDocumentMutation,
} from "@api";
import { EntityField, EntitySidePanel } from "@components";
import { DOCUMENT_MAX_PASTE_CHARS, en } from "@constants";
import { KbDocument, KbDocumentSourceType } from "@types";

import { DocumentUploadField } from "./DocumentUploadField";

interface CorpusDocumentPanelProps {
  isOpen: boolean;
  /** Null = create. */
  document: KbDocument | null;
  onClose: () => void;
}

const SOURCE_ORDER: KbDocumentSourceType[] = [
  KbDocumentSourceType.PASTE,
  KbDocumentSourceType.PDF,
  KbDocumentSourceType.DOCX,
  KbDocumentSourceType.EPUB,
  KbDocumentSourceType.URL,
];

type UploadValue = {
  fileUrl: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
} | null;

const isUploadSource = (source: KbDocumentSourceType) =>
  source === KbDocumentSourceType.PDF ||
  source === KbDocumentSourceType.DOCX ||
  source === KbDocumentSourceType.EPUB;

/**
 * Create or edit one corpus document.
 *
 * Two rules shape this form:
 *
 *  - The SOURCE TYPE is immutable after creation. A PDF is not a URL; changing the source means a
 *    different document. The switcher is therefore disabled in edit mode, and the file input offers
 *    "Replace file" instead.
 *  - Only PASTED text is editable in place. For a file-backed document the file IS the content, so
 *    letting an admin edit the extracted text would produce a corpus that silently disagrees with
 *    the PDF they can still download.
 */
export const CorpusDocumentPanel: React.FC<CorpusDocumentPanelProps> = ({
  isOpen,
  document,
  onClose,
}) => {
  const isEdit = Boolean(document);

  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState<KbDocumentSourceType>(KbDocumentSourceType.PASTE);
  const [text, setText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [upload, setUpload] = useState<UploadValue>(null);
  const [language, setLanguage] = useState("");

  const [createDocument, { isLoading: isCreating }] = useCreateKbDocumentMutation();
  const [updateDocument, { isLoading: isUpdating }] = useUpdateKbDocumentMutation();
  const [replaceContent, { isLoading: isReplacing }] = useReplaceKbDocumentContentMutation();

  useEffect(() => {
    if (!isOpen) return;
    setTitle(document?.title ?? "");
    setSourceType(document?.sourceType ?? KbDocumentSourceType.PASTE);
    // The list response deliberately omits rawText (it would be megabytes per page), so an edit
    // starts from empty and only sends a body when the admin actually types one.
    setText("");
    setSourceUrl(document?.sourceUrl ?? "");
    setUpload(null);
    setLanguage(document?.language ?? "");
  }, [isOpen, document]);

  const canEditBody = !isEdit || document?.sourceType === KbDocumentSourceType.PASTE;

  const validation = useMemo(() => {
    if (!title.trim()) return en.whatsappBot.corpus.validationTitle;
    if (isEdit) return null;

    if (sourceType === KbDocumentSourceType.PASTE && !text.trim()) {
      return en.whatsappBot.corpus.validationBody;
    }
    if (sourceType === KbDocumentSourceType.URL) {
      if (!sourceUrl.trim()) return en.whatsappBot.corpus.validationBody;
      try {
        const parsed = new URL(sourceUrl.trim());
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return en.whatsappBot.corpus.invalidUrl;
        }
      } catch {
        return en.whatsappBot.corpus.invalidUrl;
      }
    }
    if (isUploadSource(sourceType) && !upload) {
      return en.whatsappBot.corpus.validationBody;
    }
    return null;
  }, [title, isEdit, sourceType, text, sourceUrl, upload]);

  const dirty = useMemo(() => {
    if (!isEdit) {
      return Boolean(title.trim() || text.trim() || sourceUrl.trim() || upload);
    }
    return (
      title !== (document?.title ?? "") ||
      language !== (document?.language ?? "") ||
      text.trim().length > 0
    );
  }, [isEdit, title, text, sourceUrl, upload, language, document]);

  const isSaving = isCreating || isUpdating || isReplacing;

  const handleSave = async () => {
    if (validation) return;

    try {
      if (isEdit && document) {
        await updateDocument({
          id: document.id,
          title: title.trim(),
          language: language.trim() || undefined,
        }).unwrap();

        // Only send a body when there is one to send — an empty textarea must not blank a document.
        if (text.trim() && document.sourceType === KbDocumentSourceType.PASTE) {
          const updated = await replaceContent({
            id: document.id,
            text: text.trim(),
          }).unwrap();
          // ally-be no-ops an identical edit rather than re-embedding hundreds of passages, so the
          // status tells us which happened.
          toast.success(
            updated.status === document.status && updated.chunkCount === document.chunkCount
              ? en.whatsappBot.corpus.contentUnchanged
              : en.whatsappBot.corpus.updated,
          );
        } else {
          toast.success(en.whatsappBot.corpus.updated);
        }
      } else {
        await createDocument({
          title: title.trim(),
          sourceType,
          ...(sourceType === KbDocumentSourceType.PASTE ? { text: text.trim() } : {}),
          ...(sourceType === KbDocumentSourceType.URL ? { sourceUrl: sourceUrl.trim() } : {}),
          ...(upload ?? {}),
          ...(language.trim() ? { language: language.trim() } : {}),
        }).unwrap();
        toast.success(en.whatsappBot.corpus.created);
      }
      onClose();
    } catch {
      toast.error(en.whatsappBot.corpus.saveFailed);
    }
  };

  return (
    <EntitySidePanel
      isOpen={isOpen}
      title={isEdit ? en.whatsappBot.corpus.edit : en.whatsappBot.corpus.create}
      dirty={dirty}
      saveDisabled={Boolean(validation) || isSaving}
      saveDisabledReason={validation ?? undefined}
      onClose={onClose}
      onSave={() => void handleSave()}
    >
      <EntityField label={en.whatsappBot.corpus.titleLabel} required>
        <TextInput
          id="kb-title"
          labelText=""
          hideLabel
          value={title}
          placeholder={en.whatsappBot.corpus.titlePlaceholder}
          onChange={event => setTitle(event.target.value)}
        />
      </EntityField>

      <EntityField
        label={en.whatsappBot.corpus.sourceTypeLabel}
        required
        help={isEdit ? en.whatsappBot.corpus.sourceTypeLocked : undefined}
      >
        <ContentSwitcher
          selectedIndex={SOURCE_ORDER.indexOf(sourceType)}
          onChange={({ index }: { index?: number }) => {
            if (isEdit || index === undefined) return;
            setSourceType(SOURCE_ORDER[index]);
            // Clear the previous source's input so a switch cannot submit a stale body.
            setText("");
            setSourceUrl("");
            setUpload(null);
          }}
        >
          {SOURCE_ORDER.map(source => (
            <Switch
              key={source}
              name={source}
              text={en.whatsappBot.corpus.sourceType[source]}
              disabled={isEdit && source !== sourceType}
            />
          ))}
        </ContentSwitcher>
      </EntityField>

      {sourceType === KbDocumentSourceType.PASTE && (
        <EntityField
          label={en.whatsappBot.corpus.textLabel}
          required={!isEdit}
          help={
            text.length > DOCUMENT_MAX_PASTE_CHARS ? en.whatsappBot.corpus.textTooLong : undefined
          }
        >
          <AutoExpandableTextarea
            value={text}
            onChange={setText}
            placeholder={en.whatsappBot.corpus.textPlaceholder}
            maxLength={DOCUMENT_MAX_PASTE_CHARS}
            minHeight={180}
          />
        </EntityField>
      )}

      {isUploadSource(sourceType) && (
        <EntityField label={en.whatsappBot.corpus.uploadLabel} required={!isEdit}>
          <DocumentUploadField sourceType={sourceType} value={upload} onChange={setUpload} />
        </EntityField>
      )}

      {sourceType === KbDocumentSourceType.URL && (
        <EntityField label={en.whatsappBot.corpus.urlLabel} required={!isEdit}>
          <TextInput
            id="kb-url"
            labelText=""
            hideLabel
            value={sourceUrl}
            placeholder={en.whatsappBot.corpus.urlPlaceholder}
            disabled={isEdit}
            onChange={event => setSourceUrl(event.target.value)}
          />
        </EntityField>
      )}

      {isEdit && !canEditBody && (
        <p className="text-xs text-typography-500">{en.whatsappBot.corpus.sourceTypeLocked}</p>
      )}

      <EntityField
        label={en.whatsappBot.corpus.languageLabel}
        help={en.whatsappBot.corpus.languageHelp}
      >
        <TextInput
          id="kb-language"
          labelText=""
          hideLabel
          value={language}
          placeholder="en"
          onChange={event => setLanguage(event.target.value)}
        />
      </EntityField>
    </EntitySidePanel>
  );
};
