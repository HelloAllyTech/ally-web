import { useState } from "react";

import { Accordion, DropdownField } from "@/components";

import { summaryFields, summarySections, summaryValues } from "../data";
import { SummaryField } from "../types";

const CallSummary = () => {
  const [editingField, setEditingField] = useState<string | null>("");
  const [summaryData, setSummaryData] = useState(summaryValues);

  const handleEditableFieldClick = (field: SummaryField) => {
    if (field.isEditable) {
      setEditingField(field.key);
    }
  };

  const getFieldDisplay = (field: SummaryField) => {
    switch (field.type) {
      case "Boolean":
        return <div>{field.label}</div>;
      case "Dropdown":
        return (
          <div className="flex gap-1">
            <span className="font-medium text-[#000]">{`${field.label}: `}</span>
            <DropdownField
              value={summaryData[field.key]}
              onChange={(value) => setSummaryData({ ...summaryData, [field.key]: value })}
              options={field.options}
            />
          </div>
        );
      case "Multiline":
        return <div>{field.label}</div>;
      case "Number":
      case "Text":
      default:
        return editingField === field.key ? (
          <div>
            <span className="font-medium text=[#1D1B20]">{`${field.label}: `}</span>
            <input
              type="text"
              value={summaryData[field.key]}
              onChange={(e) => setSummaryData({ ...summaryData, [field.key]: e.target.value })}
            />
          </div>
        ) : (
          <div>
            <span className="font-medium text=[#1D1B20]">{`${field.label}: `}</span>
            <span
                className={`${field.isEditable ? "text-[#000] cursor-pointer" : "text-[#49454F]"}`}
                onClick={() => handleEditableFieldClick(field)}
            >
                {summaryValues[field.key]}
            </span>
          </div>
        );
    }
  };

  const getSectionFields = (section: string) => {
    return summaryFields.filter((field) => field.sectionKey === section);
  };

  return (
    <div>
      {summarySections.map(({ title, icon, key }) => (
        <Accordion
          key={key}
          title={title}
          titleIcon={icon}
        >
          {getSectionFields(key).map((field) => (
            <div key={field.key}>{getFieldDisplay(field)}</div>
          ))}
        </Accordion>
      ))}
    </div>
  );
};

export default CallSummary;
