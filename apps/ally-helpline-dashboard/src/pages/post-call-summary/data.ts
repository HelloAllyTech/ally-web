import { SummaryField } from "./types";

import { CallDetails, Demogs, CallHighlights, Flow, KeyConcerns } from "@/assets/icons";

export const summarySections = [
  {
    icon: {
      icon: CallDetails,
      alt: "call-details",
    },
    key: "callDetails",
    title: "Call Details",
  },
  {
    icon: {
      icon: Demogs,
      alt: "demogs",
    },
    key: "demogs",
    title: "Demogs",
  },
  {
    icon: {
      icon: CallHighlights,
      alt: "call-highlights",
    },
    key: "callHighlights",
    title: "Call Highlights",
  },
  {
    icon: {
      icon: Flow,
      alt: "flow",
    },
    key: "flow",
    title: "Flow",
  },
  {
    icon: {
      icon: KeyConcerns,
      alt: "key-concerns",
    },
    key: "keyConcerns",
    title: "Key concerns",
  },
];

export const summaryFields: SummaryField[] = [
  // Call Details section
  {
    isEditable: false,
    key: "callDate",
    label: "Call Date",
    sectionKey: "callDetails",
    type: "Text",
  },
  {
    isEditable: false,
    key: "callTime",
    label: "Call time",
    sectionKey: "callDetails",
    type: "Text",
  },
  {
    isEditable: false,
    key: "callerType",
    label: "Caller type",
    sectionKey: "callDetails",
    type: "Text",
  },
  {
    isEditable: false,
    key: "counsellorName",
    label: "Counsellor Name",
    sectionKey: "callDetails",
    type: "Text",
  },
  
  // Demogs section
  {
    isEditable: false,
    key: "callerId",
    label: "Caller ID",
    sectionKey: "demogs",
    type: "Text",
  },
  {
    isEditable: true,
    key: "age",
    label: "Age",
    options: ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"],
    sectionKey: "demogs",
    type: "Dropdown",
  },
  {
    isEditable: true,
    key: "gender",
    label: "Gender",
    options: ["Male", "Female", "Other", "Prefer not to say"],
    sectionKey: "demogs",
    type: "Dropdown",
  },
  {
    isEditable: true,
    key: "location",
    label: "Location",
    sectionKey: "demogs",
    type: "Text",
  },
  {
    isEditable: true,
    key: "profession",
    label: "Profession",
    sectionKey: "demogs",
    type: "Text",
  },
  {
    isEditable: true,
    key: "concernCode",
    label: "Concern code",
    sectionKey: "demogs",
    type: "Text",
  },
  {
    isEditable: true,
    key: "formalDiagnosis",
    label: "Formal diagnosis",
    sectionKey: "demogs",
    type: "Multiline",
  },
  
  // Call Highlights section
  {
    isEditable: false,
    key: "callLastedOver",
    label: "Call lasted over",
    sectionKey: "callHighlights",
    type: "Text",
  },
  {
    isEditable: false,
    key: "youAsked",
    label: "You asked",
    sectionKey: "callHighlights",
    type: "Text",
  },
  {
    isEditable: false,
    key: "usedCopilot",
    label: "Used Copilot",
    sectionKey: "callHighlights",
    type: "Text",
  },
  {
    isEditable: false,
    key: "listeningRatio",
    label: "Listening Ratio",
    sectionKey: "callHighlights",
    type: "Text",
  },
  {
    isEditable: false,
    key: "moodImprovedBy",
    label: "Mood improved by",
    sectionKey: "callHighlights",
    type: "Text",
  },
  
  // Other fields
  {
    isEditable: true,
    isEnhanceable: true,
    key: "flow",
    label: "Flow",
    sectionKey: "flow",
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: "keyConcerns",
    label: "Key concerns",
    sectionKey: "keyConcerns",
    type: "Multiline",
  },
];

export const visibleFields = {
  age: true,
  callDate: true,
  callerId: true,
  callLastedOver: true,
  callTime: true,
  callerType: true,
  concernCode: true,
  counsellorName: true,
  flow: true,
  formalDiagnosis: true,
  gender: true,
  keyConcerns: true,
  listeningRatio: true,
  location: true,
  moodImprovedBy: true,
  profession: true,
  usedCopilot: true,
  youAsked: true,
};

export const summaryValues = {
  // Call Details section
  callDate: "15 August 2023",
  callTime: "10:30 - 11:15",
  callerType: "First-time caller",
  counsellorName: "Sarah Johnson",
  
  // Demogs section
  callerId: "CL-2023-0042",
  age: 28,
  gender: "Female",
  location: "Mumbai, India",
  profession: "Software Engineer",
  concernCode: "ANX-001",
  formalDiagnosis: "Client reported previous diagnosis of Generalized Anxiety Disorder (GAD) from psychiatrist in 2020. Currently not on medication but practices meditation regularly.",
  
  // Call Highlights section
  callLastedOver: "45 minutes",
  youAsked: "12 open-ended questions",
  usedCopilot: true,
  listeningRatio: "70:30",
  moodImprovedBy: "3 points",
  
  // Other fields
  flow: "1. Built rapport and created safe space\n2. Explored current anxiety triggers\n3. Discussed coping strategies used in the past\n4. Identified specific workplace stressors\n5. Practiced breathing technique together\n6. Recommended journaling for thought patterns\n7. Discussed potential followup session",
  
  keyConcerns: "1. Work-related anxiety and burnout\n2. Difficulty maintaining work-life balance\n3. Sleep disturbances due to rumination\n4. Social withdrawal from friends and family\n5. Increased physical symptoms (headaches, tension)",
};

