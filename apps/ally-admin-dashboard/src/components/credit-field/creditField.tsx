import React from "react";

import { ProfileCard } from "@components";
import { en } from "@constants";
import { CreditFieldProps } from "@types";

export const CreditField: React.FC<CreditFieldProps> = ({
  value = { consumedCredits: 0, creditLimit: 0 },
  onChange,
  userData,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <ProfileCard
        user={userData}
        consumedCredits={value?.consumedCredits ?? 0}
        creditLimit={value?.creditLimit ?? 0}
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
            value={value?.creditLimit === 0 ? "" : value?.creditLimit}
            onChange={e => onChange({ ...value, creditLimit: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="text-gray-400 text-sm">{en.userManagement.oneCreditInMin}</div>
    </div>
  );
};
