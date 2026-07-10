import { FC, useRef, useState } from "react";

import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  List,
  ListOrdered,
  Quote,
  Minus,
} from "@icons";
import { type Editor } from "@tiptap/react";

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

const ToolbarButton: FC<ToolbarButtonProps> = ({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-1.5 rounded transition-colors ${
      isActive
        ? "bg-primary-100 text-primary-600"
        : "text-typography-600 hover:bg-gray-100 hover:text-typography-800"
    } disabled:opacity-40 disabled:cursor-not-allowed`}
  >
    {children}
  </button>
);

const ToolbarDivider: FC = () => <div className="w-px h-5 bg-border-light mx-1 self-center" />;

interface RichTextToolbarProps {
  editor: Editor | null;
  /** When provided, renders an image button that uploads then inserts the image. */
  onInsertImage?: (file: File) => Promise<void> | void;
}

export const RichTextToolbar: FC<RichTextToolbarProps> = ({ editor, onInsertImage }) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  if (!editor) return null;

  const iconSize = 16;

  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Allow re-selecting the same file later
    event.target.value = "";
    if (!file || !onInsertImage) return;
    try {
      setIsUploadingImage(true);
      await onInsertImage(file);
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-border-light bg-gray-50/50"
      role="toolbar"
      aria-label="Text formatting"
    >
      {/* Inline formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Bold (Ctrl+B)"
      >
        <Bold size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Italic (Ctrl+I)"
      >
        <Italic size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title="Underline (Ctrl+U)"
      >
        <Underline size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        title="Strikethrough"
      >
        <Strikethrough size={iconSize} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        <Heading1 size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <Heading2 size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        <Heading3 size={iconSize} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Bullet list"
      >
        <List size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Numbered list"
      >
        <ListOrdered size={iconSize} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Block elements */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="Blockquote"
      >
        <Quote size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal divider"
      >
        <Minus size={iconSize} />
      </ToolbarButton>

      {onInsertImage && (
        <>
          <ToolbarDivider />
          <ToolbarButton
            onClick={() => imageInputRef.current?.click()}
            disabled={isUploadingImage}
            title={isUploadingImage ? "Uploading image..." : "Insert image"}
          >
            <ImageIcon size={iconSize} />
          </ToolbarButton>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleImageFileChange}
          />
        </>
      )}
    </div>
  );
};
