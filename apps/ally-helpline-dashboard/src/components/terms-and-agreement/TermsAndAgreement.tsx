import { useState } from "react";

import { Dialog } from "@mui/material";

import { Button } from "@components";
import { PRIVACY_POLICY_URL, termsAndAgreementData } from "@constants";
import { parseContent } from "@utils";

const TermsAndAgreement = ({ isOpen, handleAgreeButtonClick }) => {
  const [agreeCheck, setAgreeCheck] = useState<boolean>(false);
  const paperProps = {
    style: {
      borderRadius: "8px",
      padding: "16px",
      height: "550px",
    },
  };

  return (
    <Dialog open={isOpen} disableEscapeKeyDown PaperProps={paperProps}>
      <div className="flex items-center justify-center font-medium text-2xl font-secondary">
        Terms and agreement
      </div>
      <div className="overflow-y-auto custom-scrollbar">
        <div className="border-b border-border-light">
          {termsAndAgreementData.map(item => (
            <div className="flex flex-col p-2 font-primary" key={item.heading}>
              <div className="flex gap-2 font-semibold mb-1">
                <span>{item.heading}</span>
              </div>

              <div className="text-gray-700">
                {item.content.map((content, index) => (
                  <div key={index} className="flex flex-row w-full">
                    <div className="w-[6px] h-[6px] bg-typography-900 rounded-full mr-2 ml-3 mt-[9px]" />
                    <div className="flex text-[14px] flex-wrap text-typography-800 w-[96%]">
                      {parseContent(content)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="text-[12px] text-typography-900 font-primary text-center pt-2">
          For complete details, please review our
          <a
            href={PRIVACY_POLICY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline ml-1"
          >
            Privacy Policy and User License Agreement
          </a>
          .
        </div>
        <div className="pt-2 flex text-typography-700 font-primary justify-between items-center">
          <div className="flex items-center gap-2 p-2">
            <input
              type="checkbox"
              checked={agreeCheck}
              onChange={() => setAgreeCheck(prev => !prev)}
            />
            <span className="text-[13px] text-typography-900">
              I have read and agreed to these Terms & Conditions, and consent.
            </span>
          </div>
          <Button
            className="w-[100px] h-[40px] font-semibold text-base font-tertiary"
            onClick={handleAgreeButtonClick}
            disabled={!agreeCheck}
          >
            Agree
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default TermsAndAgreement;
