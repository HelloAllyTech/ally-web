import React, { useMemo, useState } from "react";

import { useSelector } from "react-redux";
import { toast } from "sonner";

import { Play } from "@carbon/icons-react";
import { Button, CarbonDropdown, InlineNotification, Modal } from "@ally-ui-mono/ui-shared";
import { useGetScenarioLanguagesQuery, usePublishRoleplayVersionMutation } from "@api";
import { en } from "@constants";
import { useTryRoleplayLive } from "@hooks";
import { selectRoleplaySpecState } from "@reducer";
import { deriveRoleplayReadiness } from "@utils/roleplaySpec";

interface RoleplayStudioActionsProps {
  /** Persists any dirty draft state before preview / publish. */
  onSaveDraft: () => Promise<boolean>;
}

interface PreviewLanguage {
  id: string;
  label: string;
}

/**
 * Preview + Publish actions that sit in the workspace tab row.
 *
 * - Preview replaces the old "Try live": it plays the current draft version in
 *   a chosen language, and is only enabled once the spec is runnable (has
 *   states + a voice). When more than one language is configured, a picker lets
 *   the trainer choose which one to preview.
 * - Publish is only enabled once the full readiness checklist passes; it keeps
 *   the 409 no-completed-rehearsal -> force-confirm fallback.
 */
export const RoleplayStudioActions: React.FC<RoleplayStudioActionsProps> = ({ onSaveDraft }) => {
  const strings = en.roleplayStudio.publish;
  const { specId, versionId, spec } = useSelector(selectRoleplaySpecState);
  const { tryLive, isStartingSession } = useTryRoleplayLive({ onSaveDraft });
  const [publishVersion, { isLoading: isPublishing }] = usePublishRoleplayVersionMutation();
  const { data: languages = [] } = useGetScenarioLanguagesQuery({ active: true });
  const [forceConfirm, setForceConfirm] = useState(false);
  const [previewLanguageId, setPreviewLanguageId] = useState<string | null>(null);

  const readiness = deriveRoleplayReadiness(spec);
  const isPassed = (id: (typeof readiness)[number]["id"]) =>
    readiness.find(check => check.id === id)?.passed ?? false;
  // Preview needs the runnable core (a state machine to drive the persona and at
  // least one voiced language). Publish needs every readiness check to pass AND
  // every configured language to have a voice — an unvoiced language would be
  // rejected by the backend spec validator.
  const languageVoices = spec?.voice?.languageVoices ?? {};
  const configuredLangIds = Object.keys(languageVoices);
  const allLanguagesVoiced =
    configuredLangIds.length > 0 && configuredLangIds.every(id => Boolean(languageVoices[id]));
  const specComplete = isPassed("states") && isPassed("voice");
  const publishReady = readiness.every(check => check.passed) && allLanguagesVoiced;

  // Languages the trainer can preview = configured languages that already have a
  // voice mapped (the copilot assigns these).
  const previewLanguages = useMemo<PreviewLanguage[]>(() => {
    const languageVoices = spec?.voice?.languageVoices ?? {};
    const labelById = new Map(
      languages.map(option => [String(option.language_id ?? option.value), option.label]),
    );
    return Object.entries(languageVoices)
      .filter(([, voiceId]) => Boolean(voiceId))
      .map(([id]) => ({ id, label: labelById.get(id) ?? id }));
  }, [spec?.voice?.languageVoices, languages]);

  // Default to the spec's default language when it's previewable, else the first.
  const defaultPreviewId =
    previewLanguages.find(lang => lang.id === String(spec?.language?.languageId))?.id ??
    previewLanguages[0]?.id ??
    null;
  const effectivePreviewId = previewLanguageId ?? defaultPreviewId;

  const handlePreview = () =>
    void tryLive(versionId, effectivePreviewId ? Number(effectivePreviewId) : undefined);

  const doPublish = async (force: boolean) => {
    if (!specId || !versionId) return;
    try {
      await onSaveDraft();
      await publishVersion({ specId, versionId, force }).unwrap();
      toast.success(strings.published);
    } catch (error) {
      const status = (error as { status?: number | string })?.status;
      if (status === 409 && !force) {
        // 409 = no completed rehearsal for this version; offer force publish.
        setForceConfirm(true);
        return;
      }
      toast.error(strings.publishFailed);
    }
  };

  return (
    <div className="flex items-center gap-2 shrink-0">
      {specComplete && previewLanguages.length > 1 && (
        <div className="w-48">
          <CarbonDropdown
            id="roleplay-preview-language"
            size="sm"
            titleText=""
            aria-label={strings.previewLanguage}
            label={strings.previewLanguage}
            items={previewLanguages}
            itemToString={(item: PreviewLanguage | null) => item?.label ?? ""}
            selectedItem={previewLanguages.find(lang => lang.id === effectivePreviewId) ?? null}
            onChange={({ selectedItem }) =>
              setPreviewLanguageId((selectedItem as PreviewLanguage | null)?.id ?? null)
            }
          />
        </div>
      )}
      <span title={specComplete ? "" : strings.previewHint}>
        <Button
          kind="secondary"
          size="sm"
          renderIcon={Play}
          disabled={!specComplete || isStartingSession || !versionId}
          onClick={handlePreview}
        >
          {isStartingSession ? strings.startingSession : strings.preview}
        </Button>
      </span>
      <span title={publishReady ? "" : strings.publishHint}>
        <Button
          kind="primary"
          size="sm"
          disabled={!publishReady || isPublishing}
          onClick={() => void doPublish(false)}
        >
          {isPublishing ? strings.publishing : strings.publish}
        </Button>
      </span>

      <Modal
        open={forceConfirm}
        size="sm"
        modalHeading={
          <span>
            {strings.forceTitle} <em className="italic">{strings.forceTitleItalic}</em>
          </span>
        }
        primaryButtonText={strings.forcePublish}
        secondaryButtonText={en.common.cancel}
        onRequestClose={() => setForceConfirm(false)}
        onSecondarySubmit={() => setForceConfirm(false)}
        onRequestSubmit={() => {
          setForceConfirm(false);
          void doPublish(true);
        }}
      >
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title={strings.forceDescription}
          subtitle=""
        />
      </Modal>
    </div>
  );
};
