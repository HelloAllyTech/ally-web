import React, { useEffect, useState } from "react";

import { toast } from "sonner";

import {
  useGetTermsQuery,
  useGetPrivacyQuery,
  useUpdateTermsMutation,
  useUpdatePrivacyMutation,
} from "@api";
import { Button, ComfortAudioSettings } from "@components";
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

  const [updateTerms, { isLoading: isSavingTerms }] = useUpdateTermsMutation();
  const [updatePrivacy, { isLoading: isSavingPrivacy }] = useUpdatePrivacyMutation();

  const [termsHtml, setTermsHtml] = useState("");
  const [privacyHtml, setPrivacyHtml] = useState("");

  // Seed the editors once content arrives from the server.
  useEffect(() => {
    setTermsHtml(terms?.html ?? "");
  }, [terms?.html]);

  useEffect(() => {
    setPrivacyHtml(privacy?.html ?? "");
  }, [privacy?.html]);

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

  return (
    <div className="py-[2px] font-primary h-full flex flex-col">
      <h1 className="text-2xl text-typography-900 pb-2 font-secondary">Settings</h1>
      <p className="text-sm text-typography-600 pb-6">
        Edit the content shown on the public Terms of Service and Privacy Policy pages.
      </p>

      {/* The page lives inside a fixed-height layout, so the editors (which grow
          with their content) need their own scroll area. min-h-0 lets this flex
          child shrink below its content height so overflow-y-auto can kick in. */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="flex flex-col gap-10 max-w-3xl pb-6">
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
          <ComfortAudioSettings />
        </div>
      </div>
    </div>
  );
};
