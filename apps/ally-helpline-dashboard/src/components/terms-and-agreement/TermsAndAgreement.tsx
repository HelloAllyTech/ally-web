import { useState } from "react";

import { Dialog } from "@mui/material";

import { Button } from "@components";
import { TermsAndAgreementData } from "@constants";

const TermsAndAgreement = ({ isOpen, handleAgreeButtonClick }) => {
  const [agreeCheck, setAgreeCheck] = useState<boolean>(false);
  const paperProps = {
    style: {
      borderRadius: "8px",
      padding: "16px",
      height: "600px",
    },
  };

  return (
    <Dialog open={isOpen} disableEscapeKeyDown PaperProps={paperProps}>
      <div className="flex items-center justify-center font-medium text-2xl font-secondary">
        Terms and agreement
      </div>
      <div className="overflow-y-auto custom-scrollbar">
        <div className="border-b border-border-light">
          {TermsAndAgreementData.map((item, index) => (
            <div className="flex flex-col p-2 font-primary" key={item.heading}>
              <div className="flex gap-2 font-semibold">
                <span>{index + 1}.</span>
                <span>{item.heading}</span>
              </div>

              <p className="text-gray-700">
                {item.content}

                {item.link && (
                  <>
                    <a
                      href={item.link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      {item.link.text}
                    </a>
                    .
                  </>
                )}
              </p>
            </div>
          ))}
        </div>
        <div className="pt-5 flex text-typography-700 font-primary justify-between">
          <div className="flex items-center gap-2 p-2">
            <input
              type="checkbox"
              checked={agreeCheck}
              onChange={() => setAgreeCheck(prev => !prev)}
            />
            <span>I have read and agree to these terms</span>
          </div>
          <Button
            className="w-[132px] font-semibold text-base font-tertiary"
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
