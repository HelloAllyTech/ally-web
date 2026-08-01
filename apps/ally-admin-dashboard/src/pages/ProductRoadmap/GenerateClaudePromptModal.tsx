import React, { useEffect, useState } from "react";

import { toast } from "sonner";

import { ComposedModal, ModalBody, SkeletonText, TextArea } from "@ally-ui-mono/ui-shared";
import { useRoadmapAiGenerateClaudePromptMutation } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";

interface GenerateClaudePromptModalProps {
  description: string;
  prd: string;
  /** Fills the drawer's "Claude Code prompt" field. Not persisted until the drawer is saved. */
  onApply: (text: string) => void;
  onClose: () => void;
}

/**
 * Generates a ready-to-paste Claude Code implementation brief from an opportunity's description
 * and optional PRD, then lets the caller tweak it before using it — same generate → edit shape as
 * ReleaseNoteComposer's draft step. This modal itself never saves anything: "Use this prompt"
 * hands the text back to the drawer's field, which is only persisted by its own Save changes.
 */
export const GenerateClaudePromptModal: React.FC<GenerateClaudePromptModalProps> = ({
  description,
  prd,
  onApply,
  onClose,
}) => {
  const [prompt, setPrompt] = useState("");
  const [generate, { isLoading }] = useRoadmapAiGenerateClaudePromptMutation();

  // Fire once on open rather than on every render — the inputs are a snapshot of the drawer at
  // the moment this was opened, not a live subscription to further edits there.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await generate({ description, prd: prd || undefined }).unwrap();
        if (!cancelled) setPrompt(result.text ?? "");
      } catch (error) {
        if (cancelled) return;
        const message =
          (error as { data?: { message?: string } })?.data?.message ??
          "Could not generate a prompt right now.";
        toast.error(message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success("Prompt copied.");
    } catch {
      toast.error("Could not copy the prompt.");
    }
  };

  const apply = () => {
    onApply(prompt.trim());
    toast.success("Added to the opportunity — click Save changes to keep it.");
    onClose();
  };

  return (
    <ComposedModal open onClose={onClose} size="lg">
      <ModalBody>
        <div className="flex flex-col gap-4">
          <h2 className="text-typography-primary text-xl">Claude Code prompt</h2>

          {isLoading && !prompt ? (
            <SkeletonText paragraph lineCount={8} />
          ) : (
            <TextArea
              id="claude-prompt-output"
              labelText="Edit before copying if needed"
              rows={16}
              value={prompt}
              onChange={event => setPrompt(event.target.value)}
              className="font-mono"
            />
          )}

          <div className="flex justify-end gap-2">
            <Button variant={ButtonVariant.SECONDARY} onClick={onClose}>
              Cancel
            </Button>
            <Button variant={ButtonVariant.SECONDARY} onClick={copy} disabled={!prompt.trim()}>
              Copy
            </Button>
            <Button variant={ButtonVariant.PRIMARY} onClick={apply} disabled={!prompt.trim()}>
              Use this prompt
            </Button>
          </div>
        </div>
      </ModalBody>
    </ComposedModal>
  );
};
