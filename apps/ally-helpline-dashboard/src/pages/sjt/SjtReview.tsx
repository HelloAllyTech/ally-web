import { FC, useState } from "react";

import { band, scoreItem } from "./scoring";
import { SjtButton, T, useCopy, useEditing } from "./SjtCopyContext";
import { OptionId, SjtItem } from "./sjtData";

interface SjtReviewProps {
  item: SjtItem;
  order: OptionId[];
}

/**
 * One scenario's post-hoc breakdown: the panel's ladder against the learner's,
 * with the reasoning for every option — including the ones they ranked low,
 * which is where the useful disagreement usually sits. Collapsed by default so
 * ten of these don't bury the summary above them.
 *
 * Under /SJT1/edit it starts open instead: the reasoning is the most-reviewed
 * copy on the page, and ten cards that have to be opened first would hide it.
 */
export const SjtReview: FC<SjtReviewProps> = ({ item, order }) => {
  const copy = useCopy();
  const editing = useEditing();
  const [open, setOpen] = useState(false);
  const { pct } = scoreItem(order, item.key);
  const { tone } = band(pct, copy.bands);
  const shown = editing || open;

  return (
    <div className="sjt-card">
      <SjtButton className="sjt-rev-head" onClick={() => setOpen(!open)} expanded={shown}>
        <span>
          <span className="sjt-rev-title">
            <T path={`items.${item.id}.phase`} /> ·{" "}
            {/* The setting doubles as the card's title, minus the year group
                that already sits in front of it. */}
            {copy.items[item.id].setting.split(" · ")[1] || copy.items[item.id].setting}
          </span>
          <br />
          <span className="sjt-rev-meta">
            <T
              readOnly
              path="review.meta"
              vars={{ domain: copy.domains[item.domain].label, pct }}
            />
          </span>
        </span>
        <span className={`sjt-badge ${tone}`}>
          {shown ? <T path="review.hideLabel" /> : <T path="review.openLabel" />}
        </span>
      </SjtButton>

      {shown && (
        <div>
          <p className="sjt-scenario" style={{ fontSize: 17, marginTop: 14 }}>
            <T path={`items.${item.id}.scenario`} />
          </p>
          <div className="sjt-ladder">
            <div className="sjt-rung-lab">
              <span>
                <T path="review.keyLabel" />
              </span>
              <span>
                <T path="review.youLabel" />
              </span>
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
                    <span className="sjt-rung-text">
                      <T path={`items.${item.id}.options.${id}.text`} />
                    </span>
                    <span className="sjt-rung-why">
                      <T path={`items.${item.id}.options.${id}.why`} />
                    </span>
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
