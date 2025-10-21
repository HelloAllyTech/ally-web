import { ROUTES } from "./common";

export enum Permissions {
  EDIT_USER = "edit:user",
}

export const PERMISSION_ROUTE_MAP = {
  [ROUTES.USER_MANAGEMENT]: [Permissions.EDIT_USER],
};
