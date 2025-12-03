import { useState } from "react";

import { Dialog } from "@mui/material";

import { TermsAndAgreementData } from "@constants";

import { Button } from "../button";

const TermsAndAgreement = ({ isOpen, handleClose, handleAgreeButtonClick }) => {
  const [agreeCheck, setAgreeCheck] = useState<boolean>(false);
  const DialogStyle = {
    borderRadius: "8px",
    padding: "16px",
    height: "566px",
  };
  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      PaperProps={{
        style: DialogStyle,
      }}
    >
      <div className="flex items-center justify-center font-medium text-2xl font-secondary">
        Terms and agreement
      </div>
      <div className="border-b border-border-light overflow-y-auto custom-scrollbar">
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
    </Dialog>
  );
};

export default TermsAndAgreement;
