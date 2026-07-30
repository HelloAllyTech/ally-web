import React, { useCallback, useMemo, useState } from "react";

import { Archive, Delete, Edit, Eye, Unarchive } from "@icons";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ally-ui-mono/ui-shared";
import {
  useGetQuestionSetsQuery,
  useArchiveQuestionSetMutation,
  useDeleteQuestionSetMutation,
} from "@api";
import { ActionConfirmationPopup, EmptyState, ListToolbar } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { QuestionSet } from "@types";

import { QuestionSetDrawer } from "./QuestionSetDrawer";

export const QuestionSetsTab: React.FC = () => {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useGetQuestionSetsQuery({
    search: search || undefined,
    includeArchived: true,
  });
  // Draft + published-active first; archived pushed to the bottom.
  const sets = useMemo(
    () => [...(data?.items ?? [])].sort((a, b) => Number(a.isArchived) - Number(b.isArchived)),
    [data],
  );

  const [archiveSet] = useArchiveQuestionSetMutation();
  const [deleteSet] = useDeleteQuestionSetMutation();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<QuestionSet | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QuestionSet | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const openCreate = useCallback(() => {
    setEditingSet(null);
    setIsDrawerOpen(true);
  }, []);

  const openRow = useCallback((set: QuestionSet) => {
    setEditingSet(set);
    setIsDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setEditingSet(null);
  }, []);

  const handleToggleArchive = useCallback(
    async (set: QuestionSet) => {
      const nextArchived = !set.isArchived;
      try {
        setBusyId(set.id);
        await archiveSet({ id: set.id, isArchived: nextArchived }).unwrap();
        toast.success(
          nextArchived
            ? en.aiLab.questionSets.archiveSuccess
            : en.aiLab.questionSets.unarchiveSuccess,
        );
      } catch {
        toast.error(
          nextArchived ? en.aiLab.questionSets.archiveFailed : en.aiLab.questionSets.unarchiveFailed,
        );
      } finally {
        setBusyId(null);
      }
    },
    [archiveSet],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const response = await deleteSet(deleteTarget.id);
    if ("error" in response && response.error) {
      toast.error(en.aiLab.questionSets.deleteFailed);
    } else {
      toast.success(en.aiLab.questionSets.deleted);
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteSet]);

  return (
    <div className="mt-4">
      <p className="text-typography-600 text-sm mb-4 max-w-3xl">
        {en.aiLab.questionSets.subtitle}
      </p>
      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        placeholder={en.aiLab.questionSets.searchPlaceholder}
        action={{
          label: en.aiLab.questionSets.create,
          onClick: openCreate,
          variant: ButtonVariant.PRIMARY,
        }}
      />

      <div className="mt-5">
        {isLoading ? (
          <p className="text-typography-600 py-8 text-center">{en.common.loading}</p>
        ) : sets.length === 0 ? (
          <EmptyState
            title={en.aiLab.questionSets.empty}
            subtitle={en.aiLab.questionSets.emptySubtitle}
            actionLabel={en.aiLab.questionSets.create}
            onAction={openCreate}
          />
        ) : (
          <div className="border border-border-light rounded-md overflow-hidden">
            <Table className="w-full text-left font-primary text-base">
              <TableHead>
                <TableRow className="bg-background-secondary text-typography-700 text-sm">
                  <TableHeader className="px-4 py-3 font-medium w-[26%]">
                    {en.aiLab.questionSets.columnName}
                  </TableHeader>
                  <TableHeader className="px-4 py-3 font-medium">
                    {en.aiLab.questionSets.columnQuestions}
                  </TableHeader>
                  <TableHeader className="px-4 py-3 font-medium w-[14%]">
                    {en.aiLab.questionSets.columnStatus}
                  </TableHeader>
                  <TableHeader className="px-4 py-3 font-medium w-[130px]">
                    {en.aiLab.questionSets.columnCreated}
                  </TableHeader>
                  <TableHeader className="px-4 py-3 font-medium text-right w-[100px]">
                    Actions
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {sets.map(set => {
                  const isBusy = busyId === set.id;
                  return (
                    <TableRow
                      key={set.id}
                      onClick={() => openRow(set)}
                      className={`border-t border-border-light hover:bg-background-secondary/50 transition-colors cursor-pointer ${
                        set.isArchived ? "opacity-60" : ""
                      }`}
                    >
                      <TableCell className="px-4 py-3 align-top">
                        <div className="font-medium text-typography-900">{set.name}</div>
                        {set.description && (
                          <div className="text-xs text-typography-500 line-clamp-2 mt-0.5">
                            {set.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top text-typography-700">
                        {en.aiLab.questionSets.questionCount(set.questionCount)}
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${
                              set.isPublished
                                ? "bg-primary-50 text-primary-700 border-primary-200"
                                : "bg-background-secondary text-typography-600 border-border-light"
                            }`}
                          >
                            {set.isPublished
                              ? en.aiLab.questionSets.statusPublished
                              : en.aiLab.questionSets.statusDraft}
                          </span>
                          {set.isArchived && (
                            <span
                              title={en.aiLab.questionSets.archivedHelp}
                              className="text-xs font-medium uppercase tracking-wide text-typography-600 border border-border-light rounded px-1.5 py-0.5"
                            >
                              {en.aiLab.questionSets.archivedBadge}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top text-typography-500 text-sm">
                        {new Date(set.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top">
                        <div className="flex items-center justify-end gap-3 text-typography-600">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              openRow(set);
                            }}
                            className="hover:text-primary-600"
                            aria-label={set.isPublished ? en.common.view : en.common.edit}
                            title={set.isPublished ? en.common.view : en.common.edit}
                          >
                            {set.isPublished ? <Eye size={18} /> : <Edit size={18} />}
                          </button>
                          {set.isPublished && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleToggleArchive(set);
                              }}
                              disabled={isBusy}
                              className="hover:text-primary-600 disabled:opacity-50"
                              aria-label={
                                set.isArchived
                                  ? en.aiLab.questionSets.unarchive
                                  : en.aiLab.questionSets.archive
                              }
                              title={
                                set.isArchived
                                  ? en.aiLab.questionSets.unarchive
                                  : en.aiLab.questionSets.archive
                              }
                            >
                              {set.isArchived ? <Unarchive size={18} /> : <Archive size={18} />}
                            </button>
                          )}
                          {!set.isPublished && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setDeleteTarget(set);
                              }}
                              className="hover:text-destructive-600"
                              aria-label={en.common.delete}
                              title={en.common.delete}
                            >
                              <Delete size={18} />
                            </button>
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
      </div>

      <QuestionSetDrawer isOpen={isDrawerOpen} questionSet={editingSet} onClose={closeDrawer} />

      <ActionConfirmationPopup
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={en.aiLab.questionSets.deleteTitle}
        description={en.aiLab.questionSets.deleteDescription}
        primaryButton={{
          label: en.common.delete,
          onClick: handleDelete,
          variant: ButtonVariant.DESTRUCTIVE,
        }}
        secondaryButton={{ label: en.common.cancel, onClick: () => setDeleteTarget(null) }}
      />
    </div>
  );
};
