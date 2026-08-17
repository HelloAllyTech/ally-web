import { FC } from "react";

import { TrackItemType } from "@types";

import { AnnotationItemEditor } from "./editors/annotation/AnnotationItemEditor";
import { ArticleItemEditor } from "./editors/ArticleItemEditor";
import { CaseItemEditor } from "./editors/CaseItemEditor";
import { JournalItemEditor } from "./editors/JournalItemEditor";
import { QuizItemEditor } from "./editors/quiz/QuizItemEditor";
import { RoleplayItemEditor } from "./editors/RoleplayItemEditor";
import { VideoItemEditor } from "./editors/VideoItemEditor";

interface ItemEditorCanvasProps {
  sectionIndex: number;
  itemIndex: number;
  type: TrackItemType;
  onDelete: () => void;
}

/** Routes the selected item to its type-specific editor. */
export const ItemEditorCanvas: FC<ItemEditorCanvasProps> = ({
  sectionIndex,
  itemIndex,
  type,
  onDelete,
}) => {
  const props = { sectionIndex, itemIndex, onDelete };

  switch (type) {
    case TrackItemType.ROLEPLAY:
      return <RoleplayItemEditor {...props} />;
    case TrackItemType.CASE:
      return <CaseItemEditor {...props} />;
    case TrackItemType.ARTICLE:
      return <ArticleItemEditor {...props} />;
    case TrackItemType.VIDEO:
      return <VideoItemEditor {...props} />;
    case TrackItemType.JOURNAL:
      return <JournalItemEditor {...props} />;
    case TrackItemType.QUIZ:
      return <QuizItemEditor {...props} />;
    case TrackItemType.ANNOTATED_ARTIFACT:
      return <AnnotationItemEditor {...props} />;
    default:
      return null;
  }
};
