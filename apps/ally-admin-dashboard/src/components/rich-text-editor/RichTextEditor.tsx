import { FC, useEffect, useRef } from "react";

import CharacterCount from "@tiptap/extension-character-count";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { sanitizeHtml } from "./richTextSanitizer";
import { RichTextToolbar } from "./RichTextToolbar";

// TipTap renders an empty document as "<p></p>"; callers store empty as "".
// Comparing the two forms directly would read "still empty" as a change.
const EMPTY_DOC_HTML = new Set(["", "<p></p>", "<p><br></p>"]);

const normalizeForCompare = (html: string) => {
  const trimmed = (html ?? "").trim();
  return EMPTY_DOC_HTML.has(trimmed) ? "" : trimmed;
};

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
  borderless?: boolean;
  /** Opt-in inline image support (track article builder). Default false. */
  allowImages?: boolean;
  /** Upload handler for the toolbar image button; resolves to the public URL. */
  onImageUpload?: (file: File) => Promise<string | null>;
}

export const RichTextEditor: FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  maxLength,
  disabled = false,
  className = "",
  borderless = false,
  allowImages = false,
  onImageUpload,
}) => {
  // Read inside onUpdate, which TipTap creates once and would otherwise close
  // over the first render's `value`.
  const valueRef = useRef(value);
  valueRef.current = value;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Placeholder.configure({
        placeholder: placeholder ?? "",
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-typography-400 before:float-left before:h-0 before:pointer-events-none",
      }),
      ...(allowImages
        ? [
            Image.configure({
              HTMLAttributes: { class: "rounded-md max-w-full" },
            }),
          ]
        : []),
      ...(maxLength != null
        ? [
            CharacterCount.configure({
              limit: maxLength,
            }),
          ]
        : []),
    ],
    content: value || "",
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none px-3 py-2 min-h-[120px] focus:outline-none text-typography-800 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:my-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:my-1.5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:my-1 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-1 [&_li]:my-0.5 [&_blockquote]:border-l-4 [&_blockquote]:border-primary-200 [&_blockquote]:pl-4 [&_blockquote]:my-2 [&_blockquote]:text-typography-600 [&_blockquote]:italic [&_hr]:my-3 [&_hr]:border-border-light",
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      const html = updatedEditor.getHTML();
      const sanitized = sanitizeHtml(html, { allowImages });
      // TipTap fires onUpdate for its own initial content load, not only for
      // typing. Reporting that as an edit is destructive: the editor mounts
      // before the form has been populated from the server, so the empty
      // "<p></p>" doc would be written back over the real value and mark the
      // field dirty — which the studio's background autosave then persists.
      // Only report content that actually differs from what we were given.
      if (normalizeForCompare(sanitized) === normalizeForCompare(valueRef.current)) return;
      onChange(sanitized);
    },
  });

  // Sync external value changes (e.g. from AI generation or language tab switch)
  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    const sanitizedValue = sanitizeHtml(value || "", { allowImages });

    // Avoid infinite loop: only update if content actually differs
    if (normalizeForCompare(currentHtml) !== normalizeForCompare(sanitizedValue)) {
      editor.commands.setContent(sanitizedValue, { emitUpdate: false });
    }
  }, [editor, value, allowImages]);

  // Sync editable state
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  const characterCount = editor?.storage.characterCount?.characters() ?? 0;

  const handleInsertImage =
    allowImages && onImageUpload
      ? async (file: File) => {
          const url = await onImageUpload(file);
          if (url && editor) {
            editor.chain().focus().setImage({ src: url, alt: file.name }).run();
          }
        }
      : undefined;

  return (
    <div
      className={`${borderless ? "" : "border border-border-light rounded-md"} overflow-hidden bg-white ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      } ${className}`}
      data-testid="rich-text-editor"
    >
      <RichTextToolbar editor={editor} onInsertImage={handleInsertImage} />
      <EditorContent editor={editor} />
      {maxLength != null && (
        <div className="flex justify-end px-3 py-1.5 border-t border-border-light bg-gray-50/30">
          <span
            className={`text-xs ${
              characterCount >= maxLength ? "text-destructive-500" : "text-typography-500"
            }`}
          >
            {characterCount}/{maxLength}
          </span>
        </div>
      )}
    </div>
  );
};
