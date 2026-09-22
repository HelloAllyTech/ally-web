import type { BinaryClassificationExample } from "@types";

/**
 * Normalise a binary classifier's few-shot examples to the `[{ text }]` shape
 * the API and ally-ai-learn both expect.
 *
 * Tolerates bare strings as well as `{ text }` objects because the same helper
 * runs over values that came from the API, from the generator, and from the
 * editor — and drops blanks, which would otherwise reach the runtime prompt as
 * an empty numbered example.
 *
 * Deliberately its own LEAF module rather than living in `eventManagement`:
 * that file imports the `@utils` barrel, which reaches `loggerWithRedux` ->
 * `@store` and reads `baseAPI.reducerPath` at module load. Anything importing
 * it drags the whole Redux store in — which breaks any suite that mocks `@api`,
 * including the Event Builder hook's own. The only import here is type-only,
 * so it is erased at runtime.
 */
export const sanitizeClassifierExamples = (examples: unknown): BinaryClassificationExample[] => {
  if (!Array.isArray(examples)) return [];
  return examples
    .map(example => {
      const text = typeof example === "string" ? example : (example?.text ?? "");
      return { text: typeof text === "string" ? text.trim() : "" };
    })
    .filter(example => example.text.length > 0);
};
