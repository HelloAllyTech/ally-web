import React, { useState, useCallback, useMemo } from "react";

import { useDispatch } from "react-redux";
import { toast } from "sonner";

import { TextInput } from "@ally-ui-mono/ui-shared";
import {
  useCreateBadgeMutation,
  useUpdateBadgeMutation,
  useUploadBadgeIconMutation,
  useGetRoleQuery,
  useDeleteBadgeMutation,
  useDeleteBadgeIconMutation,
  baseAPI,
} from "@api";
import { DoubleArrowRight, TooltipIcon, Trash, ArrowDownFilled } from "@assets";
import { ActionConfirmationPopup, Button, ToggleSwitch } from "@components";
import { IconUploader } from "@components/icon-uploader";
import { ButtonVariant } from "@components/types";
import { en, TAG_TYPES } from "@constants";
import { UserBadge, BadgeCategory } from "@types";

import { BADGE_CRITERIA, BADGE_ROLES, getInitialFormData } from "./constants";
import { CreateBadgeSidePanelProps, FieldProps, BadgeFormData } from "./types";

const Field: React.FC<FieldProps> = ({ label, children, multiline = false, required = false }) => (
  <div
    className={`flex flex-row min-h-[40px] ${multiline ? "items-start" : "items-center"} text-base justify-between`}
  >
    <div className={`w-[40%] ${multiline && "mt-[8px]"}`}>
      <span className="text-base font-regular text-typography-800">
        {label}
        {required && <span className="text-red-500">*</span>}
      </span>
    </div>
    <div className="w-[60%] flex text-left justify-start text-neutral-800">{children}</div>
  </div>
);

const PanelHeader: React.FC<{
  onClose: () => void;
  isEditMode: boolean;
  onDelete?: () => void;
}> = ({ onClose, isEditMode, onDelete }) => (
  <div className="flex items-center justify-between p-6">
    <button
      onClick={onClose}
      className="flex flex-row items-center justify-center gap-2 text-typography-600 hover:text-neutral-800"
    >
      <DoubleArrowRight width={14} height={14} />
      <span className="text-base font-tertiary font-[500]">
        {isEditMode ? en.badge.editBadge : en.badge.createBadge}
      </span>
    </button>
    {isEditMode && onDelete && (
      <button
        onClick={onDelete}
        className="p-2 text-typography-500 flex items-center gap-2 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
        title={en.badge.deleteBadge}
      >
        <Trash width={18} height={18} />
        <span className="text-base font-tertiary font-medium">{en.badge.deleteBadge}</span>
      </button>
    )}
  </div>
);

export const CreateBadgeSidePanel: React.FC<CreateBadgeSidePanelProps> = ({
  selectedBadgeType,
  selectedBadge,
  isOpen,
  onClose,
  onSuccess,
  onBadgeCreated,
  onBadgeUpdated,
  onBadgeDeleted,
}) => {
  const isEditMode = !!selectedBadge?.id;
  const dispatch = useDispatch();
  const { data: roles } = useGetRoleQuery();
  const [createBadge, { isLoading: isCreating }] = useCreateBadgeMutation();
  const [deleteBadge, { isLoading: isDeleting }] = useDeleteBadgeMutation();
  const [updateBadge, { isLoading: isUpdating }] = useUpdateBadgeMutation();
  const [formData, setFormData] = useState<BadgeFormData>(() =>
    getInitialFormData(selectedBadgeType, selectedBadge, roles),
  );
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showPublishConfirmation, setShowPublishConfirmation] = useState(false);

  const isLoading = isCreating || isUpdating || isDeleting;

  const [uploadBadgeIcon] = useUploadBadgeIconMutation();
  const [deleteBadgeIcon] = useDeleteBadgeIconMutation();

  const handleIconUpload = useCallback(
    async (payload: { fileName: string; fileSize: number; contentType: string }) => {
      const response = await uploadBadgeIcon(payload).unwrap();
      if (isEditMode) {
        await updateBadge({
          id: selectedBadge?.id || "",
          data: {
            imageUrl: response.imageUrl,
          },
        });
        const updatedBadge = {
          ...selectedBadge,
          imageUrl: response.imageUrl,
        };
        setTimeout(() => {
          onBadgeUpdated?.(updatedBadge);
        }, 1000);
        dispatch(baseAPI.util.invalidateTags([TAG_TYPES.USER_BADGES]));
      }
      return response;
    },
    [uploadBadgeIcon, isEditMode, updateBadge, dispatch, onBadgeUpdated, selectedBadge],
  );

  // Get criteria config for selected badge type
  const criteriaConfig = useMemo(() => {
    if (!selectedBadgeType) return null;
    return BADGE_CRITERIA[selectedBadgeType];
  }, [selectedBadgeType]);

  // Track initial form data to detect changes
  const [initialFormData, setInitialFormData] = useState<BadgeFormData>(() =>
    getInitialFormData(selectedBadgeType, selectedBadge, roles),
  );

  // Reset form when badge type, selected badge, or roles changes
  const [lastBadgeType, setLastBadgeType] = useState(selectedBadgeType);
  const [lastSelectedBadgeId, setLastSelectedBadgeId] = useState(selectedBadge?.id);
  const [lastRolesLoaded, setLastRolesLoaded] = useState<boolean>(!!roles);

  if (
    selectedBadgeType !== lastBadgeType ||
    selectedBadge?.id !== lastSelectedBadgeId ||
    (!!roles !== lastRolesLoaded && roles)
  ) {
    const newInitialData = getInitialFormData(selectedBadgeType, selectedBadge, roles);
    setFormData(newInitialData);
    setInitialFormData(newInitialData);
    setLastBadgeType(selectedBadgeType);
    setLastSelectedBadgeId(selectedBadge?.id);
    setLastRolesLoaded(!!roles);
  }

  // Check if form has unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return (
      formData.name !== initialFormData.name ||
      formData.description !== initialFormData.description ||
      formData.visibilityType !== initialFormData.visibilityType ||
      JSON.stringify(formData.roles) !== JSON.stringify(initialFormData.roles) ||
      formData.achievementParams?.count !== initialFormData.achievementParams?.count
    );
  }, [formData, initialFormData]);

  // Get category display name
  const categoryDisplayName = useMemo(() => {
    if (!selectedBadgeType) return "-";
    return BadgeCategory[selectedBadgeType as keyof typeof BadgeCategory] || selectedBadgeType;
  }, [selectedBadgeType]);

  // Get role for badge type
  const badgeRole = useMemo(() => {
    if (!selectedBadgeType) return null;
    return BADGE_ROLES[selectedBadgeType];
  }, [selectedBadgeType]);

  // Get role display name (capitalize first letter)
  const roleDisplayName = useMemo(() => {
    if (!badgeRole) return "-";
    return badgeRole.charAt(0) + badgeRole.slice(1).toLowerCase();
  }, [badgeRole]);

  // Get groupId from roles API based on badge role
  const groupId = useMemo(() => {
    if (!badgeRole || !roles) return null;
    const role = roles.find(r => r.name === badgeRole);
    return role ? role.id : null;
  }, [badgeRole, roles]);

  // Update groupIds when groupId changes (for both create and edit mode if groupIds are empty)
  const [lastGroupId, setLastGroupId] = useState<number | null>(null);
  if (groupId !== lastGroupId) {
    setLastGroupId(groupId);
    if (groupId && formData.groupIds.length === 0) {
      setFormData(prev => ({
        ...prev,
        groupIds: [groupId],
      }));
    }
  }

  const handleFieldChange = useCallback((field: keyof UserBadge, value: any) => {
    setFormData(previousData => ({
      ...previousData,
      [field]: value,
    }));
  }, []);

  const handleAchievementParamsChange = useCallback((count: number) => {
    setFormData(previousData => ({
      ...previousData,
      achievementParams: { count },
    }));
  }, []);

  const handleCriteriaIncrement = useCallback(() => {
    const currentValue = formData.achievementParams?.count || 0;
    handleAchievementParamsChange(currentValue + 1);
  }, [formData.achievementParams?.count, handleAchievementParamsChange]);

  const handleCriteriaDecrement = useCallback(() => {
    const currentValue = formData.achievementParams?.count || 0;
    if (currentValue > 0) {
      handleAchievementParamsChange(currentValue - 1);
    }
  }, [formData.achievementParams?.count, handleAchievementParamsChange]);

  const handleSaveBadge = useCallback(
    async (status: "DRAFT" | "ACTIVE") => {
      if (!formData.name) {
        toast.error(en.badge.nameRequired);
        return;
      }

      try {
        if (isEditMode && selectedBadge?.id) {
          // For edit mode, only send changed fields
          const changedData: Record<string, unknown> = {};

          if (formData.name !== initialFormData.name) {
            changedData.name = formData.name;
          }
          if (formData.description !== initialFormData.description) {
            changedData.description = formData.description || "";
          }
          if (formData.imageUrl !== initialFormData.imageUrl) {
            changedData.imageUrl = formData.imageUrl || "";
          }
          if (formData.visibilityType !== initialFormData.visibilityType) {
            changedData.visibilityType =
              (formData.visibilityType as "PUBLIC" | "PRIVATE") || "PRIVATE";
          }
          if (JSON.stringify(formData.roles) !== JSON.stringify(initialFormData.roles)) {
            changedData.roles = formData.roles || [];
          }
          if (JSON.stringify(formData.groupIds) !== JSON.stringify(initialFormData.groupIds)) {
            changedData.groupIds = formData.groupIds || [];
          }
          if (formData.achievementParams?.count !== initialFormData.achievementParams?.count) {
            changedData.achievementParams = formData.achievementParams || { count: 0 };
          }

          // Always include status if it's being changed
          if (status !== initialFormData.status) {
            changedData.status = status;
          }

          await updateBadge({
            id: selectedBadge.id,
            data: changedData,
          }).unwrap();

          const updatedBadge = {
            ...selectedBadge,
            ...changedData,
          };
          onBadgeUpdated?.(updatedBadge);
          toast.success(en.badge.badgeUpdatedSuccessfully);
        } else {
          // For create mode, send all data
          const badgeData = {
            name: formData.name,
            description: formData.description || "",
            imageUrl: formData.imageUrl || "",
            status,
            visibilityType: (formData.visibilityType as "PUBLIC" | "PRIVATE") || "PRIVATE",
            category: selectedBadgeType || formData.category || "",
            roles: formData.roles || [],
            groupIds: formData.groupIds || [],
            achievementParams: formData.achievementParams || { count: 0 },
          };

          const { id } = await createBadge(badgeData).unwrap();
          const badgeRoles = badgeData.groupIds.map(
            groupId => roles.find(r => r.id === groupId)?.name || "",
          );
          const newBadge = {
            ...badgeData,
            id,
            roles: badgeRoles,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          onBadgeCreated?.(newBadge);
          toast.success(
            status === "DRAFT" ? en.badge.badgeSavedAsDraft : en.badge.badgePublishedSuccessfully,
          );
        }
        onSuccess?.();
        onClose();
        setShowPublishConfirmation(false);
        setShowDeleteConfirmation(false);
        setShowConfirmationModal(false);
      } catch {
        toast.error(isEditMode ? en.badge.badgeUpdateFailed : en.badge.badgeCreationFailed);
      }
    },
    [
      formData,
      initialFormData,
      selectedBadgeType,
      selectedBadge,
      isEditMode,
      createBadge,
      updateBadge,
      onSuccess,
      onClose,
      roles,
      onBadgeCreated,
      onBadgeUpdated,
    ],
  );

  const handleSaveAsDraft = useCallback(() => {
    handleSaveBadge("DRAFT");
  }, [handleSaveBadge]);

  const handlePublish = useCallback(() => {
    handleSaveBadge("ACTIVE");
  }, [handleSaveBadge]);

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowConfirmationModal(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const handleConfirmClose = useCallback(async () => {
    setShowConfirmationModal(false);
    if (formData.imageUrl && !isEditMode) {
      await deleteBadgeIcon({ imageUrl: formData.imageUrl || "" }).unwrap();
    }
    onClose();
  }, [onClose, deleteBadgeIcon, formData.imageUrl, isEditMode]);

  const handleCancelClose = useCallback(() => {
    setShowConfirmationModal(false);
  }, []);

  // Delete badge handlers
  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirmation(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    try {
      await deleteBadge({ id: selectedBadge?.id || "" }).unwrap();
      onBadgeDeleted?.(selectedBadge?.id || "");
      toast.success(en.badge.badgeDeletedSuccessfully);
      setShowDeleteConfirmation(false);
      onSuccess?.();
      onClose();
    } catch {
      toast.error(en.badge.badgeDeletionFailed);
    }
  }, [onSuccess, onClose, deleteBadge, selectedBadge, onBadgeDeleted]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirmation(false);
  }, []);

  // Check if form is valid for saving
  const isFormValid = useMemo(() => {
    return !!(
      formData.name &&
      formData.groupIds.length > 0 &&
      formData.description &&
      formData.achievementParams?.count > 0 &&
      formData.imageUrl
    );
  }, [
    formData.name,
    formData.groupIds,
    formData.description,
    formData.achievementParams?.count,
    formData.imageUrl,
  ]);

  // Check if save/publish should be enabled
  const canSave = useMemo(() => {
    if (isEditMode) {
      // In edit mode, require both valid form AND changes
      return isFormValid && hasUnsavedChanges;
    }
    // In create mode, only require valid form
    return isFormValid;
  }, [isEditMode, isFormValid, hasUnsavedChanges]);

  const canPublish = useMemo(() => {
    return isFormValid;
  }, [isFormValid]);

  const handleDeleteBadgeIcon = useCallback(async () => {
    await deleteBadgeIcon({ imageUrl: formData.imageUrl || "" }).unwrap();
  }, [deleteBadgeIcon, formData.imageUrl]);

  const saveAsDraftTitle = useMemo(() => {
    return formData.status === "ACTIVE"
      ? en.badge.badgeAlreadyPublished
      : !isFormValid
        ? en.badge.nameRequired
        : isEditMode && !hasUnsavedChanges
          ? en.badge.noChangesToSave
          : "";
  }, [formData.status, isFormValid, isEditMode, hasUnsavedChanges]);

  const saveAsDraftDisabled = useMemo(() => {
    return !canSave || isLoading || formData.status === "ACTIVE";
  }, [canSave, isLoading, formData.status]);

  const publishDisabled = useMemo(() => {
    return !canPublish || isLoading || (!hasUnsavedChanges && formData.status === "ACTIVE");
  }, [canPublish, isLoading, hasUnsavedChanges, formData.status]);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex font-primary">
      <div className="flex-1 bg-black bg-opacity-50" onClick={handleClose} />
      <div className="w-[50%] min-w-[700px] bg-white shadow-xl border-l-[1px] border-border-light overflow-y-auto custom-scrollbar">
        <PanelHeader onClose={handleClose} isEditMode={isEditMode} onDelete={handleDeleteClick} />

        <div className="h-[calc(100vh-100px)] px-10 pl-[46px] pt-2 overflow-y-auto custom-scrollbar">
          {/* Icon Uploader Section */}
          <div className="py-6">
            <IconUploader
              imageUrl={formData.imageUrl || ""}
              onImageDelete={handleDeleteBadgeIcon}
              onImageChange={url => handleFieldChange("imageUrl", url)}
              onUpload={handleIconUpload}
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2 w-full text-typography-400">
            <div>Details</div> <div className="border-t border-border-light my-4 w-full" />
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            {/* Name */}
            <Field label={en.badge.name} required>
              <TextInput
                id="badge-name"
                labelText={en.badge.name}
                hideLabel
                value={formData.name || ""}
                onChange={event => handleFieldChange("name", event.target.value)}
                placeholder={en.badge.enterName}
                className="w-full"
              />
            </Field>
            {/* Description */}
            <Field label={en.badge.description} multiline required>
              <TextInput
                id="badge-description"
                labelText={en.badge.description}
                hideLabel
                value={formData.description || ""}
                onChange={event => handleFieldChange("description", event.target.value)}
                placeholder={en.badge.enterDescription}
                className="w-full"
              />
            </Field>

            {/* Visibility */}
            <Field label={en.badge.visibility}>
              <ToggleSwitch
                enabled={formData.visibilityType === "PUBLIC"}
                onChange={value =>
                  handleFieldChange("visibilityType", value ? "PUBLIC" : "PRIVATE")
                }
                label={en.badge.selectVisibility}
              />
              <span className="text-base text-typography-800 ml-4">
                {formData.visibilityType === "PUBLIC" ? "Enabled" : "Disabled"}
              </span>
            </Field>

            {/* Category */}
            <Field label={en.badge.category}>
              <div className="flex items-center gap-2">
                <span className="text-base text-typography-800">{categoryDisplayName} Badges</span>
              </div>
            </Field>

            {/* Role */}
            <Field label={en.badge.role}>
              <div className="flex items-center gap-2">
                <span className="text-base text-typography-800">{roleDisplayName}</span>
              </div>
            </Field>
          </div>
          {/* Divider */}
          <div className="flex items-center gap-2 w-full text-typography-400 mt-4">
            <div className="flex items-center gap-1 shrink-0">
              <span>Criteria</span>
              <div className="relative group">
                <TooltipIcon />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-typography-900 text-white text-xs rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  {en.badge.cannotChangeAfterPublishing}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-typography-900" />
                </div>
              </div>
            </div>
            <div className="border-t border-border-light w-full" />
          </div>

          {/* Criteria Input Field */}
          {criteriaConfig && (
            <div
              className="mt-4 space-y-3"
              style={{
                opacity: isEditMode ? 0.5 : 1,
                pointerEvents: isEditMode ? "none" : "auto",
              }}
            >
              <Field label={criteriaConfig.label} required>
                <div className="inline-flex items-center">
                  <input
                    type="number"
                    min="0"
                    value={formData.achievementParams?.count || 0}
                    onChange={event => {
                      const value = parseInt(event.target.value, 10);
                      handleAchievementParamsChange(isNaN(value) ? 0 : value);
                    }}
                    placeholder="0"
                    className={`border-none focus:outline-none text-base bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                      criteriaConfig.unit ? "w-8 text-right" : "w-6 text-center"
                    }`}
                    // Scrolling over a focused number input silently changes its
                    // value in the browser — blur so the page scrolls instead.
                    onWheel={e => e.currentTarget.blur()}
                  />
                  {criteriaConfig.unit && (
                    <span className="text-base text-typography-600 ml-1 capitalize">
                      {criteriaConfig.unit}
                    </span>
                  )}
                  <div className="flex flex-col justify-center items-center ml-2">
                    <button
                      type="button"
                      data-testid="criteria-increment-btn"
                      onClick={handleCriteriaIncrement}
                      className="text-typography-400 p-1 rotate-180 hover:text-typography-600 leading-none"
                    >
                      <ArrowDownFilled width={10} height={10} />
                    </button>
                    <button
                      type="button"
                      data-testid="criteria-decrement-btn"
                      onClick={handleCriteriaDecrement}
                      className="text-typography-400 p-1 hover:text-typography-600 leading-none"
                    >
                      <ArrowDownFilled width={10} height={10} />
                    </button>
                  </div>
                </div>
              </Field>
            </div>
          )}

          <div className="flex gap-3 mt-8 pb-6 justify-center">
            <Button
              variant={ButtonVariant.SECONDARY}
              onClick={handleSaveAsDraft}
              disabled={saveAsDraftDisabled}
              title={saveAsDraftTitle}
            >
              {en.badge.saveAsDraft}
            </Button>
            <Button
              variant={ButtonVariant.PRIMARY}
              disabled={publishDisabled}
              onClick={() => setShowPublishConfirmation(true)}
            >
              {en.badge.publish}
            </Button>
          </div>
        </div>
      </div>

      <ActionConfirmationPopup
        isOpen={showConfirmationModal}
        onClose={handleCancelClose}
        title={en.badge.unsavedChanges}
        description={en.badge.unsavedChangesDescription}
        primaryButton={{
          label: en.badge.closeAnyway,
          onClick: handleConfirmClose,
        }}
        secondaryButton={{
          label: en.badge.keepEditing,
          onClick: handleCancelClose,
        }}
      />

      <ActionConfirmationPopup
        isOpen={showDeleteConfirmation}
        onClose={handleCancelDelete}
        title={en.badge.deleteBadgeConfirmation}
        titleItalic={en.badge.deleteBadgeConfirmationTitleItalic}
        description={en.badge.deleteBadgeConfirmationDescription}
        primaryButton={{
          label: en.badge.deleteBadge,
          onClick: handleConfirmDelete,
          variant: ButtonVariant.DESTRUCTIVE,
        }}
        secondaryButton={{
          label: en.common.cancel,
          onClick: handleCancelDelete,
        }}
      />

      <ActionConfirmationPopup
        isOpen={showPublishConfirmation}
        onClose={() => setShowPublishConfirmation(false)}
        title={en.badge.publishBadgeConfirmation}
        titleItalic={en.badge.publishBadgeConfirmationTitleItalic}
        description={en.badge.publishBadgeConfirmationDescription}
        primaryButton={{
          label: en.badge.publish,
          onClick: handlePublish,
        }}
        secondaryButton={{
          label: en.common.cancel,
          onClick: () => setShowPublishConfirmation(false),
        }}
      />
    </div>
  );
};
