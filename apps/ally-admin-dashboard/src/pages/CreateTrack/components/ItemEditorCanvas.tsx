import { FC } from "react";

import { useFormContext } from "react-hook-form";

import { TrackFormValues, TrackGameKey, TrackItemType } from "@types";

import { AnnotationItemEditor } from "./editors/annotation/AnnotationItemEditor";
import { ArticleItemEditor } from "./editors/ArticleItemEditor";
import { BranchingScenarioItemEditor } from "./editors/branching/BranchingScenarioItemEditor";
import { BreathingExerciseEditor } from "./editors/BreathingExerciseEditor";
import { CaseItemEditor } from "./editors/CaseItemEditor";
import { GameItemEditor } from "./editors/GameItemEditor";
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
  const { watch } = useFormContext<TrackFormValues>();
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
    case TrackItemType.GAME: {
      const gameKey = watch(`sections.${sectionIndex}.items.${itemIndex}.game.gameKey`);
      if (gameKey === TrackGameKey.BREATHING_EXERCISE) {
        return <BreathingExerciseEditor {...props} />;
      }
      return <GameItemEditor {...props} />;
    }
    case TrackItemType.BRANCHING_SCENARIO:
      return <BranchingScenarioItemEditor {...props} />;
    default:
      return null;
  }
};
