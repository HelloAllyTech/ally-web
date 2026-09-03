import { FC, useState } from "react";

import { band, scoreItem } from "./scoring";
import { DOMAINS, OptionId, SjtItem } from "./sjtData";

interface SjtReviewProps {
  item: SjtItem;
  order: OptionId[];
}

/**
 * One scenario's post-hoc breakdown: the panel's ladder against the learner's,
 * with the reasoning for every option — including the ones they ranked low,
 * which is where the useful disagreement usually sits. Collapsed by default so
 * ten of these don't bury the summary above them.
 */
export const SjtReview: FC<SjtReviewProps> = ({ item, order }) => {
  const [open, setOpen] = useState(false);
  const { pct } = scoreItem(order, item.key);
  const { tone } = band(pct);

  return (
    <div className="sjt-card">
      <button
        type="button"
        className="sjt-rev-head"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>
          <span className="sjt-rev-title">
            {item.phase} · {item.setting.split(" · ")[1] || item.setting}
          </span>
          <br />
          <span className="sjt-rev-meta">
            {DOMAINS[item.domain].label} · match {pct}%
          </span>
        </span>
        <span className={`sjt-badge ${tone}`}>{open ? "Hide" : "Open"}</span>
      </button>

      {open && (
        <div>
          <p className="sjt-scenario" style={{ fontSize: 17, marginTop: 14 }}>
            {item.scenario}
          </p>
          <div className="sjt-ladder">
            <div className="sjt-rung-lab">
              <span>Key</span>
              <span>You</span>
              <span />
            </div>
            {item.key.map((id, keyRank) => {
              const yourRank = order.indexOf(id);
              const hit = yourRank === keyRank;
              return (
                <div className="sjt-rung" key={id}>
                  <span className="sjt-mini key">{keyRank + 1}</span>
                  <span className={`sjt-mini you ${hit ? "hit" : "miss"}`}>{yourRank + 1}</span>
                  <span>
                    <span className="sjt-rung-text">{item.options[id].text}</span>
                    <span className="sjt-rung-why">{item.options[id].why}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
