import { useState } from "react";

import { useTranslation } from "react-i18next";

import { ComposedModal, ModalBody } from "@ally-ui-mono/ui-shared";
import { Button } from "@components";
import { PRIVACY_POLICY_URL } from "@constants";
import { parseContent } from "@utils";

const TermsAndAgreement = ({ isOpen, handleAgreeButtonClick }) => {
  const { t } = useTranslation();
  const [agreeCheck, setAgreeCheck] = useState<boolean>(false);

  const sections = t("terms.sections", { returnObjects: true }) as Array<{
    heading: string;
    content: string[];
  }>;

  return (
    <ComposedModal
      open={isOpen}
      onClose={() => {}}
      preventCloseOnClickOutside
      size="md"
      className="font-primary"
    >
      <ModalBody className="h-[550px] p-4">
        <div className="flex items-center justify-center font-medium text-2xl font-secondary">
          {t("terms.title")}
        </div>
        <div className="overflow-y-auto custom-scrollbar">
          <div className="border-b border-border-light">
            {sections.map(item => (
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
            {t("terms.footerPrefix")}
            <a
              href={PRIVACY_POLICY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 underline ml-1"
            >
              {t("terms.footerLinkText")}
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
              <span className="text-[13px] text-typography-900">{t("terms.agreeLabel")}</span>
            </div>
            <Button
              className="w-[100px] h-[40px] font-semibold text-base font-tertiary"
              onClick={handleAgreeButtonClick}
              disabled={!agreeCheck}
            >
              {t("terms.agreeButton")}
            </Button>
          </div>
        </div>
      </ModalBody>
    </ComposedModal>
  );
};

export default TermsAndAgreement;
