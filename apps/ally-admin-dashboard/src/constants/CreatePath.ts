import { CreatorFieldGroups, messageFieldId } from "@types";

import { FORM_FIELD_TYPES } from "./SimulationCreator";

export const PATH_CREATOR_STEP_IDS = {
  basicInfo: "basic-info",
  simulations: "simulations",
};

export const PATH_CREATOR_FIELD_GROUPS: CreatorFieldGroups[] = [
  {
    id: PATH_CREATOR_STEP_IDS.basicInfo,
    label: "Basic Information",
    fields: [
      {
        id: "isGlobal",
        label: "Organization Visibility",
        type: FORM_FIELD_TYPES.TOGGLE_BUTTON,
        fullWidth: true,
      },
      {
        id: "title",
        label: "Title",
        placeholder: "Enter title",
        type: FORM_FIELD_TYPES.TEXT,
        isMandatory: true,
        fullWidth: true,
        maxLength: 100,
      },

      {
        id: "description",
        label: "Description",
        placeholder: "What is the primary learning goal?",
        type: FORM_FIELD_TYPES.TEXT,
        isMandatory: true,
        multiline: true,
        fullWidth: true,
        maxLength: 1000,
      },
      {
        id: "coverImageUrl",
        label: "Cover Image",
        type: FORM_FIELD_TYPES.IMAGE_UPLOAD,
        isMandatory: true,
        fullWidth: true,
      },
    ],
  },
  {
    id: PATH_CREATOR_STEP_IDS.simulations,
    label: "Simulations",
    fields: [],
  },
];

export const PathStepperList = [
  { id: PATH_CREATOR_STEP_IDS.basicInfo, title: "Basic Information" },
  { id: PATH_CREATOR_STEP_IDS.simulations, title: "Simulations" },
];

export const getCreatePathSubSectionById = (id: string) => {
  return PATH_CREATOR_FIELD_GROUPS.find(section => section.id === id);
};

export const addMessageModalFields = [
  {
    id: messageFieldId.messageTitle,
    label: "Message Title",
    placeholder: "Add message title",
    required: true,
  },
  {
    id: messageFieldId.feedback,
    label: "Feedback message",
    placeholder: "Write the full message or guidance here",
    multiline: true,
  },
];

export const PATH_STATUS_OPTIONS = [
  { id: "ACTIVE", label: "Published" },
  { id: "DRAFT", label: "Draft" },
];
