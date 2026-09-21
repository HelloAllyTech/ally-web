/* ============================================================
   Every word on /SJT1, in one place.

   The page's copy is the product here — the scenarios, the four
   options and above all the reasoning behind each one are what a
   teacher takes away, and they are explicitly unvalidated (see
   sjtData.ts). So the text is modelled as data rather than
   hardcoded in JSX: /SJT1 renders the defaults below, and
   /SJT1/edit lets a reviewer rewrite any of it in place, in this
   browser, and export the result for someone to commit.

   Shape: one flat-ish object of strings. Every leaf is addressed
   by a dotted path ("intro.lede", "items.3.options.b.why"), which
   is what an override is keyed by — so a stored edit says exactly
   which sentence it replaces, survives an unrelated reword
   elsewhere, and can be reverted on its own.

   Strings holding {tokens} are filled at render time (see
   fillNodes in SjtCopyContext). A token that goes missing renders
   as itself rather than crashing, and the editor flags it.
   ============================================================ */

import { DEFAULT_BAND_NAMES, BandNames } from "./scoring";
import { DOMAINS, DomainCode, ITEMS, OPTION_IDS, OptionId, RANK_LABELS } from "./sjtData";

export interface SjtOptionCopy {
  text: string;
  why: string;
}

export interface SjtItemCopy {
  phase: string;
  setting: string;
  scenario: string;
  options: Record<OptionId, SjtOptionCopy>;
}

export interface SjtDomainCopy {
  label: string;
  blurb: string;
}

export interface SjtCopy {
  meta: {
    title: string;
    description: string;
  };
  rail: {
    label: string;
  };
  intro: {
    eyebrow: string;
    headingTop: string;
    headingBottom: string;
    headingAccent: string;
    lede: string;
    howLabel: string;
    howBody: string;
    howBodyTwo: string;
    areasLabel: string;
    startLabel: string;
    note: string;
  };
  question: {
    instruct: string;
    /** `{remaining}` — options still to be ranked. */
    remaining: string;
    nextLabel: string;
    finishLabel: string;
    clearLabel: string;
    backLabel: string;
    hint: string;
  };
  results: {
    eyebrow: string;
    lede: string;
    byAreaLabel: string;
    /** `{pct}`, `{count}`, `{items}` — the last being itemWord/itemsWord. */
    areaMeta: string;
    itemWord: string;
    itemsWord: string;
    attentionLabel: string;
    /** `{strongest}`, `{strongestPct}`, `{weakest}`, `{weakestPct}`. */
    attentionBody: string;
    attentionRehearse: string;
    /** `{areas}` — how many areas rest on only two scenarios. */
    attentionHint: string;
    scenariosLabel: string;
    restartLabel: string;
    note: string;
  };
  review: {
    keyLabel: string;
    youLabel: string;
    /** `{domain}`, `{pct}`. */
    meta: string;
    openLabel: string;
    hideLabel: string;
  };
  bands: BandNames;
  /** Best → worst, shown on a ranked option. */
  rankLabels: string[];
  domains: Record<DomainCode, SjtDomainCopy>;
  /** Keyed by `SjtItem.id` as a string, because a path segment is a string. */
  items: Record<string, SjtItemCopy>;
}

const itemDefaults = (): SjtCopy["items"] =>
  Object.fromEntries(
    ITEMS.map(item => [
      String(item.id),
      {
        phase: item.phase,
        setting: item.setting,
        scenario: item.scenario,
        options: Object.fromEntries(
          OPTION_IDS.map(id => [id, { text: item.options[id].text, why: item.options[id].why }]),
        ) as Record<OptionId, SjtOptionCopy>,
      },
    ]),
  );

const domainDefaults = (): SjtCopy["domains"] =>
  Object.fromEntries(
    Object.values(DOMAINS).map(domain => [
      domain.code,
      { label: domain.label, blurb: domain.blurb },
    ]),
  ) as SjtCopy["domains"];

export const DEFAULT_COPY: SjtCopy = {
  meta: {
    title: "Everyday conversations | Ally",
    description:
      "A situational judgement self-check for teachers: ten everyday conversations about " +
      "children's mental health, and the reasoning behind every response.",
  },
  rail: {
    label: "Everyday conversations",
  },
  intro: {
    eyebrow: "Self-check · 10 scenarios · about 12 minutes",
    headingTop: "Everyday",
    headingBottom: "conversations",
    headingAccent: ".",
    lede:
      "Most of what a school does for children's mental health happens in thirty-second " +
      "exchanges — at the door, in a corridor, while books are being handed out. This checks the " +
      "judgement you use in those moments.",
    howLabel: "How it works",
    howBody:
      "Each scenario has four things a teacher could say. Tap them in order, starting with the " +
      "one you think is best and ending with the one you think is worst. There's no time limit, " +
      "and nothing you choose is sent anywhere — your answers stay in this browser, so if you " +
      "stop halfway they'll be waiting when you come back.",
    howBodyTwo:
      "Afterwards you'll get a score against four areas of practice, plus the reasoning behind " +
      "every option — including the ones you ranked low. That reasoning is the point; the number " +
      "is just a way in.",
    areasLabel: "The four areas",
    startLabel: "Start the first scenario",
    note:
      "Prototype. The “consensus” rankings here were written to be defensible, not validated — " +
      "before any real use they need review by a panel (safeguarding lead, school counsellor, " +
      "EP) and piloting for item difficulty and discrimination. Nothing here replaces your " +
      "school's safeguarding policy: anything that worries you goes to your DSL today, not after " +
      "a self-assessment.",
  },
  question: {
    instruct: "Tap in order, best first.",
    remaining: "{remaining} left",
    nextLabel: "Next scenario",
    finishLabel: "See my results",
    clearLabel: "Clear order",
    backLabel: "Previous",
    hint: "Tap an option again to take it out of the order.",
  },
  results: {
    eyebrow: "Your results · 10 scenarios",
    lede:
      "This is how closely your ordering matched the panel's, averaged across all four areas. " +
      "Partial credit is given for near-misses, so the interesting detail is below, not here.",
    byAreaLabel: "By area of practice",
    areaMeta: "{pct}% · {count} {items}",
    itemWord: "item",
    itemsWord: "items",
    attentionLabel: "Where to put your attention",
    attentionBody:
      "Your strongest area was {strongest} ({strongestPct}%). The one with most room is " +
      "{weakest} ({weakestPct}%).",
    attentionRehearse:
      "Pick one scenario below where your order differed most, and decide now what you'd " +
      "actually say next time — a sentence you'd be willing to use on Monday. Judgement in " +
      "these moments improves by rehearsing wording, not by knowing the theory.",
    attentionHint:
      "With {areas} areas covered by only two scenarios each, treat the area scores as prompts " +
      "for reflection rather than measurements.",
    scenariosLabel: "Scenario by scenario",
    restartLabel: "Start again",
    note:
      "Prototype only — not a validated measure of competence, and not a record anyone else can " +
      "see. If a real conversation has left you worried about a child, that goes to your " +
      "designated safeguarding lead today.",
  },
  review: {
    keyLabel: "Key",
    youLabel: "You",
    meta: "{domain} · match {pct}%",
    openLabel: "Open",
    hideLabel: "Hide",
  },
  bands: { ...DEFAULT_BAND_NAMES },
  rankLabels: [...RANK_LABELS],
  domains: domainDefaults(),
  items: itemDefaults(),
};

/** Every editable leaf, as a dotted path, in the order the model declares them. */
const leafPaths = (value: unknown, prefix = ""): string[] => {
  if (typeof value === "string") return [prefix];
  if (Array.isArray(value)) return value.flatMap((entry, i) => leafPaths(entry, `${prefix}.${i}`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      leafPaths(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [];
};

export const COPY_PATHS: string[] = leafPaths(DEFAULT_COPY);

const COPY_PATH_SET = new Set(COPY_PATHS);

export const isCopyPath = (path: string): boolean => COPY_PATH_SET.has(path);

/** Reads one leaf. An unknown path yields "" rather than throwing — a missing
 * word is a bad page, a crash is no page. */
export const readCopy = (copy: SjtCopy, path: string): string => {
  const value = path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined,
      copy,
    );
  return typeof value === "string" ? value : "";
};

const setAt = (target: SjtCopy, path: string, value: string): void => {
  const keys = path.split(".");
  const last = keys.pop();
  if (!last) return;

  const parent = keys.reduce<unknown>(
    (node, key) =>
      node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined,
    target,
  );
  if (!parent || typeof parent !== "object") return;

  const holder = parent as Record<string, unknown>;
  // Only ever replace a string that already exists: an override can reword the
  // page, never add a field the components don't render.
  if (typeof holder[last] === "string") holder[last] = value;
};

/** The defaults with a reviewer's overrides applied. Unknown paths are ignored. */
export const mergeCopy = (overrides: Record<string, string>): SjtCopy => {
  const merged = structuredClone(DEFAULT_COPY);
  Object.entries(overrides).forEach(([path, value]) => {
    if (isCopyPath(path) && typeof value === "string") setAt(merged, path, value);
  });
  return merged;
};

/** `{token}` placeholders in a string, in order, e.g. ["{pct}", "{count}"]. */
export const tokensOf = (value: string): string[] => value.match(/\{[a-zA-Z]+\}/g) ?? [];

/**
 * True when an edit dropped or renamed a placeholder the default carried —
 * which is the one way to break a line rather than merely reword it.
 */
export const hasTokenDrift = (path: string, value: string): boolean => {
  const expected = tokensOf(readCopy(DEFAULT_COPY, path));
  if (expected.length === 0) return false;
  const present = new Set(tokensOf(value));
  return expected.some(token => !present.has(token));
};

const SECTION_LABELS: Record<string, string> = {
  meta: "Page meta",
  rail: "Progress rail",
  intro: "Intro screen",
  question: "Scenario screen",
  results: "Results screen",
  review: "Scenario breakdown",
  bands: "Score bands",
  rankLabels: "Rank labels",
  domains: "Areas of practice",
  items: "Scenarios",
};

const humanise = (key: string): string =>
  key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .trim();

/**
 * A path as a person would say it — the accessible name of an editable field,
 * and how a change reads in the editor's list of edits.
 */
export const describePath = (path: string): string => {
  const [head, ...rest] = path.split(".");

  if (head === "items") {
    const [id, field, optionId, optionField] = rest;
    if (field === "options") {
      return `Scenario ${id} · option ${(optionId ?? "").toUpperCase()} ${
        optionField === "why" ? "reasoning" : "text"
      }`;
    }
    return `Scenario ${id} · ${humanise(field ?? "")}`;
  }

  if (head === "domains") return `Area ${rest[0]} · ${humanise(rest[1] ?? "")}`;
  if (head === "rankLabels") return `Rank label ${Number(rest[0]) + 1}`;

  return `${SECTION_LABELS[head] ?? humanise(head)} · ${rest.map(humanise).join(" ")}`.trim();
};

/** The section a path belongs to, for grouping the editor's list of edits. */
export const sectionOf = (path: string): string => {
  const head = path.split(".")[0];
  return SECTION_LABELS[head] ?? humanise(head);
};
