import { FC, useMemo } from "react";

import { band, scoreItem } from "./scoring";
import { SjtButton, T, useCopy } from "./SjtCopyContext";
import { DOMAINS, ITEMS, OptionId } from "./sjtData";
import { SjtReview } from "./SjtReview";

interface SjtResultsProps {
  answers: Record<number, OptionId[]>;
  onRestart: () => void;
}

export const SjtResults: FC<SjtResultsProps> = ({ answers, onRestart }) => {
  const copy = useCopy();

  const scored = useMemo(
    () => ITEMS.map(item => ({ item, ...scoreItem(answers[item.id] ?? [], item.key) })),
    [answers],
  );

  const overall = Math.round(scored.reduce((sum, row) => sum + row.pct, 0) / scored.length);
  const overallBand = band(overall, copy.bands);

  const byDomain = useMemo(
    () =>
      Object.values(DOMAINS).map(domain => {
        const rows = scored.filter(row => row.item.domain === domain.code);
        const pct = Math.round(rows.reduce((sum, row) => sum + row.pct, 0) / rows.length);
        // The label comes from the copy, not from DOMAINS, so a reworded area
        // name follows through into the strongest/weakest sentence below.
        return {
          code: domain.code,
          label: copy.domains[domain.code].label,
          pct,
          count: rows.length,
          tone: band(pct, copy.bands).tone,
        };
      }),
    [scored, copy],
  );

  const weakest = [...byDomain].sort((a, b) => a.pct - b.pct)[0];
  const strongest = [...byDomain].sort((a, b) => b.pct - a.pct)[0];

  return (
    <div className="sjt-wrap">
      <p className="sjt-eyebrow">
        <T path="results.eyebrow" />
      </p>
      <div className="sjt-score">
        <span className="sjt-score-num">
          {overall}
          <sub>%</sub>
        </span>
        <span className={`sjt-badge ${overallBand.tone}`}>{overallBand.name}</span>
      </div>
      <p className="sjt-lede" style={{ fontSize: 17 }}>
        <T path="results.lede" />
      </p>

      <div className="sjt-card">
        <p className="sjt-eyebrow">
          <T path="results.byAreaLabel" />
        </p>
        {byDomain.map(domain => (
          <div className="sjt-dom" key={domain.code}>
            <div className="sjt-dom-head">
              <span className="sjt-dom-name">
                <T path={`domains.${domain.code}.label`} />
              </span>
              <span className="sjt-dom-pct">
                <T
                  readOnly
                  path="results.areaMeta"
                  vars={{
                    pct: domain.pct,
                    count: domain.count,
                    items: domain.count === 1 ? copy.results.itemWord : copy.results.itemsWord,
                  }}
                />
              </span>
            </div>
            <div className="sjt-bar">
              <i
                className={domain.tone === "good" ? "" : domain.tone}
                style={{ width: `${Math.max(domain.pct, 2)}%` }}
              />
            </div>
            <p className="sjt-dom-blurb">
              <T path={`domains.${domain.code}.blurb`} />
            </p>
          </div>
        ))}
      </div>

      <div className="sjt-card">
        <p className="sjt-eyebrow">
          <T path="results.attentionLabel" />
        </p>
        <p style={{ marginTop: 10 }}>
          <T
            path="results.attentionBody"
            vars={{
              strongest: <strong>{strongest.label.toLowerCase()}</strong>,
              strongestPct: strongest.pct,
              weakest: <strong>{weakest.label.toLowerCase()}</strong>,
              weakestPct: weakest.pct,
            }}
          />
        </p>
        <p style={{ marginTop: 12 }}>
          <T path="results.attentionRehearse" />
        </p>
        <p className="sjt-hint" style={{ marginTop: 12 }}>
          <T
            path="results.attentionHint"
            vars={{ areas: byDomain.filter(domain => domain.count === 2).length }}
          />
        </p>
      </div>

      <p className="sjt-eyebrow" style={{ marginTop: 32 }}>
        <T path="results.scenariosLabel" />
      </p>
      {scored.map(row => (
        <SjtReview key={row.item.id} item={row.item} order={answers[row.item.id] ?? []} />
      ))}

      <div className="sjt-actions">
        <SjtButton className="sjt-btn" onClick={onRestart}>
          <T path="results.restartLabel" />
        </SjtButton>
      </div>

      <p className="sjt-note">
        <T path="results.note" />
      </p>
    </div>
  );
};
