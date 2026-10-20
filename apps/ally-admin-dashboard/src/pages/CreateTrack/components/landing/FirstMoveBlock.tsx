import { FC } from "react";

import { Trash } from "@assets";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { LANDING_LIMITS } from "@types";

import { LandingBlockPanel, LandingTextField, hintClass } from "./LandingFields";
import { LandingBlockProps } from "./landingTypes";

export const FirstMoveBlock: FC<LandingBlockProps> = ({ page, update }) => {
  const copy = en.courseLanding.firstMove;
  const { firstMove } = page;
  const atMax = firstMove.replies.length >= LANDING_LIMITS.repliesMax;

  return (
    <LandingBlockPanel
      title={en.courseLanding.blocks.firstMove}
      fallback={en.courseLanding.fallback.firstMove}
      isOff={!firstMove.enabled}
      intro={copy.helper}
    >
      <LandingTextField
        label={copy.sceneLine.label}
        value={firstMove.sceneLine}
        onChange={value => {
          update(draft => {
            draft.firstMove.sceneLine = value;
          });
        }}
        max={LANDING_LIMITS.sceneLineMax}
        placeholder={copy.sceneLine.placeholder}
        hint={copy.sceneLine.hint}
      />
      <LandingTextField
        label={copy.personaLine.label}
        value={firstMove.personaLine}
        onChange={value => {
          update(draft => {
            draft.firstMove.personaLine = value;
          });
        }}
        max={LANDING_LIMITS.personaLineMax}
        placeholder={copy.personaLine.placeholder}
        hint={copy.personaLine.hint}
        multiline
      />
      <LandingTextField
        label={copy.prompt.label}
        value={firstMove.prompt}
        onChange={value => {
          update(draft => {
            draft.firstMove.prompt = value;
          });
        }}
        max={LANDING_LIMITS.promptMax}
        placeholder={copy.prompt.placeholder}
        hint={copy.prompt.hint}
      />

      <div className="flex flex-col gap-3 border-t border-border-light pt-4">
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-semibold text-typography-900">{copy.repliesHeading}</h4>
          <span className={hintClass}>
            {copy.repliesHint(LANDING_LIMITS.repliesMin, LANDING_LIMITS.repliesMax)}
          </span>
        </div>

        {firstMove.replies.map((reply, index) => (
          <div
            key={index}
            className="flex flex-col gap-3 border border-border-light rounded-md p-3"
            data-testid="landing-reply"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-typography-900">
                {copy.replyHeading(index + 1)}
              </span>
              <button
                type="button"
                onClick={() => {
                  update(draft => {
                    draft.firstMove.replies.splice(index, 1);
                  });
                }}
                aria-label={copy.removeReply(index + 1)}
                className="inline-flex items-center gap-1 text-xs text-destructive-500 hover:text-destructive-600"
              >
                <Trash className="w-3.5 h-3.5" />
                {copy.remove}
              </button>
            </div>
            <LandingTextField
              label={copy.replyText.label}
              value={reply.text || null}
              onChange={value => {
                update(draft => {
                  draft.firstMove.replies[index].text = value ?? "";
                });
              }}
              max={LANDING_LIMITS.replyTextMax}
              placeholder={copy.replyText.placeholder}
              multiline
            />
            <LandingTextField
              label={copy.replyLabel.label}
              value={reply.label || null}
              onChange={value => {
                update(draft => {
                  draft.firstMove.replies[index].label = value ?? "";
                });
              }}
              max={LANDING_LIMITS.replyLabelMax}
              placeholder={copy.replyLabel.placeholder}
              tooltip={copy.replyLabel.tooltip}
            />
            <LandingTextField
              label={copy.replyWhy.label}
              value={reply.why}
              onChange={value => {
                update(draft => {
                  draft.firstMove.replies[index].why = value;
                });
              }}
              max={LANDING_LIMITS.replyWhyMax}
              placeholder={copy.replyWhy.placeholder}
              hint={copy.replyWhy.hint}
              multiline
            />
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={ButtonVariant.SECONDARY}
            className="!h-9 text-sm"
            disabled={atMax}
            onClick={() => {
              update(draft => {
                draft.firstMove.replies.push({ text: "", label: "", why: null });
              });
            }}
          >
            {copy.addReply}
          </Button>
          {atMax && <span className={hintClass}>{copy.maxReplies(LANDING_LIMITS.repliesMax)}</span>}
        </div>
      </div>
    </LandingBlockPanel>
  );
};
