/**
 * Re-export of the promoted shared table.
 *
 * The implementation moved to components/entity-table when the WhatsApp bot tab needed the same
 * table — a second copy would have been the largest duplication in that feature. Kept as a
 * re-export (rather than rewriting six import sites) so the AI Lab tabs are untouched and the
 * refactor cannot change their behaviour.
 */
export {
  EntityTable as LabTable,
  type EntityTableColumn as LabTableColumn,
  type EntityTableAction,
} from "@components";
