import React, { useEffect, useState } from "react";

import { toast } from "sonner";

import {
  useGetTermsQuery,
  useGetPrivacyQuery,
  useUpdateTermsMutation,
  useUpdatePrivacyMutation,
  useGetTermsAndAgreementQuery,
  useUpdateTermsAndAgreementMutation,
} from "@api";
import { Button } from "@components";
import { RichTextEditor } from "@components/rich-text-editor";
import { ButtonVariant } from "@components/types";

type LegalEditorProps = {
  title: string;
  value: string;
  onChange: (html: string) => void;
  onSave: () => void;
  isSaving: boolean;
  isLoading: boolean;
};

const LegalEditor: React.FC<LegalEditorProps> = ({
  title,
  value,
  onChange,
  onSave,
  isSaving,
  isLoading,
}) => (
  <section className="flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-secondary text-typography-900">{title}</h2>
      <Button variant={ButtonVariant.PRIMARY} onClick={onSave} disabled={isSaving || isLoading}>
        {isSaving ? "Saving..." : "Save"}
      </Button>
    </div>
    <RichTextEditor
      value={value}
      onChange={onChange}
      placeholder={`Write the ${title} content...`}
    />
  </section>
);

export const Settings: React.FC = () => {
  const { data: terms, isFetching: isTermsLoading } = useGetTermsQuery();
  const { data: privacy, isFetching: isPrivacyLoading } = useGetPrivacyQuery();

  const { data: termsAndAgreement, isFetching: isTermsAndAgreementLoading } =
    useGetTermsAndAgreementQuery();

  const [updateTerms, { isLoading: isSavingTerms }] = useUpdateTermsMutation();
  const [updatePrivacy, { isLoading: isSavingPrivacy }] = useUpdatePrivacyMutation();
  const [updateTermsAndAgreement, { isLoading: isSavingTermsAndAgreement }] =
    useUpdateTermsAndAgreementMutation();

  const [termsHtml, setTermsHtml] = useState("");
  const [privacyHtml, setPrivacyHtml] = useState("");
  const [termsAndAgreementHtml, setTermsAndAgreementHtml] = useState("");

  // Seed the editors once content arrives from the server.
  useEffect(() => {
    setTermsHtml(terms?.html ?? "");
  }, [terms?.html]);

  useEffect(() => {
    setPrivacyHtml(privacy?.html ?? "");
  }, [privacy?.html]);

  useEffect(() => {
    setTermsAndAgreementHtml(termsAndAgreement?.html ?? "");
  }, [termsAndAgreement?.html]);

  const handleSaveTerms = async () => {
    try {
      await updateTerms({ html: termsHtml }).unwrap();
      toast.success("Terms of Service updated");
    } catch {
      toast.error("Failed to update Terms of Service");
    }
  };

  const handleSavePrivacy = async () => {
    try {
      await updatePrivacy({ html: privacyHtml }).unwrap();
      toast.success("Privacy Policy updated");
    } catch {
      toast.error("Failed to update Privacy Policy");
    }
  };

  const handleSaveTermsAndAgreement = async () => {
    try {
      await updateTermsAndAgreement({ html: termsAndAgreementHtml }).unwrap();
      toast.success("Terms & Agreement updated");
    } catch {
      toast.error("Failed to update Terms & Agreement");
    }
  };

  return (
    <div className="py-[2px] font-primary">
      <h1 className="text-2xl text-typography-900 pb-2 font-secondary">Settings</h1>
      <p className="text-sm text-typography-600 pb-6">
        Edit the content shown on the public Terms of Service and Privacy Policy pages, and the
        Terms &amp; Agreement consent shown to users when they sign in.
      </p>

      <div className="flex flex-col gap-10 max-w-3xl">
        <LegalEditor
          title="Terms of Service"
          value={termsHtml}
          onChange={setTermsHtml}
          onSave={handleSaveTerms}
          isSaving={isSavingTerms}
          isLoading={isTermsLoading}
        />
        <LegalEditor
          title="Privacy Policy"
          value={privacyHtml}
          onChange={setPrivacyHtml}
          onSave={handleSavePrivacy}
          isSaving={isSavingPrivacy}
          isLoading={isPrivacyLoading}
        />
        <LegalEditor
          title="Terms & Agreement (Sign-in)"
          value={termsAndAgreementHtml}
          onChange={setTermsAndAgreementHtml}
          onSave={handleSaveTermsAndAgreement}
          isSaving={isSavingTermsAndAgreement}
          isLoading={isTermsAndAgreementLoading}
        />
      </div>
    </div>
  );
};
