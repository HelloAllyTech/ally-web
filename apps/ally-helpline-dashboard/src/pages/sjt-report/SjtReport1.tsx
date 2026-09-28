import { ChangeEvent, FC, useEffect, useMemo, useRef, useState } from "react";

import {
  BANDS,
  COMPS,
  CRISIS,
  CompStat,
  DIMS,
  DimField,
  Filters,
  MIN_GROUP,
  Teacher,
  applyFilters,
  band,
  buildActions,
  compStats,
  generate,
  isGap,
  loadCSV,
  mean,
  orderFor,
  pct,
  scenarioStats,
  sgn,
} from "./reportData";
import { usePageMeta } from "../blog/usePageMeta";

import "./sjtReport.css";

export const SJT_REPORT1_TITLE = "Teacher mental health readiness report";

export const SJT_REPORT1_DESCRIPTION =
  "How ready teachers are to respond when a student is struggling: scores on five skills, where readiness differs across staff, and what to do next.";

const SAMPLE_SOURCE =
  "Teacher situational judgement self-assessment, September 2026. Sample data for 500 teachers.";

/**
 * Literata and Public Sans, which no other route uses. Loaded from here rather
 * than index.html so the rest of the app never fetches them; sjtReport.css
 * falls back to Georgia / system-ui until (or unless) they arrive.
 */
const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,400;7..72,600" +
  "&family=Public+Sans:wght@400;500;600&display=swap";

const useReportFonts = () => {
  useEffect(() => {
    // A concurrent mount (or a fast back/forward) must not append a second copy.
    const existing = document.head.querySelector<HTMLLinkElement>(`link[href="${FONTS_HREF}"]`);
    if (existing) return undefined;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONTS_HREF;
    document.head.appendChild(link);
    return () => link.remove();
  }, []);
};

/* ---------- hero ---------- */

const Hero: FC<{ source: string; list: Teacher[]; cs: CompStat[] }> = ({ source, list, cs }) => {
  const n = list.length;
  if (n < MIN_GROUP) {
    return (
      <header className="wrap">
        <p className="source">{source}</p>
        <h1>Too few teachers match these filters.</h1>
        <p className="lede">
          Results are shown only for groups of {MIN_GROUP} or more teachers, so individual answers
          stay private. Clear a filter to see the report.
        </p>
        <div className="facts" />
      </header>
    );
  }
  const sorted = [...cs].sort((a, b) => b.mean - a.mean);
  const strong = sorted[0];
  const weak = sorted[sorted.length - 1];
  const idx = Math.round(mean(list.map(t => t.overall)) + 50);
  const devAll = list.filter(t => COMPS.every(c => t.scores[c.key] >= 10)).length;
  const gap = list.filter(isGap).length;
  const needAny = list.filter(t => COMPS.some(c => t.scores[c.key] <= -15)).length;

  return (
    <header className="wrap">
      <p className="source">{source}</p>
      <h1>
        Your teachers are strongest at {strong.phrase}, and weakest at {weak.phrase}.
      </h1>
      <p className="lede">
        {pct(devAll, n)}% of teachers are at least developing in all five skills. {pct(gap, n)}%
        scored below zero on risk and handoff or safety first response, the two skills that matter
        most when a student is in danger. That is {gap} teachers who, today, might not respond
        safely in a crisis.
      </p>
      <div className="facts">
        <div className="fact">
          <b>{idx} / 100</b>
          <span>School readiness index</span>
        </div>
        <div className="fact">
          <b>{pct(devAll, n)}%</b>
          <span>Developing or ready in all five skills</span>
        </div>
        <div className="fact alert">
          <b>{gap}</b>
          <span>Teachers below zero on a crisis skill</span>
        </div>
        <div className="fact">
          <b>{needAny}</b>
          <span>Teachers who need support in at least one skill</span>
        </div>
      </div>
    </header>
  );
};

/* ---------- dot grids ---------- */

const Strips: FC<{ cs: CompStat[]; n: number }> = ({ cs, n }) => {
  if (n < MIN_GROUP) return null;
  const W = 900;
  const COLS = 21;
  const colW = W / COLS;
  const per = 6;
  const p = 6;
  const r = 2.3;
  let maxRows = 1;
  const counts = cs.map(c => {
    const cnt: Record<number, number> = {};
    c.values.forEach(v => (cnt[v] = (cnt[v] || 0) + 1));
    Object.values(cnt).forEach(k => {
      maxRows = Math.max(maxRows, Math.ceil(k / per));
    });
    return cnt;
  });
  const H = maxRows * p + 8;
  const AX = 20;
  const TOP = 14;
  const xOf = (v: number) => ((v + 50) / 5) * colW + colW / 2;

  return (
    <>
      {cs.map((c, ci) => {
        const dots = [];
        for (let i = 0; i < COLS; i++) {
          const v = -50 + i * 5;
          const k = counts[ci][v] || 0;
          const cls = "d-" + band(v);
          for (let j = 0; j < k; j++) {
            const col = j % per;
            const row = Math.floor(j / per);
            const cx = xOf(v) - ((per - 1) * p) / 2 + col * p;
            const cy = TOP + H - 4 - row * p;
            dots.push(
              <circle
                key={`${v}-${j}`}
                className={cls}
                cx={cx.toFixed(1)}
                cy={cy.toFixed(1)}
                r={r}
              />,
            );
          }
        }
        const mx = xOf(c.mean);
        const tot = c.values.length;
        const bandtext = BANDS.map(b => `${pct(c.counts[b.k], tot)}% ${b.name.toLowerCase()}`).join(
          ", ",
        );
        const aria = `${c.name}: average ${sgn(c.mean)}. ${bandtext}.`;
        return (
          <div className="strip" key={c.key}>
            <div>
              <h3>{c.name}</h3>
              <p className="desc">{c.desc}</p>
              <p className="avg">
                Average <b>{sgn(c.mean)}</b>
              </p>
              <div className="bandbar" aria-hidden="true">
                {BANDS.map(b => (
                  <span
                    key={b.k}
                    className={`c-${b.k}`}
                    style={{ width: `${(c.counts[b.k] / tot) * 100}%` }}
                  />
                ))}
              </div>
              <p className="bandtext">{bandtext}</p>
            </div>
            <svg viewBox={`0 0 ${W} ${TOP + H + AX}`} role="img" aria-label={aria}>
              <line
                className="zero"
                x1={xOf(0)}
                x2={xOf(0)}
                y1={TOP}
                y2={TOP + H}
                strokeDasharray="3 3"
              />
              {dots}
              <line className="meanline" x1={mx} x2={mx} y1={TOP - 2} y2={TOP + H} />
              <text className="meantext" x={mx} y={TOP - 5} textAnchor="middle">
                avg {sgn(c.mean)}
              </text>
              {[-50, -25, 0, 25, 50].map(v => (
                <text key={v} x={xOf(v)} y={TOP + H + AX - 4} textAnchor="middle">
                  {sgn(v)}
                </text>
              ))}
            </svg>
          </div>
        );
      })}
    </>
  );
};

const Gap: FC<{ list: Teacher[] }> = ({ list }) => {
  if (list.length < MIN_GROUP) return null;
  const both = list.filter(t => CRISIS.every(k => t.scores[k] < 0)).length;
  const rhOnly = list.filter(t => t.scores.rh < 0 && t.scores.sf >= 0).length;
  const sfOnly = list.filter(t => t.scores.sf < 0 && t.scores.rh >= 0).length;
  return (
    <div className="callout">
      <h3>{both} teachers scored below zero on both crisis skills</h3>
      <p>
        Another {rhOnly} are below zero on risk and handoff only, and {sfOnly} on safety first
        response only. These teachers are the first priority for training, because in a crisis they
        are likely to either miss the danger or not know what to do next.
      </p>
    </div>
  );
};

/* ---------- segments ---------- */

const cellStyle = (v: number) => {
  const a = Math.min(1, Math.abs(v) / 40);
  const col = v >= 0 ? "var(--ready)" : "var(--need)";
  return {
    background: `color-mix(in srgb, ${col} ${Math.round(a * 80)}%, var(--surface))`,
    ...(a > 0.55 ? { color: "#fff" } : {}),
  };
};

const SegRow: FC<{ label: string; g: Teacher[]; total?: boolean }> = ({ label, g, total }) => {
  if (g.length < MIN_GROUP) {
    return (
      <tr>
        <td>{label}</td>
        <td>{g.length}</td>
        <td className="suppressed" colSpan={COMPS.length + 1}>
          Fewer than {MIN_GROUP} teachers, hidden
        </td>
      </tr>
    );
  }
  return (
    <tr className={total ? "total" : ""}>
      <td>{label}</td>
      <td>{g.length}</td>
      {COMPS.map(c => {
        const m = mean(g.map(t => t.scores[c.key]));
        return (
          <td key={c.key} className="cell" style={cellStyle(m)}>
            {sgn(m)}
          </td>
        );
      })}
      <td className="cell">{pct(g.filter(isGap).length, g.length)}%</td>
    </tr>
  );
};

/* ---------- scenarios ---------- */

const Scenarios: FC<{
  list: Teacher[];
  hasItems: boolean;
  showAll: boolean;
  onToggle: () => void;
}> = ({ list, hasItems, showAll, onToggle }) => {
  if (!hasItems) {
    return (
      <div className="scn-list">
        <p className="intro">
          This file has skill totals only. Add columns q1 to q25 to see which situations teachers
          found hardest.
        </p>
      </div>
    );
  }
  if (list.length < MIN_GROUP) return <div className="scn-list" />;
  const rows = scenarioStats(list);
  const shown = showAll ? rows : rows.slice(0, 8);
  const cname = (k: string) => COMPS.find(c => c.key === k)?.name;
  return (
    <>
      <div className="scn-list">
        {shown.map(s => {
          const best = Math.round(s.best * 100);
          const ok = Math.round(s.ok * 100);
          const poor = Math.round(s.poor * 100);
          const harm = Math.round(s.harm * 100);
          return (
            <div className="scn" key={s.i}>
              <div>
                <p className="tag">{cname(s.c)}</p>
                <p className="t">{s.t}</p>
              </div>
              <div>
                <div
                  className="stack"
                  role="img"
                  aria-label={`${best}% best, ${ok}% acceptable, ${poor}% unhelpful, ${harm}% harmful`}
                >
                  <span className="c-ready" style={{ width: `${s.best * 100}%` }} />
                  <span className="c-dev" style={{ width: `${s.ok * 100}%` }} />
                  <span className="c-emg" style={{ width: `${s.poor * 100}%` }} />
                  <span className="c-need" style={{ width: `${s.harm * 100}%` }} />
                </div>
                <p className="nums">
                  {best}% best response, {harm}% harmful
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <button className="more" type="button" onClick={onToggle}>
        {showAll ? "Show the 8 hardest only" : "Show all 25 situations"}
      </button>
    </>
  );
};

/* ---------- page ---------- */

interface Message {
  text: string;
  err?: boolean;
}

/**
 * Public, unauthenticated teacher mental health readiness report, served at
 * /sjtreport1.
 *
 * A school leadership view of a situational judgement self-assessment: the
 * spread on each of five skills, the crisis-skill gap, readiness by staff
 * group, the hardest situations and a prioritised action list. It opens on a
 * deterministic 500-teacher sample; a school can load its own CSV, which is
 * read in the browser and never sent anywhere — the page makes no API calls.
 * Groups under MIN_GROUP teachers are never shown.
 *
 * Standalone like /SJT1: no nav, no sign-in, and its own styling in
 * sjtReport.css rather than the app tokens.
 */
export const SjtReport1: FC = () => {
  usePageMeta({
    title: SJT_REPORT1_TITLE,
    description: SJT_REPORT1_DESCRIPTION,
    url: "/sjtreport1",
  });
  useReportFonts();

  const [data, setData] = useState<Teacher[]>(generate);
  const [hasItems, setHasItems] = useState(true);
  const [filters, setFilters] = useState<Filters>({});
  const [seg, setSeg] = useState<DimField>("grade");
  const [showAll, setShowAll] = useState(false);
  const [source, setSource] = useState(SAMPLE_SOURCE);
  const [msg, setMsg] = useState<Message>({ text: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  // Only dimensions with at least two values in the data can filter or segment.
  const dims = useMemo(
    () => DIMS.map(d => ({ d, opts: orderFor(data, d) })).filter(x => x.opts.length >= 2),
    [data],
  );
  const activeSeg = dims.some(x => x.d.f === seg) ? seg : (dims[0]?.d.f ?? seg);
  const segDim = DIMS.find(d => d.f === activeSeg) ?? DIMS[0];

  const list = useMemo(() => applyFilters(data, filters), [data, filters]);
  const cs = useMemo(() => compStats(list), [list]);
  const actions = useMemo(
    () => (list.length < MIN_GROUP ? [] : buildActions(list, cs, hasItems, data)),
    [list, cs, hasItems, data],
  );

  const n = list.length;
  const count = n === data.length ? `All ${n} teachers` : `Showing ${n} of ${data.length} teachers`;

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const res = loadCSV(String(rd.result));
      if ("error" in res) {
        setMsg({ text: res.error, err: true });
        return;
      }
      setData(res.data);
      setHasItems(res.hasItems);
      setFilters({});
      setShowAll(false);
      setSeg("grade");
      setSource(
        `Teacher situational judgement self-assessment. Showing ${res.data.length} teachers from ${f.name}.`,
      );
      setMsg({
        text:
          `Loaded ${res.data.length} teachers.` +
          (res.skipped
            ? ` ${res.skipped} rows were skipped because of missing or out-of-range values.`
            : ""),
      });
      window.scrollTo?.({ top: 0, behavior: "smooth" });
    };
    rd.onerror = () =>
      setMsg({ text: "The file could not be read. Try saving it again as CSV.", err: true });
    rd.readAsText(f);
  };

  const loadSample = () => {
    setData(generate());
    setHasItems(true);
    setFilters({});
    setShowAll(false);
    setSource(SAMPLE_SOURCE);
    setMsg({ text: "Showing sample data." });
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="sjtr">
      <Hero source={source} list={list} cs={cs} />

      <div className="filters" role="region" aria-label="Filter teachers">
        <div className="wrap">
          {dims.map(({ d, opts }) => (
            <label key={d.f}>
              {d.label}
              <select
                value={filters[d.f] ?? "all"}
                onChange={e => setFilters(prev => ({ ...prev, [d.f]: e.target.value }))}
              >
                <option value="all">All</option>
                {opts.map(o => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          ))}
          <button type="button" onClick={() => setFilters({})}>
            Clear filters
          </button>
          <span className="count">{count}</span>
        </div>
      </div>

      <main className="wrap">
        <section aria-labelledby="sjtr-h-skills">
          <h2 id="sjtr-h-skills">How teachers scored on each skill</h2>
          <p className="intro">
            Every teacher answered five student situations per skill. The best response earned +10
            and the most harmful −10, so each skill is scored from −50 to +50. Each dot below is one
            teacher.
          </p>
          <div className="legend">
            {BANDS.map(b => (
              <span key={b.k}>
                <i className={`c-${b.k}`} />
                {b.name} ({b.range})
              </span>
            ))}
            <span>One dot per teacher</span>
          </div>
          <div>
            <Strips cs={cs} n={n} />
          </div>
          <Gap list={list} />
        </section>

        <section aria-labelledby="sjtr-h-seg">
          <h2 id="sjtr-h-seg">Where readiness differs across your staff</h2>
          <p className="intro">
            Average score per skill for each group. Darker green is stronger, darker red is weaker.
            The last column shows the share of teachers who scored below zero on either crisis
            skill.
          </p>
          <div className="seg-controls" role="group" aria-label="Compare teachers by">
            {dims.map(({ d }) => (
              <button
                key={d.f}
                type="button"
                aria-pressed={d.f === activeSeg}
                onClick={() => setSeg(d.f)}
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">{segDim.label}</th>
                  <th scope="col">Teachers</th>
                  {COMPS.map(c => (
                    <th key={c.key} scope="col">
                      {c.name}
                    </th>
                  ))}
                  <th scope="col">Crisis gap</th>
                </tr>
              </thead>
              <tbody>
                <SegRow label="All selected teachers" g={list} total />
                {orderFor(data, segDim).map(v => (
                  <SegRow key={v} label={v} g={list.filter(t => t[segDim.f] === v)} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="note">
            Groups with fewer than 10 teachers are hidden so no individual&apos;s answers can be
            identified.
          </p>
        </section>

        <section aria-labelledby="sjtr-h-scn">
          <h2 id="sjtr-h-scn">The situations teachers found hardest</h2>
          <p className="intro">
            Situations ranked by average score, lowest first. These are the moments where students
            are most likely to get an unhelpful or harmful response today.
          </p>
          <div className="legend">
            <span>
              <i className="c-ready" />
              Best response (+10)
            </span>
            <span>
              <i className="c-dev" />
              Acceptable (+5)
            </span>
            <span>
              <i className="c-emg" />
              Unhelpful (−5)
            </span>
            <span>
              <i className="c-need" />
              Harmful (−10)
            </span>
          </div>
          <Scenarios
            list={list}
            hasItems={hasItems}
            showAll={showAll}
            onToggle={() => setShowAll(v => !v)}
          />
        </section>

        <section aria-labelledby="sjtr-h-act">
          <h2 id="sjtr-h-act">What to do next</h2>
          <p className="intro">Priorities in order, based on the teachers currently selected.</p>
          <ol className="actions">
            {actions.map(a => (
              <li key={a.h}>
                <div>
                  <h3>{a.h}</h3>
                  <p>{a.p}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="sjtr-h-data">
          <h2 id="sjtr-h-data">About this data</h2>
          <div className="data">
            <h3>How scores are read</h3>
            <ul>
              <li>
                <b>Ready</b> (30 to 50): consistently picks the best or an acceptable response.
              </li>
              <li>
                <b>Developing</b> (10 to 25): mostly sound, with some unhelpful choices.
              </li>
              <li>
                <b>Emerging</b> (−10 to 5): as likely to get it wrong as right.
              </li>
              <li>
                <b>Needs support</b> (−15 and below): often picks responses that could harm a
                student.
              </li>
            </ul>
            <p>
              The school readiness index is the average of all five skill scores, shifted to a 0 to
              100 scale. Risk and handoff and safety first response are treated as crisis skills,
              because a wrong move there can put a student in danger.
            </p>

            <h3>Use your own results</h3>
            <p>
              This report currently shows sample data. Load a CSV file with one row per teacher and
              these columns:
            </p>
            <pre>
              {
                "teacher_id,gender,grade,tenure_years,experience_years,prior_training,active_listening,recognise,self_regulation,risk_and_handoff,safety_first_response"
              }
            </pre>
            <p>
              Optionally add <code>q1</code> to <code>q25</code> with each answer&apos;s score (10,
              5, −5 or −10) to see the hardest situations. Questions 1 to 5 are active listening, 6
              to 10 recognise, 11 to 15 self-regulation, 16 to 20 risk and handoff, 21 to 25 safety
              first response. If you include all 25, the skill columns can be left out.{" "}
              <code>prior_training</code> is optional (Yes or No).
            </p>
            <div className="upload">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                aria-label="Choose a CSV file"
                onChange={onFile}
              />
              <button type="button" onClick={loadSample}>
                Use sample data
              </button>
            </div>
            <p className={msg.err ? "msg err" : "msg"} role="status">
              {msg.text}
            </p>
            <p className="note">
              Your file is read inside your browser. It is not uploaded or stored anywhere.
            </p>
          </div>
        </section>
      </main>

      <footer className="wrap">
        Built for school leadership teams. Self-assessment results show how teachers say they would
        act, not a clinical evaluation.
      </footer>
    </div>
  );
};
