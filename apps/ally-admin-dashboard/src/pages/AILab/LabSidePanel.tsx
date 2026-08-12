/**
 * Re-export of the promoted shared side panel.
 *
 * See LabTable.tsx — the implementation moved to components/entity-side-panel for reuse by the
 * WhatsApp bot tab.
 *
 * One behavioural note: the old LabSidePanel read `en.aiLab.unsavedChangesWarning` internally, while
 * EntitySidePanel takes the warning as an optional prop. The AI Lab tabs do not pass it, so they now
 * get the component's default — which is the same sentence, character for character, that
 * `en.aiLab.unsavedChangesWarning` holds. The visible copy is unchanged.
 */
export { EntitySidePanel as LabSidePanel, EntityField as LabField } from "@components";
