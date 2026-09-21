import type { AgentBuilderSpokenLanguage, AgentBuilderVoicePick } from "@api";
import { buildGroupedVoiceOptions } from "@constants/voiceProviders";

/**
 * Fallback selection of a Language–Voice mapping for the languages Agent
 * Builder Copilot generated content for.
 *
 * Generating Hindi opening dialogues does not make a simulation runnable in
 * Hindi: the learner's language list comes from `languageVoices`, and publish
 * is blocked until every mapped language has a voice. So once the copilot knows
 * both the spoken languages and the persona, it fills that mapping in too.
 *
 * The *primary* cast is the `language_voices` field — an LLM call that reads
 * the brief and the persona and picks per language. This module covers what
 * that call doesn't: a language it skipped, an id it invented (the server drops
 * those), or the whole call failing. It delegates to `buildGroupedVoiceOptions`
 * — the same ordering the Language–Voice picker renders — and takes the top
 * option, so the fallback is exactly "the first voice the dropdown would have
 * shown you for this persona" rather than a third, private notion of a good
 * voice that could drift from the one on screen.
 */

/** A catalog language with its voices, as `getAvailableLanguageVoices` returns it. */
export interface VoiceCatalogLanguage {
  language_id: number;
  label?: string;
  voices?: Array<{
    id: string;
    name: string;
    provider?: string;
    gender?: string | null;
    age?: string | null;
  }>;
}

export interface VoicePick {
  languageId: string;
  languageLabel: string;
  voiceId: string;
  voiceName: string;
  /** How this voice was chosen, for the wizard feed. */
  source: "cast" | "fallback";
  /**
   * False when the persona's gender is known and the chosen voice's gender is
   * a different one — the language simply has no matching voice. Surfaced in
   * the wizard feed rather than silently accepted, since a female client
   * speaking in a male voice is the kind of thing nobody notices until they
   * listen to a call.
   */
  genderMatched: boolean;
}

export interface PickVoicesArgs {
  languages: AgentBuilderSpokenLanguage[];
  catalog: VoiceCatalogLanguage[];
  personaGender?: string | null;
  personaAge?: string | number | null;
  /** Whatever the form already holds, so a trainer's own pick is never moved. */
  existingLanguageVoices?: Record<string, string>;
}

/**
 * One voice per generated language that doesn't already have one. Languages
 * absent from the catalog, or with no voices at all, are skipped rather than
 * mapped to nothing.
 */
export const pickVoicesForLanguages = ({
  languages,
  catalog,
  personaGender,
  personaAge,
  existingLanguageVoices = {},
}: PickVoicesArgs): VoicePick[] => {
  const byId = new Map(catalog.map(lang => [String(lang.language_id), lang]));
  const wantedGender = String(personaGender ?? "")
    .trim()
    .toLowerCase();

  return languages.flatMap<VoicePick>(language => {
    const languageId = String(language.languageId);
    if (existingLanguageVoices[languageId]) return [];

    const catalogLanguage = byId.get(languageId);
    const voices = catalogLanguage?.voices ?? [];
    if (voices.length === 0) return [];

    const [top] = buildGroupedVoiceOptions(voices, personaGender, personaAge);
    if (!top?.value) return [];

    const chosen = voices.find(voice => voice.id === top.value);
    const chosenGender = String(chosen?.gender ?? "")
      .trim()
      .toLowerCase();

    return [
      {
        languageId,
        languageLabel: catalogLanguage?.label ?? language.label,
        voiceId: top.value,
        voiceName: chosen?.name ?? top.label,
        source: "fallback",
        // An unrecorded voice gender isn't a mismatch — it's unknown, and the
        // picker already ranks it ahead of a deliberate mismatch.
        genderMatched: !wantedGender || !chosenGender || chosenGender === wantedGender,
      },
    ];
  });
};

/** Whether a voice's gender contradicts the persona's (blank is unknown, not wrong). */
export const isGenderMatched = (
  voiceGender?: string | null,
  personaGender?: string | null,
): boolean => {
  const wanted = String(personaGender ?? "")
    .trim()
    .toLowerCase();
  const actual = String(voiceGender ?? "")
    .trim()
    .toLowerCase();
  return !wanted || !actual || wanted === actual;
};

/**
 * Turn the server's cast picks into the shared shape, so the LLM cast and the
 * fallback render through one path.
 */
export const toCastPicks = (
  cast: AgentBuilderVoicePick[],
  personaGender?: string | null,
): VoicePick[] =>
  cast.map(pick => ({
    languageId: String(pick.languageId),
    languageLabel: pick.languageLabel,
    voiceId: pick.voiceId,
    voiceName: pick.voiceName,
    source: "cast" as const,
    genderMatched: isGenderMatched(pick.voiceGender, personaGender),
  }));

/** Feed summary: `English (India) → Anushka, Hindi (India) → Abhilash (no female voice)`. */
export const describeVoicePicks = (picks: VoicePick[], personaGender?: string | null): string => {
  const gender = String(personaGender ?? "")
    .trim()
    .toLowerCase();
  return picks
    .map(pick => {
      const notes = [
        pick.genderMatched ? "" : `no ${gender} voice`,
        // Worth saying: it means the cast call didn't answer for this language,
        // so the voice is the picker's default rather than a considered choice.
        pick.source === "fallback" ? "default pick" : "",
      ].filter(Boolean);
      const suffix = notes.length > 0 ? ` (${notes.join(", ")})` : "";
      return `${pick.languageLabel} → ${pick.voiceName}${suffix}`;
    })
    .join(", ");
};
