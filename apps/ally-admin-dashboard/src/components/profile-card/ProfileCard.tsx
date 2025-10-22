import React from "react";

import { Bolt } from "@assets";
import { en } from "@constants";
import { UserListUser } from "@types";
import { formatCapitalizedEnum } from "@utils";

interface ProfileFieldProps {
  user: UserListUser;
  consumedCredits?: number;
  creditLimit?: number;
  showCredits?: boolean;
}

export const ProfileCard: React.FC<ProfileFieldProps> = ({
  user,
  consumedCredits = 0,
  creditLimit = 0,
  showCredits = false,
}) => {
  const Avatar: React.FC<{ name: string }> = ({ name }) => {
    const initial = name?.[0]?.toUpperCase() ?? "?";
    return (
      <div className="w-[40px] h-[40px] rounded-full border border-gray-300 text-gray-500 flex items-center justify-center mr-2">
        {initial}
      </div>
    );
  };

  return (
    <div className="flex items-center gap-2 text-[12px]">
      <div className="flex items-center  pr-4">
        <Avatar name={user.name} />
        <div className="min-w-0">
          <div className="truncate">{formatCapitalizedEnum(user.name)}</div>
          <div className="text-gray-500 truncate">{user.email}</div>
        </div>
      </div>
      {showCredits && (
        <div className="flex flex-col px-4  border-l">
          <div>{en.userManagement.creditsUsage}</div>
          <div className="flex items-center gap-2">
            <Bolt />
            <div>
              <span className="text-red-500 text-3xl">{consumedCredits}</span>
              <span className="text-gray-500"> / {creditLimit}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
