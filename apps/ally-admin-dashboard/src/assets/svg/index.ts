/**
 * Icon barrel.
 *
 * Icons now come from the central icon library at `@icons`
 * (`src/components/icons`), which is backed by IBM Carbon (`@carbon/icons-react`)
 * for generic UI icons and by the original custom SVGs for brand/domain icons.
 *
 * The original per-icon `*.svg` files in this directory are intentionally kept
 * on disk — brand/domain icons still import them directly (see `@icons`), and
 * any one can still be imported as a React component via `./<file>.svg?react`.
 *
 * Existing `import { Add, Close, ... } from "@assets"` call sites keep working
 * unchanged because `@assets` re-exports this module.
 */
export * from "@icons";
