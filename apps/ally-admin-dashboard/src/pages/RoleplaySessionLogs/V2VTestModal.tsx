import { FC, useState } from "react";

import { toast } from "sonner";

import {
  useGetScenarioLanguagesQuery,
  useGetSimulationsQuery,
  useStartV2VTestMutation,
} from "@api";
import { Button, CustomDropdown } from "@components";
import { ButtonVariant } from "@components/types";
import { Option, ScenarioLanguage } from "@types";

interface V2VTestModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Superadmin launcher for an AI-vs-AI V2V test session: pick a scenario +
 * language, and an AI plays the counselor side end to end. The run then shows
 * up in the session logs like a real session.
 */
export const V2VTestModal: FC<V2VTestModalProps> = ({ open, onClose }) => {
  const [scenarioId, setScenarioId] = useState<string | number>("");
  const [languageId, setLanguageId] = useState<string | number>("");
  const [maxExchanges, setMaxExchanges] = useState<number>(12);

  const { data: simulations } = useGetSimulationsQuery({ limit: 200 });
  const { data: languages = [] } = useGetScenarioLanguagesQuery({
    active: true,
  }) as { data: ScenarioLanguage[] };
  const [startV2VTest, { isLoading }] = useStartV2VTestMutation();

  const scenarioOptions: Option[] =
    simulations?.data?.map(s => ({ id: s.id, value: s.title })) ?? [];
  const languageOptions: Option[] = languages.map(l => ({
    id: l.language_id,
    value: l.label,
  }));

  const canStart = Boolean(scenarioId) && Boolean(languageId) && maxExchanges > 0 && !isLoading;

  const handleStart = async () => {
    if (!canStart) return;
    try {
      await startV2VTest({
        scenarioId: Number(scenarioId),
        languageId: Number(languageId),
        maxExchanges,
      }).unwrap();
      toast.success("V2V test session started — it will appear in the logs shortly.");
      onClose();
    } catch {
      toast.error("Failed to start V2V test session.");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-50 h-full w-full max-w-[460px] bg-white shadow-xl flex flex-col p-6 gap-5 overflow-y-auto custom-scrollbar">
        <div>
          <h2 className="text-xl font-secondary text-typography-900">Run V2V Test</h2>
          <p className="text-sm text-typography-700 mt-1">
            An AI plays the user side and runs the roleplay end to end — no human tester needed. The
            result appears in the session logs.
          </p>
        </div>

        <CustomDropdown
          label="Scenario"
          required
          options={scenarioOptions}
          value={scenarioId}
          onChange={setScenarioId}
          placeholder="Select a scenario"
        />

        <CustomDropdown
          label="Language"
          required
          options={languageOptions}
          value={languageId}
          onChange={setLanguageId}
          placeholder="Select a language"
        />

        <div className="flex flex-col gap-2">
          <label className="text-sm text-typography-900 font-primary">Max exchanges</label>
          <input
            type="number"
            min={1}
            value={maxExchanges}
            onChange={e => setMaxExchanges(Number(e.target.value))}
            className="border rounded-md px-3 py-2 bg-white w-full outline-none font-primary text-base"
          />
        </div>

        <div className="flex justify-end gap-3 mt-auto">
          <Button variant={ButtonVariant.TEXT} onClick={onClose}>
            Cancel
          </Button>
          <Button variant={ButtonVariant.PRIMARY} onClick={handleStart} disabled={!canStart}>
            {isLoading ? "Starting…" : "Start test"}
          </Button>
        </div>
      </div>
    </div>
  );
};
