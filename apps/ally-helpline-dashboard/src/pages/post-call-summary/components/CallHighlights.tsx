import { FC } from "react";

import { CallDuration, QuestionsAsked, Nudges, ListeningRatio, CallerMood } from "@/assets/icons";
import { Button } from "@/components";
import { CallHighlightsProps } from "../types";

interface Highlight {
  title: string;
  value: string;
  image: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const highlights: Highlight[] = [
  {
    title: "The call duration was more than",
    value: "45 minutes",
    image: CallDuration
  },
  {
    title: "You asked",
    value: "6 questions",
    image: QuestionsAsked
  },
  {
    title: "You used Copilot",
    value: "04 Nudges",
    image: Nudges
  },
  {
    title: "Listening to taking ratio was ",
    value: "0.67",
    image: ListeningRatio
  },
  {
    title: "Caller’s mood had increased by",
    value: "28 Points",
    image: CallerMood
  }
];

const CallHighlights: FC<CallHighlightsProps> = ({ onProceed }) => {
  return (
    <>
      <span className="text-base font-medium text-[#47464F]">Call highlights</span>
      <div className="grid grid-cols-2 gap-4">
        {highlights.map((highlight, index) => (
          <div key={index} className="flex items-center gap-[10px] p-[10px] border border-[#EFEFEF] rounded-[12px]">
            <highlight.image className="h-12 w-12" />
            <div className="flex flex-col">
              <span className="text-[14px]">{highlight.title}</span>
              <span className="text-[16px] text-[#49454F] font-medium">{highlight.value}</span>
            </div>
          </div>
        ))}
      </div>
      <Button onClick={onProceed} className="rounded-full w-fit self-end">
        Proceed to call summary
      </Button>
    </>
  );
};

export default CallHighlights;
