import { FC } from "react";

import { SjtButton, T } from "./SjtCopyContext";
import { DOMAINS } from "./sjtData";

interface SjtIntroProps {
  onStart: () => void;
}

export const SjtIntro: FC<SjtIntroProps> = ({ onStart }) => (
  <div className="sjt-wrap">
    <p className="sjt-eyebrow">
      <T path="intro.eyebrow" />
    </p>
    <h1 className="sjt-h1">
      <T path="intro.headingTop" />
      <br />
      <T path="intro.headingBottom" />
      <em>
        <T path="intro.headingAccent" />
      </em>
    </h1>
    <p className="sjt-lede">
      <T path="intro.lede" />
    </p>

    <div className="sjt-card">
      <p className="sjt-eyebrow">
        <T path="intro.howLabel" />
      </p>
      <p style={{ marginTop: 10 }}>
        <T path="intro.howBody" />
      </p>
      <p style={{ marginTop: 12 }}>
        <T path="intro.howBodyTwo" />
      </p>
    </div>

    <div className="sjt-card">
      <p className="sjt-eyebrow">
        <T path="intro.areasLabel" />
      </p>
      {Object.values(DOMAINS).map(domain => (
        <div className="sjt-dom" key={domain.code}>
          <div className="sjt-dom-head">
            <span className="sjt-dom-name">
              <T path={`domains.${domain.code}.label`} />
            </span>
            {/* The two-letter code is the area's identity rather than its copy —
                it keys the scoring and each item's domain — so it isn't text
                the editor offers. */}
            <span className="sjt-dom-pct">{domain.code}</span>
          </div>
          <p className="sjt-dom-blurb" style={{ marginTop: 6 }}>
            <T path={`domains.${domain.code}.blurb`} />
          </p>
        </div>
      ))}
    </div>

    <div className="sjt-actions">
      <SjtButton className="sjt-btn mark" onClick={onStart}>
        <T path="intro.startLabel" />
      </SjtButton>
    </div>

    <p className="sjt-note">
      <T path="intro.note" />
    </p>
  </div>
);
