import { FC, useEffect } from "react";

import { RANKING_LENGTH } from "./scoring";
import { SjtButton, T } from "./SjtCopyContext";
import { OPTION_IDS, OptionId, SjtItem } from "./sjtData";

interface SjtQuestionProps {
  item: SjtItem;
  index: number;
  total: number;
  /** Option ids already ranked, best first. */
  order: OptionId[];
  onToggle: (id: OptionId) => void;
  onClear: () => void;
  onNext: () => void;
  onBack: () => void;
}

export const SjtQuestion: FC<SjtQuestionProps> = ({
  item,
  index,
  total,
  order,
  onToggle,
  onClear,
  onNext,
  onBack,
}) => {
  // Each scenario is a fresh page of reading, so start it at the top. Scrolling
  // the window rather than the card into view keeps the sticky progress rail
  // visible instead of tucking the card's first line underneath it.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [item.id]);

  const complete = order.length === RANKING_LENGTH;
  const remaining = RANKING_LENGTH - order.length;

  return (
    <div className="sjt-wrap">
      <div className="sjt-card">
        <p className="sjt-setting">
          <T path={`items.${item.id}.phase`} /> · <T path={`items.${item.id}.setting`} />
        </p>
        <p className="sjt-scenario">
          <T path={`items.${item.id}.scenario`} />
        </p>

        <p className="sjt-instruct">
          <T path="question.instruct" />{" "}
          <span>
            <T path="question.remaining" vars={{ remaining }} readOnly />
          </span>
        </p>

        {OPTION_IDS.map(id => {
          const rank = order.indexOf(id);
          const picked = rank !== -1;
          return (
            <SjtButton
              key={id}
              className={`sjt-opt${picked ? " picked" : ""}`}
              onClick={() => onToggle(id)}
              pressed={picked}
            >
              <span className="sjt-chip" aria-hidden="true">
                {picked ? rank + 1 : "·"}
              </span>
              <span className="sjt-opt-body">
                <span className="sjt-opt-text">
                  <T path={`items.${item.id}.options.${id}.text`} />
                </span>
                {picked && (
                  <span className="sjt-opt-rank">
                    <T path={`rankLabels.${rank}`} />
                  </span>
                )}
              </span>
            </SjtButton>
          );
        })}

        <div className="sjt-actions">
          <SjtButton className="sjt-btn" onClick={onNext} disabled={!complete}>
            {index === total - 1 ? (
              <T path="question.finishLabel" />
            ) : (
              <T path="question.nextLabel" />
            )}
          </SjtButton>
          {order.length > 0 && (
            <SjtButton className="sjt-btn-ghost" onClick={onClear}>
              <T path="question.clearLabel" />
            </SjtButton>
          )}
          {index > 0 && (
            <SjtButton className="sjt-btn-ghost" onClick={onBack}>
              <T path="question.backLabel" />
            </SjtButton>
          )}
        </div>
        {!complete && (
          <p className="sjt-hint" style={{ marginTop: 10 }}>
            <T path="question.hint" />
          </p>
        )}
      </div>
    </div>
  );
};
