import { HelplineSettings } from "@src/types";

import { ValidationErrors } from "./helpers";

/** What every settings section receives: the working copy, the org defaults, and how to edit it. */
export interface SectionProps {
  form: HelplineSettings;
  /** The platform defaults — used for placeholders only, never written back. */
  defaults: HelplineSettings;
  /** Empty until the first failed Save, then live. */
  errors: ValidationErrors;
  onChange: (patch: Partial<HelplineSettings>) => void;
}
