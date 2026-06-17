import { FC } from "react";

import { useGetPromptsQuery } from "@api";
import { DoubleArrowRight } from "@assets";
import { AGENT_BUILDER_SYSTEM_PROMPT_CODE, en } from "@constants";

interface AgentBuilderSystemSkillPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Read-only side panel (slides in from the right) that shows the "system skill"
 * — the backend prompt template — that powers the Agent Builder Copilot's
 * Generate/Regenerate. The prompt is looked up by code via the prompts API;
 * `searchName` matches `promptCode` ILIKE server-side, so the code alone
 * locates the single "Agent Builder System Prompt" row. Display only: editing
 * the skill happens under System Skills.
 */
export const AgentBuilderSystemSkillPanel: FC<AgentBuilderSystemSkillPanelProps> = ({
  isOpen,
  onClose,
}) => {
  // Only fetch while the panel is open — the icon is always visible but the
  // skill is rarely viewed, so there's no reason to load it on tab mount.
  const { data: prompts, isFetching } = useGetPromptsQuery(
    { searchName: AGENT_BUILDER_SYSTEM_PROMPT_CODE },
    { skip: !isOpen },
  );

  const skill =
    prompts?.find(prompt => prompt.promptCode === AGENT_BUILDER_SYSTEM_PROMPT_CODE) ?? null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={onClose} />
      <div className="w-[50%] min-w-[600px] max-w-[760px] bg-white shadow-xl border-l border-border-light flex flex-col">
        <div className="flex items-center justify-between p-6 shrink-0">
          <button
            onClick={onClose}
            className="flex flex-row items-center justify-center gap-2 text-typography-600 hover:text-neutral-800"
          >
            <DoubleArrowRight width={14} height={14} />
            <span className="text-base font-tertiary font-[500] text-typography-900">
              {en.simulation.agentBuilder.systemSkillPanelTitle}
            </span>
          </button>
        </div>

        <div className="flex flex-col gap-4 px-10 pb-8 overflow-y-auto custom-scrollbar">
          <p className="text-sm text-typography-700">
            {en.simulation.agentBuilder.systemSkillPanelSubtitle}
          </p>

          {isFetching && !skill && (
            <div className="text-sm text-typography-600">
              {en.simulation.agentBuilder.systemSkillLoading}
            </div>
          )}

          {!isFetching && !skill && (
            <div className="text-sm text-typography-600">
              {en.simulation.agentBuilder.systemSkillNotFound}
            </div>
          )}

          {skill && (
            <>
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-typography-500">
                  {en.simulation.agentBuilder.systemSkillNameLabel}
                </span>
                <span className="text-base text-typography-900">{skill.name}</span>
              </div>

              {skill.description && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-typography-500">
                    {en.simulation.agentBuilder.systemSkillDescriptionLabel}
                  </span>
                  <span className="text-sm text-typography-700">{skill.description}</span>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-typography-500">
                  {en.simulation.agentBuilder.systemSkillPromptLabel}
                </span>
                <pre className="whitespace-pre-wrap break-words font-mono text-sm bg-neutral-50 border border-border-light rounded-md p-4 text-typography-800">
                  {skill.prompt}
                </pre>
              </div>

              <p className="text-xs text-typography-500">
                {en.simulation.agentBuilder.systemSkillManagedNote}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
