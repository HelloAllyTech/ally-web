/**
 * Opt-out hints for browser/extension form helpers (password managers,
 * writing assistants) that inject UI into inputs and can steal focus
 * mid-typing — observed on Edge as "focus lost after one keystroke", gone in
 * InPrivate where extensions are disabled.
 *
 * There is no single universal opt-out, so we set the hints each common
 * family honors. Spread these onto every free-text input the scribe flows
 * render — TextField applies them already; raw Carbon controls (the "carbon"
 * variant fields, the summary-loading notes box) must spread them explicitly.
 */
export const formFieldProtectionProps = {
  autoComplete: "off",
  // Password managers
  "data-lpignore": "true", // LastPass
  "data-1p-ignore": "true", // 1Password
  "data-bwignore": "true", // Bitwarden
  "data-form-type": "other", // Dashlane / generic
  // Writing assistants (Grammarly, Microsoft Editor, etc.)
  "data-gramm": "false",
  "data-gramm_editor": "false",
  "data-enable-grammarly": "false",
} as const;
