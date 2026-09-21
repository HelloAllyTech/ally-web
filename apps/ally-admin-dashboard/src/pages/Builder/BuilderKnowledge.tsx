import React, { useState } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  Button,
  CarbonDropdown as Dropdown,
  InlineNotification,
  SkeletonText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  Tag,
  TextArea,
  TextInput,
  Tile,
  Tooltip,
} from "@ally-ui-mono/ui-shared";
import {
  useConsolidateBuilderLessonsMutation,
  useGetBuilderExemplarsQuery,
  useGetBuilderLessonsQuery,
  usePatchBuilderLessonMutation,
} from "@api";
import { TooltipIcon } from "@assets";
import { ActionConfirmationPopup } from "@components/action-confirmation-popup";
import { en, ROUTES } from "@constants";
import { BuilderExemplar, BuilderLesson, BuilderLessonStatus } from "@types";
import { asAgentText, asAgentTextList } from "@utils";

import { BUILDER_OUTCOME_TAG_TYPE } from "./builderMotion";
import { formatHours, formatScoreboardCost } from "./scoreboardChart";

type KnowledgeTab = "lessons" | "exemplars";

const LESSON_STATUS_TAG_TYPE: Record<BuilderLessonStatus, "cool-gray" | "blue" | "green" | "red"> =
  {
    candidate: "cool-gray",
    active: "blue",
    merged: "green",
    retired: "red",
  };

const STATUS_OPTIONS: BuilderLessonStatus[] = ["candidate", "active", "merged", "retired"];

/* -------------------------------------------------------------------------- */
/* Lessons                                                                    */
/* -------------------------------------------------------------------------- */

const LessonsTab: React.FC = () => {
  const strings = en.builder.knowledge.lessons;

  const [statusFilter, setStatusFilter] = useState<BuilderLessonStatus | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [repoFilter, setRepoFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [retireTarget, setRetireTarget] = useState<BuilderLesson | null>(null);

  const { data, isLoading, isError } = useGetBuilderLessonsQuery({
    status: statusFilter || undefined,
    category: categoryFilter.trim() || undefined,
    repo: repoFilter.trim() || undefined,
  });
  const [patchLesson] = usePatchBuilderLessonMutation();
  const [consolidate, { isLoading: isConsolidating }] = useConsolidateBuilderLessonsMutation();

  const lessons = data ?? [];

  const statusItems = [
    { id: "", label: strings.filterStatusAll },
    ...STATUS_OPTIONS.map(status => ({
      id: status,
      label: strings.statusLabels[status] ?? status,
    })),
  ];
  const selectedStatusItem = statusItems.find(item => item.id === statusFilter) ?? statusItems[0];

  const startEdit = (lesson: BuilderLesson) => {
    setEditingId(lesson.id);
    setDraftText(asAgentText(lesson.lesson));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftText("");
  };

  const saveEdit = async (id: string) => {
    try {
      await patchLesson({ id, lesson: draftText }).unwrap();
      cancelEdit();
    } catch {
      toast.error(strings.saveFailed);
    }
  };

  const togglePin = async (lesson: BuilderLesson) => {
    try {
      await patchLesson({ id: lesson.id, pinned: !lesson.pinned }).unwrap();
    } catch {
      toast.error(lesson.pinned ? strings.unpinFailed : strings.pinFailed);
    }
  };

  const confirmRetire = async () => {
    if (!retireTarget) return;
    try {
      await patchLesson({ id: retireTarget.id, status: "retired" }).unwrap();
    } catch {
      toast.error(strings.retireFailed);
    } finally {
      setRetireTarget(null);
    }
  };

  const handleConsolidate = async () => {
    try {
      await consolidate().unwrap();
      toast.success(strings.consolidateStarted);
    } catch {
      toast.error(strings.consolidateFailed);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-44">
          <Dropdown
            id="builder-knowledge-status-filter"
            size="md"
            titleText={strings.filterStatusLabel}
            label={strings.filterStatusLabel}
            items={statusItems}
            selectedItem={selectedStatusItem}
            itemToString={item => item?.label ?? ""}
            onChange={({ selectedItem }) =>
              setStatusFilter((selectedItem?.id ?? "") as BuilderLessonStatus | "")
            }
          />
        </div>
        <TextInput
          id="builder-knowledge-category-filter"
          labelText={strings.filterCategoryLabel}
          placeholder={strings.filterCategoryPlaceholder}
          value={categoryFilter}
          onChange={event => setCategoryFilter(event.target.value)}
        />
        <TextInput
          id="builder-knowledge-repo-filter"
          labelText={strings.filterRepoLabel}
          placeholder={strings.filterRepoPlaceholder}
          value={repoFilter}
          onChange={event => setRepoFilter(event.target.value)}
        />
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            kind="tertiary"
            size="md"
            disabled={isConsolidating}
            onClick={() => void handleConsolidate()}
          >
            {strings.consolidateNow}
          </Button>
          <Tooltip label={strings.consolidateHint} align="top">
            <button type="button" className="inline-flex cursor-pointer items-center">
              <TooltipIcon />
            </button>
          </Tooltip>
        </div>
      </div>

      {isError && (
        <InlineNotification kind="error" lowContrast hideCloseButton title={strings.loadFailed} />
      )}

      {isLoading ? (
        <SkeletonText paragraph lineCount={6} />
      ) : lessons.length === 0 ? (
        <p className="mt-6 text-center text-sm text-typography-500">{strings.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded border border-neutral-200">
          <Table size="md">
            <TableHead>
              <TableRow>
                <TableHeader>{strings.columnLesson}</TableHeader>
                <TableHeader>{strings.columnCategory}</TableHeader>
                <TableHeader>{strings.columnStatus}</TableHeader>
                <TableHeader>{strings.columnSources}</TableHeader>
                <TableHeader>{strings.columnApplied}</TableHeader>
                <TableHeader>{strings.columnContradicted}</TableHeader>
                <TableHeader>{strings.columnRepos}</TableHeader>
                <TableHeader>
                  <span className="inline-flex items-center gap-1">
                    {strings.columnPinned}
                    <Tooltip label={strings.pinHint} align="top">
                      <button type="button" className="inline-flex cursor-pointer items-center">
                        <TooltipIcon />
                      </button>
                    </Tooltip>
                  </span>
                </TableHeader>
                <TableHeader />
              </TableRow>
            </TableHead>
            <TableBody>
              {lessons.map(lesson => {
                const isEditing = editingId === lesson.id;
                return (
                  <TableRow key={lesson.id}>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex min-w-[280px] flex-col gap-2">
                          <TextArea
                            id={`builder-knowledge-lesson-${lesson.id}`}
                            labelText={strings.columnLesson}
                            hideLabel
                            rows={3}
                            value={draftText}
                            onChange={event => setDraftText(event.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              kind="primary"
                              onClick={() => void saveEdit(lesson.id)}
                            >
                              {strings.save}
                            </Button>
                            <Button size="sm" kind="tertiary" onClick={cancelEdit}>
                              {strings.cancel}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="max-w-[360px] whitespace-pre-wrap text-sm text-typography-900">
                          {asAgentText(lesson.lesson)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{asAgentText(lesson.category)}</TableCell>
                    <TableCell>
                      <Tag type={LESSON_STATUS_TAG_TYPE[lesson.status]} size="sm">
                        {strings.statusLabels[lesson.status] ?? lesson.status}
                      </Tag>
                    </TableCell>
                    <TableCell>{lesson.sourceCount}</TableCell>
                    <TableCell>{lesson.timesApplied}</TableCell>
                    <TableCell>{lesson.timesContradicted}</TableCell>
                    <TableCell>
                      <span className="block max-w-[140px] truncate text-xs text-typography-600">
                        {lesson.repos.join(", ")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" kind="ghost" onClick={() => void togglePin(lesson)}>
                        {lesson.pinned ? strings.unpin : strings.pin}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {!isEditing && (
                          <Button size="sm" kind="ghost" onClick={() => startEdit(lesson)}>
                            {strings.edit}
                          </Button>
                        )}
                        {lesson.status !== "retired" && (
                          <Button
                            size="sm"
                            kind="danger--tertiary"
                            disabled={lesson.pinned}
                            onClick={() => setRetireTarget(lesson)}
                          >
                            {strings.retire}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ActionConfirmationPopup
        isOpen={Boolean(retireTarget)}
        onClose={() => setRetireTarget(null)}
        title={strings.retireConfirmTitle}
        description={strings.retireConfirmBody}
        primaryButton={{ label: strings.retire, onClick: () => void confirmRetire() }}
        secondaryButton={{ label: strings.cancel, onClick: () => setRetireTarget(null) }}
      />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Exemplars                                                                  */
/* -------------------------------------------------------------------------- */

const ExemplarCard: React.FC<{ exemplar: BuilderExemplar }> = ({ exemplar }) => {
  const strings = en.builder.knowledge.exemplars;
  const navigate = useNavigate();
  const failureTags = asAgentTextList(exemplar.failureTags);

  return (
    <Tile
      className="cursor-pointer hover:border-primary-400"
      onClick={() => navigate(ROUTES.BUILDER_SESSION(exemplar.sessionId))}
      role="button"
      tabIndex={0}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate(ROUTES.BUILDER_SESSION(exemplar.sessionId));
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-typography-900">{exemplar.title}</p>
          <p className="mt-0.5 truncate text-xs text-typography-500">{exemplar.repos.join(", ")}</p>
        </div>
        <Tag type={BUILDER_OUTCOME_TAG_TYPE[exemplar.outcome]} size="sm" className="shrink-0">
          {en.builder.scoreboard.outcome[exemplar.outcome] ?? exemplar.outcome}
        </Tag>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-typography-600">
        <span>{formatScoreboardCost(exemplar.costUsd)}</span>
        <span>{exemplar.fixRunCount} fix runs</span>
        <span>{exemplar.reviewCommentCount} review comments</span>
        <span>{exemplar.ciFailureCount} CI failures</span>
        <span>{formatHours(exemplar.timeToMergeHours)} to merge</span>
      </div>
      {exemplar.summaryMd && (
        <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-typography-600">
          {exemplar.summaryMd}
        </p>
      )}
      <p className="mt-2 text-xs text-typography-400">
        {failureTags.length ? failureTags.join(", ") : strings.noFailureTags}
      </p>
    </Tile>
  );
};

const ExemplarsTab: React.FC = () => {
  const strings = en.builder.knowledge.exemplars;
  const { data, isLoading, isError } = useGetBuilderExemplarsQuery();
  const exemplars = data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-typography-600">{strings.caption}</p>

      {isError && (
        <InlineNotification kind="error" lowContrast hideCloseButton title={strings.loadFailed} />
      )}

      {isLoading ? (
        <SkeletonText paragraph lineCount={6} />
      ) : exemplars.length === 0 ? (
        <p className="mt-6 text-center text-sm text-typography-500">{strings.empty}</p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {exemplars.map(exemplar => (
            <ExemplarCard key={exemplar.id} exemplar={exemplar} />
          ))}
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * What Builder has learned across past builds, and the runs worth reading in
 * full — a lesson is candidate/proposed guidance the curator distilled from
 * transcripts; an exemplar is a whole build, picked for being unusually
 * clean or unusually expensive, so a person can read the real transcript
 * behind a pattern rather than trust the curator's summary of it.
 */
export const BuilderKnowledge: React.FC = () => {
  const strings = en.builder.knowledge;
  const navigate = useNavigate();
  const [tab, setTab] = useState<KnowledgeTab>("lessons");

  const tabItems = [
    { id: "lessons", label: strings.tabLessons },
    { id: "exemplars", label: strings.tabExemplars },
  ];

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-4 overflow-y-auto p-6">
      <header>
        <Button kind="ghost" size="sm" onClick={() => navigate(ROUTES.BUILDER)}>
          ← {strings.backToBuilder}
        </Button>
        <h1 className="mt-2 text-xl font-semibold text-typography-900">{strings.title}</h1>
        <p className="mt-1 text-sm text-typography-600">{strings.subtitle}</p>
      </header>

      <Tabs
        items={tabItems}
        activeId={tab}
        onChange={id => setTab(id as KnowledgeTab)}
        showCount={false}
      />

      {tab === "lessons" ? <LessonsTab /> : <ExemplarsTab />}
    </div>
  );
};
