import { Permissions } from "@constants";

import { sessionTypeOptions } from "./constants";

export const getPermittedSessionTypeOptions = (permissions: Permissions[]) => {
  return sessionTypeOptions.filter(option =>
    option.permissionList?.some(permission => permissions.includes(permission as Permissions)),
  );
};
