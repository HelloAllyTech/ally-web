import { FC, useState } from "react";

import { Link } from "react-router-dom";

import { ROUTES } from "@constants";

// Reached across pages on purpose, and by relative path — the same treatment
// UserManagement gives ../SuperAdmins/SuperAdmins. The alternative was a second
// bugs table on this tab, which is the one thing this tab must not be: the
// moment it drifts from Bug Hunter's, "the same data" stops being true and a
// planner and a triager are reading two different backlogs.
import { BugFindingsTable } from "../BugHunter/BugFindingsTable";
import { KeyboardShortcutSheet } from "../BugHunter/KeyboardShortcutSheet";

/**
 * The roadmap's Bugs tab — Bug Hunter's comprehensive bug table, read-only.
 *
 * ## Why a mirror rather than a link
 *
 * Bugs came OFF the opportunities board when Bug Hunter took over tracking
 * them, which was right for triage and wrong for planning: the person deciding
 * what next month contains lost the ability to see what is broken without
 * leaving the roadmap for a tab built around a different question. The two
 * readers want the same rows and different verbs — Stacks' *Interface patterns
 * for evolving human roles in agent systems* is the argument for treating them
 * as two readers rather than widening one screen until it serves both.
 *
 * So this is the *reviewer's* dashboard shown to a *planner*: identical rows,
 * identical filters, identical drawer, and none of the decisions. Approve,
 * reject, "put me on it", bulk triage and the selection column are all gone —
 * not disabled, gone — because a greyed-out Approve on forty rows is noise, and
 * this tab is not where that call gets made.
 *
 * ## What is deliberately NOT reimplemented here
 *
 * Everything. `BugFindingsTable` already reads `?bucket=`, `?q=`, `?sev=` and
 * the rest out of the query string, so this tab inherits filtering, sorting,
 * search, paging, the age tint, the duplicate flag and the detail drawer for
 * free — and inherits every future change to them too. `canTriage={false}` is
 * the whole of the read-only contract; it is the same flag the table already
 * threads down to its rows and its drawer, so there is exactly one copy of that
 * rule rather than a second read-only code path to keep in step.
 *
 * ## Sharing a query string with the board
 *
 * The bug table's params (`bug`, `bucket`, `q`, `sev`, `src`, …) and the
 * roadmap's (`tab`, `view`, `opportunity`) do not collide, so a link to
 * `?tab=bugs&bucket=problem` lands on this tab with that filter applied. The
 * page clears `?bug=` when you leave, for the same reason it clears
 * `?opportunity=` — a drawer belongs to the tab that opened it.
 */
export const BugsTab: FC = () => {
  const [showShortcuts, setShowShortcuts] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {/* Provenance and the exit, in one line, above the table rather than
          inside it. A reader who arrives here from the board needs to know two
          things before the first row means anything: these rows are not
          roadmap items, and this screen cannot change them. Saying so once at
          the top beats discovering it by looking for a button that isn't
          there. */}
      <p className="text-typography-secondary text-sm">
        Every bug Bug Hunter is tracking — what it found itself and what your team reported —
        mirrored here so you can plan against it. This view is read-only; approving, rejecting and
        starting a fix happen on{" "}
        <Link to={ROUTES.BUG_HUNTER} className="text-primary-600 underline">
          Bug Hunter
        </Link>
        .
      </p>

      <BugFindingsTable canTriage={false} onShowShortcuts={() => setShowShortcuts(true)} />

      {showShortcuts && (
        <KeyboardShortcutSheet canTriage={false} onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  );
};
