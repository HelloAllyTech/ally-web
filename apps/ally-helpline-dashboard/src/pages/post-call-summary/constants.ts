import { CallDuration, QuestionsAsked, Nudges, ListeningRatio, CallerMood } from "@/assets/icons";
import { Highlight } from "./types";

export const highlights: Highlight[] = [
    {
      key: "callDuration",
      title: "The call duration was more than",
      image: CallDuration,
    },
    {
      key: "questionsAsked",
      title: "You asked",
      image: QuestionsAsked,
    },
    {
      key: "nudges",
      title: "You used Copilot",
      image: Nudges,
    },
    {
      key: "listeningRatio",
      title: "Listening to talking ratio was ",
      image: ListeningRatio,
    },
    {
      key: "callerMood",
      title: "Caller’s mood had increased by",
      image: CallerMood,
    },
  ];