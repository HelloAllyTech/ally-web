import { FC, useState } from "react";

import { ArrowDown, ArrowUp, Edit, Table, TrashCan } from "@carbon/icons-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import {
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  IconButton,
  Loading,
  InlineLoading,
} from "@ally-ui-mono/ui-shared";
import {
  useGetCustomFieldDefinitionsQuery,
  useDeleteCustomFieldDefinitionMutation,
  useReorderCustomFieldDefinitionsMutation,
  useUpdateCustomFieldDefinitionMutation,
} from "@api";
import { Button } from "@components";
import { Permissions } from "@constants";
import { useCustomFieldsEnabled } from "@hooks";
import { RootState } from "@store";
import { CustomFieldDefinition, CustomFieldScope, CustomFieldType } from "@types";

import CustomFieldModal from "./CustomFieldModal";

interface ConfirmDeleteDialogProps {
  field: CustomFieldDefinition | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

const ConfirmDeleteDialog: FC<ConfirmDeleteDialogProps> = ({
  field,
  onConfirm,
  onCancel,
  isDeleting,
}) => (
  <ComposedModal open={Boolean(field)} onClose={onCancel} size="xs" danger>
    <ModalHeader title="Delete custom field?" />
    <ModalBody>
      <p className="text-sm text-typography-600">
        Deleting <span className="font-medium">"{field?.name}"</span> will hide it from all call
        logs. Existing values will not be removed.
      </p>
    </ModalBody>
    <ModalFooter>
      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
      <Button onClick={onConfirm} disabled={isDeleting}>
        {isDeleting ? <InlineLoading /> : "Delete"}
      </Button>
    </ModalFooter>
  </ComposedModal>
);

interface ManageCustomFieldsDialogProps {
  open: boolean;
  onClose: () => void;
}

const TYPE_LABELS: Record<CustomFieldType, string> = {
  [CustomFieldType.SINGLE_SELECT]: "Single Select",
  [CustomFieldType.MULTI_SELECT]: "Multi Select",
  [CustomFieldType.DATE]: "Date",
  [CustomFieldType.TEXT]: "Text",
  [CustomFieldType.NUMBER]: "Number",
  [CustomFieldType.BOOLEAN]: "Yes / No",
};

const ManageCustomFieldsDialog: FC<ManageCustomFieldsDialogProps> = ({ open, onClose }) => {
  const { permissions } = useSelector((state: RootState) => state.user);
  const canManage = permissions?.includes(Permissions.MANAGE_CUSTOM_FIELD_DEFINITIONS);

  const { data: customFieldsEnabled } = useCustomFieldsEnabled();
  const customFieldsActive = customFieldsEnabled !== false;

  const { data: rawDefinitions = [], isLoading } = useGetCustomFieldDefinitionsQuery(undefined, {
    skip: !customFieldsActive || !canManage,
  });
  // SUPER_ADMIN-scoped fields are managed only from scribe settings; the
  // calls table and call-detail page still display their values, but this
  // dialog must not list or expose them for in-app edit.
  const definitions = rawDefinitions.filter(d => d.scope !== CustomFieldScope.SUPER_ADMIN);
  const [deleteDefinition, { isLoading: isDeleting }] = useDeleteCustomFieldDefinitionMutation();
  const [updateDefinition] = useUpdateCustomFieldDefinitionMutation();
  const [reorderDefinitions] = useReorderCustomFieldDefinitionsMutation();

  const [fieldToDelete, setFieldToDelete] = useState<CustomFieldDefinition | null>(null);
  const [fieldToEdit, setFieldToEdit] = useState<CustomFieldDefinition | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const handleDelete = async () => {
    if (!fieldToDelete || !canManage) return;
    try {
      await deleteDefinition(fieldToDelete.id).unwrap();
      toast.success("Custom field deleted");
    } catch {
      toast.error("Failed to delete custom field");
    } finally {
      setFieldToDelete(null);
    }
  };

  const handleToggleShowInTable = async (field: CustomFieldDefinition) => {
    if (!canManage) return;
    try {
      await updateDefinition({ id: field.id, showInTable: !field.showInTable }).unwrap();
    } catch {
      toast.error("Failed to update field visibility");
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (!canManage) return;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= definitions.length) return;

    const reordered = [...definitions];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];

    try {
      await reorderDefinitions({ ids: reordered.map(f => f.id) }).unwrap();
    } catch {
      toast.error("Failed to reorder fields");
    }
  };

  return (
    <>
      <ComposedModal open={open} onClose={onClose} size="sm">
        <ModalHeader title="Manage custom fields" />
        <ModalBody>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loading withOverlay={false} />
            </div>
          ) : definitions.length === 0 ? (
            <p className="text-sm text-typography-500 text-center py-6">No custom fields yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {definitions.map((field, index) => (
                <div key={field.id} className="flex items-center justify-between py-3 px-1">
                  <div>
                    <p className="text-sm font-medium text-typography-800">{field.name}</p>
                    <p className="text-xs text-typography-400">
                      {TYPE_LABELS[field.fieldType]} · {field.sectionLabel ?? field.sectionKey}
                    </p>
                  </div>
                  <div className="flex gap-1 items-center">
                    <div className="flex flex-col">
                      <IconButton
                        label="Move up"
                        kind="ghost"
                        size="sm"
                        onClick={() => handleMove(index, "up")}
                        disabled={index === 0}
                      >
                        <ArrowUp />
                      </IconButton>
                      <IconButton
                        label="Move down"
                        kind="ghost"
                        size="sm"
                        onClick={() => handleMove(index, "down")}
                        disabled={index === definitions.length - 1}
                      >
                        <ArrowDown />
                      </IconButton>
                    </div>
                    <IconButton
                      label={field.showInTable ? "Hide from table" : "Show in table"}
                      align="top"
                      kind="ghost"
                      size="sm"
                      onClick={() => handleToggleShowInTable(field)}
                    >
                      <Table
                        className={field.showInTable ? "text-primary-600" : "text-typography-400"}
                      />
                    </IconButton>
                    <IconButton
                      label="Edit"
                      kind="ghost"
                      size="sm"
                      onClick={() => setFieldToEdit(field)}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      label="Delete"
                      kind="ghost"
                      size="sm"
                      onClick={() => setFieldToDelete(field)}
                    >
                      <TrashCan />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <div className="flex justify-between w-full">
            <Button onClick={() => setIsAddOpen(true)}>+ Add field</Button>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </ModalFooter>
      </ComposedModal>

      <ConfirmDeleteDialog
        field={fieldToDelete}
        onConfirm={handleDelete}
        onCancel={() => setFieldToDelete(null)}
        isDeleting={isDeleting}
      />

      {fieldToEdit && (
        <CustomFieldModal
          open={Boolean(fieldToEdit)}
          onClose={() => setFieldToEdit(null)}
          editingField={fieldToEdit}
        />
      )}

      <CustomFieldModal open={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </>
  );
};

export default ManageCustomFieldsDialog;
