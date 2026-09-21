import React, { useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import {
  ComposedModal,
  InlineNotification,
  ModalBody,
  Select,
  SelectItem,
  TextArea,
} from "@ally-ui-mono/ui-shared";
import { useAcceptAnalyticsSuggestionMutation, useRoadmapAiDuplicatesMutation } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import {
  AnalyticsSuggestion,
  RoadmapDuplicateMatch,
  RoadmapOpportunityType,
  RoadmapTaxonomyItem,
} from "@types";

/** Mirrors the roadmap's own description limit — this text becomes an opportunity. */
const DESCRIPTION_MAX = 1000;
const DUPLICATE_DEBOUNCE_MS = 700;

interface AcceptSuggestionModalProps {
  suggestion: AnalyticsSuggestion;
  goals: RoadmapTaxonomyItem[];
  onClose: () => void;
  /** Called after a successful file, so the parent can clear its selection. */
  onAccepted: () => void;
}

/**
 * Review a suggestion, then file it.
 *
 * A sibling of ProductRoadmap's AddOpportunityDrawer rather than a reuse of it: that
 * component takes no initial values, hardwires the create mutation, and its
 * duplicate panel navigates into the roadmap drawer — which is the wrong exit from
 * an Analytics tab. The form pieces are the same on purpose, so filing from here
 * and filing from the board feel like one action.
 *
 * The model's draft is prefilled and fully editable. That is the point of the
 * step: what reaches the board is what a person agreed to, not what a model wrote,
 * and the roadmap keeps no marker saying otherwise.
 *
 * The duplicate check is informational here. It cannot navigate anywhere useful
 * from this tab, so it reports what already exists and leaves the judgement to the
 * reader — and like everywhere else it degrades silently, because a dead vector
 * service must never block filing.
 */
export const AcceptSuggestionModal: React.FC<AcceptSuggestionModalProps> = ({
  suggestion,
  goals,
  onClose,
  onAccepted,
}) => {
  const strings = en.analyticsSuggestions;

  const [description, setDescription] = useState(suggestion.body);
  const [type, setType] = useState<RoadmapOpportunityType>(suggestion.suggestedType);
  // The model's goal when it matched a live one; otherwise the reader picks.
  const [productGoal, setProductGoal] = useState(suggestion.suggestedGoal ?? goals[0]?.name ?? "");
  const [duplicates, setDuplicates] = useState<RoadmapDuplicateMatch[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [accept, { isLoading: isFiling }] = useAcceptAnalyticsSuggestionMutation();
  const [checkDuplicates] = useRoadmapAiDuplicatesMutation();

  /** Request-id guard so a slower, older duplicate response cannot win. */
  const requestId = useRef(0);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const trimmed = description.trim();
    if (trimmed.length < 15) {
      setDuplicates([]);
      return undefined;
    }
    debounce.current = setTimeout(async () => {
      const id = ++requestId.current;
      try {
        const result = await checkDuplicates({
          description: trimmed,
          productGoal: productGoal || undefined,
        }).unwrap();
        if (id === requestId.current) setDuplicates(result.matches ?? []);
      } catch {
        // Best-effort by contract.
        if (id === requestId.current) setDuplicates([]);
      }
    }, DUPLICATE_DEBOUNCE_MS);

    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [description, productGoal, checkDuplicates]);

  const submit = async () => {
    const trimmed = description.trim();
    if (!trimmed) {
      setError(strings.descriptionMissing);
      return;
    }
    if (!productGoal) {
      setError(strings.goalMissing);
      return;
    }
    setError(null);

    try {
      await accept({
        id: suggestion.id,
        body: { description: trimmed, productGoal, type },
      }).unwrap();
      toast.success(strings.accepted);
      onAccepted();
      onClose();
    } catch (caught) {
      const status = (caught as { status?: number })?.status;
      const message =
        (caught as { data?: { message?: string } })?.data?.message ?? strings.acceptFailed;
      // 409 means somebody else already decided this card. Closing is the honest
      // response: the refetch will show its real state, and keeping the form open
      // would invite a second attempt at something already done.
      if (status === 409) {
        toast.error(message);
        onAccepted();
        onClose();
        return;
      }
      setError(message);
    }
  };

  return (
    <ComposedModal open onClose={onClose} size="lg">
      <ModalBody>
        <div className="flex flex-col gap-4">
          <h2 className="text-typography-primary text-xl">{strings.acceptTitle}</h2>
          <p className="text-typography-700 text-sm">{strings.acceptIntro}</p>

          <TextArea
            id="accept-suggestion-description"
            labelText={strings.descriptionLabel}
            rows={6}
            value={description}
            maxCount={DESCRIPTION_MAX}
            enableCounter
            maxLength={DESCRIPTION_MAX}
            onChange={event => setDescription(event.target.value)}
            placeholder={strings.descriptionPlaceholder}
          />

          <div className="flex gap-3">
            <Select
              id="accept-suggestion-type"
              labelText={strings.typeLabel}
              value={type}
              onChange={event => setType(event.target.value as RoadmapOpportunityType)}
            >
              <SelectItem value={RoadmapOpportunityType.IDEA} text={strings.typeIdea} />
              <SelectItem value={RoadmapOpportunityType.BUG} text={strings.typeBug} />
            </Select>

            <Select
              id="accept-suggestion-goal"
              labelText={strings.goalLabel}
              value={productGoal}
              onChange={event => setProductGoal(event.target.value)}
            >
              {!productGoal && <SelectItem value="" text={strings.goalPlaceholder} />}
              {goals.map(goal => (
                <SelectItem key={goal.id} value={goal.name} text={goal.name} />
              ))}
            </Select>
          </div>

          {duplicates.length > 0 && (
            <div className="border-border-light border p-3">
              <div className="text-typography-primary mb-2 text-sm">{strings.duplicatesTitle}</div>
              <ul className="flex flex-col gap-2">
                {duplicates.map(match => (
                  <li key={match.id} className="text-sm">
                    <div className="text-typography-primary">{match.description}</div>
                    <div className="text-typography-secondary text-xs">{match.reason}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title=""
              subtitle={error}
              className="max-w-full"
            />
          )}

          <div className="flex justify-end gap-2">
            <Button variant={ButtonVariant.SECONDARY} onClick={onClose} disabled={isFiling}>
              {strings.cancel}
            </Button>
            <Button variant={ButtonVariant.PRIMARY} onClick={submit} disabled={isFiling}>
              {strings.acceptSubmit}
            </Button>
          </div>
        </div>
      </ModalBody>
    </ComposedModal>
  );
};
