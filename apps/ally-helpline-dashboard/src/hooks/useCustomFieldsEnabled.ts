import { useSelector } from "react-redux";

import { useGetCustomFieldsEnabledQuery } from "@api";
import { RootState } from "@store";
import { UserRole } from "@types";

/**
 * Wraps `useGetCustomFieldsEnabledQuery` with a role guard.
 *
 * The `/settings/custom-fields-enabled` endpoint is only authorized for the
 * Counselor role; calling it with any other role returns a 403. This hook
 * skips the request entirely unless the current user is a Counselor (and
 * still honours an explicit caller-provided `skip`).
 */
export const useCustomFieldsEnabled = (options?: { skip?: boolean }) => {
  const role = useSelector((state: RootState) => state.user.user?.role);
  const isCounsellor = role === UserRole.COUNSELLOR;

  return useGetCustomFieldsEnabledQuery(undefined, {
    skip: Boolean(options?.skip) || !isCounsellor,
  });
};
