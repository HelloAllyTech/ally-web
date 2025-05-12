/* eslint-disable max-len */
export const TABLE_HEADERS = [
  {
    id: "clientId",
    label: "Call ID",
    width: "10%",
  },
  {
    id: "dateAndTime",
    label: "Date & Time",
    width: "15%",
  },
  {
    id: "duration",
    label: "Duration",
    width: "20%",
  },
  {
    id: "quality_score",
    label: "Quality Score",
    width: "15%",
  },
  {
    id: "tags",
    label: "Tags",
    width: "30%",
  },
  {
    id: "notes",
    label: "Notes",
    width: "10%",
  },
];

export const TAG_COLORS = {
  1: { bg: "#FEE1E180", text: "#C62828" },
  2: { bg: "#FFE8D580", text: "#F55A00" },
  3: { bg: "#EBEBEB80", text: "#424242" },
  4: { bg: "#D7F4DC80", text: "#388E3C" },
  5: { bg: "#B9EFC880", text: "#1B5E20" },
};

export const dummySummarydata = {
  id: 567,
  keyConcerns: `- Client is struggling with caregiving responsibilities (for her mother), feeling emotionally drained.
    - Expresses self-doubt and guilt about not doing enough.
    -Mentions difficulty balancing caregiving with personal needs and work life.
    -Client tends to find it hard to let go of control.`,
  flow: `- Made space for the client to share thoughts and experiences.
    - Validated their experiences and acknowledged the difficulty of caregiving.
    -Reframed self-care and taking time off as not selfish.
    -Encouraged a small behavioural experiment for letting go of control.
    -Explored the client’s dreams and aspirations and acknowledged inner conflict.`,
  notes: `- Made space for the client to share thoughts and experiences.
    - Validated their experiences and acknowledged the difficulty of caregiving.
    -Reframed self-care and taking time off as not selfish.
    -Encouraged a small behavioural experiment for letting go of control.
    -Explored the client’s dreams and aspirations and acknowledged inner conflict.`,
  transcript: `Client: HI, I’m feeling a bit overwhelmed. There’s just a lot going on, and I don’t know where to start\n
  You: I hear you. It can be tough when everything feels like too much at once. Want to share what’s been weighing on you the most?\n
  Client: I think it’s mainly work stress. Deadlines are piling up, and I feel like I’m always behind.\n
  You: That sounds really stressful. Have you had a chance to take a break or step away for a moment?`,
  comments: [
    {
      comment: "bit overwhelmed",
      description:
        "Your response shows good empathy. You acknowledged the client's feelings and opened the door for them to elaborate. You could build on this by validating their emotions more explicitly—something like, 'That sounds really hard. It's okay to feel overwhelmed sometimes.'",
    },
    {
      comment: "work stress",
      description:
        "Nice job identifying the specific source of stress. To deepen the conversation, consider gently exploring how work stress is affecting other areas of their life. This could help uncover any patterns or related concerns.",
    },
    {
      comment: "stressful",
      description:
        "This was a strong empathetic reflection. You named the emotion clearly, which helps the client feel heard. To take it a step further, you might offer a concrete coping strategy or ask how they've managed similar situations before.",
    },
  ],
};

export const CALL_LOGS_PAGINATION_LIMIT = 10;
export const TABLE_ROW_HEIGHT = 58; // 58px
