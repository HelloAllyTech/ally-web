import { FC, useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { TextArea } from "@ally-ui-mono/ui-shared";
import { useEnhanceFieldMutation, useGetAutofillModelsQuery } from "@api";
import { AutofillModelSelect } from "@components/autofill-model-select";
import { DEFAULT_AUTOFILL_MODEL, FALLBACK_AUTOFILL_MODEL_OPTIONS, en } from "@constants";

import { AutofillButton } from "../autofill-button";

interface EnhanceButtonProps {
  /** One of ENHANCE_TYPE — identifies the field for the backend. */
  enhanceType: string;
  /** Human label used in toasts (e.g. "Character Backstory"). */
  label?: string;
  /** Live current content of the field being improved. */
  currentValue: string;
  /**
   * Apply the improved content. `translations` (keyed by languageId) is present
   * only when `translateTo` was supplied — used by primary+translation fields.
   */
  onApply: (improved: string, translations?: Record<string, string>) => void;
  /**
   * Primary+translation fields only: after improving the (primary) value,
   * re-translate it into these languages and hand them to `onApply`.
   */
  translateTo?: { languageId: string; languageCode: string }[];
  disabled?: boolean;
}

/**
 * Field-level "Improve" control. Mirrors the autofill design language (wand
 * button + model select) but, unlike generate/regenerate, it never invents
 * content — it sends ONLY the field's *existing* value (no other scenario
 * fields) and applies the improved text back.
 *
 * Fully modular: drop `<EnhanceButton>` next to any field, give it the field's
 * current value and an `onApply` callback. Nothing about it is field-specific.
 */
export const EnhanceButton: FC<EnhanceButtonProps> = ({
  enhanceType,
  label,
  currentValue,
  onApply,
  translateTo,
  disabled = false,
}) => {
  const [enhanceField] = useEnhanceFieldMutation();
  const { data: apiModels } = useGetAutofillModelsQuery();
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const [selectedModel, setSelectedModel] = useState(DEFAULT_AUTOFILL_MODEL);

  const containerRef = useRef<HTMLDivElement>(null);

  // Resolve provider from the SAME list the model picker shows (API models when
  // available, else the fallback). Anthropic model ids returned by the API can
  // differ from the fallback ids, so mapping against fallback alone would
  // mislabel an Anthropic model as "openai".
  const allModelOptions = apiModels?.length ? apiModels : FALLBACK_AUTOFILL_MODEL_OPTIONS;
  const selectedProvider =
    allModelOptions.find(m => m.value === selectedModel)?.provider ?? "openai";

  // Strip HTML tags before the emptiness check so rich-text fields (whose
  // "empty" value is markup like "<p></p>") are correctly treated as empty.
  // Harmless for plain-text fields, which carry no tags. The full value
  // (markup included) is still what gets sent to the backend.
  const hasContent =
    typeof currentValue === "string" && currentValue.replace(/<[^>]*>/g, "").trim() !== "";

  // Close the popover on outside click / Escape.
  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointer = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  const runEnhance = async (guidance: string) => {
    if (isEnhancing || !hasContent) return;
    setIsOpen(false);
    setIsEnhancing(true);
    try {
      const response = await enhanceField({
        fieldName: enhanceType,
        currentValue,
        guidance: guidance.trim() ? guidance.trim() : undefined,
        model: selectedModel,
        provider: selectedProvider,
        ...(translateTo?.length ? { translateTo } : {}),
      }).unwrap();

      const improved = response?.content;
      if (typeof improved === "string" && improved.trim()) {
        onApply(improved, response?.translations);
        toast.success(`${label || "Field"} ${en.simulation.enhance.enhancedSuccessfully}`);
      } else {
        toast.error(`${en.errors.failedToEnhance} ${label || "field"}`);
      }
    } catch {
      toast.error(`${en.errors.failedToEnhance} ${label || "field"}`);
    } finally {
      setIsEnhancing(false);
      setCustomText("");
    }
  };

  // Only surface the control once the field actually has content to improve —
  // enhance has nothing to act on otherwise.
  if (!enhanceType || !hasContent) return null;

  const triggerLabel = isEnhancing
    ? en.simulation.enhance.enhancing
    : en.simulation.enhance.trigger;

  return (
    <div ref={containerRef} className="relative inline-flex">
      <AutofillButton
        onClick={() => setIsOpen(open => !open)}
        isLoading={isEnhancing}
        label={triggerLabel}
        disabled={disabled}
        compact
      />

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 z-30 w-72 bg-white border border-border-light rounded-md shadow-lg p-3 flex flex-col gap-3"
          data-testid="enhance-menu"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-typography-600 shrink-0">
              {en.simulation.enhance.modelLabel}
            </span>
            <AutofillModelSelect
              value={selectedModel}
              onChange={setSelectedModel}
              disabled={isEnhancing}
              className="flex-1 min-w-0"
            />
          </div>

          <TextArea
            id="enhance-custom-guidance"
            labelText={en.simulation.enhance.customPlaceholder}
            hideLabel
            value={customText}
            onChange={e => setCustomText(e.target.value)}
            placeholder={en.simulation.enhance.customPlaceholder}
            rows={3}
            className="w-full"
          />

          {/* One action: blank box = auto-improve, typed = custom instruction. */}
          <button
            type="button"
            data-testid="enhance-custom-submit"
            onClick={() => runEnhance(customText)}
            className="self-end text-sm bg-primary-500 text-white rounded-2xl px-4 py-1 hover:bg-primary-700 cursor-pointer"
          >
            {en.simulation.enhance.customSubmit}
          </button>
        </div>
      )}
    </div>
  );
};
