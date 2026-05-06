import React, { useMemo, useState } from "react";

import { Info, RefreshCw, RotateCcw, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import {
  useGetAllI18nTranslationsQuery,
  useGetI18nAuditLogQuery,
  useGetI18nStatusQuery,
  usePublishI18nMutation,
  useRollbackI18nMutation,
  useUpdateI18nTranslationsMutation,
} from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { Permissions } from "@constants";
import { useUser } from "@hooks";
import { DynamicI18nAggregatedRow } from "@types";

const PLACEHOLDER_REGEX = /\{\{\s*[\w.-]+\s*\}\}/g;

const extractPlaceholders = (value = "") =>
  [...new Set(value.match(PLACEHOLDER_REGEX) ?? [])]
    .map(placeholder => placeholder.replace(/\s+/g, ""))
    .sort();

const samePlaceholders = (left: string[], right: string[]) => left.join("|") === right.join("|");

const SECTION_FILTER_KEY = "__section";
const KEY_FILTER_KEY = "__key";

const editKey = (fullKey: string, language: string) => `${fullKey}|${language}`;

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

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
  ta: "Tamil",
  kn: "Kannada",
};

const labelForLanguage = (code: string) => LANGUAGE_LABELS[code] ?? code.toUpperCase();

export const TranslationManagement: React.FC = () => {
  const { permissions } = useUser();
  const canEdit = permissions.includes(Permissions.EDIT_I18N_TRANSLATIONS);

  const { data: aggregated, isFetching, refetch } = useGetAllI18nTranslationsQuery();
  const { data: status, refetch: refetchStatus } = useGetI18nStatusQuery();
  const { data: auditLogs = [] } = useGetI18nAuditLogQuery({ limit: 20, offset: 0 });

  const [updateTranslation, { isLoading: isUpdating }] = useUpdateI18nTranslationsMutation();
  const [publishI18n, { isLoading: isPublishing }] = usePublishI18nMutation();
  const [rollbackI18n, { isLoading: isRollingBack }] = useRollbackI18nMutation();

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [rollbackVersion, setRollbackVersion] = useState<number | "">("");

  const languages = aggregated?.languages ?? [];
  const rows = aggregated?.rows ?? [];

  const sections = useMemo(() => [...new Set(rows.map(row => row.namespace))].sort(), [rows]);

  const isLiveSelected = useMemo(() => {
    if (rollbackVersion === "") return false;
    return (
      status?.versions?.find(v => v.version === Number(rollbackVersion))?.current ?? false
    );
  }, [rollbackVersion, status?.versions]);

  const filteredRows = useMemo(() => {
    const sectionSelected = filters[SECTION_FILTER_KEY] ?? "";
    const keyFilter = (filters[KEY_FILTER_KEY] ?? "").trim().toLowerCase();
    const langFilters = languages.map(lang => ({
      lang,
      query: (filters[lang] ?? "").trim().toLowerCase(),
    }));

    return rows.filter(row => {
      if (sectionSelected && row.namespace !== sectionSelected) return false;
      if (keyFilter && !row.fullKey.toLowerCase().includes(keyFilter)) return false;

      for (const { lang, query } of langFilters) {
        if (!query) continue;
        const value = (edits[editKey(row.fullKey, lang)] ?? row.values[lang] ?? "").toLowerCase();
        if (!value.includes(query)) return false;
      }
      return true;
    });
  }, [rows, filters, edits, languages]);

  const setFilter = (column: string, value: string) =>
    setFilters(prev => ({ ...prev, [column]: value }));

  const setEdit = (fullKey: string, language: string, value: string) =>
    setEdits(prev => ({ ...prev, [editKey(fullKey, language)]: value }));

  const getCellValue = (row: DynamicI18nAggregatedRow, language: string) =>
    edits[editKey(row.fullKey, language)] ?? row.values[language] ?? "";

  const isCellDirty = (row: DynamicI18nAggregatedRow, language: string) => {
    const editValue = edits[editKey(row.fullKey, language)];
    if (editValue === undefined) return false;
    return editValue !== (row.values[language] ?? "");
  };

  const hasPlaceholderMismatch = (row: DynamicI18nAggregatedRow, language: string) => {
    const original = row.values[language] ?? "";
    const edited = getCellValue(row, language);
    return !samePlaceholders(extractPlaceholders(original), extractPlaceholders(edited));
  };

  const saveCell = async (row: DynamicI18nAggregatedRow, language: string) => {
    if (!canEdit || !isCellDirty(row, language)) return;
    if (hasPlaceholderMismatch(row, language)) {
      toast.error(`Placeholder mismatch for ${row.fullKey} (${language})`);
      return;
    }
    const value = getCellValue(row, language);

    try {
      await updateTranslation({
        language,
        namespace: row.namespace,
        key: row.innerKey,
        value,
      }).unwrap();
      setEdits(prev => {
        const next = { ...prev };
        delete next[editKey(row.fullKey, language)];
        return next;
      });
      toast.success(`Saved ${labelForLanguage(language)}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const publish = async () => {
    try {
      const manifest = await publishI18n({}).unwrap();
      toast.success(`Published ${manifest.currentVersion}`);
      void refetch();
      void refetchStatus();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const rollback = async () => {
    if (!rollbackVersion) return;
    try {
      const manifest = await rollbackI18n({ version: Number(rollbackVersion) }).unwrap();
      toast.success(`Rolled back to ${manifest.currentVersion}`);
      void refetch();
      void refetchStatus();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const refreshAll = () => {
    void refetch();
    void refetchStatus();
  };

  const pendingEditCount = Object.keys(edits).length;

  return (
    <div className="h-full overflow-hidden font-primary text-typography-900">
      <div className="flex h-full flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-secondary text-2xl">Translations</h1>
            <div className="mt-1 flex flex-wrap gap-3 text-sm text-typography-600">
              <span>Live: {status?.manifest?.currentVersion ?? "unpublished"}</span>
              <span>Languages: {languages.length}</span>
              <span>Keys: {rows.length}</span>
              <span>Retention: last {status?.retentionLimit ?? 5}</span>
              {pendingEditCount > 0 && (
                <span className="text-amber-700">{pendingEditCount} unsaved</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="group relative">
              <button
                type="button"
                aria-label="Recent audit"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-300 bg-white text-typography-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-200"
              >
                <Info size={16} />
              </button>
              <div className="invisible absolute right-0 top-full z-40 mt-2 w-80 origin-top-right rounded-md border border-neutral-200 bg-white p-3 opacity-0 shadow-lg transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <h3 className="font-secondary text-sm">Recent audit</h3>
                <div className="mt-2 max-h-72 divide-y divide-neutral-100 overflow-auto">
                  {auditLogs.length === 0 && (
                    <div className="py-2 text-sm text-typography-600">No audit entries</div>
                  )}
                  {auditLogs.map((log, index) => (
                    <div key={`${log.date}-${index}`} className="py-2 text-sm">
                      <div className="font-medium">{log.event}</div>
                      <div className="mt-0.5 text-xs text-typography-600">
                        {formatDate(log.date)}
                      </div>
                      <div className="text-xs text-typography-600">{log.userName}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Button
              variant={ButtonVariant.TEXT}
              onClick={refreshAll}
              className="h-9 rounded-md px-3"
              disabled={isFetching}
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
              <option value="">Versions</option>
              {status?.versions?.map(version => (
                <option key={version.name} value={version.version}>
                  {version.name}
                  {version.current ? " (live)" : ""}
                </option>
              ))}
            </select>
            <Button
              variant={ButtonVariant.SECONDARY}
              onClick={rollback}
              disabled={!canEdit || !rollbackVersion || isLiveSelected || isRollingBack}
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

        <div className="flex min-h-0 flex-1 flex-col">
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-neutral-200 bg-white">
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[1800px] border-separate border-spacing-0 text-left text-sm">
                <thead className="sticky top-0 z-20 bg-neutral-50 text-xs uppercase text-typography-600">
                  <tr>
                    <th className="sticky left-0 z-30 w-[160px] min-w-[160px] border-b border-neutral-200 bg-neutral-50 px-3 py-3">
                      Section
                    </th>
                    <th className="sticky left-[160px] z-30 w-[280px] min-w-[280px] border-b border-r border-neutral-200 bg-neutral-50 px-3 py-3 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                      Key
                    </th>
                    {languages.map(lang => (
                      <th
                        key={lang}
                        className="border-b border-neutral-200 px-3 py-3"
                        style={{ minWidth: 280 }}
                      >
                        {labelForLanguage(lang)}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-white">
                    <th className="sticky left-0 z-30 w-[160px] min-w-[160px] border-b border-neutral-200 bg-white px-2 py-2">
                      <select
                        value={filters[SECTION_FILTER_KEY] ?? ""}
                        onChange={event => setFilter(SECTION_FILTER_KEY, event.target.value)}
                        className="h-8 w-full rounded-md border border-neutral-300 bg-white px-2 text-xs outline-none focus:border-primary-500"
                      >
                        <option value="">All sections</option>
                        {sections.map(section => (
                          <option key={section} value={section}>
                            {section}
                          </option>
                        ))}
                      </select>
                    </th>
                    <th className="sticky left-[160px] z-30 w-[280px] min-w-[280px] border-b border-r border-neutral-200 bg-white px-2 py-2 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                      <input
                        value={filters[KEY_FILTER_KEY] ?? ""}
                        onChange={event => setFilter(KEY_FILTER_KEY, event.target.value)}
                        placeholder="Filter key"
                        className="h-8 w-full rounded-md border border-neutral-300 px-2 text-xs outline-none focus:border-primary-500"
                      />
                    </th>
                    {languages.map(lang => (
                      <th key={lang} className="border-b border-neutral-200 px-2 py-2">
                        <input
                          value={filters[lang] ?? ""}
                          onChange={event => setFilter(lang, event.target.value)}
                          placeholder={`Filter ${labelForLanguage(lang)}`}
                          className="h-8 w-full rounded-md border border-neutral-300 px-2 text-xs outline-none focus:border-primary-500"
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isFetching && rows.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-typography-600" colSpan={2 + languages.length}>
                        Loading translations...
                      </td>
                    </tr>
                  )}
                  {!isFetching && filteredRows.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-typography-600" colSpan={2 + languages.length}>
                        No translations match your filters
                      </td>
                    </tr>
                  )}
                  {filteredRows.map(row => (
                    <tr key={row.fullKey} className="group align-top">
                      <td className="sticky left-0 z-10 w-[160px] min-w-[160px] border-b border-neutral-100 bg-white px-3 py-3 text-typography-700 group-hover:bg-neutral-50">
                        <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs">
                          {row.namespace}
                        </span>
                      </td>
                      <td className="sticky left-[160px] z-10 w-[280px] min-w-[280px] border-b border-r border-neutral-100 bg-white px-3 py-3 font-mono text-xs text-typography-700 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] group-hover:bg-neutral-50">
                        {row.fullKey}
                        {row.placeholders.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {row.placeholders.map(placeholder => (
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
                      {languages.map(lang => {
                        const value = getCellValue(row, lang);
                        const dirty = isCellDirty(row, lang);
                        const placeholderMismatch = hasPlaceholderMismatch(row, lang);
                        return (
                          <td
                            key={lang}
                            className={`border-b border-neutral-100 px-2 py-2 ${
                              dirty ? "bg-amber-50" : ""
                            }`}
                          >
                            <textarea
                              value={value}
                              onChange={event => setEdit(row.fullKey, lang, event.target.value)}
                              onBlur={() => {
                                if (dirty && !placeholderMismatch) void saveCell(row, lang);
                              }}
                              disabled={!canEdit || isUpdating}
                              placeholder={
                                lang === "en" ? "" : `Translate to ${labelForLanguage(lang)}`
                              }
                              rows={2}
                              className="min-h-[56px] w-full resize-y rounded-md border border-neutral-200 bg-white p-2 text-sm leading-5 outline-none focus:border-primary-500 disabled:bg-neutral-50"
                            />
                            {placeholderMismatch && (
                              <div className="mt-1 text-xs text-red-600">Placeholder mismatch</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-neutral-200 px-3 py-2 text-xs text-typography-600">
              <span>
                Showing {filteredRows.length} of {rows.length} keys
              </span>
              <span>Tip: tab between cells. Edits save when you click out of a cell.</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
