import React from "react";

import { Bolt } from "@assets";
import { en } from "@constants";
import { UserListUser } from "@types";
import { formatCapitalizedEnum } from "@utils";

interface ProfileFieldProps {
  user: UserListUser;
  showCredits?: boolean;
}

export const ProfileCard: React.FC<ProfileFieldProps> = ({ user, showCredits = false }) => {
  const Avatar: React.FC<{ name: string }> = ({ name }) => {
    const initial = name?.[0]?.toUpperCase() ?? "?";
    return (
      <div className="w-[40px] h-[40px] rounded-full border border-border-light text-text-500 flex items-center justify-center mr-2">
        {initial}
      </div>
    );
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center  pr-4">
        <Avatar name={user.name} />
        <div className="min-w-0">
          <div className="truncate">{formatCapitalizedEnum(user.name)}</div>
          <div className="text-text-500 truncate">{user.email}</div>
        </div>
      </div>
      {showCredits && (
        <div className="flex flex-col px-4  border-l">
          <div>{en.userManagement.creditsUsage}</div>
          <div className="flex items-center gap-2">
            <Bolt />
            <div>
              <span className="text-destructive-500 text-3xl">{user.consumedCredits}</span>
              <span className="text-text-500"> / {user.creditLimit}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
