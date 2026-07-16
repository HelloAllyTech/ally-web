import React, { useCallback, useState } from "react";

import { BarChart3, Delete, Upload, Users } from "@icons";
import { toast } from "sonner";

import { useGetLabRunsQuery, useDeleteLabRunMutation } from "@api";
import { ActionConfirmationPopup, EmptyState, ListToolbar } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { LabRun } from "@types";

import { AssignRunDrawer } from "./AssignRunDrawer";
import { CreateRunDrawer } from "./CreateRunDrawer";
import { PublishRunDrawer } from "./PublishRunDrawer";
import { RunDetailDrawer } from "./RunDetailDrawer";
import { RunResultsDrawer } from "./RunResultsDrawer";
import { RunStatusBadge } from "./RunStatusBadge";

const VariableSummary: React.FC<{ run: LabRun }> = ({ run }) => {
  if (!run.variableValues.length) return <span className="text-typography-400">—</span>;
  const shown = run.variableValues.slice(0, 3);
  const extra = run.variableValues.length - shown.length;
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map(v => (
        <span
          key={v.name}
          className="font-mono text-xs bg-background-secondary border border-border-light rounded px-1.5 py-0.5"
        >{`{{${v.name}}}`}</span>
      ))}
      {extra > 0 && <span className="text-xs text-typography-500">+{extra}</span>}
    </span>
  );
};

export const RunsTab: React.FC = () => {
  const [search, setSearch] = useState("");
  const { data, isLoading, refetch } = useGetLabRunsQuery({ search: search || undefined });
  const runs = data?.items ?? [];

  const [deleteRun] = useDeleteLabRunMutation();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [detailRun, setDetailRun] = useState<LabRun | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LabRun | null>(null);
  const [publishRun, setPublishRun] = useState<LabRun | null>(null);
  const [assignRun, setAssignRun] = useState<LabRun | null>(null);
  const [resultsRun, setResultsRun] = useState<LabRun | null>(null);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const response = await deleteRun(deleteTarget.id);
    if ("error" in response && response.error) {
      toast.error(en.aiLab.runs.deleteFailed);
    } else {
      toast.success(en.aiLab.runs.deleted);
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteRun]);

  return (
    <div className="mt-4">
      <p className="text-typography-600 text-sm mb-4 max-w-3xl">{en.aiLab.runs.subtitle}</p>
      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        placeholder={en.aiLab.runs.searchPlaceholder}
        action={{
          label: en.aiLab.runs.create,
          onClick: () => setIsDrawerOpen(true),
          variant: ButtonVariant.PRIMARY,
        }}
      />

      <div className="mt-5">
        {isLoading ? (
          <p className="text-typography-600 py-8 text-center">{en.common.loading}</p>
        ) : runs.length === 0 ? (
          <EmptyState
            title={en.aiLab.runs.empty}
            subtitle={en.aiLab.runs.emptySubtitle}
            actionLabel={en.aiLab.runs.create}
            onAction={() => setIsDrawerOpen(true)}
          />
        ) : (
          <div className="border border-border-light rounded-md overflow-hidden">
            <table className="w-full text-left font-primary text-base">
              <thead>
                <tr className="bg-background-secondary text-typography-700 text-sm">
                  <th className="px-4 py-3 font-medium w-[20%]">{en.aiLab.runs.columnSkill}</th>
                  <th className="px-4 py-3 font-medium w-[16%]">{en.aiLab.runs.columnVariables}</th>
                  <th className="px-4 py-3 font-medium w-[12%]">{en.aiLab.runs.columnStatus}</th>
                  <th className="px-4 py-3 font-medium">{en.aiLab.runs.columnOutput}</th>
                  <th className="px-4 py-3 font-medium w-[130px]">{en.aiLab.runs.columnCreated}</th>
                  <th className="px-4 py-3 font-medium text-right w-[70px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(run => (
                  <tr
                    key={run.id}
                    onClick={() => setDetailRun(run)}
                    className="border-t border-border-light hover:bg-background-secondary/50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 align-top font-medium text-typography-900">
                      {run.skillName}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <VariableSummary run={run} />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col items-start gap-1">
                        <RunStatusBadge status={run.status} />
                        {run.publishedAt && (
                          <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-primary-50 text-primary-700 border-primary-200">
                            {en.aiLab.publish.publishedBadge}
                          </span>
                        )}
                        {run.publishedAt && run.evalStats && run.evalStats.assigned > 0 && (
                          <span className="text-xs text-typography-500">
                            {en.aiLab.assign.responses(
                              run.evalStats.submitted,
                              run.evalStats.assigned,
                            )}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-typography-700">
                      <span className="line-clamp-2">
                        {run.status === "FAILED" ? run.error : run.output}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-typography-500 text-sm">
                      {new Date(run.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center justify-end gap-3 text-typography-600">
                        {run.status === "COMPLETED" && !run.publishedAt && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setPublishRun(run);
                            }}
                            className="hover:text-primary-600"
                            aria-label={en.aiLab.publish.action}
                            title={en.aiLab.publish.action}
                          >
                            <Upload size={18} />
                          </button>
                        )}
                        {run.publishedAt && (
                          <>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setAssignRun(run);
                              }}
                              className="hover:text-primary-600"
                              aria-label={en.aiLab.assign.action}
                              title={en.aiLab.assign.action}
                            >
                              <Users size={18} />
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setResultsRun(run);
                              }}
                              className="hover:text-primary-600"
                              aria-label={en.aiLab.results.action}
                              title={en.aiLab.results.action}
                            >
                              <BarChart3 size={18} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setDeleteTarget(run);
                          }}
                          className="hover:text-destructive-600"
                          aria-label="Delete"
                          title="Delete"
                        >
                          <Delete size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateRunDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onComplete={refetch}
      />

      <RunDetailDrawer run={detailRun} onClose={() => setDetailRun(null)} />

      <PublishRunDrawer run={publishRun} onClose={() => setPublishRun(null)} />

      <AssignRunDrawer run={assignRun} onClose={() => setAssignRun(null)} />

      <RunResultsDrawer run={resultsRun} onClose={() => setResultsRun(null)} />

      <ActionConfirmationPopup
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={en.aiLab.runs.deleteTitle}
        description={en.aiLab.runs.deleteDescription}
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
