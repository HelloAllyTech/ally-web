import React, { useEffect, useState } from "react";

import { toast } from "sonner";

import { AutoExpandableTextarea, TextInput } from "@ally-ui-mono/ui-shared";
import { useCreateDocumentFromWaUnansweredMutation } from "@api";
import { EntityField, EntitySidePanel } from "@components";
import { en } from "@constants";
import { WaUnansweredQuestion } from "@types";

interface UnansweredAnswerPanelProps {
  /** Null closes the panel. */
  question: WaUnansweredQuestion | null;
  onClose: () => void;
}

/**
 * Close a corpus gap: write the answer, and it becomes a retrievable document.
 *
 * The question is shown but never used as the document body. A document whose content is the
 * question embeds beautifully against that question and contains no answer — the bot would confidently
 * cite it while saying nothing useful, which is worse than the honest decline it gives today.
 *
 * The title is not prefilled from the question either, for the same reason at the retrieval level: a
 * title like "how do I handle a client who won't talk" describes one worker's phrasing, while
 * "Engaging a withdrawn client" describes the material and retrieves for everyone who needs it.
 */
export const UnansweredAnswerPanel: React.FC<UnansweredAnswerPanelProps> = ({
  question,
  onClose,
}) => {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [createDocument, { isLoading }] = useCreateDocumentFromWaUnansweredMutation();

  useEffect(() => {
    setTitle("");
    setText("");
  }, [question?.id]);

  const trimmedTitle = title.trim();
  const trimmedText = text.trim();
  const saveDisabledReason = !trimmedTitle
    ? en.whatsappBot.unanswered.answerTitleRequired
    : !trimmedText
      ? en.whatsappBot.unanswered.answerTextRequired
      : undefined;

  const handleSave = async () => {
    if (!question || saveDisabledReason) return;
    try {
      await createDocument({
        id: question.id,
        title: trimmedTitle,
        text: trimmedText,
      }).unwrap();
      // Says "will be searchable once indexing finishes", not "done": the document exists but its
      // chunks are still being embedded, and claiming otherwise would have an admin test a question
      // that cannot work yet.
      toast.success(en.whatsappBot.unanswered.answerSaved);
      onClose();
    } catch {
      toast.error(en.whatsappBot.unanswered.answerFailed);
    }
  };

  return (
    <EntitySidePanel
      isOpen={Boolean(question)}
      title={en.whatsappBot.unanswered.answerHeading}
      dirty={Boolean(trimmedTitle || trimmedText)}
      saveDisabled={Boolean(saveDisabledReason) || isLoading}
      saveDisabledReason={saveDisabledReason}
      unsavedChangesWarning={en.common.thisActionCannotBeUndone}
      onClose={onClose}
      onSave={() => void handleSave()}
    >
      <p className="text-sm text-typography-600">{en.whatsappBot.unanswered.answerIntro}</p>

      <EntityField label={en.whatsappBot.unanswered.answerQuestionLabel}>
        <p className="rounded bg-neutral-100 px-3 py-2 text-sm text-typography-800">
          {question?.questionText}
        </p>
      </EntityField>

      <EntityField label={en.whatsappBot.unanswered.answerTitleLabel} required>
        <TextInput
          id="wa-answer-title"
          labelText=""
          placeholder={en.whatsappBot.unanswered.answerTitlePlaceholder}
          value={title}
          onChange={event => setTitle(event.target.value)}
        />
      </EntityField>

      <EntityField label={en.whatsappBot.unanswered.answerTextLabel} required>
        <AutoExpandableTextarea
          value={text}
          onChange={setText}
          placeholder={en.whatsappBot.unanswered.answerTextPlaceholder}
          minHeight={220}
        />
      </EntityField>
    </EntitySidePanel>
  );
};
