import { cellTypes } from "../components/notion-table/utils";

export const GUARDRAILS_TABLE_COLUMNS = [
  {
    id: "name",
    label: "Name",
    accessor: "name",
    placeholder: "Enter name",
    dataType: cellTypes.editableText,
    minWidth: 200,
  },
  {
    id: "helperDialogue",
    label: "If helper said something that can be classified as",
    accessor: "helperDialogue",
    placeholder: "Enter helper dialogue",
    dataType: cellTypes.editableText,
    minWidth: 400,
  },
  {
    id: "actorDialogue",
    label: "Actor should start by saying",
    accessor: "actorDialogue",
    placeholder: "Enter actor dialogue",
    dataType: cellTypes.editableText,
    minWidth: 300,
  },
  {
    id: "active",
    label: "Status",
    accessor: "active",
    dataType: cellTypes.switch,
    minWidth: 120,
  },
  {
    id: "createdAt",
    label: "Created Date",
    accessor: "createdAt",
    dataType: cellTypes.normalText,
    minWidth: 150,
  },
];
