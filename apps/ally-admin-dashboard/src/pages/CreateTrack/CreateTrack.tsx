import { FC, useEffect, useMemo, useState } from "react";

import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import {
  useCreateTrackMutation,
  useGetTrackTranslationsQuery,
  useLazyGetTrackByIdQuery,
  useUpdateTrackByIdMutation,
  useUpdateTrackStructureMutation,
} from "@api";
import { WarningAlt } from "@assets";
import { ActionConfirmationPopup, Header } from "@components";
import { ButtonVariant } from "@components/types";
import { DEFAULT_TRACK_FORM_VALUES, TRACK_ENTITY_LABEL, en } from "@constants";
import { SimulationStatus, TrackFormValues, TrackItemType } from "@types";

import { ItemEditorCanvas } from "./components/ItemEditorCanvas";
import { TrackOutlineRail } from "./components/TrackOutlineRail";
import { TrackSettingsEditor } from "./components/TrackSettingsEditor";
import { TrackTranslationsEditor } from "./components/TrackTranslationsEditor";
import {
  TrackSelection,
  isSettingsSelection,
  isTranslationsSelection,
} from "./components/types";
import {
  createEmptySection,
  createItemOfType,
  deserializeTrack,
  extractTrackMetadata,
  serializeTrackForm,
  validateTrackForPublish,
} from "./trackFormUtils";

/**
 * Track 2.0 ("Course") builder. A 3-region shell (top bar / left outline rail /
 * right editor canvas) driven by one `useForm<TrackFormValues>`. Save persists
 * metadata then the whole structure; publish additionally flips status to ACTIVE.
 */
export const CreateTrack: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [trackId, setTrackId] = useState<string | null>(id ?? null);
  const [selection, setSelection] = useState<TrackSelection>("settings");
  const [showDiscardPopup, setShowDiscardPopup] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showErrorPopover, setShowErrorPopover] = useState(false);

  const [getTrackById, { data: trackDetail }] = useLazyGetTrackByIdQuery();
  // Drives the badge on the rail's Languages node. Skipped until the course
  // exists — a course with no id has nothing to translate.
  const { data: translations } = useGetTrackTranslationsQuery(trackId ?? "", {
    skip: !trackId,
  });
  const [createTrack] = useCreateTrackMutation();
  const [updateTrackMetadata] = useUpdateTrackByIdMutation();
  const [updateTrackStructure] = useUpdateTrackStructureMutation();

  const formMethods = useForm<TrackFormValues>({
    defaultValues: DEFAULT_TRACK_FORM_VALUES,
    mode: "onChange",
  });
  const {
    control,
    watch,
    reset,
    getValues,
    formState: { isDirty },
  } = formMethods;

  const sectionArray = useFieldArray({ control, name: "sections", keyName: "fieldId" });

  // Keyed on the route param, not `trackId` state — `trackId` is also set
  // internally right after a fresh create (see `persist`), and refetching at
  // that moment races the structure PUT: the GET can return the just-created
  // track before it has any sections, which then wipes the in-progress form.
  useEffect(() => {
    if (id) getTrackById(id);
  }, [id, getTrackById]);

  useEffect(() => {
    if (trackDetail) reset(deserializeTrack(trackDetail));
  }, [trackDetail, reset]);

  // Browser-level unsaved-changes guard (in addition to the in-app popup).
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const watchedValues = watch();
  const publishErrors = useMemo(() => validateTrackForPublish(watchedValues), [watchedValues]);
  const errorKeys = useMemo(
    () => new Set(publishErrors.map(error => error.nodeKey)),
    [publishErrors],
  );
  const canPublish = publishErrors.length === 0;
  const publishedLanguageCount = useMemo(
    () =>
      (translations?.languages ?? []).filter(language => language.status === "PUBLISHED").length,
    [translations],
  );

  /* ----------------------------- Rail actions ---------------------------- */

  const handleAddSection = () => {
    sectionArray.append(createEmptySection(sectionArray.fields.length));
  };

  const handleAddItem = (sectionIndex: number, type: TrackItemType) => {
    const section = getValues(`sections.${sectionIndex}`);
    const items = [...(section.items ?? []), createItemOfType(type)];
    formMethods.setValue(`sections.${sectionIndex}.items`, items, { shouldDirty: true });
    setSelection({ sectionIndex, itemIndex: items.length - 1 });
  };

  const handleDeleteSection = (sectionIndex: number) => {
    sectionArray.remove(sectionIndex);
    setSelection("settings");
  };

  const handleDeleteItem = (sectionIndex: number, itemIndex: number) => {
    const section = getValues(`sections.${sectionIndex}`);
    const items = (section.items ?? []).filter((_, index) => index !== itemIndex);
    formMethods.setValue(`sections.${sectionIndex}.items`, items, { shouldDirty: true });
    setSelection("settings");
  };

  const handleReorderSections = (from: number, to: number) => {
    sectionArray.move(from, to);
  };

  const handleReorderItems = (sectionIndex: number, from: number, to: number) => {
    const section = getValues(`sections.${sectionIndex}`);
    const items = [...(section.items ?? [])];
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);
    formMethods.setValue(`sections.${sectionIndex}.items`, items, { shouldDirty: true });
  };

  /* ------------------------------- Persist ------------------------------- */

  /** Persist metadata (+ optional status) then structure. Returns the id on success. */
  const persist = async (status?: SimulationStatus): Promise<string | null> => {
    const values = getValues();
    if (!values.title?.trim()) {
      toast.error(en.errors.titleIsRequired);
      return null;
    }

    setIsSaving(true);
    try {
      const metadata = extractTrackMetadata(values);
      let currentId = trackId;

      if (currentId) {
        await updateTrackMetadata({
          id: currentId,
          data: { ...metadata, ...(status ? { status } : {}) },
        }).unwrap();
      } else {
        const created = await createTrack(metadata).unwrap();
        currentId = created.id;
        setTrackId(created.id);
      }

      await updateTrackStructure({
        id: currentId,
        data: serializeTrackForm(values),
      }).unwrap();

      // On a fresh create the status flip needs its own call (metadata POST
      // has no status field).
      if (status && !trackId) {
        await updateTrackMetadata({ id: currentId, data: { status } }).unwrap();
      }

      reset(getValues());
      return currentId;
    } catch (error: any) {
      const message =
        error?.status === 409
          ? error?.data?.message ||
            "This track's structure is locked because learners are already enrolled."
          : error?.data?.message || `Failed to save ${TRACK_ENTITY_LABEL.toLowerCase()}`;
      toast.error(message);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    const savedId = await persist();
    return savedId ? [savedId] : null;
  };

  const handlePublish = async () => {
    if (!canPublish) return;
    const savedId = await persist(SimulationStatus.ACTIVE);
    if (savedId) {
      toast.success(`${TRACK_ENTITY_LABEL} published successfully`);
      navigate(-1);
    }
  };

  const handleBack = () => {
    if (isDirty) setShowDiscardPopup(true);
    else navigate(-1);
  };

  const handleSaveAndExit = async () => {
    const savedId = await persist();
    if (savedId) {
      setShowDiscardPopup(false);
      navigate(-1);
    }
  };

  const handleDiscard = () => {
    setShowDiscardPopup(false);
    navigate(-1);
  };

  /* -------------------------------- Render ------------------------------- */

  const title = id ? `Edit ${TRACK_ENTITY_LABEL}` : `Create ${TRACK_ENTITY_LABEL}`;
  const sections = watchedValues.sections ?? [];

  const renderCanvas = () => {
    if (isSettingsSelection(selection)) return <TrackSettingsEditor />;
    if (isTranslationsSelection(selection)) {
      return <TrackTranslationsEditor trackId={trackId} isDirty={isDirty} />;
    }
    const { sectionIndex, itemIndex } = selection;
    const item = sections[sectionIndex]?.items?.[itemIndex];
    if (!item) {
      return (
        <div className="h-full flex items-center justify-center text-sm text-typography-500">
          Select a component from the outline to edit it.
        </div>
      );
    }
    return (
      <ItemEditorCanvas
        key={item.localId}
        sectionIndex={sectionIndex}
        itemIndex={itemIndex}
        type={item.type}
        onDelete={() => handleDeleteItem(sectionIndex, itemIndex)}
      />
    );
  };

  return (
    <FormProvider {...formMethods}>
      <div className="h-[100vh] overflow-hidden font-primary">
        <div className="relative">
          <Header
            isValid={canPublish}
            isPublishing={isSaving}
            onBack={handleBack}
            onPublish={handlePublish}
            onSaveDraft={handleSaveDraft}
            title={title}
            showPreview={false}
            type="Track"
          />
          {!canPublish && (
            <div className="absolute right-2 top-[92px] z-20">
              <button
                type="button"
                onClick={() => setShowErrorPopover(prev => !prev)}
                className="inline-flex items-center gap-1 text-xs text-destructive-500 hover:text-destructive-600"
              >
                <WarningAlt className="w-4 h-4" />
                {publishErrors.length} issue{publishErrors.length === 1 ? "" : "s"} to fix before
                publishing
              </button>
              {showErrorPopover && (
                <div className="absolute right-0 mt-1 w-80 max-h-72 overflow-y-auto bg-white border border-border-light rounded-md shadow-lg p-3 z-30">
                  <ul className="flex flex-col gap-1.5">
                    {publishErrors.map((error, index) => (
                      <li
                        key={`${error.nodeKey}-${index}`}
                        className="text-xs text-typography-700 flex gap-1.5"
                      >
                        <WarningAlt className="w-3.5 h-3.5 text-destructive-500 flex-shrink-0 mt-0.5" />
                        {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex h-[calc(100vh-140px)]">
          <TrackOutlineRail
            sections={sections}
            selection={selection}
            errorKeys={errorKeys}
            onSelectSettings={() => setSelection("settings")}
            onSelectTranslations={() => setSelection("translations")}
            publishedLanguageCount={publishedLanguageCount}
            onSelectItem={(sectionIndex, itemIndex) => setSelection({ sectionIndex, itemIndex })}
            onAddSection={handleAddSection}
            onAddItem={handleAddItem}
            onDeleteSection={handleDeleteSection}
            onReorderSections={handleReorderSections}
            onReorderItems={handleReorderItems}
          />
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">{renderCanvas()}</div>
        </div>

        <ActionConfirmationPopup
          isOpen={showDiscardPopup}
          onClose={() => setShowDiscardPopup(false)}
          title={en.simulation.unsaved}
          titleItalic={en.simulation.changes}
          description={en.simulation.discardDescription}
          primaryButton={{
            label: en.simulation.saveAndExit,
            onClick: handleSaveAndExit,
            variant: ButtonVariant.PRIMARY,
          }}
          secondaryButton={{
            label: en.simulation.discardChanges,
            onClick: handleDiscard,
            variant: ButtonVariant.SECONDARY,
          }}
        />
      </div>
    </FormProvider>
  );
};
