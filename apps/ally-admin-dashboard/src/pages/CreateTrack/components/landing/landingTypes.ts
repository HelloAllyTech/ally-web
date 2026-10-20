import { TrackFormValues, TrackLandingPage } from "@types";

/** Edits the landing page in the form: `recipe` mutates a private copy, which is then saved back. */
export type LandingUpdate = (recipe: (draft: TrackLandingPage) => void) => void;

export interface LandingBlockProps {
  page: TrackLandingPage;
  update: LandingUpdate;
}

export interface LandingSectionsProps {
  /** The form's sections, in order. Chapters are keyed on each one's `serverId`. */
  sections: TrackFormValues["sections"];
}
