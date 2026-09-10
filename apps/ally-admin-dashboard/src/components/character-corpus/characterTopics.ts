import { KbCharacterTopic } from "@types";

/**
 * The character topics, in interview order, with the labels a curator sees.
 *
 * Labels are written for the person uploading a book, not for the schema: they answer "what
 * would this material help with?" rather than naming an enum. The order matches the phases the
 * interview actually runs in, so a curator who has watched an interview recognises it.
 *
 * Deliberately NOT generated from the enum. An enum member with no label here would render as
 * a raw snake_case string in a list an admin reads, and a label that has to be invented at
 * render time is a label nobody chose.
 */
export const CHARACTER_TOPIC_OPTIONS: {
  id: KbCharacterTopic;
  label: string;
  hint: string;
}[] = [
  {
    id: KbCharacterTopic.IDENTITY,
    label: "Who they are",
    hint: "Names, ages, backgrounds — rarely needs reference material",
  },
  {
    id: KbCharacterTopic.LIFE_CONTEXT,
    label: "Their life",
    hint: "Work, household, money, the texture of an ordinary day",
  },
  {
    id: KbCharacterTopic.INNER_LIFE,
    label: "Inner life",
    hint: "Temperament, values, fears, what they want",
  },
  {
    id: KbCharacterTopic.HISTORY_AND_PRESENTING_CONCERN,
    label: "History & concern",
    hint: "How a condition presents and progresses; what brings someone in",
  },
  {
    id: KbCharacterTopic.SPEECH_AND_LANGUAGE,
    label: "How they speak",
    hint: "Register, dialect, code-mixing, verbal habits",
  },
];

const LABELS = new Map(CHARACTER_TOPIC_OPTIONS.map(({ id, label }) => [id, label]));

/** The curator-facing label, falling back to the raw value rather than to nothing. */
export const characterTopicLabel = (topic: KbCharacterTopic | string): string =>
  LABELS.get(topic as KbCharacterTopic) ?? String(topic);
