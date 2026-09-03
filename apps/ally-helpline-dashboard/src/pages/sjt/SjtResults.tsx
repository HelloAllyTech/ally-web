import { FC, useMemo } from "react";

import { band, scoreItem } from "./scoring";
import { DOMAINS, ITEMS, OptionId } from "./sjtData";
import { SjtReview } from "./SjtReview";

interface SjtResultsProps {
  answers: Record<number, OptionId[]>;
  onRestart: () => void;
}

export const SjtResults: FC<SjtResultsProps> = ({ answers, onRestart }) => {
  const scored = useMemo(
    () => ITEMS.map(item => ({ item, ...scoreItem(answers[item.id] ?? [], item.key) })),
    [answers],
  );

  const overall = Math.round(scored.reduce((sum, row) => sum + row.pct, 0) / scored.length);
  const overallBand = band(overall);

  const byDomain = useMemo(
    () =>
      Object.values(DOMAINS).map(domain => {
        const rows = scored.filter(row => row.item.domain === domain.code);
        const pct = Math.round(rows.reduce((sum, row) => sum + row.pct, 0) / rows.length);
        return { ...domain, pct, count: rows.length, tone: band(pct).tone };
      }),
    [scored],
  );

  const weakest = [...byDomain].sort((a, b) => a.pct - b.pct)[0];
  const strongest = [...byDomain].sort((a, b) => b.pct - a.pct)[0];

  return (
    <div className="sjt-wrap">
      <p className="sjt-eyebrow">Your results · 10 scenarios</p>
      <div className="sjt-score">
        <span className="sjt-score-num">
          {overall}
          <sub>%</sub>
        </span>
        <span className={`sjt-badge ${overallBand.tone}`}>{overallBand.name}</span>
      </div>
      <p className="sjt-lede" style={{ fontSize: 17 }}>
        This is how closely your ordering matched the panel&apos;s, averaged across all four areas.
        Partial credit is given for near-misses, so the interesting detail is below, not here.
      </p>

      <div className="sjt-card">
        <p className="sjt-eyebrow">By area of practice</p>
        {byDomain.map(domain => (
          <div className="sjt-dom" key={domain.code}>
            <div className="sjt-dom-head">
              <span className="sjt-dom-name">{domain.label}</span>
              <span className="sjt-dom-pct">
                {domain.pct}% · {domain.count} {domain.count === 1 ? "item" : "items"}
              </span>
            </div>
            <div className="sjt-bar">
              <i
                className={domain.tone === "good" ? "" : domain.tone}
                style={{ width: `${Math.max(domain.pct, 2)}%` }}
              />
            </div>
            <p className="sjt-dom-blurb">{domain.blurb}</p>
          </div>
        ))}
      </div>

      <div className="sjt-card">
        <p className="sjt-eyebrow">Where to put your attention</p>
        <p style={{ marginTop: 10 }}>
          Your strongest area was <strong>{strongest.label.toLowerCase()}</strong> ({strongest.pct}
          %). The one with most room is <strong>{weakest.label.toLowerCase()}</strong> (
          {weakest.pct}%).
        </p>
        <p style={{ marginTop: 12 }}>
          Pick one scenario below where your order differed most, and decide now what you&apos;d
          actually say next time — a sentence you&apos;d be willing to use on Monday. Judgement in
          these moments improves by rehearsing wording, not by knowing the theory.
        </p>
        <p className="sjt-hint" style={{ marginTop: 12 }}>
          With {byDomain.filter(domain => domain.count === 2).length} areas covered by only two
          scenarios each, treat the area scores as prompts for reflection rather than measurements.
        </p>
      </div>

      <p className="sjt-eyebrow" style={{ marginTop: 32 }}>
        Scenario by scenario
      </p>
      {scored.map(row => (
        <SjtReview key={row.item.id} item={row.item} order={answers[row.item.id] ?? []} />
      ))}

      <div className="sjt-actions">
        <button type="button" className="sjt-btn" onClick={onRestart}>
          Start again
        </button>
      </div>

      <p className="sjt-note">
        Prototype only — not a validated measure of competence, and not a record anyone else can
        see. If a real conversation has left you worried about a child, that goes to your designated
        safeguarding lead today.
      </p>
    </div>
  );
};
