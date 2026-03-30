import React from "react";

import { ProfileCard } from "@components";
import { en } from "@constants";
import { CreditFieldProps } from "@types";

export const CreditField: React.FC<CreditFieldProps> = ({ onChange, userData, value }) => {
  return (
    <div className="flex flex-col gap-4">
      <ProfileCard user={userData} showCredits={true} />
      <div className="flex gap-4 border-t pt-3">
        <div className="flex flex-col w-full">
          <label className="text-xs pb-[8px] text-typography-900 cursor-pointer">
            {en.userManagement.consumedCredits}
          </label>
          <div className="border rounded-md py-2 outline-none font-primary w-full p-2 opacity-50">
            {userData?.consumedCredits}
          </div>
        </div>
        <div className="flex flex-col w-full">
          <label className="text-xs pb-[8px] text-typography-900 cursor-pointer">
            {en.userManagement.newCreditLimit}
          </label>
          <input
            type="number"
            className="border rounded-md py-2 outline-none font-secondaryPro w-full p-2"
            value={value ?? ""}
            onChange={e => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </div>
      </div>
      <div className="text-typography-600 text-sm">{en.userManagement.oneCreditInMin}</div>
    </div>
  );
};
