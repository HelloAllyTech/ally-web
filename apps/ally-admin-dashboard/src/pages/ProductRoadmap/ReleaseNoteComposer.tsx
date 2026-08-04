import React, { useState } from "react";

import { toast } from "sonner";

import {
  SkeletonText,
  TextArea,
  TextInput,
  ComposedModal,
  ModalBody,
} from "@ally-ui-mono/ui-shared";
import {
  useCreateRoadmapReleaseNoteMutation,
  useRoadmapAiReleaseNotesMutation,
  useUpdateRoadmapReleaseNoteMutation,
} from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { RoadmapOpportunity, RoadmapReleaseNote } from "@types";

const TITLE_MAX = 200;
const CONTENT_MAX = 20000;

interface ReleaseNoteComposerProps {
  /** null = composing a new set. */
  note: RoadmapReleaseNote | null;
  /**
   * Released opportunities to choose from, owned by ReleaseNotesTab.
   *
   * Deliberately a PROP, not a query inside this modal. A second subscription to
   * getRoadmapOpportunities created on modal mount never settled — isFetching stayed true
   * forever even though the cache entry for those exact args was fulfilled — so the pick-list
   * lives with the stable parent instead. It is also simply better placement: this is the
   * tab's data, not modal state, and lifting it avoids re-fetching 200 rows on every open.
   */
  released: RoadmapOpportunity[];
  isLoadingReleased: boolean;
  onClose: () => void;
}

/**
 * Two-phase composer: SELECT released opportunities → GENERATE a draft → EDIT → SAVE.
 *
 * Only released opportunities are offered. The backend filters the selection to
 * stage=released again before the model sees it, because the board lets you multi-select before
 * a stage change has actually landed.
 *
 * Editing an existing set UPDATES it rather than inserting a duplicate — a bug worth naming,
 * since the natural "generate again then save" flow would otherwise create a second record every
 * time someone tweaked wording.
 *
 * `opportunityIds` is stored as a denormalised snapshot of what the notes were generated from,
 * deliberately not a join. Because opportunities are soft-deleted in Ally, those ids stay
 * resolvable even after a merge — an improvement on the source, which left dangling uuids.
 */
export const ReleaseNoteComposer: React.FC<ReleaseNoteComposerProps> = ({
  note,
  released,
  isLoadingReleased,
  onClose,
}) => {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(note?.opportunityIds ?? []));
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");

  const [generate, { isLoading: isGenerating }] = useRoadmapAiReleaseNotesMutation();
  const [createNote, { isLoading: isCreating }] = useCreateRoadmapReleaseNoteMutation();
  const [updateNote, { isLoading: isUpdating }] = useUpdateRoadmapReleaseNoteMutation();

  const isSaving = isCreating || isUpdating;

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const runGenerate = async () => {
    if (selected.size === 0) return;
    try {
      const result = await generate({ opportunityIds: [...selected] }).unwrap();
      if (result.text?.trim()) {
        setContent(result.text.trim());
        toast.success("Draft ready — edit before publishing.");
      } else {
        toast.error("The generator returned nothing usable.");
      }
    } catch (error) {
      // 404 when none of the selection is actually released — surface the backend's message.
      const message =
        (error as { data?: { message?: string } })?.data?.message ??
        "Could not generate a draft right now.";
      toast.error(message);
    }
  };

  const save = async () => {
    const payload = {
      title: title.trim() || null,
      content: content.trim(),
      opportunityIds: [...selected],
    };
    try {
      if (note) {
        await updateNote({ id: note.id, body: payload }).unwrap();
        toast.success("Release notes updated.");
      } else {
        await createNote(payload).unwrap();
        toast.success("Release notes published.");
      }
      onClose();
    } catch (error) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ?? "Could not save those notes.";
      toast.error(message);
    }
  };

  const canSave = content.trim().length > 0 && content.length <= CONTENT_MAX && !isSaving;

  return (
    <ComposedModal open onClose={onClose} size="lg">
      <ModalBody>
        <div className="flex flex-col gap-4">
          <h2 className="text-typography-primary text-xl">
            {note ? "Edit release notes" : "New release notes"}
          </h2>

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-typography-primary text-sm">
                What shipped? ({selected.size} selected)
              </h3>
              <div className="flex gap-1">
                <Button
                  variant={ButtonVariant.TEXT}
                  onClick={() => setSelected(new Set(released.map(o => o.id)))}
                  disabled={released.length === 0}
                >
                  Select all
                </Button>
                <Button
                  variant={ButtonVariant.TEXT}
                  onClick={() => setSelected(new Set())}
                  disabled={selected.size === 0}
                >
                  Clear
                </Button>
              </div>
            </div>

            {isLoadingReleased ? (
              <SkeletonText paragraph lineCount={4} />
            ) : released.length === 0 ? (
              <p className="text-typography-secondary border border-border-light p-3 text-sm">
                Nothing is in the released stage yet. Move opportunities to Released on the board
                first.
              </p>
            ) : (
              // `relative` on the scroll container: Carbon's absolute-positioned internals escape a
              // `static` overflow ancestor and inflate its scrollHeight, producing a phantom second
              // scrollbar.
              <ul className="border-border-light relative max-h-56 overflow-y-auto border">
                {released.map(opportunity => (
                  <li key={opportunity.id} className="border-border-light border-b last:border-b-0">
                    <label className="flex cursor-pointer items-start gap-3 p-2 text-sm hover:bg-background-secondary">
                      <input
                        type="checkbox"
                        checked={selected.has(opportunity.id)}
                        onChange={() => toggle(opportunity.id)}
                        className="mt-1"
                      />
                      <span className="min-w-0">
                        <span className="text-typography-primary">{opportunity.description}</span>
                        <span className="text-typography-secondary block text-xs">
                          {opportunity.type === "bug" ? "Bug" : "Idea"} · {opportunity.productGoal}
                          {opportunity.releasedAt
                            ? ` · released ${opportunity.releasedAt.slice(0, 10)}`
                            : ""}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}

            <div>
              <Button
                variant={ButtonVariant.SECONDARY}
                onClick={runGenerate}
                disabled={selected.size === 0 || isGenerating}
              >
                {isGenerating ? "Drafting…" : `Draft notes from ${selected.size} selected`}
              </Button>
            </div>
          </section>

          <TextInput
            id="release-title"
            labelText="Title (optional)"
            value={title}
            maxLength={TITLE_MAX}
            placeholder="July release"
            onChange={event => setTitle(event.target.value)}
          />

          <TextArea
            id="release-content"
            labelText="Notes"
            rows={12}
            value={content}
            maxLength={CONTENT_MAX}
            maxCount={CONTENT_MAX}
            enableCounter
            placeholder="Generate a draft above, or write it yourself."
            onChange={event => setContent(event.target.value)}
          />

          <div className="flex justify-end gap-2">
            <Button variant={ButtonVariant.SECONDARY} onClick={onClose}>
              Cancel
            </Button>
            <Button variant={ButtonVariant.PRIMARY} onClick={save} disabled={!canSave}>
              {isSaving ? "Saving…" : note ? "Save changes" : "Publish notes"}
            </Button>
          </div>
        </div>
      </ModalBody>
    </ComposedModal>
  );
};
