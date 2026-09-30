import { ProductUpdateAudience, ProductUpdateKind, ProductUpdateSurface } from "@api";
import { en } from "@constants";

// Built lazily so nothing reads `@constants` at import time (see CLAUDE.md gotchas).
export const getSurfaceOptions = (): { value: ProductUpdateSurface; label: string }[] => [
  { value: "web_app", label: en.productUpdates.surfaceLabels.web_app },
  { value: "mobile_app", label: en.productUpdates.surfaceLabels.mobile_app },
  { value: "admin_console", label: en.productUpdates.surfaceLabels.admin_console },
  { value: "whatsapp", label: en.productUpdates.surfaceLabels.whatsapp },
];

export const getKindOptions = (): { value: ProductUpdateKind; label: string }[] => [
  { value: "new", label: en.productUpdates.kindLabels.new },
  { value: "improved", label: en.productUpdates.kindLabels.improved },
  { value: "fixed", label: en.productUpdates.kindLabels.fixed },
];

export const getAudienceOptions = (): { value: ProductUpdateAudience; label: string }[] => [
  { value: "public", label: en.productUpdates.audienceLabels.public },
  { value: "internal", label: en.productUpdates.audienceLabels.internal },
];
