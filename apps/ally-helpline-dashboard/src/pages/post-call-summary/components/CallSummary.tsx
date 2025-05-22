import { useState } from "react";

import { Accordion, DropdownField, TextField, Button } from "@/components";
import { CallDetails } from "@/assets/icons";

import { labelShownSections, summaryFields, summarySections, summaryValues } from "../constants";
import { SummaryField } from "../types";

const CallSummary = () => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState(summaryValues);

  const handleEditableFieldClick = (field: SummaryField) => {
    if (field.isEditable) {
      setEditingField(field.key);
    }
  };

  const getFieldDisplay = (field: SummaryField) => {
    switch (field.type) {
      case "Dropdown":
        return (
          <div key={field.key} className="flex gap-1">
            <span className="font-medium text-[16px] text-[#000]">{`${field.label}: `}</span>
            <DropdownField
              value={summaryData[field.key]}
              onChange={(value) => setSummaryData({ ...summaryData, [field.key]: value })}
              options={field.options ?? []}
            />
          </div>
        );
      case "Multiline":
        return (
          <div key={field.key} className="flex flex-col gap-1">
            {labelShownSections.includes(field.sectionKey) && (
              <span className="font-medium text-[16px] text-[#000]">{`${field.label}: `}</span>
            )}
            <TextField
              value={summaryData[field.key]}
              onChange={(e) => setSummaryData({ ...summaryData, [field.key]: e.target.value })}
              multiline
              rows={4}
              className="w-full text-[16px]"
              placeholder={field.placeholder}
            />
          </div>
        );
      case "Number":
      case "Text":
      default:
        return editingField === field.key ? (
          <div key={field.key}>
            <span className="font-medium text-[16px] text-[#1D1B20]">{`${field.label}: `}</span>
            <input
              type="text"
              value={summaryData[field.key]}
              onBlur={() => setEditingField(null)}
              onChange={(e) => setSummaryData({ ...summaryData, [field.key]: e.target.value })}
              className="text-[16px]"
            />
          </div>
        ) : (
          <div key={field.key}>
            <span className="font-medium text-[16px] text-[#1D1B20]">{`${field.label}: `}</span>
            <span
              className={`${field.isEditable ? "text-[#000] cursor-pointer" : "text-gray-500"} text-[16px]`}
              onClick={() => handleEditableFieldClick(field)}
            >
              {summaryData[field.key]}
            </span>
          </div>
        );
    }
  };

  const getSectionFields = (section: string) => {
    return summaryFields.filter((field) => field.sectionKey === section);
  };

  return (
    <>
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
        {summarySections.map(({ title, icon, key }) => (
          <Accordion
            key={key}
            title={title}
            titleIcon={icon}
          >
            {getSectionFields(key).map((field) => getFieldDisplay(field))}
          </Accordion>
        ))}
      </div>
      <div className="flex justify-center">
        <Button
          className="rounded-[100px]"
          onClick={() => console.log(summaryData)}
        >
          Submit
        </Button>
      </div>
    </>
  );
};

export default CallSummary;
