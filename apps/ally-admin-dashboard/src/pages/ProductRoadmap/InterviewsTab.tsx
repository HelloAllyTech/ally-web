import React, { useState } from "react";

import { toast } from "sonner";

import { SkeletonText } from "@ally-ui-mono/ui-shared";
import { useDeleteRoadmapInterviewNoteMutation, useGetRoadmapInterviewNotesQuery } from "@api";
import { ActionConfirmationPopup, Button, EmptyState, ListToolbar } from "@components";
import { ButtonVariant } from "@components/types";
import { RoadmapInterviewNote } from "@types";

import { InterviewModal } from "./InterviewModal";

interface InterviewsTabProps {
  canVote: boolean;
  canManage: boolean;
  /** Ally user id of the viewer, so author-only affordances resolve without another fetch. */
  currentUserId?: number;
}

/**
 * User interviews — the qualitative half of the board.
 *
 * Votes tell you WHAT people want prioritised; these notes tell you WHY. The source kept them
 * as a sibling top-level tab for that reason, and this keeps the same shape.
 *
 * Authorship rules mirror the backend: the author OR a manager may edit and delete. Unlike
 * comments, a research note is a shared artefact rather than someone's speech, so managers can
 * correct it. The backend enforces this independently — hiding the buttons is a courtesy.
 */
export const InterviewsTab: React.FC<InterviewsTabProps> = ({
  canVote,
  canManage,
  currentUserId,
}) => {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<RoadmapInterviewNote | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoadmapInterviewNote | null>(null);

  const { data, isLoading } = useGetRoadmapInterviewNotesQuery({
    search: search.trim() || undefined,
  });
  const [deleteNote, { isLoading: isDeleting }] = useDeleteRoadmapInterviewNoteMutation();

  const notes = data?.items ?? [];
  const mayMutate = (note: RoadmapInterviewNote) =>
    canManage || (!!currentUserId && note.createdBy === currentUserId);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteNote(deleteTarget.id).unwrap();
      toast.success("Interview note deleted.");
      setDeleteTarget(null);
    } catch (error) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ?? "Could not delete that note.";
      toast.error(message);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        placeholder="Search interviews"
        action={
          canVote
            ? {
                label: "New interview",
                onClick: () => setIsCreating(true),
                variant: ButtonVariant.PRIMARY,
              }
            : undefined
        }
      />

      {isLoading ? (
        <SkeletonText paragraph lineCount={6} />
      ) : notes.length === 0 ? (
        <EmptyState
          title="No interview notes yet"
          subtitle={
            search
              ? "No interviews match that search."
              : "Capture what users actually said, so the votes have context."
          }
          {...(canVote && !search
            ? { actionLabel: "New interview", onAction: () => setIsCreating(true) }
            : {})}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map(note => (
            <li key={note.id} className="border border-border-light p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-typography-primary text-base">{note.title}</h3>
                  <div className="text-typography-secondary mt-0.5 text-xs">
                    {note.interviewee ? `${note.interviewee} · ` : ""}
                    {new Date(note.createdAt).toISOString().slice(0, 10)}
                    {note.transcript ? " · transcript attached" : ""}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant={ButtonVariant.TEXT} onClick={() => setEditing(note)}>
                    {mayMutate(note) ? "Edit" : "View"}
                  </Button>
                  {mayMutate(note) && (
                    <Button variant={ButtonVariant.TEXT} onClick={() => setDeleteTarget(note)}>
                      Delete
                    </Button>
                  )}
                </div>
              </div>
              {/* Plain text, whitespace preserved — the summary is LLM-generated prose with
                  plain-text headings and "- " bullets, deliberately not HTML. */}
              <p className="text-typography-primary mt-3 text-sm whitespace-pre-wrap">
                {note.summary}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="text-typography-secondary text-xs">
        {data ? `${notes.length} of ${data.count} interviews` : null}
      </div>

      {(isCreating || editing) && (
        <InterviewModal
          note={editing}
          readOnly={!!editing && !mayMutate(editing)}
          onClose={() => {
            setIsCreating(false);
            setEditing(null);
          }}
        />
      )}

      <ActionConfirmationPopup
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete interview note"
        titleItalic={deleteTarget?.title}
        description="This removes the note and its transcript. This cannot be undone."
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
