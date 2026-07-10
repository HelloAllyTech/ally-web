import { FC } from "react";

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";

import { ArrowUp, ArrowDownFilled, MenuIcon } from "@assets";
import { QuizOption, SanitizedQuizQuestion } from "@types";

import { QuizAnswerState } from "../quizAnswerState";

interface OrderingQuestionProps {
  question: SanitizedQuizQuestion;
  state: QuizAnswerState;
  onChange: (state: QuizAnswerState) => void;
}

interface RowProps {
  option: QuizOption;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
}

const SortableRow: FC<RowProps> = ({ option, index, total, onMove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: option.id,
  });
  const { t } = useTranslation();

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-[12px] border bg-white p-3 ${
        isDragging ? "border-primary-500 shadow-md" : "border-border-light"
      }`}
    >
      <button
        type="button"
        aria-label={t("tracks2.player.prev")}
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab text-typography-400 active:cursor-grabbing"
      >
        <MenuIcon className="h-5 w-5" />
      </button>
      <span className="flex-1 text-base text-typography-900">{option.text}</span>
      <div className="flex flex-shrink-0 flex-col gap-0.5">
        <button
          type="button"
          aria-label="move up"
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-typography-600 hover:bg-neutral-100 disabled:opacity-30"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="move down"
          disabled={index === total - 1}
          onClick={() => onMove(index, index + 1)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-typography-600 hover:bg-neutral-100 disabled:opacity-30"
        >
          <ArrowDownFilled className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

/**
 * Ordering question — dnd-kit sortable rows plus per-row up/down buttons for
 * touch and keyboard accessibility.
 */
export const OrderingQuestion: FC<OrderingQuestionProps> = ({ question, state, onChange }) => {
  const { t } = useTranslation();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const orderedIds = state.orderedItemIds ?? (question.items ?? []).map(i => i.id);
  const byId = new Map((question.items ?? []).map(i => [i.id, i]));

  const setOrder = (ids: string[]) => onChange({ orderedItemIds: ids });

  const move = (from: number, to: number) => {
    if (to < 0 || to >= orderedIds.length) return;
    setOrder(arrayMove(orderedIds, from, to));
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = orderedIds.indexOf(String(active.id));
    const to = orderedIds.indexOf(String(over.id));
    if (from >= 0 && to >= 0) setOrder(arrayMove(orderedIds, from, to));
  };

  return (
    <div>
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-typography-600">
        {t("tracks2.quiz.question.orderPrompt")}
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {orderedIds.map((id, index) => {
              const option = byId.get(id);
              if (!option) return null;
              return (
                <SortableRow
                  key={id}
                  option={option}
                  index={index}
                  total={orderedIds.length}
                  onMove={move}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
