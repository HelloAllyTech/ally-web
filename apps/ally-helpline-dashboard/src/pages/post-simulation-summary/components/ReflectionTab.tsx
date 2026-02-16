import { FC, useState } from "react";

import { useGetReflectionPromptsQuery } from "@api";
import { Button } from "@components";

const PROMPTS = [
  "1. What do you think the client needed most in the moment you shifted to problem-solving?",
  "2. What do you think the client needed most in the moment you shifted to problem-solving?",
];

interface ReflectionTabProps {
  sessionId: string;
}

const Header = () => {
  return (
    <div className="border-b p-2 text-base font-primary text-gray-700">Self-Reflection Prompts</div>
  );
};

const Prompts = ({ prompts }: { prompts: any[] }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
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
                className={`rounded-lg border-2 text-left transition-colors h-full ${isSelected ? "border-primary-50" : "border-neutral-200"}`}
              >
                <div
                  className={`p-2 font-primary text-base rounded-t-lg ${isSelected ? "bg-primary-50" : "bg-neutral-100"}`}
                >
                  {text}
                </div>
              </div>

              {selectedIndex !== null && selectedIndex === index && (
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" className="w-1/4">
                    Clear
                  </Button>
                  <Button className="w-1/4">Save</Button>
                </div>
              )}
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
        <Prompts prompts={reflectionPrompts?.ReflectionPrompt ?? PROMPTS} />
      </div>
    </div>
  );
};
