import React, { useState } from "react";

import { toast } from "sonner";

import { TextArea, TextInput, ComposedModal, ModalBody } from "@ally-ui-mono/ui-shared";
import {
  useCreateRoadmapInterviewNoteMutation,
  useRoadmapAiSummariseMutation,
  useUpdateRoadmapInterviewNoteMutation,
} from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { RoadmapInterviewNote } from "@types";

const TITLE_MAX = 200;
const SUMMARY_MAX = 5000;
/** Matches ROADMAP_LIMITS.INTERVIEW_TRANSCRIPT_MAX on the backend. */
const TRANSCRIPT_MAX = 50000;

interface InterviewModalProps {
  /** null = creating a new note. */
  note: RoadmapInterviewNote | null;
  readOnly?: boolean;
  onClose: () => void;
}

/**
 * Create or edit an interview note.
 *
 * The transcript is optional and exists mainly to feed the summariser: paste the raw call
 * transcript, press Summarise, and the LLM produces the skimmable summary a PM actually reads.
 * The result lands in an editable field rather than being saved directly — the model is a first
 * draft, not an authority.
 *
 * Summary is PLAIN TEXT, not rich text. The backend generates it as prose with plain-text
 * headings and "- " bullets, so putting a TipTap HTML editor here would force either fragile
 * HTML emission from the model or a lossy markdown/HTML round trip on the most-used path.
 */
export const InterviewModal: React.FC<InterviewModalProps> = ({
  note,
  readOnly = false,
  onClose,
}) => {
  const [title, setTitle] = useState(note?.title ?? "");
  const [interviewee, setInterviewee] = useState(note?.interviewee ?? "");
  const [transcript, setTranscript] = useState(note?.transcript ?? "");
  const [summary, setSummary] = useState(note?.summary ?? "");

  const [createNote, { isLoading: isCreating }] = useCreateRoadmapInterviewNoteMutation();
  const [updateNote, { isLoading: isUpdating }] = useUpdateRoadmapInterviewNoteMutation();
  const [summarise, { isLoading: isSummarising }] = useRoadmapAiSummariseMutation();

  const isSaving = isCreating || isUpdating;

  const runSummarise = async () => {
    const text = transcript.trim();
    if (!text) return;
    try {
      const result = await summarise({ transcript: text }).unwrap();
      if (result.text?.trim()) {
        setSummary(result.text.trim());
        toast.success("Summarised — edit freely before saving.");
      } else {
        toast.error("The summariser returned nothing usable.");
      }
    } catch {
      toast.error("Could not summarise that transcript right now.");
    }
  };

  const save = async () => {
    const payload = {
      title: title.trim(),
      interviewee: interviewee.trim() || null,
      transcript: transcript.trim() || null,
      summary: summary.trim(),
    };
    try {
      if (note) {
        await updateNote({ id: note.id, body: payload }).unwrap();
        toast.success("Interview note saved.");
      } else {
        await createNote(payload).unwrap();
        toast.success("Interview note added.");
      }
      onClose();
    } catch (error) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ?? "Could not save that note.";
      toast.error(message);
    }
  };

  const canSave =
    !readOnly &&
    title.trim().length > 0 &&
    title.length <= TITLE_MAX &&
    summary.trim().length > 0 &&
    summary.length <= SUMMARY_MAX &&
    !isSaving;

  return (
    <ComposedModal open onClose={onClose} size="lg">
      <ModalBody>
        <div className="flex flex-col gap-4">
          <h2 className="text-typography-primary text-xl">
            {note ? (readOnly ? "Interview note" : "Edit interview note") : "New interview note"}
          </h2>

          <div className="flex gap-3">
            <TextInput
              id="interview-title"
              labelText="Title"
              value={title}
              readOnly={readOnly}
              maxLength={TITLE_MAX}
              placeholder="Counsellor onboarding call"
              onChange={event => setTitle(event.target.value)}
            />
            <TextInput
              id="interview-interviewee"
              labelText="Interviewee (optional)"
              value={interviewee}
              readOnly={readOnly}
              placeholder="Name, role, or leave blank to anonymise"
              onChange={event => setInterviewee(event.target.value)}
            />
          </div>

          <TextArea
            id="interview-transcript"
            labelText="Transcript (optional)"
            helperText="Paste the raw call transcript to generate a summary from it."
            rows={6}
            value={transcript}
            readOnly={readOnly}
            maxLength={TRANSCRIPT_MAX}
            onChange={event => setTranscript(event.target.value)}
            className="font-mono"
          />

          {!readOnly && (
            <div className="flex items-center gap-2">
              <Button
                variant={ButtonVariant.SECONDARY}
                onClick={runSummarise}
                disabled={!transcript.trim() || isSummarising}
              >
                {isSummarising ? "Summarising…" : "Summarise transcript"}
              </Button>
              <span className="text-typography-secondary text-xs">
                Produces a first draft you can edit — it is never saved without your review.
              </span>
            </div>
          )}

          <TextArea
            id="interview-summary"
            labelText="Summary"
            rows={10}
            value={summary}
            readOnly={readOnly}
            maxLength={SUMMARY_MAX}
            maxCount={SUMMARY_MAX}
            enableCounter
            placeholder="Themes, pain points, feature requests, notable quotes."
            onChange={event => setSummary(event.target.value)}
          />

          <div className="flex justify-end gap-2">
            <Button variant={ButtonVariant.SECONDARY} onClick={onClose}>
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly && (
              <Button variant={ButtonVariant.PRIMARY} onClick={save} disabled={!canSave}>
                {isSaving ? "Saving…" : note ? "Save changes" : "Add interview"}
              </Button>
            )}
          </div>
        </div>
      </ModalBody>
    </ComposedModal>
  );
};
