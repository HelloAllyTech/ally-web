import { ReactNode, useEffect, useMemo, useState } from "react";

import { Button, CarbonDropdown as Dropdown } from "@ally-ui-mono/ui-shared";
import { useGetCourseImpactQuery, useGetTenantsQuery } from "@api";

import { asOfStamp } from "../analyticsFilters";
import { ChangeWhiskers } from "../ChangeWhiskers";
import { ChartCard, buildSource } from "../chartKit";
import {
  CourseImpactCourse,
  REFERENCE_LABEL,
  competencySourceText,
  comparisonLine,
  courseRows,
  courseTakeaway,
  courseVerdict,
  coverageAdvice,
  coverageStages,
  pooledRow,
  pooledTakeaway,
  referenceNote,
  sharePct,
  skillRows,
  toPoints,
  unhelpfulVerdict,
  unpairedCourseCount,
} from "../courseImpactChart";
import { CourseLiftWhiskers } from "../CourseLiftWhiskers";
import { ALL_ORGS, orgFilterItems } from "../foundationalSkillsProgressChart";
import { FunnelBars } from "../FunnelBars";

/** The org list is a filter, not a directory: one page covers every live org. */
const TENANT_PAGE_SIZE = 200;
/** Course rows shown before "Show all": enough to see the spread without scrolling past it. */
const COURSE_ROWS_COLLAPSED = 12;

const Section = ({
  title,
  blurb,
  controls,
  children,
}: {
  title: string;
  blurb: string;
  controls?: ReactNode;
  children: ReactNode;
}) => (
  <section className="flex flex-col gap-3">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-base font-semibold text-typography-900">{title}</h3>
        <p className="max-w-4xl text-xs leading-relaxed text-typography-500">{blurb}</p>
      </div>
      {controls}
    </div>
    {children}
  </section>
);

/** A small labelled number. Text carries the meaning; nothing here is colour-only. */
const Stat = ({ label, value, note }: { label: string; value: string; note: string }) => (
  <div className="flex flex-col gap-0.5 rounded border border-[#e0e0e0] p-3">
    <span className="text-[11px] text-typography-500">{label}</span>
    <span className="text-2xl font-semibold tabular-nums text-typography-900">{value}</span>
    <span className="text-[11px] leading-snug text-typography-500">{note}</span>
  </div>
);

const InlinePicker = <T extends { id: string; label: string }>({
  id,
  label,
  items,
  selected,
  onChange,
}: {
  id: string;
  label: string;
  items: T[];
  selected: T["id"] | undefined;
  onChange: (id: T["id"]) => void;
}) => (
  <Dropdown
    id={id}
    size="sm"
    type="inline"
    label={label}
    // Visually hidden, but it names the control for a screen reader.
    titleText={label}
    hideLabel
    items={items}
    itemToString={(i: T) => i?.label ?? ""}
    selectedItem={items.find(i => i.id === selected) ?? null}
    onChange={({ selectedItem }: { selectedItem: T }) => selectedItem && onChange(selectedItem.id)}
  />
);

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The course the drill-down opens on: the one with the most learners to compare. */
const defaultCourse = (courses: CourseImpactCourse[]): string | undefined =>
  (courses.find(c => c.coverage.paired > 0) ?? courses[0])?.trackId;

/**
 * Highlights → Course impact: did each course's learners do better on the
 * foundational helping skills after the course than before it?
 *
 * One fixed rubric (the same one the Helping skills tab reads), so every course
 * is on the same 1–4 scale whatever its scenarios. Each learner is compared
 * with themselves — their last scored practice before starting against their
 * first after finishing — and the server withholds every average below its
 * sample floor. All-time, like Helping skills, so no page filters reach it; it
 * carries its own org filter.
 */
export const CourseImpactSubTab = () => {
  const [tenantId, setTenantId] = useState<string>(ALL_ORGS);
  const [trackId, setTrackId] = useState<string | undefined>(undefined);
  const [showAll, setShowAll] = useState(false);

  // A failed or forbidden org list leaves only "All orgs" — the tab still works.
  const { data: tenantData } = useGetTenantsQuery({ limit: TENANT_PAGE_SIZE });
  const orgItems = useMemo(() => orgFilterItems(tenantData?.data ?? []), [tenantData]);
  const orgName = tenantId ? orgItems.find(o => o.id === tenantId)?.label : undefined;
  const allTime = orgName ? `All time · ${orgName} only` : "All time";

  // One request carries the list AND the chosen course. RTK keeps `data` from
  // the previous arguments while a new course loads, so the list never blanks
  // on a pick; the drill-down is shown only once `data.course` matches it.
  const { data, currentData, isLoading, isFetching, isError, refetch } = useGetCourseImpactQuery({
    ...(tenantId ? { tenantId } : {}),
    ...(trackId ? { trackId } : {}),
  });

  const courses = data?.courses ?? [];
  // Open on the best-covered course, and again whenever the org filter leaves
  // the chosen course out of the list. Decided on `currentData` — the response
  // to THESE arguments — so a newly picked org's default is never taken from
  // the previous org's list while the new one loads.
  useEffect(() => {
    if (!currentData) return;
    if (!trackId || !currentData.courses.some(c => c.trackId === trackId)) {
      setTrackId(defaultCourse(currentData.courses));
    }
  }, [currentData, trackId]);

  const pickOrg = (id: string) => {
    setTenantId(id);
    setTrackId(undefined);
    setShowAll(false);
  };

  const loading = isLoading && !data;
  const common = { loading, error: isError, onRetry: refetch };
  const minN = data?.minSampleSize ?? 20;
  const windowCuts = data?.windowCuts ?? 3;

  const rows = courseRows(courses);
  const visibleRows = showAll ? rows : rows.slice(0, COURSE_ROWS_COLLAPSED);
  const unpaired = unpairedCourseCount(courses);
  // All courses together, each learner once, heads the list; the free-practice
  // reference is the grey whisker under every row. Both are absent from a
  // backend that predates them, and the rows still render without them.
  const pooled = pooledRow(data?.pooled);
  const reference = data?.reference
    ? {
        label: REFERENCE_LABEL,
        change: data.reference.change,
        ci: data.reference.changeCi,
        n: data.reference.learners,
      }
    : null;
  const refNote = referenceNote(data?.reference, windowCuts, minN);
  const liftTakeaway = data
    ? [courseTakeaway(data.summary, minN), pooledTakeaway(data.pooled, data.reference)]
        .filter(Boolean)
        .join(" ")
    : undefined;

  const chosen = courses.find(c => c.trackId === trackId);
  const detail = data?.course && data.course.trackId === trackId ? data.course : null;
  const detailLoading = !!trackId && !detail && (isFetching || loading);
  const detailCommon = { loading: detailLoading, error: isError && !detail, onRetry: refetch };

  const courseItems = courses.map(c => ({
    id: c.trackId,
    label: `${c.title} · ${c.coverage.paired} comparable`,
  }));

  const source = buildSource({
    derivation: "Each learner before vs after, one fixed rubric",
    window: allTime,
    asOf: asOfStamp(data?.computedAt),
  });

  const unhelpful = detail ? toPoints(detail.unhelpful) : null;
  const targetedNames = detail ? detail.skills.filter(s => s.targeted).map(s => s.name) : [];
  const taughtFrom = competencySourceText(chosen?.competencySource);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-typography-900">Org:</span>
        <InlinePicker
          id="course-impact-org"
          label="Org"
          items={orgItems}
          selected={tenantId}
          onChange={pickOrg}
        />
      </div>

      <Section
        title="Every course"
        blurb={`For each course, learners who finished it are compared with themselves: their helping-skills score (1–4) from their last ${windowCuts} scored practice slices before starting, against their first ${windowCuts} after finishing. A change is shown only once ${minN} learners can be compared, and is called only when its 95% interval clears zero.`}
      >
        <ChartCard
          title="Course impact at a glance"
          caption={`Courses with at least ${minN} learners who practised both before and after them, and how each one moved.`}
          source={source}
          {...common}
          empty={!loading && !!data && data.summary.courses === 0}
          emptyText="No one has enrolled in a course yet"
          chartId="AAQ-193"
        >
          {data && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat
                label="Courses with enough learners"
                value={String(data.summary.measurable)}
                note={`of ${data.summary.courses} with an enrollment`}
              />
              <Stat
                label="Improved"
                value={String(data.summary.improved)}
                note="Interval above zero"
              />
              <Stat
                label="No clear change"
                value={String(data.summary.unclear)}
                note="Interval spans zero: too small to see, or not there"
              />
              <Stat
                label="Declined"
                value={String(data.summary.declined)}
                note="Interval below zero"
              />
            </div>
          )}
        </ChartCard>

        <ChartCard
          wide
          title="Helping skills before and after, by course"
          caption={`Before/after on the same learners. Not a trial: people who finish courses also practise more. The grey whisker is what free practice over the same number of slices looked like. Each row is the change in a course's average score (after − before) with its 95% interval, green or red only when the interval clears zero; under each course: before → after, how many of its enrolled learners can be compared, and how long finishing took.`}
          source={buildSource({
            derivation: "Each learner before vs after, one fixed rubric",
            window: allTime,
            n: data?.summary.pairedEnrollments,
            nUnit: "learner–course pairs",
            asOf: asOfStamp(data?.computedAt),
          })}
          takeaway={liftTakeaway || undefined}
          {...common}
          empty={!loading && !!data && rows.length === 0}
          emptyText={
            data && data.summary.courses > 0
              ? `${data.summary.courses} course(s) have enrollments, but no learner has scored practice both before starting and after finishing one yet. Pick a course below to see where its learners drop out of the comparison.`
              : "No one has enrolled in a course yet"
          }
          chartId="AAQ-194"
        >
          <div className="flex flex-col gap-3">
            <CourseLiftWhiskers
              rows={visibleRows}
              headRow={pooled}
              reference={reference}
              emptyLabel="too few learners"
            />
            {refNote && (
              <p className="max-w-4xl text-[11px] leading-snug text-typography-500">{refNote}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs text-typography-500">
              {rows.length > COURSE_ROWS_COLLAPSED && (
                <Button kind="ghost" size="sm" onClick={() => setShowAll(v => !v)}>
                  {showAll ? "Show fewer" : `Show all ${rows.length} courses`}
                </Button>
              )}
              {unpaired > 0 && (
                <span>
                  {unpaired} more course{unpaired === 1 ? " has" : "s have"} no learner who can be
                  compared yet.
                </span>
              )}
            </div>
            {data?.provenance && (
              <p className="max-w-4xl text-[11px] leading-snug text-typography-500">
                {data.provenance}
              </p>
            )}
          </div>
        </ChartCard>
      </Section>

      <Section
        title="One course"
        blurb="Why a course can or cannot be read, which skills moved, and whether harmful habits fell away. Skills this course teaches are listed first."
        controls={
          courseItems.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-typography-900">Course:</span>
              <InlinePicker
                id="course-impact-course"
                label="Course"
                items={courseItems}
                selected={trackId}
                onChange={id => setTrackId(id)}
              />
            </div>
          ) : null
        }
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard
            title="Who this course can measure"
            caption="Each step keeps only the learners from the step before: enrolled, started, finished, had scored practice before starting, and practised again after finishing. The last bar is who the comparison is made on."
            source={source}
            takeaway={chosen ? (coverageAdvice(chosen.coverage) ?? undefined) : undefined}
            {...common}
            empty={!loading && !chosen}
            emptyText="No course selected"
            chartId="AAQ-195"
          >
            {chosen && <FunnelBars stages={coverageStages(chosen.coverage)} unit="learners" />}
          </ChartCard>

          <ChartCard
            title="Unhelpful behaviour, before and after"
            caption="Share of each learner's practice slices showing any unhelpful or potentially harmful behaviour, averaged over the same learners. Lower is better."
            source={source}
            takeaway={
              unhelpful && unhelpful.change !== null
                ? `${capitalise(unhelpfulVerdict(unhelpful))}: ${comparisonLine(unhelpful, 0, " pts")}.`
                : undefined
            }
            {...detailCommon}
            // Only once the course has loaded: with no `n` the card would read
            // "not enough data" for a course it has not fetched yet.
            {...(detail ? { n: detail.unhelpful.learners, nUnit: "learners", minN } : {})}
            empty={!detailLoading && !detail}
            emptyText="No course selected"
            chartId="AAQ-197"
          >
            {detail && unhelpful && (
              <div className="grid grid-cols-2 gap-3">
                <Stat
                  label="Before the course"
                  value={sharePct(detail.unhelpful.beforeAvg)}
                  note="of their slices"
                />
                <Stat
                  label="After the course"
                  value={sharePct(detail.unhelpful.afterAvg)}
                  note={`${unhelpfulVerdict(unhelpful)} · n = ${detail.unhelpful.learners}`}
                />
              </div>
            )}
          </ChartCard>

          <ChartCard
            wide
            title="Skill by skill, before and after"
            caption={`Change in each skill's level (1–4) over learners who had a chance to show it both before and after. A skill nobody had a chance at is left out rather than shown as low.${
              detail && targetedNames.length === 0
                ? " None of this course's competencies match a helping skill, so none is marked as taught."
                : ""
            }`}
            source={source}
            takeaway={
              chosen
                ? `${chosen.title}: overall ${courseVerdict(chosen.composite)}${
                    chosen.composite.change !== null ? ` — ${comparisonLine(chosen.composite)}` : ""
                  }.`
                : undefined
            }
            {...detailCommon}
            empty={
              !detailLoading &&
              (!detail || skillRows(detail.skills, chosen?.competencySource).length === 0)
            }
            emptyText={
              detail
                ? "No learner in this course can be compared before and after yet."
                : "No course selected"
            }
            chartId="AAQ-196"
          >
            {detail && (
              <div className="flex flex-col gap-3">
                <ChangeWhiskers rows={skillRows(detail.skills, chosen?.competencySource)} />
                {detail.competencies.length > 0 && (
                  <p className="text-[11px] leading-snug text-typography-500">
                    Competencies this course teaches{taughtFrom ? ` (${taughtFrom})` : ""}:{" "}
                    {detail.competencies.join(", ")}.
                  </p>
                )}
              </div>
            )}
          </ChartCard>
        </div>
      </Section>
    </div>
  );
};
