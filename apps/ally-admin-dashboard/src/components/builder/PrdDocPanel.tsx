import React, { useEffect, useMemo, useRef, useState } from "react";

import { Edit } from "@icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button, Tag, TextArea, Tooltip } from "@ally-ui-mono/ui-shared";
import { en } from "@constants";
import { BuilderPrdDocument, BuilderPrdReadiness } from "@types";
import { asAgentText, asAgentTextList } from "@utils";

import { ReadinessRing } from "./ReadinessRing";
import {
  BUILDER_DURATION,
  BUILDER_EASING,
  prefersReducedMotion,
} from "../../pages/Builder/builderMotion";
import { roleplayMarkdownComponents } from "../roleplay-studio/markdownComponents";

/**
 * Every list in this panel is written by the agent, so none of it can be
 * assumed well-shaped: a section it is mid-way through thinking about may hold
 * a string where an array belongs, or an entry with half its fields unset.
 *
 * `?.length > 0` is not a sufficient guard — a string has a length and then
 * fails on `.map`, which is exactly how this panel first crashed. Read every
 * agent-authored array through here instead.
 *
 * The array being well-shaped says nothing about its items: the second crash
 * was `openQuestions` holding `{ id, text }` rows, which React refuses to
 * render as a child. Every leaf below goes through `asAgentText` for the same
 * reason this goes through `asArray`.
 */
const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/** Plain-markdown sections, in the order they read. */
const PROSE_SECTIONS: (keyof BuilderPrdDocument)[] = [
  "summary",
  "problem",
  "usersAndContext",
  "goals",
  "nonGoals",
  "testPlanMd",
  "e2ePlanMd",
];

interface PrdDocPanelProps {
  prd: BuilderPrdDocument;
  readiness: BuilderPrdReadiness;
  versionNumber: number;
  /** False while a build is running — the PRD is what the build reads. */
  editable: boolean;
  onSaveSection: (path: string, value: string) => Promise<void>;
}

/**
 * The living PRD, beside the chat.
 *
 * Editing is per section rather than whole-document: the agent patches by
 * JSON Pointer and a person edits one part at a time, so section granularity
 * is what lets both write without overwriting each other's work.
 *
 * A section that just changed gets a brief highlight. That is the whole point
 * of showing the document during the interview — you can watch it being
 * written, and you can see *which part* moved without diffing it yourself.
 */
export const PrdDocPanel: React.FC<PrdDocPanelProps> = ({
  prd,
  readiness,
  versionNumber,
  editable,
  onSaveSection,
}) => {
  const strings = en.builder.prd;
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [flashedKeys, setFlashedKeys] = useState<Set<string>>(new Set());

  const previousPrdRef = useRef<BuilderPrdDocument | null>(null);

  // Highlight whatever changed between renders. Compared against the previous
  // document rather than driven by the SSE frame so an admin's own save
  // highlights too — otherwise only the agent's edits would appear to land.
  useEffect(() => {
    const previous = previousPrdRef.current;
    previousPrdRef.current = prd;
    if (!previous || prefersReducedMotion()) return undefined;

    const changed = new Set<string>();
    for (const key of Object.keys(prd) as (keyof BuilderPrdDocument)[]) {
      if (JSON.stringify(previous[key]) !== JSON.stringify(prd[key])) {
        changed.add(String(key));
      }
    }
    if (changed.size === 0) return undefined;

    setFlashedKeys(changed);
    const timer = window.setTimeout(() => setFlashedKeys(new Set()), 1400);
    return () => window.clearTimeout(timer);
  }, [prd]);

  const readinessByKey = useMemo(
    () => new Map(readiness.sections.map(section => [section.key, section])),
    [readiness.sections],
  );

  // Normalised once, at the top, rather than guarded at each use site — a
  // single missed guard is a crashed panel, and the panel is how the admin
  // watches the PRD being written.
  const requirements = asArray<BuilderPrdDocument["requirements"][number]>(prd.requirements);
  const assumptions = asArray<BuilderPrdDocument["assumptions"][number]>(prd.assumptions);
  const repoPlans = asArray<BuilderPrdDocument["technicalPlan"]["repos"][number]>(
    prd.technicalPlan?.repos,
  );
  const openQuestions = asAgentTextList(prd.openQuestions);

  const beginEdit = (key: string, value: string) => {
    setEditingKey(key);
    setDraftValue(value);
    setShowPreview(false);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setDraftValue("");
  };

  const saveEdit = async (key: string) => {
    setSaving(true);
    try {
      await onSaveSection(`/${key}`, draftValue);
      setEditingKey(null);
      setDraftValue("");
    } catch {
      // onSaveSection already surfaced a toast for this; swallow the
      // rejection here so the fire-and-forget onClick doesn't also throw it
      // as an unhandled promise rejection. The editor stays open with the
      // draft intact so the admin can retry.
    } finally {
      setSaving(false);
    }
  };

  const sectionStyle = (key: string): React.CSSProperties | undefined => {
    if (!flashedKeys.has(key)) {
      return prefersReducedMotion()
        ? undefined
        : {
            transition: `background-color ${BUILDER_DURATION.slow}ms ${BUILDER_EASING.productive}`,
          };
    }
    return {
      backgroundColor: "var(--cds-highlight, #d0e2ff)",
      transition: `background-color ${BUILDER_DURATION.fast}ms ${BUILDER_EASING.productive}`,
    };
  };

  const renderSectionHeader = (key: string, label: string, currentValue?: string) => {
    const section = readinessByKey.get(key);
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-typography-900">{label}</h3>
          {section && !section.ok && section.hint && (
            <Tooltip label={section.hint} align="top">
              <Tag type="warm-gray" size="sm">
                !
              </Tag>
            </Tooltip>
          )}
        </div>
        {editable && currentValue !== undefined && editingKey !== key && (
          <Button
            kind="ghost"
            size="sm"
            hasIconOnly
            iconDescription={strings.edit}
            tooltipPosition="left"
            renderIcon={Edit}
            onClick={() => beginEdit(key, currentValue)}
          />
        )}
      </div>
    );
  };

  // Takes `unknown`, not `string`: every markdown section on this panel is
  // agent-written, and one that arrived as an object used to reach
  // ReactMarkdown and throw.
  const renderMarkdown = (raw: unknown) => {
    const value = asAgentText(raw);
    return value.trim() ? (
      <div className="prose prose-sm mt-1 max-w-none text-sm text-typography-800">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={roleplayMarkdownComponents}>
          {value}
        </ReactMarkdown>
      </div>
    ) : (
      <p className="mt-1 text-sm italic text-typography-400">{strings.emptySection}</p>
    );
  };

  const renderEditor = (key: string) => (
    <div className="mt-2 flex flex-col gap-2">
      {showPreview ? (
        <div className="min-h-[120px] rounded border border-neutral-200 p-2">
          {renderMarkdown(draftValue)}
        </div>
      ) : (
        <TextArea
          id={`builder-prd-${key}`}
          labelText={strings.edit}
          hideLabel
          rows={6}
          value={draftValue}
          disabled={saving}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
            setDraftValue(event.target.value)
          }
        />
      )}
      <div className="flex items-center justify-between">
        <Button kind="ghost" size="sm" onClick={() => setShowPreview(prev => !prev)}>
          {showPreview ? strings.write : strings.preview}
        </Button>
        <div className="flex gap-2">
          <Button kind="secondary" size="sm" disabled={saving} onClick={cancelEdit}>
            {strings.cancel}
          </Button>
          <Button kind="primary" size="sm" disabled={saving} onClick={() => saveEdit(key)}>
            {strings.save}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <ReadinessRing readiness={readiness} />
        <Tag type="cool-gray" size="sm">
          {strings.versionLabel(versionNumber)}
        </Tag>
      </div>

      {!editable && (
        <p className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs text-typography-600">
          {strings.lockedWhileBuilding}
        </p>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {PROSE_SECTIONS.map(key => {
          const stringKey = String(key);
          const value = asAgentText(prd[key]);
          return (
            <section key={stringKey} className="mb-4 rounded p-1" style={sectionStyle(stringKey)}>
              {renderSectionHeader(stringKey, strings.sections[stringKey] ?? stringKey, value)}
              {editingKey === stringKey ? renderEditor(stringKey) : renderMarkdown(value)}
            </section>
          );
        })}

        <section className="mb-4 rounded p-1" style={sectionStyle("requirements")}>
          {renderSectionHeader("requirements", strings.sections.requirements)}
          {requirements.length ? (
            <ul className="mt-1 flex flex-col gap-2">
              {requirements.map((requirement, requirementIndex) => {
                const criteria = asAgentTextList(requirement.acceptanceCriteria);
                return (
                  <li
                    key={`${requirement.id ?? "req"}-${requirementIndex}`}
                    className="rounded border border-neutral-200 p-2"
                  >
                    <div className="flex items-baseline gap-2">
                      {asAgentText(requirement.id) && (
                        <Tag type="blue" size="sm">
                          {asAgentText(requirement.id)}
                        </Tag>
                      )}
                      <span className="text-sm font-medium text-typography-900">
                        {asAgentText(requirement.title)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-typography-700">
                      {asAgentText(requirement.description)}
                    </p>
                    {criteria.length > 0 && (
                      <>
                        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-typography-500">
                          {strings.acceptanceCriteria}
                        </p>
                        <ul className="mt-0.5 list-disc pl-5 text-sm text-typography-700">
                          {criteria.map((criterion, index) => (
                            <li key={index}>{criterion}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-1 text-sm italic text-typography-400">{strings.noRequirements}</p>
          )}
        </section>

        <section className="mb-4 rounded p-1" style={sectionStyle("assumptions")}>
          {renderSectionHeader("assumptions", strings.sections.assumptions)}
          {assumptions.length ? (
            <ul className="mt-1 flex flex-col gap-1">
              {assumptions.map((assumption, assumptionIndex) => (
                <li
                  key={`${assumption.id ?? "assumption"}-${assumptionIndex}`}
                  className="flex items-start gap-2"
                >
                  {/* shrink-0 on the tag and min-w-0 on the text: a Carbon Tag
                      will not shrink below its label, so without these the
                      assumption text is squeezed to zero width and wraps back
                      underneath the tag it is meant to sit beside. */}
                  <span className="shrink-0">
                    <Tag type={assumption.status === "confirmed" ? "green" : "warm-gray"} size="sm">
                      {assumption.status === "confirmed"
                        ? strings.assumptionConfirmed
                        : strings.assumptionUnconfirmed}
                    </Tag>
                  </span>
                  <span className="min-w-0 flex-1 text-sm text-typography-700">
                    {asAgentText(assumption.text)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm italic text-typography-400">{strings.noAssumptions}</p>
          )}
        </section>

        <section className="mb-4 rounded p-1" style={sectionStyle("technicalPlan")}>
          {renderSectionHeader("technicalPlan", strings.sections.technicalPlan)}
          {repoPlans.length ? (
            <ul className="mt-1 flex flex-col gap-2">
              {/* Keyed by index, not by `repo`: the agent writes this array and
                  can leave a plan's repo name unset while it is still working
                  the section out. A null key is not a key. */}
              {repoPlans.map((plan, index) => {
                const repoName = asAgentText(plan.repo).trim();
                return (
                  <li key={`${repoName || "unnamed"}-${index}`}>
                    <Tag type={repoName ? "purple" : "warm-gray"} size="sm">
                      {repoName || strings.unnamedRepo}
                    </Tag>
                    {renderMarkdown(plan.changesMd)}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-1 text-sm italic text-typography-400">{strings.emptySection}</p>
          )}
          {prd.technicalPlan?.dataModelMd && renderMarkdown(prd.technicalPlan.dataModelMd)}
          {prd.technicalPlan?.apiMd && renderMarkdown(prd.technicalPlan.apiMd)}
        </section>

        <section className="mb-4 rounded p-1" style={sectionStyle("openQuestions")}>
          {renderSectionHeader("openQuestions", strings.sections.openQuestions)}
          {openQuestions.length ? (
            <ul className="mt-1 list-disc pl-5 text-sm text-typography-700">
              {openQuestions.map((question, index) => (
                <li key={index}>{question}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm italic text-typography-400">{strings.noOpenQuestions}</p>
          )}
        </section>
      </div>
    </div>
  );
};
