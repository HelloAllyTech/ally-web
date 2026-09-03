import { FC } from "react";

import { DOMAINS } from "./sjtData";

interface SjtIntroProps {
  onStart: () => void;
}

export const SjtIntro: FC<SjtIntroProps> = ({ onStart }) => (
  <div className="sjt-wrap">
    <p className="sjt-eyebrow">Self-check · 10 scenarios · about 12 minutes</p>
    <h1 className="sjt-h1">
      Everyday
      <br />
      conversations<em>.</em>
    </h1>
    <p className="sjt-lede">
      Most of what a school does for children&apos;s mental health happens in thirty-second
      exchanges — at the door, in a corridor, while books are being handed out. This checks the
      judgement you use in those moments.
    </p>

    <div className="sjt-card">
      <p className="sjt-eyebrow">How it works</p>
      <p style={{ marginTop: 10 }}>
        Each scenario has four things a teacher could say. Tap them in order, starting with the one
        you think is best and ending with the one you think is worst. There&apos;s no time limit,
        and nothing you choose is sent anywhere — your answers stay in this browser, so if you stop
        halfway they&apos;ll be waiting when you come back.
      </p>
      <p style={{ marginTop: 12 }}>
        Afterwards you&apos;ll get a score against four areas of practice, plus the reasoning behind
        every option — including the ones you ranked low. That reasoning is the point; the number is
        just a way in.
      </p>
    </div>

    <div className="sjt-card">
      <p className="sjt-eyebrow">The four areas</p>
      {Object.values(DOMAINS).map(domain => (
        <div className="sjt-dom" key={domain.code}>
          <div className="sjt-dom-head">
            <span className="sjt-dom-name">{domain.label}</span>
            <span className="sjt-dom-pct">{domain.code}</span>
          </div>
          <p className="sjt-dom-blurb" style={{ marginTop: 6 }}>
            {domain.blurb}
          </p>
        </div>
      ))}
    </div>

    <div className="sjt-actions">
      <button type="button" className="sjt-btn mark" onClick={onStart}>
        Start the first scenario
      </button>
    </div>

    <p className="sjt-note">
      Prototype. The “consensus” rankings here were written to be defensible, not validated — before
      any real use they need review by a panel (safeguarding lead, school counsellor, EP) and
      piloting for item difficulty and discrimination. Nothing here replaces your school&apos;s
      safeguarding policy: anything that worries you goes to your DSL today, not after a
      self-assessment.
    </p>
  </div>
);
