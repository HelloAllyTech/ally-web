import { FC, useCallback, useEffect, useRef, useState } from "react";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { TextArea } from "@ally-ui-mono/ui-shared";
import { useGetReflectionPromptsQuery, useUpdateReflectionPromptMutation } from "@api";
import { Cloud, RoundCheckmark, CrossRedBackground } from "@assets";
import { useDebounce } from "@hooks";
import { Prompt } from "@types";

interface ReflectionTabProps {
  sessionId: string;
  className?: string;
}

const AUTOSAVE_DELAY = 1000;

const PROMPTS: Prompt[] = [
  {
    id: "1",
    promptId: "1",
    prompt:
      "What do you think the client needed most in the moment you shifted to problem-solving?",
    response: null,
  },
  {
    id: "2",
    promptId: "2",
    prompt: "Where did you feel unsure or rushed during the conversation?",
    response: null,
  },
];

export const ReflectionTab: FC<ReflectionTabProps> = ({ sessionId, className = "flex-row" }) => {
  const { t } = useTranslation();
  const { data: reflectionPrompts } = useGetReflectionPromptsQuery({ sessionId });

  const [responses, setResponses] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [updateReflectionPrompt] = useUpdateReflectionPromptMutation();
  const isInitialMount = useRef(true);

  const prompts =
    reflectionPrompts?.reflectionPrompts?.length > 0
      ? reflectionPrompts?.reflectionPrompts
      : PROMPTS;

  useEffect(() => {
    setResponses(prompts.map(prompt => prompt?.response ?? ""));
  }, [prompts]);

  const renderAutosave = () => {
    if (saving) {
      return (
        <div className="flex flex-row items-center gap-1">
          <Cloud />
          <span className="text-sm font-primary text-neutral-500">
            {t("reflection.autosaving")}
          </span>
        </div>
      );
    }

    if (saveFailed) {
      return (
        <div className="flex flex-row items-center gap-1">
          <CrossRedBackground className="w-4 h-4" />
          <span className="text-sm font-primary text-destructive-500 ml-[2px]">
            {t("reflection.saveFailed")}
          </span>
        </div>
      );
    }

    return (
      <div className="flex flex-row items-center gap-1">
        <RoundCheckmark color="#9CA3AF" />
        <span className="text-sm font-primary text-neutral-500">{t("reflection.saved")}</span>
      </div>
    );
  };

  const saveResponse = useCallback(
    async (index: number, value: string) => {
      if (!prompts[index]) return;
      setSaving(true);

      try {
        await updateReflectionPrompt({
          sessionId,
          reflectionPromptId: prompts[index].id,
          promptId: prompts[index].promptId,
          response: value,
        }).unwrap();
        setSaveFailed(false);
      } catch {
        toast.error(t("reflection.autoSaveFailed"));
        setSaveFailed(true);
      }
      setSaving(false);
    },
    [sessionId, prompts, updateReflectionPrompt],
  );

  const debouncedSave = useDebounce(saveResponse, AUTOSAVE_DELAY);

  const updateResponse = useCallback(
    (index: number, value: string) => {
      setResponses(prev => {
        const next = [...prev];
        if (next.length <= index) next.length = index + 1;
        next[index] = value;
        return next;
      });

      if (!isInitialMount.current) {
        debouncedSave(index, value);
      }
    },
    [debouncedSave],
  );

  useEffect(() => {
    isInitialMount.current = false;
  }, []);

  const renderJournalCard = (index: number, text: Prompt) => {
    return (
      <div
        key={text?.id}
        className="flex min-h-0 flex-1 basis-0 flex-col gap-4 overflow-hidden bg-[#B39DDB10] rounded-md border border-[#7E57C2] p-6 shadow-sm min-w-[300px] w-full"
      >
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#7E57C2] text-lg font-semibold text-white">
          {index + 1}
        </div>
        <p className="flex-shrink-0 break-words pt-2 font-serif text-xl leading-relaxed text-[#7E57C2]">
          {text?.prompt}
        </p>

        <div className="relative min-h-0 flex-1">
          <TextArea
            id={`reflection-response-${text?.id}`}
            labelText={t("reflection.writeThoughts")}
            hideLabel
            value={responses[index] ?? ""}
            onChange={e => updateResponse(index, e.target.value)}
            placeholder={t("reflection.writeThoughts")}
            className="absolute inset-0 h-full w-full custom-scrollbar [&>div]:h-full [&_textarea]:h-full [&_textarea]:resize-none"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden rounded-lg border border-gray-200 bg-white p-4 font-primary">
      <div className="flex flex-shrink-0 flex-row justify-between gap-4 border-b border-gray-200 pb-2">
        <span className="text-typography-900 font-primary text-base font-medium">
          {t("postSim.tabs.deeperReflection")}
        </span>
        {renderAutosave()}
      </div>

      <div className={`flex min-h-0 flex-1 gap-4 overflow-hidden ${className}`}>
        {prompts?.map((text, index) => renderJournalCard(index, text))}
        {prompts?.length === 0 && (
          <div className="flex flex-col gap-4 h-full w-full min-w-[300px] p-10 items-center">
            <span className="text-typography-700 font-primary text-lg">
              {t("reflection.noPrompts")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
