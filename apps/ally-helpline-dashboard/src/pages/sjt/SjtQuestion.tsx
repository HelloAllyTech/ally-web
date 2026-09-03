import { FC, useEffect } from "react";

import { RANKING_LENGTH } from "./scoring";
import { OPTION_IDS, OptionId, RANK_LABELS, SjtItem } from "./sjtData";

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
          {item.phase} · {item.setting}
        </p>
        <p className="sjt-scenario">{item.scenario}</p>

        <p className="sjt-instruct">
          Tap in order, best first. <span>{remaining} left</span>
        </p>

        {OPTION_IDS.map(id => {
          const rank = order.indexOf(id);
          const picked = rank !== -1;
          return (
            <button
              type="button"
              key={id}
              className={`sjt-opt${picked ? " picked" : ""}`}
              onClick={() => onToggle(id)}
              aria-pressed={picked}
            >
              <span className="sjt-chip" aria-hidden="true">
                {picked ? rank + 1 : "·"}
              </span>
              <span className="sjt-opt-body">
                <span className="sjt-opt-text">{item.options[id].text}</span>
                {picked && <span className="sjt-opt-rank">{RANK_LABELS[rank]}</span>}
              </span>
            </button>
          );
        })}

        <div className="sjt-actions">
          <button type="button" className="sjt-btn" onClick={onNext} disabled={!complete}>
            {index === total - 1 ? "See my results" : "Next scenario"}
          </button>
          {order.length > 0 && (
            <button type="button" className="sjt-btn-ghost" onClick={onClear}>
              Clear order
            </button>
          )}
          {index > 0 && (
            <button type="button" className="sjt-btn-ghost" onClick={onBack}>
              Previous
            </button>
          )}
        </div>
        {!complete && (
          <p className="sjt-hint" style={{ marginTop: 10 }}>
            Tap an option again to take it out of the order.
          </p>
        )}
      </div>
    </div>
  );
};
