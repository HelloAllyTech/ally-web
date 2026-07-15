import React, { useState } from "react";

import { Play } from "@carbon/icons-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import { Button, Tile } from "@ally-ui-mono/ui-shared";
import { usePublishRoleplayVersionMutation } from "@api";
import { ActionConfirmationPopup } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { useTryRoleplayLive } from "@hooks";
import { CopilotImprovementReadyPayload } from "@src/types/roleplayStudio";

import { CumulativeDiffView } from "../improvement/CumulativeDiffView";
import { roleplayMarkdownComponents } from "../markdownComponents";

interface ImprovementReadyCardProps {
  content: string;
  payload: CopilotImprovementReadyPayload;
}

/**
 * The loop's "ready to test live & publish" chat row. Actions target the
 * BEST (candidate) version: it is byte-identical to the auto-accepted draft
 * version and — unlike it — carries the COMPLETED verification rehearsal the
 * publish gate requires.
 */
export const ImprovementReadyCard: React.FC<ImprovementReadyCardProps> = ({ content, payload }) => {
  const strings = en.roleplayStudio.copilot.improvement;
  const publishStrings = en.roleplayStudio.publish;
  const { tryLive, isStartingSession } = useTryRoleplayLive();
  const [publishVersion, { isLoading: isPublishing }] = usePublishRoleplayVersionMutation();
  const [showForceConfirm, setShowForceConfirm] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [published, setPublished] = useState(false);

  const targetVersionId = payload.bestVersionId ?? payload.acceptedVersionId;

  const doPublish = async (force: boolean) => {
    if (!targetVersionId) return;
    try {
      await publishVersion({
        specId: payload.specId,
        versionId: targetVersionId,
        force,
      }).unwrap();
      setPublished(true);
      toast.success(publishStrings.published);
    } catch (error) {
      const status = (error as { status?: number | string })?.status;
      if (status === 409 && !force) {
        setShowForceConfirm(true);
        return;
      }
      toast.error(publishStrings.publishFailed);
    }
  };

  return (
    <div className="flex justify-start">
      <Tile className="max-w-[92%] w-full">
        <div className="text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={roleplayMarkdownComponents}>
            {content}
          </ReactMarkdown>
        </div>

        {targetVersionId && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              kind="secondary"
              size="sm"
              renderIcon={Play}
              onClick={() => void tryLive(targetVersionId)}
              disabled={isStartingSession}
            >
              {isStartingSession ? publishStrings.startingSession : strings.testLive}
            </Button>
            <Button
              kind="primary"
              size="sm"
              onClick={() => void doPublish(false)}
              disabled={isPublishing || published}
            >
              {published
                ? publishStrings.published
                : isPublishing
                  ? publishStrings.publishing
                  : strings.publish}
            </Button>
            <Button kind="ghost" size="sm" onClick={() => setShowDiff(previous => !previous)}>
              {showDiff ? strings.hideChanges : strings.viewChanges}
            </Button>
          </div>
        )}

        {showDiff && (
          <div className="mt-3">
            <CumulativeDiffView runId={payload.improvementRunId} />
          </div>
        )}

        <ActionConfirmationPopup
          isOpen={showForceConfirm}
          onClose={() => setShowForceConfirm(false)}
          title={publishStrings.forceTitle}
          titleItalic={publishStrings.forceTitleItalic}
          description={publishStrings.forceDescription}
          primaryButton={{
            label: publishStrings.forcePublish,
            onClick: () => {
              setShowForceConfirm(false);
              void doPublish(true);
            },
            variant: ButtonVariant.PRIMARY,
          }}
          secondaryButton={{
            label: en.common.cancel,
            onClick: () => setShowForceConfirm(false),
            variant: ButtonVariant.SECONDARY,
          }}
        />
      </Tile>
    </div>
  );
};
