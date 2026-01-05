import { FC } from "react";

import { profileSettingsProps } from "./types";
import ActionDialog from "../action-dialog";

export const ProfileSettings: FC<profileSettingsProps> = ({ isOpen, onClose, userData }) => {
  return (
    <ActionDialog open={isOpen} onClose={onClose} title="Profile Settings">
      <div className="flex flex-col p-2">
        <label>Name</label>
        <input placeholder={userData.name} disabled />
      </div>
    </ActionDialog>
  );
};
