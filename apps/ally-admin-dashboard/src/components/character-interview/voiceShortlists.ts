import type { CharacterInterviewChatMessage, CharacterInterviewQuestionOption } from "@types";

/**
 * The voice shortlists an interview has produced so far, grouped by language.
 *
 * The agent's voice questions are the only place its shortlist exists, and an
 * answer card locks once answered — so an admin who answers by typing in the
 * composer (a normal turn, carrying no questionId) never sees a play button at
 * all, and one who answers by clicking loses them the moment the card locks.
 * Collecting the shortlists out of the transcript lets a persistent strip keep
 * them playable for the rest of the session.
 */

export interface VoiceCatalogLanguage {
  language_id: number;
  label?: string;
  voices?: Array<{ id: string }>;
}

export interface VoiceShortlist {
  languageId: string;
  languageLabel: string;
  options: CharacterInterviewQuestionOption[];
  /** The voice this language settled on, when the question was answered. */
  chosenVoiceId?: string;
  /** True when the admin answered "None of these" for this language. */
  noneChosen?: boolean;
}

/**
 * Group the shortlists by language, newest question per language winning.
 *
 * A question counts as a voice question only when every option id resolves to
 * a catalog voice — the same test the answer card uses, and for the same
 * reason: the interviewer prompt is file-backed and may be dashboard-
 * overridden, so a marker it was meant to emit could silently never arrive.
 *
 * Each option is grouped by ITS OWN language rather than the question's. The
 * prompt now asks one voice question per language, but a transcript from
 * before that change — or from an overridden prompt still asking the old way —
 * offers several languages in one question, and taking the first option's
 * language for the whole group labelled a mixed shortlist with whichever
 * language happened to come first.
 */
export const collectVoiceShortlists = (
  messages: CharacterInterviewChatMessage[],
  catalog: VoiceCatalogLanguage[],
): VoiceShortlist[] => {
  const languageOfVoice = new Map<string, VoiceCatalogLanguage>();
  for (const language of catalog) {
    for (const voice of language.voices ?? []) {
      if (voice?.id) languageOfVoice.set(voice.id, language);
    }
  }
  if (languageOfVoice.size === 0) return [];

  const byLanguage = new Map<string, VoiceShortlist>();

  for (const message of messages) {
    const options = message.question?.options ?? [];
    if (options.length === 0) continue;
    if (!options.every(option => languageOfVoice.has(option.id))) continue;

    const selectedId = message.answeredAnswer?.selectedOptionIds?.[0];
    const chosenByLabel = message.answeredWith
      ? options.find(option => option.label === message.answeredWith)?.id
      : undefined;
    const chosen = selectedId ?? chosenByLabel;

    // Split this question's options across the languages they belong to. A
    // per-language question yields exactly one group; a mixed one yields
    // several, each labelled correctly.
    const grouped = new Map<string, CharacterInterviewQuestionOption[]>();
    for (const option of options) {
      const languageId = String(languageOfVoice.get(option.id)!.language_id);
      grouped.set(languageId, [...(grouped.get(languageId) ?? []), option]);
    }

    for (const [languageId, languageOptions] of grouped) {
      const language = languageOfVoice.get(languageOptions[0].id)!;
      // A re-asked language replaces its earlier shortlist rather than adding
      // a second group for the same language.
      byLanguage.set(languageId, {
        languageId,
        languageLabel: language.label ?? `Language ${languageId}`,
        options: languageOptions,
        // The pick belongs to whichever language actually holds it, so a
        // mixed question does not mark every group as chosen.
        chosenVoiceId: languageOptions.some(option => option.id === chosen) ? chosen : undefined,
        noneChosen: message.answeredAnswer?.none === true,
      });
    }
  }

  return [...byLanguage.values()].sort((a, b) => Number(a.languageId) - Number(b.languageId));
};
