import { Variants } from "framer-motion";

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
export const dummyScenarios = [
  {
    unique_id: "hopeless-male",
    title: "Hopeless Male, 40",
    short_description: "A 40-year-old male is experiencing deep hopelessness.",
    long_description:
      "He feels overwhelmed by ongoing personal and professional failures, believes his situation won't improve, and is withdrawing socially. He's showing signs of resignation and low self-worth. Your goal is to explore his thoughts gently, offer validation, and begin rebuilding his sense of agency and hope.",
    cover_image: "https://cdn.midjourney.com/e93ccee3-55d8-4137-870c-07995f36f083/0_2.png",
    is_coming_soon: false,
  },
  {
    unique_id: "burnout-tech-professional",
    title: "A techie’s burnout",
    short_description: "A 29-year-old tech worker is showing signs of burnout.",
    long_description:
      "He works long hours under constant pressure and feels emotionally drained. He mentions irritability, sleep problems, and questioning the purpose of his work. Your aim is to validate his exhaustion, explore boundaries and recovery, and help him reconnect with his values and needs.",
    cover_image: "https://cdn.midjourney.com/f0c37d9e-b5cd-43d8-8a85-801bd27d3c71/0_2.png",
    is_coming_soon: false,
  },
  {
    unique_id: "anxious-student",
    title: "Anxious Student, 21",
    short_description: "A 21-year-old college student struggles with anxiety.",
    long_description:
      "She constantly fears failure, overthinks social interactions, and experiences frequent panic attacks before exams. She's beginning to avoid classes. Your aim is to help her manage her anxious thoughts, introduce coping strategies, and encourage small steps toward re-engaging with academic and social life.",
    cover_image: "https://cdn.midjourney.com/bc22b877-4ced-4811-90cc-6bb5bda9455b/0_3.png",
    is_coming_soon: true,
  },
  {
    unique_id: "depressed-working-mother",
    title: "Depressed Working Mother, 35",
    short_description: "A 35-year-old mother feels emotionally numb and overwhelmed.",
    long_description:
      "She juggles a demanding job and parenting, but recently feels like she's failing at both. She's lost interest in activities she once enjoyed, sleeps poorly, and feels persistently low. Your task is to validate her experience, explore sources of pressure, and introduce small ways to rebuild motivation.",
    cover_image: "https://cdn.midjourney.com/8de40a65-c961-451d-b3b2-f457ec765a28/0_2.png",
    is_coming_soon: true,
  },
  {
    unique_id: "grieving-retired-male",
    title: "Retired old man grieving after losing partner",
    short_description: "A recently retired 68 year old man is grieving after losing his partner",
    long_description:
      "After losing his partner of 40 years, he feels purposeless and alone. Retirement has further amplified his sense of isolation. He finds it hard to talk to family. Your goal is to hold space for his grief while gently exploring ways to reconnect and find meaning again.",
    cover_image: "https://cdn.midjourney.com/d92fe6c3-8f3c-49d1-b859-bf7fb10028b7/0_3.png",
    is_coming_soon: false,
  },
  {
    unique_id: "suicidal-teen",
    title: "A young girl experiencing suicidal thoughts",
    short_description: "A 17 year old teen expresses suicidal thoughts.",
    long_description:
      'She feels misunderstood at home, isolated at school, and says life "feels pointless." She hints at not wanting to wake up. Your goal is to assess her safety non-judgmentally, build rapport, and identify immediate steps to ensure safety while offering hope and emotional connection.',
    cover_image: "https://cdn.midjourney.com/2db7f688-1df8-4b1b-806d-881ee7a5469d/0_2.png",
    is_coming_soon: true,
  },
];
