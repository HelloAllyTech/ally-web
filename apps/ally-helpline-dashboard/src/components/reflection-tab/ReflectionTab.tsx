import { FC, useEffect, useState } from "react";

import { useGetReflectionPromptsQuery, useUpdateReflectionPromptMutation } from "@api";
import { Button } from "@components";
import { Prompt } from "@types";

const PROMPTS = [
  {
    id: "1",
    promptId: "1",
    prompt:
      "What do you think the client needed most in the moment you shifted to problem-solving?",
  },
  {
    id: "2",
    promptId: "2",
    prompt:
      "What do you think the client needed most in the moment you shifted to problem-solving?",
  },
];

interface ReflectionTabProps {
  sessionId: string;
}

const Header = () => {
  return (
    <span className="text-typography-900 font-primary text-base font-semibold border-b pb-2">
      Deeper Reflection
    </span>
  );
};

const BottomButtons = ({
  selectedIndex,
  index,
  sessionId,
  prompts,
  responses,
  updateResponse,
}: {
  selectedIndex: number | null;
  index: number;
  sessionId: string;
  prompts: Prompt[];
  responses: string[];
  updateResponse: (index: number, value: string) => void;
}) => {
  const [updateReflectionPrompt] = useUpdateReflectionPromptMutation();

  const saveResponse = (index: number) => {
    if (selectedIndex === null) return;
    updateReflectionPrompt({
      sessionId,
      reflectionPromptId: prompts[index].id,
      promptId: prompts[index].promptId,
      response: responses[index],
    });
  };

  const clearResponse = (index: number) => updateResponse(index, "");

  return (
    <>
      {selectedIndex !== null && selectedIndex === index && (
        <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
          <Button variant="secondary" className="w-1/4" onClick={() => clearResponse(index)}>
            Clear
          </Button>
          <Button className="w-1/4" onClick={() => saveResponse(index)}>
            Save
          </Button>
        </div>
      )}
    </>
  );
};

const Prompts = ({ prompts, sessionId }: { prompts: Prompt[]; sessionId: string }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [responses, setResponses] = useState<string[]>([]);

  useEffect(() => {
    setResponses(prompts.map(prompt => prompt.response ?? ""));
  }, [prompts]);

  const updateResponse = (index: number, value: string) => {
    setResponses(prev => {
      const next = [...prev];
      if (next.length <= index) next.length = index + 1;
      next[index] = value;
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <div className="flex flex-col gap-4 flex-1 overflow-auto">
        {prompts.map((text, index) => {
          const isSelected = selectedIndex === index;
          return (
            <>
              <div
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`flex flex-col rounded-lg border-2 text-left transition-colors min-h-[200px] ${isSelected ? "border-primary-50" : "border-neutral-200"}`}
              >
                <div
                  className={`shrink-0 p-2 font-primary text-base rounded-t-lg ${isSelected ? "bg-primary-50" : "bg-neutral-100"}`}
                >
                  {text?.prompt}
                </div>
                <div className="flex-1 min-h-0 flex flex-col rounded-b-lg p-2 bg-white border-t-0">
                  <textarea
                    value={responses[index] ?? ""}
                    onChange={e => updateResponse(index, e.target.value)}
                    className="h-full min-h-0 w-full outline-none resize-none"
                    rows={10}
                  />
                </div>
              </div>
              <BottomButtons
                selectedIndex={selectedIndex}
                index={index}
                sessionId={sessionId}
                prompts={prompts}
                responses={responses}
                updateResponse={updateResponse}
              />
            </>
          );
        })}
      </div>
    </div>
  );
};

export const ReflectionTab: FC<ReflectionTabProps> = ({ sessionId }) => {
  const { data: reflectionPrompts } = useGetReflectionPromptsQuery({ sessionId });
  return (
    <div className="p-1 rounded-lg w-full h-full border shadow-lg">
      <div className="flex flex-col gap-4 w-full h-full rounded-lg bg-white p-4">
        <Header />
        <Prompts prompts={reflectionPrompts?.reflectionPrompts ?? PROMPTS} sessionId={sessionId} />
      </div>
    </div>
  );
};
