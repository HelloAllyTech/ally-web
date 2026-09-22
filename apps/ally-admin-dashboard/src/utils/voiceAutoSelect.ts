import {
  VoiceAge,
  genderMatchRank,
  getProviderLabel,
  toVoiceAgeBand,
} from "@constants/voiceProviders";

/**
 * Choosing a voice for a persona, from what the simulation already knows.
 *
 * A simulation's `languageVoices` map is what makes it runnable — publish is
 * blocked until a language has a voice, and a language with no entry is simply
 * not offered to the learner. Filling it by hand meant opening one dropdown per
 * language and reading provider names, for a decision the form already has the
 * inputs to make: the persona carries a gender and an age, and every voice in
 * the catalog carries the same two fields.
 *
 * So this picks, and the author changes what they disagree with. Deliberately
 * heuristic and deterministic — the same persona against the same catalog
 * always yields the same cast, which a model call could not promise and which
 * matters when an author re-opens a simulation and expects to see what they
 * saw last time. The Agent Builder Copilot's LLM cast still runs on its own
 * path and takes precedence; this is what fills the rest.
 *
 * Ordering here is NOT the picker's ordering, on purpose.
 * `buildGroupedVoiceOptions` sorts provider above age because its groups are
 * labelled "Provider · Gender" and splitting one renders its header twice — a
 * rendering constraint, not a claim that the vendor matters more than whether
 * the voice sounds the persona's age. Taking that list's first entry (what the
 * copilot fallback used to do) therefore picked alphabetically-first-provider
 * and let age break ties only within that one group. Here age ranks directly
 * under gender, and provider is only a tie-break.
 */

/** A catalog voice, as `getAvailableLanguageVoices` returns it. */
export interface SelectableVoice {
  id: string;
  name: string;
  provider?: string;
  gender?: string | null;
  age?: string | null;
}

export interface PersonaVoiceTraits {
  gender?: string | null;
  /** The studio stores a number; a voice carries a band. */
  age?: string | number | null;
}

export interface VoiceSelection {
  voice: SelectableVoice;
  /** False only when both genders are known and differ — the language has no matching voice. */
  genderMatched: boolean;
  /** False only when both ages are known and land in different bands. */
  ageMatched: boolean;
}

/** Bands in order, so "one band out" can be told from "the other end of the scale". */
const AGE_ORDER: VoiceAge[] = [
  VoiceAge.CHILD,
  VoiceAge.TEEN,
  VoiceAge.YOUNG_ADULT,
  VoiceAge.ADULT,
  VoiceAge.SENIOR,
];

/**
 * Where an unrecorded voice age sits: worse than the neighbouring band, better
 * than one two bands out.
 *
 * Most catalog rows still carry no age — it is hand-entered and optional — so
 * treating "not recorded" as a mismatch would rank almost the whole catalog
 * below the handful of tagged voices, and a wrongly-tagged one would win every
 * time. An unknown age is unknown, not wrong.
 */
const UNKNOWN_AGE_DISTANCE = 1.5;

/**
 * How many bands separate a voice from the persona, or 0 when the persona has
 * no usable age (nothing to prefer, so nothing to penalise).
 */
export const voiceAgeDistance = (
  voiceAge?: string | null,
  personaAge?: string | number | null,
): number => {
  const wanted = toVoiceAgeBand(personaAge);
  if (!wanted) return 0;
  const actual = toVoiceAgeBand(voiceAge);
  if (!actual) return UNKNOWN_AGE_DISTANCE;
  return Math.abs(AGE_ORDER.indexOf(actual) - AGE_ORDER.indexOf(wanted));
};

/**
 * The best voice for a persona out of one language's voices, or null when the
 * language has none.
 *
 * Nothing is excluded: if the only Hindi voices are male and the persona is
 * female, a male voice is still returned — an unvoiced language is worse than
 * an imperfectly voiced one, and the mismatch is reported rather than hidden so
 * the author can act on it.
 */
export const pickVoiceForLanguage = (
  voices: SelectableVoice[] = [],
  { gender, age }: PersonaVoiceTraits = {},
): VoiceSelection | null => {
  const ranked = voices
    .filter(voice => !!voice?.id)
    .map(voice => ({
      voice,
      genderRank: genderMatchRank(voice.gender, gender),
      ageDistance: voiceAgeDistance(voice.age, age),
      providerLabel: getProviderLabel(voice.provider),
    }))
    .sort(
      (a, b) =>
        a.genderRank - b.genderRank ||
        a.ageDistance - b.ageDistance ||
        // Beyond this point nothing distinguishes the voices on the persona's
        // terms, so the remaining keys exist only to make the answer stable:
        // a catalog re-order must not silently re-cast a simulation.
        a.providerLabel.localeCompare(b.providerLabel) ||
        a.voice.name.localeCompare(b.voice.name) ||
        a.voice.id.localeCompare(b.voice.id),
    );

  const best = ranked[0];
  if (!best) return null;

  const wantedAge = toVoiceAgeBand(age);
  const actualAge = toVoiceAgeBand(best.voice.age);

  return {
    voice: best.voice,
    genderMatched: best.genderRank === 0,
    ageMatched: !wantedAge || !actualAge || wantedAge === actualAge,
  };
};

export interface AutoSelectLanguage {
  language_id: number | string;
  label?: string;
  voices?: SelectableVoice[];
}

export interface AutoSelectArgs {
  languages: AutoSelectLanguage[];
  persona?: PersonaVoiceTraits;
  /** Already-chosen voices, keyed by language id. Never overwritten. */
  existing?: Record<string, string>;
}

export interface AutoSelectedVoice {
  languageId: string;
  languageLabel: string;
  voiceId: string;
  voiceName: string;
  genderMatched: boolean;
  ageMatched: boolean;
}

/**
 * One voice per language that doesn't already have one.
 *
 * Languages with no voices are skipped rather than mapped to nothing, and an
 * existing entry — an author's pick, a character's, the copilot's, or one
 * loaded from a saved simulation — is left exactly as it is.
 */
export const autoSelectLanguageVoices = ({
  languages,
  persona,
  existing = {},
}: AutoSelectArgs): AutoSelectedVoice[] =>
  languages.flatMap<AutoSelectedVoice>(language => {
    const languageId = String(language.language_id);
    if (existing[languageId]) return [];

    const selection = pickVoiceForLanguage(language.voices ?? [], persona);
    if (!selection) return [];

    return [
      {
        languageId,
        languageLabel: language.label ?? languageId,
        voiceId: selection.voice.id,
        voiceName: selection.voice.name,
        genderMatched: selection.genderMatched,
        ageMatched: selection.ageMatched,
      },
    ];
  });

export interface ResolveAutoCastArgs {
  languages: AutoSelectLanguage[];
  /** The form's current `languageVoices`. */
  current: Record<string, string>;
  /** What a previous pass of this cast wrote, so its own picks are recognisable. */
  alreadyCast: Record<string, string>;
  /** Languages whose voice the author cleared, which is how a language is removed. */
  dismissed: Set<string>;
  persona?: PersonaVoiceTraits;
}

export interface AutoCastResult {
  /** The full replacement map to write into the form. */
  next: Record<string, string>;
  picks: AutoSelectedVoice[];
}

/**
 * Whether to re-cast, and to what — the whole decision, so it can be reasoned
 * about without a React tree around it. Returns null to mean "leave the form
 * exactly as it is".
 *
 * The one rule worth stating plainly: the moment the map holds a voice this
 * cast did not write, the cast steps back entirely. That voice came from a
 * saved simulation, a character, the copilot or the author, and in all four
 * cases the languages *missing* from that map are missing deliberately —
 * enabling them would put a simulation in front of learners in languages
 * somebody had decided against.
 */
export const resolveAutoCast = ({
  languages,
  current,
  alreadyCast,
  dismissed,
  persona,
}: ResolveAutoCastArgs): AutoCastResult | null => {
  if (languages.length === 0) return null;

  const isAuthored = Object.entries(current).some(
    ([languageId, voiceId]) => voiceId && alreadyCast[languageId] !== voiceId,
  );
  if (isAuthored) return null;

  const picks = autoSelectLanguageVoices({ languages, persona }).filter(
    pick => !dismissed.has(pick.languageId),
  );
  const next = Object.fromEntries(picks.map(pick => [pick.languageId, pick.voiceId]));

  // Both maps are built from the same language order, so a string compare is
  // enough to stop this re-entering through its own write.
  if (JSON.stringify(next) === JSON.stringify(current)) return null;

  return { next, picks };
};
