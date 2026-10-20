import { FC, useMemo, useState } from "react";

import { useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { useDraftTrackLandingPageMutation } from "@api";
import { Launch, WandStars } from "@assets";
import { Button } from "@components";
import { buildPublicLink } from "@components/organization-access-details/text-helpline/helpers";
import { ButtonVariant } from "@components/types";
import { en, getCourseSharePath } from "@constants";
import { useCanUseCourseCopilot } from "@hooks";
import { TrackFormValues } from "@types";

import { CastBlock } from "./CastBlock";
import { ContentNotesBlock } from "./ContentNotesBlock";
import { FirstMoveBlock } from "./FirstMoveBlock";
import { HeroBlock } from "./HeroBlock";
import { HowItPlaysBlock } from "./HowItPlaysBlock";
import { LandingBlockList } from "./LandingBlockList";
import { LandingBlockKey, computeLandingBlockStatuses, countReadyBlocks } from "./landingBlocks";
import { mergeLandingDraft } from "./landingDraft";
import { OutcomesBlock } from "./OutcomesBlock";
import { StoryArcBlock } from "./StoryArcBlock";
import { useLandingPage } from "./useLandingPage";
import { XpBlock } from "./XpBlock";
import { withLandingDefaults } from "../../trackFormUtils";

/** A stable stand-in for a form with no sections, so the memo below doesn't rerun every render. */
const NO_SECTIONS: TrackFormValues["sections"] = [];

interface LandingPageEditorProps {
  /** Null until a brand-new course is first saved. */
  trackId?: string | null;
  /** The saved course is published (ACTIVE) — its share link only resolves then. */
  isPublished?: boolean;
}

/**
 * Editor for `TrackFormValues.landingPage`: the story-led layout of the course's public page.
 * Block list on the left, the selected block's fields on the right. It writes through the
 * builder's own form, so Save draft and Publish persist it; there is no save button here.
 */
export const LandingPageEditor: FC<LandingPageEditorProps> = ({
  trackId = null,
  isPublished = false,
}) => {
  const copy = en.courseLanding;
  const {
    control,
    getValues,
    setValue,
    formState: { isDirty, dirtyFields },
  } = useFormContext<TrackFormValues>();
  const { page, update } = useLandingPage();
  const canUseCourseCopilot = useCanUseCourseCopilot();
  const [selected, setSelected] = useState<LandingBlockKey>("hero");
  const [draftLandingPage, { isLoading: isDrafting }] = useDraftTrackLandingPageMutation();

  const sections = useWatch({ control, name: "sections" }) ?? NO_SECTIONS;
  const isPublicView = useWatch({ control, name: "isPublicView" }) ?? false;
  const publicViewUnsaved = !!dirtyFields.isPublicView;

  const statuses = useMemo(() => computeLandingBlockStatuses(page, sections), [page, sections]);
  const { ready, total } = countReadyBlocks(statuses);

  /* ------------------------------ Open page ------------------------------ */

  const openPageBlocker = !trackId
    ? copy.openPageUnsaved
    : !isPublicView
      ? copy.openPageNeedsPublicView
      : publicViewUnsaved
        ? copy.openPagePendingPublicView
        : !isPublished
          ? copy.openPageNeedsPublish
          : null;

  const openPage = () => {
    if (!trackId || openPageBlocker) return;
    window.open(buildPublicLink(getCourseSharePath(trackId)), "_blank", "noopener,noreferrer");
  };

  /* --------------------------- Draft with Copilot --------------------------- */

  const handleDraft = async () => {
    if (!trackId) return;
    try {
      const { draft } = await draftLandingPage(trackId).unwrap();
      // Read the form again now: the author may have typed while the model was working.
      const { merged, filledCount } = mergeLandingDraft(
        withLandingDefaults(getValues("landingPage")),
        draft,
      );
      if (filledCount === 0) {
        toast.info(copy.draftNothing);
        return;
      }
      setValue("landingPage", merged, { shouldDirty: true });
      toast.success(copy.draftFilled(filledCount));
    } catch (error: any) {
      toast.error(error?.data?.message || copy.draftFailed);
    }
  };

  const draftTooltip = isDirty ? copy.draftUnsaved : copy.draftHint;

  const renderBlock = () => {
    const shared = { page, update };
    switch (selected) {
      case "hero":
        return <HeroBlock {...shared} />;
      case "firstMove":
        return <FirstMoveBlock {...shared} />;
      case "arc":
        return <StoryArcBlock {...shared} sections={sections} />;
      case "outcomes":
        return <OutcomesBlock {...shared} />;
      case "howItPlays":
        return <HowItPlaysBlock {...shared} sections={sections} />;
      case "cast":
        return <CastBlock {...shared} />;
      case "xp":
        return <XpBlock {...shared} />;
      case "contentNotes":
        return <ContentNotesBlock {...shared} />;
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-4xl" data-testid="landing-page-editor">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-typography-900">{copy.title}</h2>
        <p className="text-sm text-typography-700">{copy.explainer}</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-typography-900" data-testid="landing-readiness">
            {copy.readiness(ready, total)}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {trackId && canUseCourseCopilot && (
              <Tooltip label={draftTooltip} align="top">
                <span>
                  <Button
                    variant={ButtonVariant.TEXT}
                    disabled={isDirty || isDrafting}
                    onClick={() => void handleDraft()}
                    aria-busy={isDrafting}
                    className="inline-flex items-center gap-1 px-4 py-1 h-[36px] text-primary-500"
                  >
                    <WandStars className="w-4 h-4" />
                    {isDrafting ? copy.drafting : copy.draftWithCopilot}
                  </Button>
                </span>
              </Tooltip>
            )}
            <Tooltip label={openPageBlocker ?? copy.openPageHint} align="top">
              <span>
                <Button
                  variant={ButtonVariant.TEXT}
                  disabled={openPageBlocker !== null}
                  onClick={openPage}
                  className="inline-flex items-center gap-1 px-4 py-1 h-[36px] text-primary-500"
                >
                  <Launch className="w-4 h-4" />
                  {copy.openPage}
                </Button>
              </span>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
        <div className="w-full md:w-64 md:flex-shrink-0">
          <LandingBlockList
            statuses={statuses}
            selected={selected}
            onSelect={setSelected}
            page={page}
            onToggle={(key, enabled) => {
              update(draft => {
                draft[key].enabled = enabled;
              });
            }}
          />
        </div>
        <div className="flex-1 min-w-0 w-full border border-border-light rounded-md p-4">
          {renderBlock()}
        </div>
      </div>
    </div>
  );
};
