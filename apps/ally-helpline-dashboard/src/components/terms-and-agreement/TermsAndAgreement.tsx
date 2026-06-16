import { useState } from "react";

import { Dialog } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useGetTermsAndAgreementQuery } from "@api";
import { Button } from "@components";
import { PRIVACY_POLICY_URL } from "@constants";
import { sanitizeHtml } from "@utils";

const TermsAndAgreement = ({ isOpen, handleAgreeButtonClick }) => {
  const { t } = useTranslation();
  const [agreeCheck, setAgreeCheck] = useState<boolean>(false);
  const paperProps = {
    style: {
      borderRadius: "8px",
      padding: "16px",
      height: "550px",
    },
  };

  // Consent copy is authored by a super admin in the admin dashboard and served
  // from /v1/settings/terms-and-agreement (public). Sanitized before rendering.
  const { data, isLoading } = useGetTermsAndAgreementQuery();
  const sanitized = sanitizeHtml(data?.html ?? "");

  return (
    <Dialog open={isOpen} disableEscapeKeyDown PaperProps={paperProps}>
      <div className="flex items-center justify-center font-medium text-2xl font-secondary">
        {t("terms.title")}
      </div>
      <div className="overflow-y-auto custom-scrollbar">
        <div className="border-b border-border-light">
          {isLoading ? (
            <p className="p-4 text-[14px] text-typography-700 font-primary">Loading…</p>
          ) : (
            <div
              className="p-2 font-primary text-[14px] text-typography-800 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-1 [&_li]:my-0.5 [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-primary-200 [&_blockquote]:pl-4 [&_blockquote]:my-2 [&_blockquote]:italic"
              dangerouslySetInnerHTML={{ __html: sanitized }}
            />
          )}
        </div>
        <div className="text-[12px] text-typography-900 font-primary text-center pt-2">
          {t("terms.footerPrefix")}
          <a
            href={PRIVACY_POLICY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline ml-1"
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
            disabled={!agreeCheck || isLoading}
          >
            {t("terms.agreeButton")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default TermsAndAgreement;
