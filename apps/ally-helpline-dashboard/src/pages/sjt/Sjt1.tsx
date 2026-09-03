import { FC, useCallback } from "react";

// Generic despite living under pages/blog — it owns document.title, the og:*
// tags and the canonical link for any public, unauthenticated page.
import { isComplete } from "./scoring";
import { ITEMS, OptionId } from "./sjtData";
import { SjtIntro } from "./SjtIntro";
import { SjtQuestion } from "./SjtQuestion";
import { SjtResults } from "./SjtResults";
import { useSjtFonts } from "./useSjtFonts";
import { EMPTY_PROGRESS, useSjtProgress } from "./useSjtProgress";
import { usePageMeta } from "../blog/usePageMeta";

import "./sjt.css";

export const SJT1_TITLE = "Everyday conversations | Ally";

export const SJT1_DESCRIPTION =
  "A situational judgement self-check for teachers: ten everyday conversations about " +
  "children's mental health, and the reasoning behind every response.";

/**
 * Public, unauthenticated situational judgement self-check, served at /SJT1.
 *
 * Deliberately standalone: no nav bar, no sign-in, no API calls, and its own
 * styling in sjt.css — Claude's design system, serif-only — rather than the
 * app's Carbon tokens, so the page
 * is meant to be handed to a teacher as a link and work on the first tap.
 *
 * The one thing it does persist is the run itself, in this browser only, so a
 * twelve-minute self-check survives an interruption. See useSjtProgress.
 */
export const Sjt1: FC = () => {
  usePageMeta({ title: SJT1_TITLE, description: SJT1_DESCRIPTION, url: "/SJT1" });
  useSjtFonts();

  const [progress, setProgress] = useSjtProgress();
  const { stage, index, answers } = progress;

  const item = ITEMS[index];
  const order: OptionId[] = answers[item.id] ?? [];

  /**
   * Ranking is tap-to-append: an untouched option joins the end of the order,
   * and tapping a ranked one drops it out (closing the gap behind it). That
   * keeps the whole interaction to one gesture, which matters more on a phone
   * than drag-to-reorder precision would.
   */
  const toggle = useCallback(
    (id: OptionId) => {
      setProgress(current => {
        const currentItem = ITEMS[current.index];
        const currentOrder = current.answers[currentItem.id] ?? [];
        const next = currentOrder.includes(id)
          ? currentOrder.filter(other => other !== id)
          : [...currentOrder, id];
        return { ...current, answers: { ...current.answers, [currentItem.id]: next } };
      });
    },
    [setProgress],
  );

  const clear = useCallback(() => {
    setProgress(current => ({
      ...current,
      answers: { ...current.answers, [ITEMS[current.index].id]: [] },
    }));
  }, [setProgress]);

  const next = useCallback(() => {
    setProgress(current =>
      current.index === ITEMS.length - 1
        ? { ...current, stage: "results" }
        : { ...current, index: current.index + 1 },
    );
  }, [setProgress]);

  const back = useCallback(() => {
    setProgress(current => ({ ...current, index: Math.max(0, current.index - 1) }));
  }, [setProgress]);

  const restart = useCallback(() => setProgress(EMPTY_PROGRESS), [setProgress]);

  return (
    <div className="sjt">
      {stage === "quiz" && (
        <div className="sjt-rail">
          <div className="sjt-rail-top">
            <span>Everyday conversations</span>
            <span>
              {index + 1} / {ITEMS.length}
            </span>
          </div>
          <div className="sjt-ticks">
            {ITEMS.map((tickItem, tickIndex) => (
              <span
                key={tickItem.id}
                className={`sjt-tick${
                  tickIndex === index ? " here" : isComplete(answers[tickItem.id]) ? " done" : ""
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {stage === "intro" && (
        <SjtIntro onStart={() => setProgress(current => ({ ...current, stage: "quiz" }))} />
      )}

      {stage === "quiz" && (
        <SjtQuestion
          item={item}
          index={index}
          total={ITEMS.length}
          order={order}
          onToggle={toggle}
          onClear={clear}
          onNext={next}
          onBack={back}
        />
      )}

      {stage === "results" && <SjtResults answers={answers} onRestart={restart} />}
    </div>
  );
};
