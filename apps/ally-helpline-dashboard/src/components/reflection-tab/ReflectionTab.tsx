import { FC, useCallback, useEffect, useRef, useState } from "react";

import { toast } from "sonner";

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
          <span className="text-sm font-primary text-neutral-500">Autosaving</span>
        </div>
      );
    }

    if (saveFailed) {
      return (
        <div className="flex flex-row items-center gap-1">
          <CrossRedBackground className="w-4 h-4" />
          <span className="text-sm font-primary text-destructive-500 ml-[2px]">Failed to save</span>
        </div>
      );
    }

    return (
      <div className="flex flex-row items-center gap-1">
        <RoundCheckmark color="#9CA3AF" />
        <span className="text-sm font-primary text-neutral-500">Saved</span>
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
        toast.error("Failed to auto-save the response");
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
        className="flex flex-col gap-4 bg-[#B39DDB10] rounded-md h-full w-full min-w-[300px] border border-[#7E57C2] p-6 shadow-sm"
      >
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#7E57C2] flex items-center justify-center text-white font-semibold text-lg">
          {index + 1}
        </div>
        <p className="text-[#7E57C2] text-xl leading-relaxed pt-2 font-serif">{text?.prompt}</p>

        <div className="flex-1 min-h-0 flex flex-col">
          <textarea
            value={responses[index] ?? ""}
            onChange={e => updateResponse(index, e.target.value)}
            placeholder="Write your thoughts here..."
            className="h-full min-h-[300px] bg-transparent w-full outline-none resize-none text-base text-typography-900 font-sans"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full h-[90%] font-primary rounded-lg border border-gray-200 bg-white p-4 pb-10">
      <div className="flex flex-row gap-4 justify-between border-b border-gray-200 pb-2">
        <span className="text-typography-900 font-primary text-base font-medium">
          Deeper Reflection
        </span>
        {renderAutosave()}
      </div>

      <div className={`flex gap-4 flex-1 min-h-0 overflow-auto custom-scrollbar ${className}`}>
        {prompts?.map((text, index) => renderJournalCard(index, text))}
        {prompts?.length === 0 && (
          <div className="flex flex-col gap-4 h-full w-full min-w-[300px] p-10 items-center">
            <span className="text-typography-700 font-primary text-lg">No prompts available</span>
          </div>
        )}
      </div>
    </div>
  );
};
