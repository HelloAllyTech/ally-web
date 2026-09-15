import { FC, useMemo } from "react";

import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { TextArea, Tooltip } from "@ally-ui-mono/ui-shared";
import { TooltipIcon, Trash } from "@assets";
import { RichTextEditor } from "@components/rich-text-editor";
import { MAX_ARTICLE_QUESTIONS } from "@constants";
import { McqSingleQuestion, TrackFormValues, TrackItemType } from "@types";

import { ItemEditorFrame } from "./ItemEditorFrame";
import { McqEditor } from "./quiz/McqEditor";
import {
  createQuestionOfType,
  parseArticleQuestionMarkers,
  QuestionPath,
  removeArticleQuestionMarker,
} from "../../trackFormUtils";
import { useTrackMediaUpload } from "../../useTrackMediaUpload";

interface ArticleItemEditorProps {
  sectionIndex: number;
  itemIndex: number;
  onDelete: () => void;
}

/**
 * Article authoring: the body, plus any inline questions it anchors.
 *
 * The two halves are deliberately split. A question is *placed* in the body —
 * the toolbar's question button drops a placeholder at the cursor — but it is
 * *written* in the fields below, which reuse the quiz editor's MCQ fields
 * rather than inventing a second way to write the same thing. Keeping the
 * answer key out of the rich text is also what stops it riding along in the
 * HTML the learner is served.
 *
 * The fields are ordered by where their placeholders sit, so "Question 2"
 * below is the chip labelled "Question 2" in the body. A question whose
 * placeholder has been deleted is called out rather than quietly dropped:
 * it would otherwise fail publish validation with nothing on screen to
 * explain why.
 */
export const ArticleItemEditor: FC<ArticleItemEditorProps> = ({
  sectionIndex,
  itemIndex,
  onDelete,
}) => {
  const { control, setValue } = useFormContext<TrackFormValues>();
  const { upload } = useTrackMediaUpload();
  const base = `sections.${sectionIndex}.items.${itemIndex}` as const;
  const htmlName = `${base}.article.html` as const;
  const questionsName = `${base}.article.questions` as `sections.0.items.0.article.questions`;

  const { fields, append, remove } = useFieldArray({
    control,
    name: questionsName,
    keyName: "fieldId",
  });

  const html = (useWatch({ control, name: htmlName }) ?? "") as string;
  const watchedQuestions = useWatch({ control, name: questionsName });
  // `useWatch` hands back a fresh array each render when the field is unset,
  // which would make every memo below recompute.
  const questions = useMemo(
    () => (watchedQuestions ?? []) as McqSingleQuestion[],
    [watchedQuestions],
  );

  const placedIds = useMemo(() => parseArticleQuestionMarkers(html), [html]);

  /**
   * The field rows in the order the reader meets them, with anything the
   * author has unplaced pushed to the end.
   */
  const rows = useMemo(() => {
    const indexById = new Map(questions.map((question, index) => [question.id, index]));
    const placed = placedIds
      .map(id => indexById.get(id))
      .filter((index): index is number => index != null)
      .map(index => ({ index, placed: true }));
    const placedSet = new Set(placed.map(row => row.index));
    const unplaced = questions
      .map((_, index) => index)
      .filter(index => !placedSet.has(index))
      .map(index => ({ index, placed: false }));
    return [...placed, ...unplaced];
  }, [questions, placedIds]);

  const handleImageUpload = (file: File) => upload(file, "image");

  /**
   * Called by the toolbar button. Creates the question and hands back its id
   * for the editor to anchor; returning null leaves the body untouched.
   */
  const handleCreateQuestion = (): string | null => {
    if (questions.length >= MAX_ARTICLE_QUESTIONS) {
      toast.error(`An article can hold at most ${MAX_ARTICLE_QUESTIONS} questions.`);
      return null;
    }
    const question = createQuestionOfType("mcq_single") as McqSingleQuestion;
    append(question);
    return question.id;
  };

  const handleRemoveQuestion = (index: number, questionId: string) => {
    remove(index);
    // Leaving the placeholder behind would render an empty hole in the
    // article and fail publish validation.
    setValue(htmlName, removeArticleQuestionMarker(html, questionId), {
      shouldDirty: true,
    });
  };

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
          name={htmlName}
          render={({ field }) => (
            <RichTextEditor
              value={field.value ?? ""}
              onChange={field.onChange}
              placeholder="Write the article content…"
              allowImages
              onImageUpload={handleImageUpload}
              onCreateQuestion={handleCreateQuestion}
              className="min-h-[360px] [&_.ProseMirror]:min-h-[320px]"
            />
          )}
        />
      </div>

      {fields.length > 0 && (
        <div className="flex flex-col gap-4">
          <span className="inline-flex items-center gap-1">
            <span className="text-sm font-medium text-typography-800">
              Questions ({fields.length}/{MAX_ARTICLE_QUESTIONS})
            </span>
            <Tooltip
              label="A multiple choice question the reader answers where it sits in the article. Their answer is final and they're told straight away whether it was right, so an article with questions is finished by answering them, not by marking it read."
              align="top"
            >
              <button type="button" className="cursor-pointer inline-flex items-center">
                <TooltipIcon />
              </button>
            </Tooltip>
          </span>

          {rows.map(({ index, placed }, position) => {
            const question = questions[index];
            const field = fields[index];
            if (!question || !field) return null;
            const questionPath = `${base}.article.questions.${index}` as QuestionPath;

            return (
              <div
                key={field.fieldId}
                className={`border rounded-md p-4 flex flex-col gap-4 ${
                  placed ? "border-border-light" : "border-warning-400 bg-warning-50/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-typography-800">
                    {placed ? `Question ${position + 1}` : "Not in the article"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(index, question.id)}
                    className="text-destructive-500 hover:text-destructive-600"
                    aria-label={`Delete question ${position + 1}`}
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>

                {!placed && (
                  <p className="text-xs text-warning-800">
                    Its placeholder was deleted from the article, so nobody will see it. Put it back
                    with the question button in the toolbar, or delete the question.
                  </p>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-typography-800">Question</label>
                  <Controller
                    control={control}
                    name={`${questionPath}.prompt`}
                    render={({ field: promptField }) => (
                      <TextArea
                        id={`${questionPath}.prompt`}
                        labelText="Question"
                        hideLabel
                        {...promptField}
                        value={promptField.value ?? ""}
                        rows={2}
                        placeholder="Question text"
                        className="w-full"
                      />
                    )}
                  />
                </div>

                <McqEditor questionPath={questionPath} multi={false} />
              </div>
            );
          })}
        </div>
      )}
    </ItemEditorFrame>
  );
};
