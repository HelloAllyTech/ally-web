/**
 * A scenario character's list-shaped fields live in `jsonb` columns, so what
 * comes back from the API is whatever was written there — and characters
 * authored through the agent paths have been seen carrying a bare string
 * where a list belongs. Every consumer then calls `.map`/`.filter` on it and
 * takes the whole page down with "e.map is not a function". (`?.length` is no
 * guard: a non-empty string has one.)
 *
 * Reading it through this helper turns that into an empty list: the panel
 * renders, the trainer can refill the field, and the damage stays confined to
 * data that was already unusable.
 *
 * The overloads keep the element type when the caller's value is already
 * typed as a list, so this stays a runtime guard rather than a cast that
 * loses `T`.
 */
export function asList<T>(value: T[] | null | undefined): T[];
export function asList(value: unknown): never[];
export function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
