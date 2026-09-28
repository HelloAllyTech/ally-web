/**
 * Data model, sample generator, statistics and CSV reader for the teacher
 * readiness report at /sjtreport1.
 *
 * Ported line for line from the standalone HTML report the page was specified
 * as, so the sample cohort (seeded RNG) and every number derived from it match
 * that file exactly. Nothing here touches the DOM; SjtReport1 renders it.
 */

export type CompKey = "al" | "rec" | "sr" | "rh" | "sf";

export interface Comp {
  key: CompKey;
  name: string;
  /** CSV column holding this skill's total. */
  col: string;
  /** How the headline names the skill ("strongest at …"). */
  phrase: string;
  /** Mean latent ability used by the sample generator. */
  base: number;
  desc: string;
  /** The recommended action when this skill is a priority. */
  act: string;
}

export const COMPS: Comp[] = [
  {
    key: "al",
    name: "Active listening",
    col: "active_listening",
    phrase: "listening to students",
    base: 0.75,
    desc: "Hearing a student out without judging, fixing or brushing it off.",
    act: "Run short practice sessions on reflective listening: paraphrasing, open questions and staying with silence. Pair newer teachers with strong listeners.",
  },
  {
    key: "rec",
    name: "Recognise",
    col: "recognise",
    phrase: "recognising early signs",
    base: 0.45,
    desc: "Spotting early signs that a student is struggling.",
    act: "Share a one-page list of warning signs (changes in grades, attendance, mood, friendships) and give teachers one simple way to log a concern.",
  },
  {
    key: "sr",
    name: "Self-regulation",
    col: "self_regulation",
    phrase: "staying calm under pressure",
    base: 0.5,
    desc: "Staying steady when a situation gets emotional or personal.",
    act: "Give teachers tools to stay calm in the moment and a debrief space after difficult disclosures, so their own stress does not shape the response.",
  },
  {
    key: "rh",
    name: "Risk and handoff",
    col: "risk_and_handoff",
    phrase: "judging risk and handing off",
    base: 0.05,
    desc: "Knowing when it is serious and passing it to the right person.",
    act: "Make the referral path impossible to miss: who to call, when confidentiality must be broken, and what to tell the student. Rehearse it like a fire drill.",
  },
  {
    key: "sf",
    name: "Safety first response",
    col: "safety_first_response",
    phrase: "responding safely in a crisis",
    base: 0.25,
    desc: "Keeping a student safe in the first minutes of a crisis.",
    act: "Train every teacher on the first five minutes of a crisis: stay with the student, remove immediate dangers, call for help and never leave them alone.",
  },
];

/** The two skills where a wrong move can put a student in danger. */
export const CRISIS: CompKey[] = ["rh", "sf"];

export interface Item {
  c: CompKey;
  t: string;
  /** Difficulty used by the sample generator. */
  d: number;
}

/** The 25 situations, five per skill, in q1…q25 order. */
export const ITEMS: Item[] = [
  { c: "al", t: "A student goes quiet mid-conversation after mentioning home", d: 0.2 },
  { c: "al", t: 'A student says "you won’t understand anyway"', d: 0.35 },
  { c: "al", t: "A student shares a painful breakup during a free period", d: -0.2 },
  { c: "al", t: "A student brings up the same worry every day", d: 0.1 },
  { c: "al", t: "A student starts crying while you are explaining a mark", d: -0.3 },
  { c: "rec", t: "A top performer’s grades drop sharply over a month", d: -0.35 },
  { c: "rec", t: "A student keeps visiting the sick room with stomach aches", d: 0.3 },
  { c: "rec", t: "A student starts giving away prized possessions", d: 0.6 },
  { c: "rec", t: "The class clown turns withdrawn after exams", d: -0.1 },
  { c: "rec", t: "A student wears full sleeves in summer and avoids PE", d: 0.45 },
  { c: "sr", t: "A student swears at you in front of the class", d: 0.4 },
  { c: "sr", t: "You feel shaken after a student discloses abuse", d: 0.1 },
  { c: "sr", t: "A parent angrily blames you for their child’s anxiety", d: 0.3 },
  { c: "sr", t: "A student cries uncontrollably and your next class is waiting", d: -0.1 },
  { c: "sr", t: "A colleague mocks a student’s panic attack in the staff room", d: -0.2 },
  { c: "rh", t: "A student asks you to promise not to tell anyone", d: 0.85 },
  { c: "rh", t: 'A student says they want to "just disappear"', d: 0.2 },
  { c: "rh", t: "The counsellor is on leave and a student discloses self-harm", d: 0.35 },
  { c: "rh", t: "A student reveals a friend is being hurt at home", d: -0.15 },
  { c: "rh", t: "A student’s online post hints at hopelessness", d: -0.25 },
  { c: "sf", t: "A student has a panic attack during an exam", d: -0.3 },
  { c: "sf", t: "A student threatens to jump from the school terrace", d: 0.3 },
  { c: "sf", t: "A student tells you they have taken extra pills", d: 0.45 },
  { c: "sf", t: "A fight breaks out and one student freezes completely", d: 0 },
  { c: "sf", t: "A student is hiding in the washroom, sobbing, and won’t come out", d: -0.2 },
];

export type BandKey = "ready" | "dev" | "emg" | "need";

export const BANDS: { k: BandKey; name: string; range: string }[] = [
  { k: "ready", name: "Ready", range: "30 to 50" },
  { k: "dev", name: "Developing", range: "10 to 25" },
  { k: "emg", name: "Emerging", range: "−10 to 5" },
  { k: "need", name: "Needs support", range: "−15 and below" },
];

export const band = (s: number): BandKey =>
  s >= 30 ? "ready" : s >= 10 ? "dev" : s >= -10 ? "emg" : "need";

export const GRADES = [
  "Pre-primary",
  "Primary (1–5)",
  "Middle (6–8)",
  "Secondary (9–10)",
  "Senior secondary (11–12)",
];

export type DimField = "grade" | "tenureBand" | "expBand" | "gender" | "train";

export interface Dim {
  f: DimField;
  label: string;
  order: string[];
}

export const DIMS: Dim[] = [
  { f: "grade", label: "Grade taught", order: GRADES },
  {
    f: "tenureBand",
    label: "Tenure at school",
    order: ["Under 2 years", "2 to 5 years", "6 to 10 years", "Over 10 years"],
  },
  {
    f: "expBand",
    label: "Total experience",
    order: ["Under 5 years", "5 to 10 years", "11 to 20 years", "Over 20 years"],
  },
  { f: "gender", label: "Gender", order: ["Female", "Male", "Prefer not to say"] },
  { f: "train", label: "Prior mental health training", order: ["Yes", "No", "Not recorded"] },
];

/** Groups smaller than this are never shown, so no one's answers can be singled out. */
export const MIN_GROUP = 10;

export type Scores = Record<CompKey, number>;

export interface TeacherInput {
  id: string;
  gender: string;
  grade: string;
  tenure: number;
  exp: number;
  train: string;
  /** Per-situation scores (10, 5, −5, −10), when the source has them. */
  items?: number[];
  /** Per-skill totals, when the source has no per-situation scores. */
  scores?: Scores;
}

export interface Teacher extends TeacherInput {
  scores: Scores;
  tenureBand: string;
  expBand: string;
  overall: number;
}

/* ---------- helpers ---------- */

export const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
/** Signed integer with a true minus sign: +12, −4, 0. */
export const sgn = (v: number) => {
  const r = Math.round(v);
  return (r > 0 ? "+" : r < 0 ? "−" : "") + Math.abs(r);
};
export const isGap = (t: Teacher) => CRISIS.some(k => t.scores[k] < 0);
export const tenureBand = (y: number) =>
  y < 2 ? "Under 2 years" : y <= 5 ? "2 to 5 years" : y <= 10 ? "6 to 10 years" : "Over 10 years";
export const expBand = (y: number) =>
  y < 5
    ? "Under 5 years"
    : y <= 10
      ? "5 to 10 years"
      : y <= 20
        ? "11 to 20 years"
        : "Over 20 years";

const emptyScores = (): Scores => ({ al: 0, rec: 0, sr: 0, rh: 0, sf: 0 });

export function finish(t: TeacherInput): Teacher {
  let scores = t.scores;
  if (!scores) {
    const summed = emptyScores();
    (t.items ?? []).forEach((v, i) => {
      summed[ITEMS[i].c] += v;
    });
    scores = summed;
  }
  return {
    ...t,
    scores,
    tenureBand: tenureBand(t.tenure),
    expBand: expBand(t.exp),
    overall: mean(COMPS.map(c => scores[c.key])),
  };
}

/* ---------- sample data ---------- */

/** mulberry32 — the same seeded stream the source report used. */
function rng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The 500-teacher sample cohort. Deterministic: same seed, same report. */
export function generate(): Teacher[] {
  const R = rng(20260928);
  const gauss = () => {
    let u = 0;
    let v = 0;
    while (!u) u = R();
    while (!v) v = R();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const pick = <T>(arr: T[], w: number[]): T => {
    let x = R() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < arr.length; i++) {
      x -= w[i];
      if (x <= 0) return arr[i];
    }
    return arr[arr.length - 1];
  };
  const out: Teacher[] = [];
  for (let i = 0; i < 500; i++) {
    const gender = pick(["Female", "Male", "Prefer not to say"], [71, 27, 2]);
    const grade = pick(GRADES, [12, 30, 24, 20, 14]);
    const exp = Math.min(38, Math.max(1, Math.round(Math.abs(gauss()) * 8 + R() * 6)));
    const tenure = Math.min(exp, Math.round(R() * exp * 0.7 + R() * 2));
    const train = R() < 0.28 ? "Yes" : "No";
    const g = gauss();
    const expEff = Math.min(exp, 20) * 0.02 - 0.2;
    const tenEff = Math.min(tenure, 10) * 0.01;
    const early = grade === GRADES[0] || grade === GRADES[1];
    const senior = grade === GRADES[3] || grade === GRADES[4];
    const ab = emptyScores();
    COMPS.forEach(c => {
      let a = c.base + 0.45 * g + 0.4 * gauss() + expEff + tenEff;
      if (train === "Yes") a += CRISIS.includes(c.key) ? 0.45 : 0.15;
      if (early) {
        if (c.key === "rec") a += 0.2;
        if (c.key === "rh") a -= 0.15;
      }
      if (senior) {
        if (c.key === "rh") a += 0.1;
        if (c.key === "sr") a -= 0.12;
      }
      ab[c.key] = a;
    });
    const items = ITEMS.map(it => {
      const s = ab[it.c] - it.d + gauss() * 0.75;
      return s > 0.7 ? 10 : s > -0.1 ? 5 : s > -0.9 ? -5 : -10;
    });
    out.push(
      finish({
        id: "T" + String(i + 1).padStart(3, "0"),
        gender,
        grade,
        tenure,
        exp,
        train,
        items,
      }),
    );
  }
  return out;
}

/* ---------- filtering ---------- */

export type Filters = Partial<Record<DimField, string>>;

/** A dimension's values present in the data: known ones in their natural order, then any others A–Z. */
export function orderFor(data: Teacher[], dim: Dim): string[] {
  const present = new Set(data.map(t => t[dim.f]));
  const known = dim.order.filter(v => present.has(v));
  const extra = [...present].filter(v => !dim.order.includes(v)).sort();
  return known.concat(extra);
}

export function applyFilters(data: Teacher[], filters: Filters): Teacher[] {
  return data.filter(t =>
    DIMS.every(d => {
      const v = filters[d.f];
      return !v || v === "all" || t[d.f] === v;
    }),
  );
}

/* ---------- stats ---------- */

export interface CompStat extends Comp {
  mean: number;
  counts: Record<BandKey, number>;
  values: number[];
}

export function compStats(list: Teacher[]): CompStat[] {
  return COMPS.map(c => {
    const values = list.map(t => t.scores[c.key]);
    const counts: Record<BandKey, number> = { ready: 0, dev: 0, emg: 0, need: 0 };
    values.forEach(s => counts[band(s)]++);
    return { ...c, mean: mean(values), counts, values };
  });
}

export interface ScenarioStat extends Item {
  i: number;
  avg: number;
  best: number;
  ok: number;
  poor: number;
  harm: number;
}

/** Every situation's answer mix, hardest (lowest average) first. */
export function scenarioStats(list: Teacher[]): ScenarioStat[] {
  const n = list.length;
  return ITEMS.map((it, i) => {
    const c: Record<string, number> = { 10: 0, 5: 0, "-5": 0, "-10": 0 };
    list.forEach(t => {
      const v = t.items?.[i];
      if (v !== undefined && v in c) c[v]++;
    });
    return {
      ...it,
      i,
      avg: mean(list.map(t => t.items?.[i] ?? 0)),
      best: c[10] / n,
      ok: c[5] / n,
      poor: c[-5] / n,
      harm: c[-10] / n,
    };
  }).sort((a, b) => a.avg - b.avg);
}

export interface Action {
  h: string;
  p: string;
}

/**
 * The prioritised "what to do next" list for the selected teachers. `all` is
 * the whole loaded cohort: groups are enumerated from it, as in the source.
 */
export function buildActions(
  list: Teacher[],
  cs: CompStat[],
  hasItems: boolean,
  all: Teacher[],
): Action[] {
  const n = list.length;
  const weak = [...cs].sort((a, b) => a.mean - b.mean);
  const gap = list.filter(isGap).length;
  const items: Action[] = [];

  items.push({
    h: `Build ${weak[0].name.toLowerCase()} first`,
    p: `It has the lowest average score (${sgn(weak[0].mean)}), with ${pct(weak[0].counts.need, n)}% of teachers needing support. ${weak[0].act}`,
  });
  if (gap)
    items.push({
      h: `Put the ${gap} teachers with a crisis gap into the next training cycle`,
      p: "They scored below zero on risk and handoff or safety first response. Until they are trained, make sure every one of them knows the name and number of the person to call.",
    });

  if (hasItems) {
    const hard = scenarioStats(list)[0];
    items.push({
      h: "Use the hardest situation as a staff discussion",
      p: `Only ${Math.round(hard.best * 100)}% chose the best response to "${hard.t.toLowerCase()}", and ${Math.round(hard.harm * 100)}% chose a harmful one. Walk through it together at the next staff meeting.`,
    });
  }

  const crisisMean = (g: Teacher[]) => mean(g.map(t => (t.scores.rh + t.scores.sf) / 2));
  let worst: { d: Dim; v: string; m: number; n: number } | null = null;
  const base = crisisMean(list);
  DIMS.forEach(d =>
    orderFor(all, d).forEach(v => {
      const g = list.filter(t => t[d.f] === v);
      if (g.length < MIN_GROUP || g.length === n) return;
      const m = crisisMean(g);
      if (!worst || m < worst.m) worst = { d, v, m, n: g.length };
    }),
  );
  const w = worst as { d: Dim; v: string; m: number; n: number } | null;
  if (w && w.m < base - 2)
    items.push({
      h: `Give extra support to one group: ${w.d.label.toLowerCase()}, ${w.v.toLowerCase()}`,
      p: `These ${w.n} teachers average ${sgn(w.m)} on the crisis skills, against ${sgn(base)} for everyone selected.`,
    });

  if (weak[1]) items.push({ h: `Then strengthen ${weak[1].name.toLowerCase()}`, p: weak[1].act });

  return items;
}

/* ---------- CSV ---------- */

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let f = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      row.push(f);
      f = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(f);
      rows.push(row);
      row = [];
      f = "";
    } else f += ch;
  }
  if (f !== "" || row.length) {
    row.push(f);
    rows.push(row);
  }
  return rows.filter(r => r.some(x => x.trim() !== ""));
}

export type LoadResult =
  | { ok: true; data: Teacher[]; hasItems: boolean; skipped: number }
  | { ok: false; error: string };

/** Reads a school's own results file into teachers, or explains what is wrong with it. */
export function loadCSV(text: string): LoadResult {
  const rows = parseCSV(text.replace(/^\uFEFF/, ""));
  if (rows.length < 2)
    return {
      ok: false,
      error: "This file has no data rows. Check that it has a header row and one row per teacher.",
    };
  const hdr = rows[0].map(h =>
    h
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_"),
  );
  const ix = (k: string) => hdr.indexOf(k);
  const hasItems = ITEMS.every((_, i) => ix("q" + (i + 1)) >= 0);
  const hasComps = COMPS.every(c => ix(c.col) >= 0);
  const missing = ["gender", "grade", "tenure_years", "experience_years"].filter(k => ix(k) < 0);
  if (!hasComps && !hasItems) missing.push("the five skill columns or q1 to q25");
  if (missing.length)
    return {
      ok: false,
      error:
        "Missing columns: " +
        missing.join(", ") +
        ". Check the header row matches the format above.",
    };

  const out: Teacher[] = [];
  let skipped = 0;
  rows.slice(1).forEach((r, ri) => {
    const g = (k: string) => (r[ix(k)] || "").trim();
    const num = (k: string) => Number(g(k).replace("−", "-"));
    const t: TeacherInput = {
      id: ix("teacher_id") >= 0 ? g("teacher_id") : "R" + (ri + 1),
      gender: g("gender") || "Not recorded",
      grade: g("grade") || "Not recorded",
      tenure: num("tenure_years"),
      exp: num("experience_years"),
      train: ix("prior_training") >= 0 ? g("prior_training") || "Not recorded" : "Not recorded",
    };
    // The source matched "Not recorded" as a "no" here, counting teachers with
    // no training data as untrained; the sentinel is excluded first.
    if (t.train !== "Not recorded") {
      if (/^y/i.test(t.train)) t.train = "Yes";
      else if (/^n(o|$)/i.test(t.train)) t.train = "No";
    }
    if (!isFinite(t.tenure) || !isFinite(t.exp)) {
      skipped++;
      return;
    }
    if (hasItems) {
      t.items = ITEMS.map((_, i) => num("q" + (i + 1)));
      if (t.items.some(v => ![10, 5, -5, -10].includes(v))) {
        skipped++;
        return;
      }
    }
    if (hasComps && !hasItems) {
      const scores = emptyScores();
      let bad = false;
      COMPS.forEach(c => {
        const v = num(c.col);
        if (!isFinite(v) || v < -50 || v > 50) bad = true;
        scores[c.key] = v;
      });
      if (bad) {
        skipped++;
        return;
      }
      t.scores = scores;
    }
    out.push(finish(t));
  });

  if (out.length < MIN_GROUP)
    return {
      ok: false,
      error: `Only ${out.length} valid rows found. The report needs at least ${MIN_GROUP} teachers.`,
    };
  return { ok: true, data: out, hasItems, skipped };
}
