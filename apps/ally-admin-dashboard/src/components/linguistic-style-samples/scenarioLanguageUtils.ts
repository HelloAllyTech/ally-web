import type { ScenarioContext } from "../../types/simulation";

export interface LanguageOption {
  language_id: number;
  value: string;
  label: string;
  translationCode?: string;
}

/** Default number of blank sample rows for a brand-new simulation. */
export const DEFAULT_SAMPLE_COUNT = 5;
export const ALLOWED_FILLER_WORDS_FIELD = "allowedFillerWords";

/** Upper bound for filler picker (autofill returns up to 14). */
export const ALLOWED_FILLER_WORDS_MAX = 20;

export interface FillerTag {
  id: string;
  name: string;
}

/** Map stored string[] to tag shape for HelperTag (ids are UI-only; API stores names). */
export function stringsToFillerTags(names: string[] | undefined): FillerTag[] {
  return (names ?? [])
    .map((name, index) => ({
      id: `filler-${index}-${String(name).trim()}`,
      name: String(name).trim(),
    }))
    .filter(t => t.name.length > 0);
}

export function uniqueFillerNamesPreserveOrder(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const n = raw.trim();
    if (!n) continue;
    const k = n.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(n);
  }
  return out;
}

export function buildScenarioContext(
  formMethods: { getValues: () => Record<string, unknown> },
  languageId: string,
  languageCode: string,
  languageName: string,
): ScenarioContext {
  const formValues = formMethods.getValues();
  return {
    title: formValues.title,
    name: formValues.name,
    age: formValues.age,
    gender: formValues.gender,
    genderIdentity: formValues.genderIdentity,
    sexualOrientation: formValues.sexualOrientation,
    profession: formValues.profession,
    currentLocation: formValues.currentLocation,
    competency: (formValues.competency as { name?: string } | undefined)?.name,
    characterProfileText: formValues.characterProfileText,
    challengeDescription: formValues.description,
    languageId,
    languageCode,
    languageName,
  } as ScenarioContext;
}
