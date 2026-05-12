import { FC, useEffect, useCallback } from "react";

import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { RichTextToolbar } from "./RichTextToolbar";
import { sanitizeHtml } from "./richTextSanitizer";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
}

export const RichTextEditor: FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  maxLength,
  disabled = false,
  className = "",
}) => {
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
      const sanitized = sanitizeHtml(html);
      onChange(sanitized);
    },
  });

  // Sync external value changes (e.g. from AI generation or language tab switch)
  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    const sanitizedValue = sanitizeHtml(value || "");

    // Avoid infinite loop: only update if content actually differs
    if (currentHtml !== sanitizedValue && sanitizedValue !== currentHtml) {
      editor.commands.setContent(sanitizedValue, { emitUpdate: false });
    }
  }, [editor, value]);

  // Sync editable state
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  const characterCount = editor?.storage.characterCount?.characters() ?? 0;

  return (
    <div
      className={`border border-border-light rounded-md overflow-hidden bg-white ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      } ${className}`}
      data-testid="rich-text-editor"
    >
      <RichTextToolbar editor={editor} />
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
