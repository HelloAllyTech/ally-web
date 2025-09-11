import { GetSimulationSummaryResponse, KeyEvent } from "@types";

export const formattedMockData: GetSimulationSummaryResponse = {
  id: "7fd3a0fb-de94-4e89-bda9-a2b80b31440e",
  counselorId: 53,
  createdAt: "2025-09-10T17:01:32.989Z",
  endedAt: "2025-09-10T17:01:41.332Z",
  metadata: {
    openEndedQuestions: 8,
    empathyAndValidation: 7.5,
    activeListening: 8.2,
  },
  roomId: "ss_7fd3a0fb-de94-4e89-bda9-a2b80b31440e",
  scenarioId: 1,
  score: 85,
  startedAt: "2025-09-10T17:01:33.029Z",
  status: "ENDED",
  tenantId: "37dd4277-9b31-4a62-be6a-62d1eb03be4d",
  updatedAt: "2025-09-10T17:01:41.289Z",
  summary: {
    keyEvents: [
      {
        data: {
          score: 8,
          emoji: "😊",
          message:
            "Great job showing empathy and validating the client's feelings. Your tone was warm and supportive.",
        },
        timestamp: "2025-09-10T17:01:35.500Z",
      },
      {
        data: {
          score: 6,
          emoji: "🤔",
          message:
            "Consider asking more open-ended questions to encourage deeper exploration of the client's concerns.",
        },
        timestamp: "2025-09-10T17:01:37.200Z",
      },
      {
        data: {
          score: 9,
          emoji: "👏",
          message:
            "Excellent active listening! You reflected back the client's emotions accurately and showed genuine understanding.",
        },
        timestamp: "2025-09-10T17:01:38.800Z",
      },
      {
        data: {
          score: 7,
          emoji: "💡",
          message:
            "Good use of paraphrasing. Try to avoid interrupting when the client is sharing sensitive information.",
        },
        timestamp: "2025-09-10T17:01:40.100Z",
      },
    ],
    whatWentWell: [
      "Demonstrated excellent empathy and validation skills throughout the session",
      "Used active listening techniques effectively, reflecting back client emotions accurately",
      "Maintained a warm and supportive tone that helped build rapport",
      "Asked thoughtful follow-up questions that encouraged deeper exploration",
      "Showed genuine care and concern for the client's wellbeing",
    ],
    improvementTips: [
      "Practice asking more open-ended questions to encourage client self-exploration",
      "Work on reducing interruptions, especially during sensitive moments",
      "Consider using more silence to allow the client time to process and respond",
      "Try to avoid giving advice too quickly - let the client discover solutions",
      "Practice summarizing key points periodically to ensure understanding",
    ],
  },
};

// Additional mock data for different scenarios
export const mockDataVariations = {
  highScore: {
    ...formattedMockData,
    score: 95,
    summary: {
      ...formattedMockData.summary,
      whatWentWell: [
        "Exceptional demonstration of all core counseling skills",
        "Perfect balance of empathy, active listening, and professional boundaries",
        "Outstanding ability to create a safe and trusting environment",
        "Masterful use of therapeutic techniques throughout the session",
      ],
      improvementTips: [
        "Continue practicing these skills to maintain this high level of performance",
        "Consider mentoring other counselors to share your expertise",
        "Explore advanced therapeutic modalities to expand your toolkit",
      ],
    },
  },
  lowScore: {
    ...formattedMockData,
    score: 45,
    summary: {
      ...formattedMockData.summary,
      whatWentWell: [
        "Showed genuine interest in helping the client",
        "Attempted to use some basic counseling techniques",
        "Maintained professional demeanor throughout the session",
      ],
      improvementTips: [
        "Focus on developing active listening skills - practice reflecting back what you hear",
        "Work on asking open-ended questions instead of closed-ended ones",
        "Practice showing empathy through both words and body language",
        "Learn to use silence effectively to allow clients time to process",
        "Consider additional training in basic counseling techniques",
      ],
    },
  },
  noSummary: {
    ...formattedMockData,
    summary: undefined,
  },
};
