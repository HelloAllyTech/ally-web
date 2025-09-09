import { Variants } from "framer-motion";

import { Scenario, ScenarioStatus } from "@types";

// TODO: Move variant objects to a separate common file

export const learnPageContainerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      when: "beforeChildren",
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.3 },
  },
};

export const learnPageItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const learnPageExpandedVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1], // easeOut curve
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.3 },
  },
};

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

// TODO: Remove once API is implemented
export const dummyScenarios: Scenario[] = [
  {
    id: 1,
    title: "Hopeless Male, 40",
    scenario: "A 40-year-old male is experiencing deep hopelessness.",
    description:
      "He feels overwhelmed by ongoing personal and professional failures, believes his situation won't improve, and is withdrawing socially. He's showing signs of resignation and low self-worth. Your goal is to explore his thoughts gently, offer validation, and begin rebuilding his sense of agency and hope.",
    coverImageUrl: "https://cdn.midjourney.com/e93ccee3-55d8-4137-870c-07995f36f083/0_2.png",
    status: ScenarioStatus.AVAILABLE,
  },
  {
    id: 2,
    title: "A techie’s burnout",
    scenario: "A 29-year-old tech worker is showing signs of burnout.",
    description:
      "He works long hours under constant pressure and feels emotionally drained. He mentions irritability, sleep problems, and questioning the purpose of his work. Your aim is to validate his exhaustion, explore boundaries and recovery, and help him reconnect with his values and needs.",
    coverImageUrl: "https://cdn.midjourney.com/f0c37d9e-b5cd-43d8-8a85-801bd27d3c71/0_2.png",
    status: ScenarioStatus.AVAILABLE,
  },
  {
    id: 3,
    title: "Anxious Student, 21",
    scenario: "A 21-year-old college student struggles with anxiety.",
    description:
      "She constantly fears failure, overthinks social interactions, and experiences frequent panic attacks before exams. She's beginning to avoid classes. Your aim is to help her manage her anxious thoughts, introduce coping strategies, and encourage small steps toward re-engaging with academic and social life.",
    coverImageUrl: "https://cdn.midjourney.com/bc22b877-4ced-4811-90cc-6bb5bda9455b/0_3.png",
    status: ScenarioStatus.COMING_SOON,
  },
  {
    id: 4,
    title: "Depressed Working Mother, 35",
    scenario: "A 35-year-old mother feels emotionally numb and overwhelmed.",
    description:
      "She juggles a demanding job and parenting, but recently feels like she's failing at both. She's lost interest in activities she once enjoyed, sleeps poorly, and feels persistently low. Your task is to validate her experience, explore sources of pressure, and introduce small ways to rebuild motivation.",
    coverImageUrl: "https://cdn.midjourney.com/8de40a65-c961-451d-b3b2-f457ec765a28/0_2.png",
    status: ScenarioStatus.COMING_SOON,
  },
  {
    id: 5,
    title: "Retired old man grieving after losing partner",
    scenario: "A recently retired 68 year old man is grieving after losing his partner",
    description:
      "After losing his partner of 40 years, he feels purposeless and alone. Retirement has further amplified his sense of isolation. He finds it hard to talk to family. Your goal is to hold space for his grief while gently exploring ways to reconnect and find meaning again.",
    coverImageUrl: "https://cdn.midjourney.com/d92fe6c3-8f3c-49d1-b859-bf7fb10028b7/0_3.png",
    status: ScenarioStatus.AVAILABLE,
  },
  {
    id: 6,
    title: "A young girl experiencing suicidal thoughts",
    scenario: "A 17 year old teen expresses suicidal thoughts.",
    description:
      'She feels misunderstood at home, isolated at school, and says life "feels pointless." She hints at not wanting to wake up. Your goal is to assess her safety non-judgmentally, build rapport, and identify immediate steps to ensure safety while offering hope and emotional connection.',
    coverImageUrl: "https://cdn.midjourney.com/2db7f688-1df8-4b1b-806d-881ee7a5469d/0_2.png",
    status: ScenarioStatus.COMING_SOON,
  },
];
