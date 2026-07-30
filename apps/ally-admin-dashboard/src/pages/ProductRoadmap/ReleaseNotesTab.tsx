import React, { useMemo, useState } from "react";

import { toast } from "sonner";

import { SkeletonText } from "@ally-ui-mono/ui-shared";
import {
  useDeleteRoadmapReleaseNoteMutation,
  useGetRoadmapOpportunitiesQuery,
  useGetRoadmapReleaseNotesQuery,
} from "@api";
import { ActionConfirmationPopup, Button, EmptyState } from "@components";
import { ButtonVariant } from "@components/types";
import { RoadmapOpportunitiesQuery, RoadmapOpportunityStage, RoadmapReleaseNote } from "@types";

import { ReleaseNoteComposer } from "./ReleaseNoteComposer";

interface ReleaseNotesTabProps {
  canManage: boolean;
}

/**
 * Release notes: pick released opportunities, let the LLM draft categorised notes, edit, save.
 *
 * READ is VIEW-gated but WRITE is EDIT-gated, which is why this tab renders for everyone who can
 * see the board while the compose/edit/delete affordances need `canManage`. That read gate is a
 * deliberate divergence from a literal RLS port: the source's policy was admin-only for SELECT
 * too, but because RLS filters rows rather than rejecting requests, a non-admin got `200 []` and
 * the client relied on that. Release notes are also the most shareable artefact here.
 *
 * Worth knowing: this feature shipped in the standalone app on 2026-07-01 and had ZERO rows in
 * production at migration time. If it stays unused, this tab is the first thing to cut.
 */
export const ReleaseNotesTab: React.FC<ReleaseNotesTabProps> = ({ canManage }) => {
  const [isComposing, setIsComposing] = useState(false);
  const [editing, setEditing] = useState<RoadmapReleaseNote | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoadmapReleaseNote | null>(null);

  const { data, isLoading } = useGetRoadmapReleaseNotesQuery();
  const [deleteNote, { isLoading: isDeleting }] = useDeleteRoadmapReleaseNoteMutation();

  /**
   * The composer's pick-list, owned here rather than inside the modal — see the note on
   * ReleaseNoteComposerProps.released. A high limit because this is a pick-list, not a paged
   * board, and one memoised arg object so the cache key stays stable.
   */
  const releasedQuery = useMemo<RoadmapOpportunitiesQuery>(
    () => ({
      stage: [RoadmapOpportunityStage.RELEASED],
      sortBy: "releasedAt",
      order: "DESC",
      limit: 200,
      offset: 0,
    }),
    [],
  );
  const { data: releasedData, isLoading: isLoadingReleased } = useGetRoadmapOpportunitiesQuery(
    releasedQuery,
    { skip: !canManage },
  );

  const notes = data?.items ?? [];

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteNote(deleteTarget.id).unwrap();
      toast.success("Release notes deleted.");
      setDeleteTarget(null);
    } catch (error) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ??
        "Could not delete those notes.";
      toast.error(message);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <p className="text-typography-secondary max-w-2xl text-sm">
          Draft notes from opportunities that have actually shipped. Selections that are not in the
          released stage are filtered out before the model sees them.
        </p>
        {canManage && (
          <Button
            variant={ButtonVariant.PRIMARY}
            onClick={() => {
              setEditing(null);
              setIsComposing(true);
            }}
          >
            New release notes
          </Button>
        )}
      </div>

      {isLoading ? (
        <SkeletonText paragraph lineCount={6} />
      ) : notes.length === 0 ? (
        <EmptyState
          title="No release notes yet"
          subtitle={
            canManage
              ? "Pick what shipped and let the draft write itself."
              : "Nothing has been published yet."
          }
          {...(canManage
            ? { actionLabel: "New release notes", onAction: () => setIsComposing(true) }
            : {})}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map(note => (
            <li key={note.id} className="border border-border-light p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-typography-primary text-base">
                    {note.title || "Untitled release"}
                  </h3>
                  <div className="text-typography-secondary mt-0.5 text-xs">
                    {new Date(note.createdAt).toISOString().slice(0, 10)}
                    {" · "}
                    {note.opportunityIds.length} opportunit
                    {note.opportunityIds.length === 1 ? "y" : "ies"}
                  </div>
                </div>
                {canManage && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant={ButtonVariant.TEXT}
                      onClick={() => {
                        setEditing(note);
                        setIsComposing(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant={ButtonVariant.TEXT} onClick={() => setDeleteTarget(note)}>
                      Delete
                    </Button>
                  </div>
                )}
              </div>
              {/* Plain text with whitespace preserved: the model emits categorised prose with
                  plain-text headings, not HTML. */}
              <p className="text-typography-primary mt-3 text-sm whitespace-pre-wrap">
                {note.content}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="text-typography-secondary text-xs">
        {data ? `${notes.length} of ${data.count} published sets` : null}
      </div>

      {isComposing && (
        <ReleaseNoteComposer
          note={editing}
          released={releasedData?.items ?? []}
          isLoadingReleased={isLoadingReleased}
          onClose={() => {
            setIsComposing(false);
            setEditing(null);
          }}
        />
      )}

      <ActionConfirmationPopup
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete release notes"
        titleItalic={deleteTarget?.title ?? undefined}
        description="This removes the published notes. The opportunities they were generated from are unaffected."
        primaryButton={{
          label: isDeleting ? "Deleting…" : "Delete",
          onClick: confirmDelete,
          variant: ButtonVariant.DESTRUCTIVE,
        }}
        secondaryButton={{
          label: "Cancel",
          onClick: () => setDeleteTarget(null),
          variant: ButtonVariant.SECONDARY,
        }}
      />
    </div>
  );
};
