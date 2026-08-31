/**
 * Ally writes the debrief as one continuous note, but marks its structure with
 * machine keys on their own line — `## [what_worked]` — rather than with
 * written headings. The keys are deliberately not human text: the note body is
 * generated in the learner's own language, so a heading the model translated
 * could never be matched here. The app owns the visible label and pulls it from
 * i18n, which also keeps the debrief's headings consistent with the rest of the
 * screen.
 *
 * Every note stored before this existed carries no keys at all, and a live
 * generation can always drift. Both degrade the same way: the note falls back
 * to one unlabelled block of prose, exactly as it rendered before sections.
 */

/** Keys carrying a visible heading, in the order Ally is told to write them. */
export const LABELLED_SECTION_KEYS = ["what_worked", "what_it_cost", "try_next"] as const;

/**
 * `closing` is a structural marker, not a heading — the note ends by inviting a
 * reply, and that invitation is not part of "Try this next". Without the marker
 * the closing sentence renders underneath the last heading, which reads as
 * though replying were the thing Ally asked them to practise.
 */
export const SECTION_KEYS = [...LABELLED_SECTION_KEYS, "closing"] as const;

export type DebriefSectionKey = (typeof SECTION_KEYS)[number];

export interface DebriefSection {
  /**
   * `null` for the note's unlabelled opening — the greeting, the callback to
   * their last session, and the live note carried forward — and for the whole
   * note when it carries no keys.
   */
  key: DebriefSectionKey | null;
  paragraphs: string[];
}

/**
 * Deliberately forgiving about everything except the key itself. The prompt
 * asks for `## [what_worked]`, but a model that drops the `##`, bolds the line,
 * loses the brackets, adds a colon or shifts case has still told us exactly
 * which section it means — and refusing that spelling would cost the learner a
 * whole section of their debrief.
 */
const SECTION_HEADING = new RegExp(
  `^\\s*(?:#{1,6}\\s*)?(?:\\*\\*|__)?\\s*\\[?\\s*(${SECTION_KEYS.join("|")})\\s*\\]?\\s*(?:\\*\\*|__)?\\s*:?\\s*$`,
  "i",
);

/**
 * The same key when the model wrote it inline instead of on a line of its own —
 * `## [what_worked] You effectively acknowledged…`. The prompt is explicit that
 * a marker line carries nothing but the marker, but this is the drift that
 * actually reached learners, and the honest fallback for it is the section
 * heading rather than a machine key left sitting in the prose. Brackets are
 * required here, unlike SECTION_HEADING: mid-prose the brackets are the only
 * thing separating a marker from a sentence that happens to open with a word
 * like "closing".
 */
const INLINE_SECTION_HEADING = new RegExp(
  `^\\s*(?:#{1,6}\\s*)?(?:\\*\\*|__)?\\s*\\[\\s*(${SECTION_KEYS.join("|")})\\s*\\]\\s*(?:\\*\\*|__)?\\s*:?\\s*`,
  "i",
);

export const isLabelledSectionKey = (
  key: DebriefSectionKey | null,
): key is (typeof LABELLED_SECTION_KEYS)[number] =>
  key !== null && (LABELLED_SECTION_KEYS as readonly string[]).includes(key);

/**
 * Split a note into its sections, preserving paragraph breaks within each.
 *
 * Parses line by line rather than splitting on blank lines first, because a
 * heading and its first paragraph usually arrive in the same block with only a
 * single newline between them.
 */
export const parseDebriefSections = (note: string): DebriefSection[] => {
  const sections: DebriefSection[] = [];
  let key: DebriefSectionKey | null = null;
  let paragraphs: string[] = [];
  let lines: string[] = [];

  const flushParagraph = () => {
    const paragraph = lines.join("\n").trim();
    if (paragraph) paragraphs.push(paragraph);
    lines = [];
  };

  const flushSection = () => {
    flushParagraph();
    // A heading with nothing under it is dropped rather than rendered as a bare
    // label. The prompt tells Ally to omit a section it cannot support, so an
    // empty one means drift, and a lone heading looks like a failed load.
    if (paragraphs.length) {
      // Ally is told to use each key at most once; if one repeats anyway, fold
      // it into the section already on screen instead of showing the same
      // heading twice.
      const existing = key === null ? undefined : sections.find(section => section.key === key);
      if (existing) existing.paragraphs.push(...paragraphs);
      else sections.push({ key, paragraphs });
    }
    paragraphs = [];
  };

  for (const line of note.split("\n")) {
    const heading = line.match(SECTION_HEADING);
    if (heading) {
      flushSection();
      key = heading[1].toLowerCase() as DebriefSectionKey;
      continue;
    }
    const inline = line.match(INLINE_SECTION_HEADING);
    if (inline) {
      flushSection();
      key = inline[1].toLowerCase() as DebriefSectionKey;
      lines.push(line.slice(inline[0].length));
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      continue;
    }
    lines.push(line);
  }
  flushSection();

  return sections;
};
