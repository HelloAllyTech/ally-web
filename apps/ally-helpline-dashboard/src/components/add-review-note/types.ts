export interface AddReviewNoteProps {
  note?: string;
  isEditable?: boolean;
  onEditNote?: () => void;
  onAddNote?: () => void;
  isEdited?: boolean;
  reviewCreatedAt?: string;
}
