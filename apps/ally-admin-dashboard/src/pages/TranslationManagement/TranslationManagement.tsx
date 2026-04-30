import React, { useEffect, useMemo, useState } from "react";

import { Check, History, RefreshCw, RotateCcw, Save, Search, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import {
  useGetI18nAuditLogQuery,
  useGetI18nDiffQuery,
  useGetI18nStatusQuery,
  useGetI18nTranslationsQuery,
  usePublishI18nMutation,
  useRollbackI18nMutation,
  useUpdateI18nTranslationsMutation,
} from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { Permissions } from "@constants";
import { useUser } from "@hooks";
import { DynamicI18nTranslationEntry } from "@types";

const PLACEHOLDER_REGEX = /\{\{\s*[\w.-]+\s*\}\}/g;

const extractPlaceholders = (value = "") =>
  [...new Set(value.match(PLACEHOLDER_REGEX) ?? [])]
    .map(placeholder => placeholder.replace(/\s+/g, ""))
    .sort();

const samePlaceholders = (left: string[], right: string[]) => left.join("|") === right.join("|");

const getErrorMessage = (error: unknown) => {
  if (!error || typeof error !== "object") return "Request failed";
  const maybeError = error as {
    data?: { message?: string | { message?: string } };
    error?: string;
  };

  if (typeof maybeError.data?.message === "string") return maybeError.data.message;
  if (
    maybeError.data?.message &&
    typeof maybeError.data.message === "object" &&
    typeof maybeError.data.message.message === "string"
  ) {
    return maybeError.data.message.message;
  }
  return maybeError.error ?? "Request failed";
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

export const TranslationManagement: React.FC = () => {
  const { permissions } = useUser();
  const canEdit = permissions.includes(Permissions.EDIT_I18N_TRANSLATIONS);
  const [language, setLanguage] = useState("");
  const [namespace, setNamespace] = useState("");
  const [search, setSearch] = useState("");
  const [rollbackVersion, setRollbackVersion] = useState<number | "">("");
  const [edits, setEdits] = useState<Record<string, string>>({});

  const {
    data: status,
    isFetching: isStatusFetching,
    refetch: refetchStatus,
  } = useGetI18nStatusQuery();
  const { data: translations, isFetching: isTranslationsFetching } = useGetI18nTranslationsQuery(
    { language, namespace, search },
    { skip: !language || !namespace },
  );
  const { data: diff } = useGetI18nDiffQuery(
    { language, namespace },
    { skip: !language || !namespace },
  );
  const { data: auditLogs = [] } = useGetI18nAuditLogQuery({ limit: 20, offset: 0 });

  const [updateTranslation, { isLoading: isUpdating }] = useUpdateI18nTranslationsMutation();
  const [publishI18n, { isLoading: isPublishing }] = usePublishI18nMutation();
  const [rollbackI18n, { isLoading: isRollingBack }] = useRollbackI18nMutation();

  useEffect(() => {
    if (!language && status?.languages?.length) {
      setLanguage(status.languages[0]);
    }
    if (!namespace && status?.namespaces?.length) {
      setNamespace(status.namespaces[0]);
    }
  }, [language, namespace, status]);

  useEffect(() => {
    setEdits({});
  }, [language, namespace]);

  useEffect(() => {
    const firstRollback = status?.versions?.find(version => !version.current)?.version;
    setRollbackVersion(firstRollback ?? "");
  }, [status?.versions]);

  const changedDiffCount = useMemo(
    () => diff?.entries.filter(entry => entry.status !== "unchanged").length ?? 0,
    [diff],
  );

  const getEditedValue = (entry: DynamicI18nTranslationEntry) => edits[entry.key] ?? entry.value;

  const getPlaceholderMismatch = (entry: DynamicI18nTranslationEntry) => {
    const original = extractPlaceholders(entry.value);
    const edited = extractPlaceholders(getEditedValue(entry));
    return !samePlaceholders(original, edited);
  };

  const saveEntry = async (entry: DynamicI18nTranslationEntry) => {
    if (!canEdit || getPlaceholderMismatch(entry)) return;
    const value = getEditedValue(entry);

    try {
      await updateTranslation({ language, namespace, key: entry.key, value }).unwrap();
      setEdits(prev => {
        const next = { ...prev };
        delete next[entry.key];
        return next;
      });
      toast.success("Translation saved");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const publish = async () => {
    try {
      const manifest = await publishI18n({}).unwrap();
      toast.success(`Published ${manifest.currentVersion}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const rollback = async () => {
    if (!rollbackVersion) return;
    try {
      const manifest = await rollbackI18n({ version: Number(rollbackVersion) }).unwrap();
      toast.success(`Rolled back to ${manifest.currentVersion}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const translationRows = translations?.entries ?? [];

  return (
    <div className="h-full overflow-hidden font-primary text-typography-900">
      <div className="flex h-full flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-secondary text-2xl">Translations</h1>
            <div className="mt-1 flex flex-wrap gap-3 text-sm text-typography-600">
              <span>Live: {status?.manifest?.currentVersion ?? "unpublished"}</span>
              <span>Draft languages: {status?.languages?.length ?? 0}</span>
              <span>Retention: last {status?.retentionLimit ?? 5}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={ButtonVariant.TEXT}
              onClick={() => refetchStatus()}
              className="h-9 rounded-md px-3"
              disabled={isStatusFetching}
              title="Refresh"
            >
              <RefreshCw size={16} />
              Refresh
            </Button>
            <select
              value={rollbackVersion}
              onChange={event =>
                setRollbackVersion(event.target.value ? Number(event.target.value) : "")
              }
              className="h-9 rounded-md border border-neutral-300 bg-white px-3 text-sm"
              disabled={!canEdit || isRollingBack}
            >
              <option value="">Rollback version</option>
              {status?.versions
                ?.filter(version => !version.current)
                .map(version => (
                  <option key={version.name} value={version.version}>
                    {version.name}
                  </option>
                ))}
            </select>
            <Button
              variant={ButtonVariant.SECONDARY}
              onClick={rollback}
              disabled={!canEdit || !rollbackVersion || isRollingBack}
              className="h-9 rounded-md px-3"
            >
              <RotateCcw size={16} />
              Rollback
            </Button>
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={publish}
              disabled={!canEdit || isPublishing}
              className="h-9 rounded-md px-3 text-white"
            >
              <UploadCloud size={16} />
              {isPublishing ? "Publishing..." : "Publish"}
            </Button>
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-md border border-neutral-200 bg-white">
            <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 p-3">
              <select
                value={language}
                onChange={event => setLanguage(event.target.value)}
                className="h-10 min-w-[140px] rounded-md border border-neutral-300 bg-white px-3 text-sm"
              >
                {status?.languages.map(item => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select
                value={namespace}
                onChange={event => setNamespace(event.target.value)}
                className="h-10 min-w-[180px] rounded-md border border-neutral-300 bg-white px-3 text-sm"
              >
                {status?.namespaces.map(item => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <div className="relative min-w-[220px] flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-typography-500"
                />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search keys"
                  className="h-10 w-full rounded-md border border-neutral-300 pl-9 pr-3 text-sm outline-none focus:border-primary-500"
                />
              </div>
              <div className="text-sm text-typography-600">
                {translationRows.length} keys - {changedDiffCount} changed
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[880px] border-separate border-spacing-0 text-left text-sm">
                <thead className="sticky top-0 z-10 bg-neutral-50 text-xs uppercase text-typography-600">
                  <tr>
                    <th className="w-[24%] border-b border-neutral-200 px-3 py-3">Key</th>
                    <th className="w-[40%] border-b border-neutral-200 px-3 py-3">Draft value</th>
                    <th className="w-[28%] border-b border-neutral-200 px-3 py-3">Live value</th>
                    <th className="w-[8%] border-b border-neutral-200 px-3 py-3 text-right">
                      Save
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isTranslationsFetching && (
                    <tr>
                      <td className="px-3 py-6 text-typography-600" colSpan={4}>
                        Loading translations...
                      </td>
                    </tr>
                  )}
                  {!isTranslationsFetching &&
                    translationRows.map(entry => {
                      const editedValue = getEditedValue(entry);
                      const dirty = editedValue !== entry.value;
                      const placeholderMismatch = getPlaceholderMismatch(entry);
                      return (
                        <tr key={entry.key} className="align-top hover:bg-neutral-50">
                          <td className="border-b border-neutral-100 px-3 py-3 font-mono text-xs text-typography-700">
                            {entry.key}
                            {entry.changed && (
                              <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 font-primary text-[11px] text-amber-700">
                                changed
                              </span>
                            )}
                          </td>
                          <td className="border-b border-neutral-100 px-3 py-3">
                            <textarea
                              value={editedValue}
                              onChange={event =>
                                setEdits(prev => ({ ...prev, [entry.key]: event.target.value }))
                              }
                              onBlur={() => {
                                if (dirty && !placeholderMismatch) void saveEntry(entry);
                              }}
                              disabled={!canEdit}
                              className="min-h-[72px] w-full resize-y rounded-md border border-neutral-300 bg-white p-2 text-sm leading-5 outline-none focus:border-primary-500 disabled:bg-neutral-50"
                            />
                            {placeholderMismatch && (
                              <div className="mt-1 text-xs text-red-600">Placeholder mismatch</div>
                            )}
                            {entry.placeholders.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {entry.placeholders.map(placeholder => (
                                  <span
                                    key={placeholder}
                                    className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] text-typography-600"
                                  >
                                    {placeholder}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="border-b border-neutral-100 px-3 py-3 text-typography-700">
                            <div className="max-h-[96px] overflow-auto whitespace-pre-wrap rounded-md bg-neutral-50 p-2">
                              {entry.liveValue ?? "-"}
                            </div>
                          </td>
                          <td className="border-b border-neutral-100 px-3 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => saveEntry(entry)}
                              disabled={!canEdit || !dirty || placeholderMismatch || isUpdating}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300 text-typography-700 hover:bg-neutral-100 disabled:cursor-default disabled:opacity-40"
                              title="Save translation"
                            >
                              {dirty ? <Save size={16} /> : <Check size={16} />}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  {!isTranslationsFetching && translationRows.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-typography-600" colSpan={4}>
                        No translations found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="flex min-h-0 flex-col gap-4 overflow-auto">
            <section className="rounded-md border border-neutral-200 bg-white">
              <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-3">
                <History size={16} />
                <h2 className="font-secondary text-base">Versions</h2>
              </div>
              <div className="divide-y divide-neutral-100">
                {status?.versions.map(version => (
                  <div key={version.name} className="px-3 py-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{version.name}</span>
                      {version.current && (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                          live
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-typography-600">
                      {formatDate(version.updatedAt)}
                    </div>
                  </div>
                ))}
                {status?.versions.length === 0 && (
                  <div className="px-3 py-4 text-sm text-typography-600">No versions yet</div>
                )}
              </div>
            </section>

            <section className="rounded-md border border-neutral-200 bg-white">
              <div className="border-b border-neutral-200 px-3 py-3">
                <h2 className="font-secondary text-base">Recent audit</h2>
              </div>
              <div className="divide-y divide-neutral-100">
                {auditLogs.map((log, index) => (
                  <div key={`${log.date}-${index}`} className="px-3 py-3 text-sm">
                    <div className="font-medium">{log.event}</div>
                    <div className="mt-1 text-xs text-typography-600">{formatDate(log.date)}</div>
                    <div className="mt-1 text-xs text-typography-600">{log.userName}</div>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <div className="px-3 py-4 text-sm text-typography-600">No audit entries</div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};
