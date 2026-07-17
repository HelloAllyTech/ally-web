import { FC } from "react";

import { Controller, useFormContext } from "react-hook-form";

import { RichTextEditor } from "@components/rich-text-editor";
import { TrackFormValues, TrackItemType } from "@types";

import { ItemEditorFrame } from "./ItemEditorFrame";
import { useTrackMediaUpload } from "../../useTrackMediaUpload";

interface ArticleItemEditorProps {
  sectionIndex: number;
  itemIndex: number;
  onDelete: () => void;
}

export const ArticleItemEditor: FC<ArticleItemEditorProps> = ({
  sectionIndex,
  itemIndex,
  onDelete,
}) => {
  const { control } = useFormContext<TrackFormValues>();
  const { upload } = useTrackMediaUpload();
  const base = `sections.${sectionIndex}.items.${itemIndex}` as const;

  const handleImageUpload = (file: File) => upload(file, "image");

  return (
    <ItemEditorFrame
      sectionIndex={sectionIndex}
      itemIndex={itemIndex}
      type={TrackItemType.ARTICLE}
      onDelete={onDelete}
    >
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-typography-800">Content</label>
        <Controller
          control={control}
          name={`${base}.article.html`}
          render={({ field }) => (
            <RichTextEditor
              value={field.value ?? ""}
              onChange={field.onChange}
              placeholder="Write the article content…"
              allowImages
              onImageUpload={handleImageUpload}
              className="min-h-[360px] [&_.ProseMirror]:min-h-[320px]"
            />
          )}
        />
      </div>
    </ItemEditorFrame>
  );
};
