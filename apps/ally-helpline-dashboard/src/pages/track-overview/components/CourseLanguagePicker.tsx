import { FC, useMemo } from "react";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DropdownField } from "@ally-ui-mono/ui-shared";
import { useSetTrackLanguageMutation } from "@api";
import { TrackLanguageOption } from "@types";

interface CourseLanguagePickerProps {
  trackId: string;
  /** Published languages for this course, English first. */
  options: TrackLanguageOption[];
  /** What the learner is reading it in now. */
  currentLanguageCode: string;
  /** Whether the choice can be persisted on the enrollment yet. */
  enrolled: boolean;
  /**
   * Before enrollment there is no enrollment row to persist the choice on, so
   * the overview keeps it locally and hands it to the detail query and to
   * enroll. After enrollment the server owns it.
   */
  onPreferredLanguageChange: (languageCode: string) => void;
}

/**
 * The app's own endonyms, so this list reads the same as the app language
 * selector in the sidebar. A language the app has no endonym for falls back
 * to the backend label.
 */
const APP_ENDONYMS: Record<string, string> = {
  en: "English",
  hi: "हिंदी",
  mr: "मराठी",
  ta: "தமிழ்",
  kn: "ಕನ್ನಡ",
};

export const getCourseLanguageLabel = (option: TrackLanguageOption): string =>
  option.isSource
    ? option.label
    : (APP_ENDONYMS[option.languageCode.split("-")[0]] ?? option.label);

/**
 * Per-course language picker.
 *
 * Separate from the app-wide `LanguageSelector` on purpose: this changes what
 * ONE course reads in, not the whole app, so a learner can work through a
 * Hindi course while keeping an English interface (or the reverse). Once
 * enrolled, the choice persists on the enrollment and is the language their
 * answers are marked in.
 *
 * Only languages a trainer has published are offered — a half-translated
 * course never appears here — and English is always present, being the
 * authored source. Renders nothing for a single-language course: a control
 * whose only option is the current one is noise.
 */
export const CourseLanguagePicker: FC<CourseLanguagePickerProps> = ({
  trackId,
  options,
  currentLanguageCode,
  enrolled,
  onPreferredLanguageChange,
}) => {
  const { t } = useTranslation();
  const [setTrackLanguage, { isLoading }] = useSetTrackLanguageMutation();

  const labelled = useMemo(
    () => options.map(option => ({ option, label: getCourseLanguageLabel(option) })),
    [options],
  );

  if (options.length < 2) return null;

  const current =
    labelled.find(({ option }) => option.languageCode === currentLanguageCode) ??
    labelled.find(({ option }) => option.languageCode === currentLanguageCode.split("-")[0]) ??
    labelled.find(({ option }) => option.isSource) ??
    labelled[0];

  const handleChange = async (selectedLabel: string) => {
    const selected = labelled.find(({ label }) => label === selectedLabel)?.option;
    if (!selected || selected.languageCode === current.option.languageCode) return;
    if (!enrolled) {
      onPreferredLanguageChange(selected.languageCode);
      return;
    }
    try {
      // The mutation invalidates the whole track cache — every title, prompt
      // and option in the course changes with the language.
      await setTrackLanguage({ trackId, languageCode: selected.languageCode }).unwrap();
    } catch {
      // The learner keeps reading in the current language and can retry.
      // Progress is keyed by component id, so nothing is at risk.
      toast.error(t("tracks2.language.changeFailed"));
    }
  };

  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-typography-700"
      aria-label={t("tracks2.language.title")}
      data-testid="course-language-picker"
    >
      <span>{t("tracks2.language.readingIn", { language: current.label })}</span>
      <div className="min-w-[140px] max-w-[220px]">
        <DropdownField
          label={undefined}
          value={current.label}
          valueClassName="text-sm font-medium text-primary-600"
          onChange={handleChange}
          options={labelled.map(({ label }) => label)}
          disabled={isLoading}
          hideSearch
        />
      </div>
    </div>
  );
};

export default CourseLanguagePicker;
