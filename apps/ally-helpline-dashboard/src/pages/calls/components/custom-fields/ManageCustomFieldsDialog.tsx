import { FC, useState } from "react";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import TableChartIcon from "@mui/icons-material/TableChart";
import { toast } from "sonner";
import { useSelector } from "react-redux";

import {
  useGetCustomFieldDefinitionsQuery,
  useGetCustomFieldsEnabledQuery,
  useDeleteCustomFieldDefinitionMutation,
  useUpdateCustomFieldDefinitionMutation,
} from "@api";
import { Button } from "@components";
import { Permissions } from "@constants";
import { RootState } from "@store";
import { CustomFieldDefinition, CustomFieldType } from "@types";

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
  <Dialog open={Boolean(field)} onClose={onCancel} maxWidth="xs" fullWidth>
    <DialogTitle>Delete custom field?</DialogTitle>
    <DialogContent>
      <p className="text-sm text-typography-600">
        Deleting <span className="font-medium">"{field?.name}"</span> will hide it from all call
        logs. Existing values will not be removed.
      </p>
    </DialogContent>
    <DialogActions className="px-6 py-3 gap-2">
      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
      <Button onClick={onConfirm} disabled={isDeleting}>
        {isDeleting ? <CircularProgress size={16} /> : "Delete"}
      </Button>
    </DialogActions>
  </Dialog>
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

  const { data: customFieldsEnabled } = useGetCustomFieldsEnabledQuery();
  const customFieldsActive = customFieldsEnabled !== false;

  const { data: definitions = [], isLoading } = useGetCustomFieldDefinitionsQuery(undefined, {
    skip: !customFieldsActive || !canManage,
  });
  const [deleteDefinition, { isLoading: isDeleting }] = useDeleteCustomFieldDefinitionMutation();
  const [updateDefinition] = useUpdateCustomFieldDefinitionMutation();

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

    const a = definitions[index];
    const b = definitions[swapIndex];

    try {
      await Promise.all([
        updateDefinition({ id: a.id, displayOrder: b.displayOrder }).unwrap(),
        updateDefinition({ id: b.id, displayOrder: a.displayOrder }).unwrap(),
      ]);
    } catch {
      toast.error("Failed to reorder fields");
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Manage custom fields</DialogTitle>
        <DialogContent dividers>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <CircularProgress />
            </div>
          ) : definitions.length === 0 ? (
            <p className="text-sm text-typography-500 text-center py-6">
              No custom fields yet.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {definitions.map((field, index) => (
                <div
                  key={field.id}
                  className="flex items-center justify-between py-3 px-1"
                >
                  <div>
                    <p className="text-sm font-medium text-typography-800">{field.name}</p>
                    <p className="text-xs text-typography-400">
                      {TYPE_LABELS[field.fieldType]} · {field.sectionLabel ?? field.sectionKey}
                    </p>
                  </div>
                  <div className="flex gap-1 items-center">
                    <div className="flex flex-col">
                      <IconButton
                        size="small"
                        onClick={() => handleMove(index, "up")}
                        disabled={index === 0}
                      >
                        <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleMove(index, "down")}
                        disabled={index === definitions.length - 1}
                      >
                        <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </div>
                    <Tooltip
                      title={field.showInTable ? "Hide from table" : "Show in table"}
                      placement="top"
                      arrow
                    >
                      <IconButton
                        size="small"
                        onClick={() => handleToggleShowInTable(field)}
                        sx={{ color: field.showInTable ? "primary.main" : "text.disabled" }}
                      >
                        {field.showInTable ? (
                          <TableChartIcon fontSize="small" />
                        ) : (
                          <TableChartOutlinedIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                    <IconButton size="small" onClick={() => setFieldToEdit(field)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setFieldToDelete(field)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
        <DialogActions className="px-6 py-3 flex justify-between w-full">
          <Button onClick={() => setIsAddOpen(true)}>
            + Add field
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

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

      <CustomFieldModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </>
  );
};

export default ManageCustomFieldsDialog;
