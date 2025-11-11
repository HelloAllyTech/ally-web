import { CreatorFieldGroups } from "@types";

import { FORM_FIELD_TYPES } from "./common";

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
        id: "orgVisibility",
        label: "Organization Visibility",
        type: FORM_FIELD_TYPES.TOGGLE_BUTTON,
        fullWidth: true,
      },
      {
        id: "name",
        label: "Name",
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
];

export const PathStepperList = [
  { id: PATH_CREATOR_STEP_IDS.basicInfo, title: "Basic Information" },
  { id: PATH_CREATOR_STEP_IDS.simulations, title: "Simulations" },
];

export const getCreatePathSubSectionById = (id: string) => {
  return PATH_CREATOR_FIELD_GROUPS.find(section => section.id === id);
};
