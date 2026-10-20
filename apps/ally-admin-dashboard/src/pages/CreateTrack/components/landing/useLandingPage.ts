import { useCallback, useMemo } from "react";

import { useFormContext, useWatch } from "react-hook-form";

import { TrackFormValues, TrackLandingPage } from "@types";

import { LandingUpdate } from "./landingTypes";
import { withLandingDefaults } from "../../trackFormUtils";

/**
 * The landing page as the builder form holds it (`TrackFormValues.landingPage`), always complete,
 * plus an `update` that writes back through `setValue` with `shouldDirty`, so Save draft and
 * Publish persist it with no save button of its own.
 *
 * `page` is read through `withLandingDefaults`, so a course whose page is still null (a brand-new
 * one) reads as the backend's empty page. `update` re-reads the live value on every call rather
 * than closing over `page`, so two edits in one tick cannot overwrite each other.
 */
export const useLandingPage = (): { page: TrackLandingPage; update: LandingUpdate } => {
  const { control, getValues, setValue } = useFormContext<TrackFormValues>();
  const watched = useWatch({ control, name: "landingPage" });
  const page = useMemo(() => withLandingDefaults(watched), [watched]);

  const update = useCallback<LandingUpdate>(
    recipe => {
      const next = withLandingDefaults(getValues("landingPage"));
      recipe(next);
      setValue("landingPage", next, { shouldDirty: true });
    },
    [getValues, setValue],
  );

  return { page, update };
};
