import { FC } from "react";

import { useFormContext, useWatch } from "react-hook-form";

import { GetScenarioType, TrackFormValues, TrackItemType } from "@types";

import { ItemEditorFrame } from "./ItemEditorFrame";
import { ReferencePicker } from "./ReferencePicker";

interface RoleplayItemEditorProps {
  sectionIndex: number;
  itemIndex: number;
  onDelete: () => void;
}

export const RoleplayItemEditor: FC<RoleplayItemEditorProps> = ({
  sectionIndex,
  itemIndex,
  onDelete,
}) => {
  const { control, setValue, getValues } = useFormContext<TrackFormValues>();
  const base = `sections.${sectionIndex}.items.${itemIndex}` as const;

  const scenarioId = useWatch({ control, name: `${base}.scenarioId` });
  const refTitle = useWatch({ control, name: `${base}.refTitle` });
  const refCoverImageUrl = useWatch({ control, name: `${base}.refCoverImageUrl` });

  const handleSelect = (row: GetScenarioType | null) => {
    setValue(`${base}.scenarioId`, row ? row.scenarioId : null, { shouldDirty: true });
    setValue(`${base}.refTitle`, row?.title ?? "", { shouldDirty: true });
    setValue(`${base}.refCoverImageUrl`, row?.coverImageUrl ?? "", { shouldDirty: true });
    // Seed the item title from the picked simulation if it is still empty.
    if (row && !getValues(`${base}.title`)) {
      setValue(`${base}.title`, row.title, { shouldDirty: true });
    }
  };

  return (
    <ItemEditorFrame
      sectionIndex={sectionIndex}
      itemIndex={itemIndex}
      type={TrackItemType.ROLEPLAY}
      onDelete={onDelete}
    >
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-typography-800">Simulation</label>
        <ReferencePicker
          entityType="simulation"
          selected={{ id: scenarioId ?? null, title: refTitle, coverImageUrl: refCoverImageUrl }}
          onSelect={handleSelect}
        />
      </div>
    </ItemEditorFrame>
  );
};
