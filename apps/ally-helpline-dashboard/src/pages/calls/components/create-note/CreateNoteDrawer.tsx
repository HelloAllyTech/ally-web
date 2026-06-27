import { FC, useEffect, useMemo, useRef, useState } from "react";

import { CircularProgress } from "@mui/material";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useCreateNoteMutation,
  useGetCustomFieldDefinitionsQuery,
  useUpsertCustomFieldValuesMutation,
} from "@api";
import { Drawer } from "@components";
import { useDebounce, useUser } from "@hooks";
import { CustomFieldDefinition, CustomFieldValue, UserRole } from "@types";

import CustomFieldValuesPanel from "../custom-fields/CustomFieldValuesPanel";

interface CreateNoteDrawerProps {
  open: boolean;
  onClose: () => void;
}

const SAVE_DEBOUNCE_MS = 600;

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Right-side panel for creating a manual scribe note. Renders every active
 * custom field enabled for the organisation as an editable form. The note's
 * underlying chat record is created lazily on the first edit, then field values
 * auto-save (debounced) against it; the note is auto-named CALL-{id}-{date}.
 */
const CreateNoteDrawer: FC<CreateNoteDrawerProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const { user } = useUser();
  const isCounsellor = user?.role === UserRole.COUNSELLOR;

  const { data: definitions, isLoading: isDefinitionsLoading } = useGetCustomFieldDefinitionsQuery(
    undefined,
    { skip: !open },
  );

  const [createNote] = useCreateNoteMutation();
  const [upsertValues] = useUpsertCustomFieldValuesMutation();

  const [localValues, setLocalValues] = useState<Record<string, string | null>>({});
  const [noteName, setNoteName] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  // Refs survive re-renders and the in-flight create/save races.
  const noteIdRef = useRef<number | null>(null);
  const creatingRef = useRef<Promise<number> | null>(null);
  const latestValuesRef = useRef<Record<string, string | null>>({});

  // Each time the panel opens, start a fresh note.
  useEffect(() => {
    if (open) {
      setLocalValues({});
      setNoteName(null);
      setSaveState("idle");
      noteIdRef.current = null;
      creatingRef.current = null;
      latestValuesRef.current = {};
    }
  }, [open]);

  // The org's active scribe fields, mapped into the shape the panel expects
  // (definitions carry no values yet, so every field starts blank).
  const fieldValues: CustomFieldValue[] = useMemo(
    () =>
      (definitions ?? [])
        .filter((def: CustomFieldDefinition) => def.isActive)
        .slice()
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((def: CustomFieldDefinition) => ({
          fieldDefinitionId: def.id,
          name: def.name,
          fieldType: def.fieldType,
          options: def.options,
          sectionKey: def.sectionKey,
          sectionLabel: def.sectionLabel ?? "",
          editPermission: def.editPermission,
          fillMode: def.fillMode,
          displayOrder: def.displayOrder,
          value: null,
        })),
    [definitions],
  );

  // Create the note record once, reusing the in-flight promise for rapid edits.
  const ensureNote = async (): Promise<number> => {
    if (noteIdRef.current != null) return noteIdRef.current;
    if (!creatingRef.current) {
      creatingRef.current = createNote()
        .unwrap()
        .then(res => {
          noteIdRef.current = res.chatId;
          setNoteName(res.name);
          return res.chatId;
        });
    }
    return creatingRef.current;
  };

  const persist = async () => {
    setSaveState("saving");
    try {
      const chatId = await ensureNote();
      const values = Object.entries(latestValuesRef.current).map(([fieldDefinitionId, value]) => ({
        fieldDefinitionId,
        value: value ?? undefined,
      }));
      await upsertValues({ chatId, values }).unwrap();
      setSaveState("saved");
    } catch {
      setSaveState("error");
      creatingRef.current = null; // allow a retry on the next edit
      toast.error(t("calls.createNote.saveError"));
    }
  };

  const debouncedPersist = useDebounce(persist, SAVE_DEBOUNCE_MS);

  const handleValueChange = (fieldDefinitionId: string, value: string | null) => {
    setLocalValues(prev => {
      const next = { ...prev, [fieldDefinitionId]: value };
      latestValuesRef.current = next;
      return next;
    });
    debouncedPersist();
  };

  // Flush pending edits before the drawer unmounts (useDebounce cancels its
  // timer on unmount, so the last keystroke would otherwise be lost).
  const handleClose = () => {
    if (Object.keys(latestValuesRef.current).length > 0 && saveState !== "saved") {
      void persist();
    }
    onClose();
  };

  const saveLabel =
    saveState === "saving"
      ? t("calls.createNote.saving")
      : saveState === "saved"
        ? t("calls.createNote.saved")
        : saveState === "error"
          ? t("calls.createNote.saveError")
          : "";

  const renderBody = () => {
    if (isDefinitionsLoading) {
      return (
        <div className="flex justify-center py-6" data-testid="create-note-loading">
          <CircularProgress size={20} />
        </div>
      );
    }
    if (fieldValues.length === 0) {
      return (
        <p className="text-typography-600 text-sm py-4" data-testid="create-note-empty">
          {t("calls.createNote.empty")}
        </p>
      );
    }
    return (
      <CustomFieldValuesPanel
        chatId={0}
        canEdit
        isCounsellor={isCounsellor}
        externalFieldValues={fieldValues}
        externalLocalValues={localValues}
        onValueChange={handleValueChange}
      />
    );
  };

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      className="font-primary"
      drawerClassName="h-screen w-[440px] max-w-[92vw]"
      bodyClassName="overflow-y-auto"
      title={noteName ?? t("calls.createNote.title")}
    >
      <div className="flex flex-col gap-2" data-testid="create-note-drawer">
        {saveLabel && (
          <span
            className={`text-xs ${
              saveState === "error" ? "text-destructive-500" : "text-typography-500"
            }`}
            data-testid="create-note-save-status"
          >
            {saveLabel}
          </span>
        )}
        {renderBody()}
      </div>
    </Drawer>
  );
};

export default CreateNoteDrawer;
