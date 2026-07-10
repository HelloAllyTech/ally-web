import { FC } from "react";

import { useFormContext, useWatch } from "react-hook-form";

import { GetScenarioType, TrackFormValues, TrackItemType } from "@types";

import { ItemEditorFrame } from "./ItemEditorFrame";
import { ReferencePicker } from "./ReferencePicker";

interface CaseItemEditorProps {
  sectionIndex: number;
  itemIndex: number;
  onDelete: () => void;
}

export const CaseItemEditor: FC<CaseItemEditorProps> = ({ sectionIndex, itemIndex, onDelete }) => {
  const { control, setValue, getValues } = useFormContext<TrackFormValues>();
  const base = `sections.${sectionIndex}.items.${itemIndex}` as const;

  const caseId = useWatch({ control, name: `${base}.caseId` });
  const refTitle = useWatch({ control, name: `${base}.refTitle` });
  const refCoverImageUrl = useWatch({ control, name: `${base}.refCoverImageUrl` });

  const handleSelect = (row: GetScenarioType | null) => {
    // caseId is a string in the track contract; the picker yields numeric ids.
    setValue(`${base}.caseId`, row ? String(row.scenarioId) : null, { shouldDirty: true });
    setValue(`${base}.refTitle`, row?.title ?? "", { shouldDirty: true });
    setValue(`${base}.refCoverImageUrl`, row?.coverImageUrl ?? "", { shouldDirty: true });
    if (row && !getValues(`${base}.title`)) {
      setValue(`${base}.title`, row.title, { shouldDirty: true });
    }
  };

  return (
    <ItemEditorFrame
      sectionIndex={sectionIndex}
      itemIndex={itemIndex}
      type={TrackItemType.CASE}
      onDelete={onDelete}
    >
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-typography-800">Case</label>
        <ReferencePicker
          entityType="case"
          selected={{ id: caseId ?? null, title: refTitle, coverImageUrl: refCoverImageUrl }}
          onSelect={handleSelect}
        />
      </div>
    </ItemEditorFrame>
  );
};
