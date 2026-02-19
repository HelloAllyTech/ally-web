// File: apps/ally-helpline-dashboard/src/components/language-selector/LanguageSelector.tsx
import { useEffect, useMemo, useState } from "react";

import { DropdownField } from "@ally-ui-mono/ui-shared";

import i18n from "../../i18n";

// Map language codes to native display labels (kept consistent with existing UI)
const LANGUAGE_OPTIONS: Array<{ code: string; label: string }> = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
];

const getLabelFromCode = (code: string): string => {
  const exact = LANGUAGE_OPTIONS.find(o => o.code === code)?.label;
  if (exact) return exact;
  // Fallback: match by prefix (e.g., en-US -> English)
  const byPrefix = LANGUAGE_OPTIONS.find(o => code?.startsWith(o.code))?.label;
  return byPrefix ?? "English";
};

const getCodeFromLabel = (label: string): string => {
  return LANGUAGE_OPTIONS.find(o => o.label === label)?.code ?? "en";
};

// Language selector that follows existing UI/UX using shared DropdownField
const LanguageSelector = ({ label }: { label?: string }) => {
  const [lng, setLng] = useState<string>(i18n.language);

  useEffect(() => {
    const stored = localStorage.getItem("i18nextLng");
    if (stored && stored !== lng) {
      setLng(stored);
    }
  }, []);

  const valueLabel = useMemo(() => getLabelFromCode(lng), [lng]);
  const optionLabels = useMemo(() => LANGUAGE_OPTIONS.map(o => o.label), []);

  const handleChange = async (selectedLabel: string) => {
    const newCode = getCodeFromLabel(selectedLabel);
    await i18n.changeLanguage(newCode);
    localStorage.setItem("i18nextLng", newCode); // explicit persist
    setLng(newCode);
    // Basic RTL support toggle for Arabic (extendable for other RTL languages)
    const rtlLangs = new Set(["ar", "fa", "ur", "he"]);
    document.documentElement.dir = rtlLangs.has(newCode) ? "rtl" : "ltr";
  };

  return (
    <div
      aria-label="Language selector"
      className="w-full max-w-[220px] min-w-[160px] flex flex-col gap-1"
    >
      {label && <span className="text-xs text-typography-600">{label}</span>}
      <DropdownField
        label={undefined}
        value={valueLabel}
        valueClassName="text-sm font-medium"
        onChange={handleChange}
        options={optionLabels}
      />
    </div>
  );
};

export default LanguageSelector;
