import { FC, useEffect, useRef } from "react";

import { useGetPromptsQuery } from "@api";
import { Close } from "@assets";
import { AGENT_BUILDER_SYSTEM_PROMPT_CODE, en, KeyboardKeys } from "@constants";

interface AgentBuilderSystemSkillPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const TITLE_ID = "system-skill-panel-title";

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

  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Carbon-style dialog behaviors (Carbon's Modal gives these for free; this is
  // a custom panel, so they're wired up by hand): ESC closes, the body scroll
  // is locked while open, focus moves into the panel and returns to the trigger
  // on close, and Tab is trapped within the panel. No shared focus-trap util
  // exists in the app, so the trap is inlined here.
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === KeyboardKeys.ESCAPE) {
        onClose();
        return;
      }
      if (event.key !== KeyboardKeys.TAB) return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener(KeyboardKeys.KEYDOWN, handleKeyDown);
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener(KeyboardKeys.KEYDOWN, handleKeyDown);
      document.body.style.overflow = "unset";
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-neutral-900 bg-opacity-50" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        className="w-[50%] min-w-[600px] max-w-[760px] bg-white shadow-xl border-l border-border-light flex flex-col"
      >
        <div className="flex items-center justify-between p-6 shrink-0">
          <h2 id={TITLE_ID} className="text-base font-tertiary font-[500] text-neutral-900">
            {en.simulation.agentBuilder.systemSkillPanelTitle}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={en.simulation.agentBuilder.systemSkillCloseLabel}
            className="text-neutral-600 hover:text-neutral-900"
          >
            <Close width={16} height={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-10 pb-8 overflow-y-auto custom-scrollbar">
          <p className="text-sm text-neutral-600">
            {en.simulation.agentBuilder.systemSkillPanelSubtitle}
          </p>

          {isFetching && !skill && (
            <div className="text-sm text-neutral-600">
              {en.simulation.agentBuilder.systemSkillLoading}
            </div>
          )}

          {!isFetching && !skill && (
            <div className="text-sm text-neutral-600">
              {en.simulation.agentBuilder.systemSkillNotFound}
            </div>
          )}

          {skill && (
            <>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-neutral-600">
                  {en.simulation.agentBuilder.systemSkillNameLabel}
                </span>
                <span className="text-base text-neutral-900">{skill.name}</span>
              </div>

              {skill.description && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-neutral-600">
                    {en.simulation.agentBuilder.systemSkillDescriptionLabel}
                  </span>
                  <span className="text-sm text-neutral-900">{skill.description}</span>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <span className="text-xs text-neutral-600">
                  {en.simulation.agentBuilder.systemSkillPromptLabel}
                </span>
                <pre className="whitespace-pre-wrap break-words font-mono text-sm bg-neutral-50 border border-border-light p-4 text-neutral-900">
                  {skill.prompt}
                </pre>
              </div>

              <p className="text-xs text-neutral-500">
                {en.simulation.agentBuilder.systemSkillManagedNote}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
