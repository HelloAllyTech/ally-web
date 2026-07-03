import { useSelector } from "react-redux";

import { useGetScribeVoiceNoteEnabledQuery } from "@api";
import { Permissions } from "@constants";
import { RootState } from "@store";
import { hasPermissions } from "@utils";

/**
 * Wraps `useGetScribeVoiceNoteEnabledQuery` with a permission guard.
 *
 * The `/settings/scribe-voice-note-enabled` endpoint is only authorized for
 * counsellors; calling it without the counsellor permission returns a 403. This
 * hook skips the request entirely unless the current user holds
 * `COUNSELOR_ACCESS` (checked via the permission union, so an admin+counsellor
 * — whose collapsed `role` reads as ADMIN — is still recognised as a
 * counsellor), and still honours an explicit caller-provided `skip`.
 */
export const useScribeVoiceNoteEnabled = (options?: { skip?: boolean }) => {
  const permissions = useSelector((state: RootState) => state.user.permissions);
  const isCounsellor = hasPermissions(permissions, Permissions.COUNSELOR_ACCESS);

  return useGetScribeVoiceNoteEnabledQuery(undefined, {
    skip: Boolean(options?.skip) || !isCounsellor,
  });
};
