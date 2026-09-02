import React, { useEffect, useState } from "react";

import { toast } from "sonner";

import {
  useGetTermsQuery,
  useGetPrivacyQuery,
  useUpdateTermsMutation,
  useUpdatePrivacyMutation,
} from "@api";
import { Button } from "@components";
import { RichTextEditor } from "@components/rich-text-editor";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";

type LegalEditorProps = {
  title: string;
  value: string;
  onChange: (html: string) => void;
  onSave: () => void;
  isSaving: boolean;
  isLoading: boolean;
};

/**
 * The two documents keep their own headings and their own Save buttons even
 * though they share a tab: they are published separately, so one Save for both
 * would push an unfinished Privacy edit live the moment Terms was ready.
 */
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
        {isSaving ? en.settings.saving : en.settings.save}
      </Button>
    </div>
    <RichTextEditor
      value={value}
      onChange={onChange}
      placeholder={en.settings.legalPlaceholder(title)}
    />
  </section>
);

export const LegalTab: React.FC = () => {
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
      toast.success(en.settings.termsSaved);
    } catch {
      toast.error(en.settings.termsSaveFailed);
    }
  };

  const handleSavePrivacy = async () => {
    try {
      await updatePrivacy({ html: privacyHtml }).unwrap();
      toast.success(en.settings.privacySaved);
    } catch {
      toast.error(en.settings.privacySaveFailed);
    }
  };

  return (
    <div className="flex flex-col gap-10 max-w-3xl">
      <LegalEditor
        title={en.settings.termsTitle}
        value={termsHtml}
        onChange={setTermsHtml}
        onSave={handleSaveTerms}
        isSaving={isSavingTerms}
        isLoading={isTermsLoading}
      />
      <LegalEditor
        title={en.settings.privacyTitle}
        value={privacyHtml}
        onChange={setPrivacyHtml}
        onSave={handleSavePrivacy}
        isSaving={isSavingPrivacy}
        isLoading={isPrivacyLoading}
      />
    </div>
  );
};
