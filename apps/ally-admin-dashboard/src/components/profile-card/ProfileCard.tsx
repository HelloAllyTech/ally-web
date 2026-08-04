import React from "react";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { Bolt } from "@assets";
import { en } from "@constants";
import { UserListUser } from "@types";
import { formatCapitalizedEnum } from "@utils";

interface ProfileFieldProps {
  user: UserListUser;
  showCredits?: boolean;
}

export const ProfileCard: React.FC<ProfileFieldProps> = ({ user, showCredits = false }) => {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex min-w-0 items-center  pr-4">
        <div className="w-10 h-10 rounded-full mr-3">
          <CustomImage
            src={user.profileImageUrl}
            alt="user"
            className="w-10 h-10 rounded-full"
            fallbackClassName="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-typography-600"
            fallbackText={user.name?.slice(0, 1)?.toUpperCase() ?? "NA"}
          />
        </div>
        <div className="min-w-0">
          <div className="truncate">{formatCapitalizedEnum(user.name)}</div>
          <div className="text-typography-800 truncate">{user.email}</div>
        </div>
      </div>
      {showCredits && (
        <div className="flex flex-col px-4  border-l">
          <div>{en.userManagement.creditsUsage}</div>
          <div className="flex items-center gap-2">
            <Bolt />
            <div>
              <span className="text-destructive-500 text-3xl">{user.consumedCredits}</span>
              <span className="text-typography-800"> / {user.creditLimit}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
