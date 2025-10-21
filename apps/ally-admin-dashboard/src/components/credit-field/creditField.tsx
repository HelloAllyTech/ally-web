import React from "react";

import { ProfileCard } from "@components";
import { en } from "@constants";
import { CreditFieldProps, InputProps } from "@types";

export const CreditField: React.FC<CreditFieldProps> = ({
  value = { consumedCredits: 0, newCredits: 0 },
  onChange,
  userData,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <ProfileCard
        user={userData}
        consumedCredits={value?.consumedCredits ?? 0}
        newCredits={value?.newCredits ?? 0}
        showCredits={true}
      />
      <div className="flex gap-4 border-t pt-3">
        <div className="flex flex-col w-full">
          <label className="text-[12px] pb-[8px] text-[#49454F] cursor-pointer">
            {en.userManagement.consumedCredits}
          </label>
          <div className="border rounded-md py-2 outline-none font-['Replay_Pro'] w-full p-2 opacity-50">
            {value?.consumedCredits}
          </div>
        </div>
        <div className="flex flex-col w-full">
          <label className="text-[12px] pb-[8px] text-[#49454F] cursor-pointer">
            {en.userManagement.newCreditLimit}
          </label>
          <input
            type="number"
            className="border rounded-md py-2 outline-none font-['Replay_Pro'] w-full p-2"
            value={value?.newCredits === 0 ? "" : value?.newCredits}
            onChange={e => onChange({ ...value, newCredits: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="text-gray-400 text-sm">{en.userManagement.oneCreditInMin}</div>
    </div>
  );
};
