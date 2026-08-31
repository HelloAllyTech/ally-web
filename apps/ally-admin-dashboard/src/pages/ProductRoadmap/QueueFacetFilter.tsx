import React, { useMemo } from "react";

import { MultiSelect } from "@ally-ui-mono/ui-shared";

interface QueueFacetFilterItem {
  id: string;
  label: string;
}

export interface QueueFacetFilterProps {
  /** DOM id. Carbon requires one, and it is what the visually-hidden title is tied to. */
  id: string;
  /** The facet's name — the accessible name, and the placeholder in the closed field. */
  label: string;
  /**
   * Every value the facet can take.
   *
   * From the taxonomy / GET /facets, never from the loaded page: the feed rarely contains every
   * owner, and an option list that shrinks as you filter is worse than no filter at all. Same
   * reasoning as buildFacetSections, which feeds the full filter bar.
   */
  options: string[];
  /** The applied filter. EMPTY MEANS ALL — see the docblock below. */
  value: string[];
  onChange: (next: string[]) => void;
}

/**
 * One Carbon multi-select facet for the Queue toolbar.
 *
 * The Queue hides the full filter bar — it is a fixed view of the pipeline, not a place to build
 * arbitrary queries — but goal and owner are the two cuts people actually want while working
 * through it ("what is mine", "what is on this goal"), so they get a control each rather than the
 * whole bar back.
 *
 * ## Empty means ALL, and every box renders ticked
 *
 * The stored filter is `[]` when nothing is being excluded, matching the convention every other
 * filter in this app and every saved view already uses — an empty array is "no filter", not "match
 * nothing". But an empty Carbon MultiSelect renders with all boxes CLEAR, which reads as "nothing
 * is included" over a feed that is showing everything.
 *
 * So the two are decoupled: `[]` renders as fully ticked, and a full selection stores back as
 * `[]`. What that buys, beyond reading correctly:
 *
 *   - A product goal or owner added AFTER this page loaded is still included, because "all" is
 *     never a frozen list of names. Storing all twelve goals explicitly would silently drop the
 *     thirteenth, and its opportunities would vanish from the Queue with every box on screen
 *     ticked.
 *   - Switching to the Queue applies QUEUE_VIEW_STATE, which carries no goal or owner filter.
 *     That lands as `[]` and therefore as "all", with no extra reset step to keep in sync.
 *
 * Carbon's clear-selection "X" therefore means RESET THE FACET rather than "select none": it
 * empties the stored filter, which is all rows. Selecting none is not reachable, and that is
 * deliberate — it is a state whose only outcome is an empty feed nobody asked for.
 *
 * Renders nothing at all when the facet has no options. A dropdown that can only ever be opened
 * and closed again is noise, and on a tenant with no product goals defined that is what this
 * would be.
 */
export const QueueFacetFilter: React.FC<QueueFacetFilterProps> = ({
  id,
  label,
  options,
  value,
  onChange,
}) => {
  const items = useMemo<QueueFacetFilterItem[]>(
    () => options.map(option => ({ id: option, label: option })),
    [options],
  );

  const selectedItems = useMemo(
    () => (value.length ? items.filter(item => value.includes(item.id)) : items),
    [items, value],
  );

  if (!items.length) return null;

  return (
    <MultiSelect
      id={id}
      size="sm"
      /*
        Two problems, and the second is not where it looks.

        The min-width widens the FIELD, and so the menu, which Carbon sizes from it. That alone
        does not stop the truncation: Carbon pins `.cds--checkbox-label-text` to a fixed width
        with `white-space: nowrap` + ellipsis, and it does not grow with the menu — measured at
        156px of box for up to 191px of text at both 208px and 240px of menu. Overriding the menu
        option, which looks like the culprit, does nothing; the checkbox label inside it clips.

        The wrapping therefore lives in styles.css under `.roadmap-facet-filter`, scoped so that
        no other MultiSelect in the app changes, and with a selector specific enough to beat
        Carbon's own. See the comment there — the specificity is the whole trick.

        It matters here because goal and owner names are USER-AUTHORED: no fixed width is ever
        safe, and on this tenant "Roleplay Actor Build Time" and "Roleplay Actor Realism" both
        rendered as "Roleplay Acto...". The toolbar already wraps, so on a narrow viewport these
        drop to their own line rather than squeezing back down.
      */
      className="roadmap-facet-filter min-w-[15rem]"
      // Visually hidden: the closed field already shows `label` as its placeholder, so a title
      // above it would print the word twice in a row of controls with no room to spare. Kept
      // rather than dropped because it is what names the control for a screen reader.
      titleText={label}
      hideLabel
      label={label}
      items={items}
      itemToString={item => item?.label ?? ""}
      selectedItems={selectedItems}
      // "fixed", not Carbon's default "top-after-reopen": that one floats selected options to the
      // top, and with everything selected by default the list would reshuffle itself the first
      // time you untick something. A facet list has a meaningful order of its own — keep it.
      selectionFeedback="fixed"
      onChange={({ selectedItems: next }) => {
        const chosen = next ?? [];
        // Both ends collapse to "all": nothing ticked is the clear button (reset), everything
        // ticked is not a filter at all. Anything between is stored as the explicit subset.
        onChange(
          chosen.length === 0 || chosen.length === items.length ? [] : chosen.map(item => item.id),
        );
      }}
    />
  );
};
