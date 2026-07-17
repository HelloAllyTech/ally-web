/**
 * Static labels for the Org. Settings toggles.
 *
 * NOTE: dashboard-analytics toggles (Scribe Analytics / Org Session Analytics /
 * Simulator Analytics) are intentionally omitted here. The admin screen sources
 * them from GET /v1/analytics/dashboard/all, which is gated on
 * `edit:analytics:dashboard` — a permission the consumer ADMIN role does NOT
 * hold (see ally-be permissions.constants.ts ADMIN_PERMISSIONS). Add them back
 * once/if that access is granted to org admins.
 * TODO(dashboard-analytics): wire once org admins can read /analytics/dashboard/all.
 */

/** Feature-toggle rows shown at the top of the Scribe Settings tab. */
export const SCRIBE_TOGGLE_ITEMS: { id: ScribeToggleId; label: string }[] = [
  { id: "enableMicrophoneMode", label: "Microphone Mode" },
  { id: "enableDictationMode", label: "Dictation Mode" },
  { id: "enableAudioUpload", label: "Upload Call Recording" },
];

export type ScribeToggleId = "enableMicrophoneMode" | "enableDictationMode" | "enableAudioUpload";

/** All custom-field types the org can enable, mirroring the admin screen. */
export const CUSTOM_FIELD_TYPE_ITEMS: { key: string; label: string }[] = [
  { key: "SINGLE_SELECT", label: "Single select" },
  { key: "MULTI_SELECT", label: "Multi select" },
  { key: "DATE", label: "Date" },
  { key: "TEXT", label: "Text" },
  { key: "NUMBER", label: "Number" },
  { key: "BOOLEAN", label: "Yes / No" },
];
