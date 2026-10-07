import { FC, useEffect, useRef, useState } from "react";

import { ChevronLeft, Quote } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { useGetHelplineMeQuery, useGetHelplineQaDetailQuery } from "@api/helpline";
import { ANALYTICS_EVENTS, ANALYTICS_PROPS } from "@constants/analyticsEvents";
import { Permissions } from "@constants/permissions";
import { ROUTES, buildHelplineChatMessageRoute } from "@constants/routes";
import { useAnalytics } from "@hooks/useAnalytics";
import { useUser } from "@hooks/useUser";
import type { QaDetailDto, QaSkillDto, QaTier } from "@types";
import { parseHelplineError } from "@utils/helplineErrors";
import { hasPermissions } from "@utils/permission";

import { formatComposite } from "./HelplineQa";

const TIERS: QaTier[] = ["Engage", "Understand", "Support"];

/** "To work on" opens on this many skills; the rest wait behind "Show more". */
const IMPROVEMENTS_SHOWN = 2;

/** Skills in tier order (Engage → Understand → Support), keeping the server's order within a tier. */
const byTier = (skills: QaSkillDto[]) =>
  TIERS.map(tier => ({ tier, skills: skills.filter(skill => skill.tier === tier) })).filter(
    group => group.skills.length > 0,
  );

const tierIndex = (skill: QaSkillDto) => {
  const index = TIERS.indexOf(skill.tier);
  return index < 0 ? TIERS.length : index;
};

/**
 * The feedback in the order the helping-skills rubric asks for it: strengths
 * first, then specific improvements each with a way to practise, then a
 * positive close. Each list runs in tier order (Engage → Understand →
 * Support, the server's order within a tier), so "show the first two" means
 * the earliest steps of the conversation. Pure, so it's testable on its own.
 */
export const qaFeedbackSections = (detail: QaDetailDto) => {
  const ordered = detail.skills
    .map((skill, index) => ({ skill, index }))
    .sort((a, b) => tierIndex(a.skill) - tierIndex(b.skill) || a.index - b.index)
    .map(({ skill }) => skill);
  return {
    strengths: ordered.filter(skill => skill.level >= 3),
    improvements: ordered.filter(skill => skill.level <= 2),
  };
};

const Evidence: FC<{ chatId: string; evidence: QaSkillDto["evidence"] }> = ({
  chatId,
  evidence,
}) => {
  const { t } = useTranslation();
  if (!evidence.length) return null;
  return (
    <ul className="mt-2 flex flex-col gap-1.5">
      {evidence.map(item => (
        <li key={`${item.messageId}-${item.quote}`}>
          <Link
            to={buildHelplineChatMessageRoute(chatId, item.messageId)}
            className="group flex items-start gap-2 rounded-lg bg-background-secondary px-3 py-2 font-primary text-sm text-typography-900 hover:bg-background-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <Quote
              aria-hidden="true"
              className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-typography-600"
            />
            <span className="min-w-0 flex-1 break-words italic">{item.quote}</span>
            <span className="whitespace-nowrap text-xs font-medium text-typography-700 group-hover:underline">
              {t("helplineWorkspace.qa.seeInChat")}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
};

const SkillHeading: FC<{ skill: QaSkillDto }> = ({ skill }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h4 className="font-primary text-base font-semibold text-typography-900">{skill.label}</h4>
      <span className="font-primary text-xs text-typography-700" data-testid="qa-skill-score">
        {t("helplineWorkspace.qa.skillScore", { score: skill.level })}
      </span>
    </div>
  );
};

const StrengthCard: FC<{ skill: QaSkillDto; chatId: string }> = ({ skill, chatId }) => {
  const { t } = useTranslation();
  const behaviours = [...skill.basicMet, ...skill.advanced];
  return (
    <li
      className="rounded-xl border border-border-light bg-white p-3"
      data-testid={`qa-strength-${skill.key}`}
    >
      <SkillHeading skill={skill} />
      {behaviours.length > 0 && (
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 font-primary text-sm text-typography-900">
          {skill.basicMet.map(item => (
            <li key={`met-${item}`}>{item}</li>
          ))}
          {skill.advanced.map(item => (
            <li key={`adv-${item}`}>
              {item}{" "}
              <span className="rounded-full bg-status-sageBg px-1.5 py-0.5 text-xs text-status-sageFg">
                {t("helplineWorkspace.qa.goingFurther")}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Evidence chatId={chatId} evidence={skill.evidence} />
    </li>
  );
};

/**
 * One skill to work on: what got in the way first (unhelpful behaviours), then
 * the basic steps that were missing — each with a one-line way to practise,
 * built from the behaviour's own words (nothing invented). About what happened
 * in this chat, never about the person ("Frame Corrective Feedback on
 * Performance, Not Personality").
 */
const ImprovementCard: FC<{ skill: QaSkillDto; chatId: string }> = ({ skill, chatId }) => {
  const { t } = useTranslation();
  return (
    <li
      className="rounded-xl border border-border-light bg-white p-3"
      data-testid={`qa-improvement-${skill.key}`}
    >
      <SkillHeading skill={skill} />
      <ul className="mt-2 flex flex-col gap-2 font-primary text-sm">
        {skill.unhelpful.map(item => (
          <li key={`unhelpful-${item}`} data-testid="qa-unhelpful">
            <p className="text-typography-900">
              <span className="font-medium">{t("helplineWorkspace.qa.unhelpfulLabel")}</span> {item}
            </p>
            <p className="text-typography-700">
              {t("helplineWorkspace.qa.practiseUnhelpful", { behaviour: item })}
            </p>
          </li>
        ))}
        {skill.basicMissing.map(item => (
          <li key={`missing-${item}`} data-testid="qa-missing">
            <p className="text-typography-900">
              <span className="font-medium">{t("helplineWorkspace.qa.missingLabel")}</span> {item}
            </p>
            <p className="text-typography-700">
              {t("helplineWorkspace.qa.practiseMissing", { behaviour: item })}
            </p>
          </li>
        ))}
      </ul>
      <Evidence chatId={chatId} evidence={skill.evidence} />
    </li>
  );
};

const TierGroups: FC<{
  skills: QaSkillDto[];
  render: (skill: QaSkillDto) => React.ReactNode;
}> = ({ skills, render }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      {byTier(skills).map(group => (
        <div key={group.tier} className="flex flex-col gap-2">
          <h3 className="font-primary text-xs font-medium uppercase tracking-wide text-typography-700">
            {t(`helplineWorkspace.qa.tiers.${group.tier}`)}
          </h3>
          <ul className="flex flex-col gap-2">{group.skills.map(render)}</ul>
        </div>
      ))}
    </div>
  );
};

/**
 * `/helpline/qa/:chatId` — the helping-skills feedback on one chat, for the
 * listener it's about or a supervisor. Framed strictly as strengths → specific
 * improvements with a way to practise → a positive close; scores read "score
 * 1–4"; no pass/fail, no ranking, no comparison with anyone else. The listener
 * sees exactly what a supervisor sees, so there are no surprises ("Involve
 * supervisees in ongoing evaluation to prevent surprises").
 */
export const HelplineQaDetail: FC = () => {
  const { chatId = "" } = useParams<{ chatId: string }>();
  const { t, i18n } = useTranslation();
  const { track } = useAnalytics();
  const { permissions } = useUser();
  const { data: me } = useGetHelplineMeQuery();
  const {
    data: detail,
    isLoading,
    error,
    refetch,
  } = useGetHelplineQaDetailQuery(chatId, {
    skip: !chatId,
  });
  const [showAllImprovements, setShowAllImprovements] = useState(false);
  const tracked = useRef<string | null>(null);
  const isReviewer = hasPermissions(permissions, Permissions.VIEW_HELPLINE_QA);
  const isMine = Boolean(detail && me && detail.listenerId === me.userId);

  useEffect(() => {
    if (!detail || !me || tracked.current === detail.chatId) return;
    tracked.current = detail.chatId;
    track(ANALYTICS_EVENTS.HELPLINE_QA_VIEWED, {
      [ANALYTICS_PROPS.HELPLINE_CHAT_ID]: detail.chatId,
      [ANALYTICS_PROPS.HELPLINE_QA_VIEWER]: detail.listenerId === me.userId ? "self" : "supervisor",
    });
  }, [detail, me, track]);

  const back = (
    <Link
      to={ROUTES.HELPLINE_QA}
      className="inline-flex min-h-[40px] items-center gap-1 self-start rounded-full pr-2 font-primary text-sm md:min-h-[36px] text-typography-800 hover:text-typography-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    >
      <ChevronLeft aria-hidden="true" className="h-4 w-4" />
      {isReviewer ? t("helplineWorkspace.qa.backAll") : t("helplineWorkspace.qa.backMine")}
    </Link>
  );

  if (isLoading) {
    return (
      <p role="status" className="p-6 font-primary text-sm text-typography-700">
        {t("helplineWorkspace.gate.loading")}
      </p>
    );
  }
  if (!detail) {
    const { status } = parseHelplineError(error);
    return (
      <div className="flex flex-col gap-3 p-6 font-primary">
        {back}
        <p className="text-base text-typography-800">
          {status === 404 || status === 403
            ? t("helplineWorkspace.qa.notFound")
            : t("helplineWorkspace.qa.loadFailed")}
        </p>
        {status !== 404 && status !== 403 && (
          <button
            type="button"
            onClick={() => void refetch()}
            className="min-h-[40px] self-start rounded-full border border-border-medium px-4 py-2 text-sm text-typography-900 hover:bg-background-secondary md:min-h-0"
          >
            {t("helplineWorkspace.gate.retry")}
          </button>
        )}
      </div>
    );
  }

  const { strengths, improvements } = qaFeedbackSections(detail);
  const shownImprovements = showAllImprovements
    ? improvements
    : improvements.slice(0, IMPROVEMENTS_SHOWN);
  const hiddenCount = improvements.length - shownImprovements.length;
  const date = new Intl.DateTimeFormat(i18n.language || "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(detail.endedAt));

  return (
    <div className="h-full overflow-y-auto" data-testid="helpline-qa-detail">
      <article className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-5 md:px-6">
        <header className="flex flex-col gap-2">
          {back}
          <h1 className="font-secondary text-2xl text-typography-900">
            {isMine
              ? t("helplineWorkspace.qa.detailTitleMine")
              : t("helplineWorkspace.qa.detailTitle", { name: detail.listenerName })}
          </h1>
          <p className="font-primary text-sm text-typography-700">
            {t("helplineWorkspace.qa.chatOn", { date })}
            {" · "}
            {t("helplineWorkspace.qa.overallScore", {
              score: formatComposite(detail.compositeScore),
            })}
          </p>
          <p className="font-primary text-sm text-typography-800">
            {isMine
              ? t("helplineWorkspace.qa.detailIntroMine")
              : t("helplineWorkspace.qa.detailIntroSupervisor", { name: detail.listenerName })}
          </p>
        </header>

        <section
          aria-labelledby="qa-strengths"
          className="flex flex-col gap-3"
          data-testid="qa-section-strengths"
        >
          <h2 id="qa-strengths" className="font-primary text-lg font-medium text-typography-900">
            {t("helplineWorkspace.qa.wentWell")}
          </h2>
          {strengths.length ? (
            <TierGroups
              skills={strengths}
              render={skill => (
                <StrengthCard key={skill.key} skill={skill} chatId={detail.chatId} />
              )}
            />
          ) : (
            <p className="font-primary text-sm text-typography-700">
              {t("helplineWorkspace.qa.wentWellEmpty")}
            </p>
          )}
        </section>

        <section
          aria-labelledby="qa-improvements"
          className="flex flex-col gap-3"
          data-testid="qa-section-improvements"
        >
          <h2 id="qa-improvements" className="font-primary text-lg font-medium text-typography-900">
            {t("helplineWorkspace.qa.toWorkOn")}
          </h2>
          {improvements.length ? (
            <>
              <p className="font-primary text-sm text-typography-700">
                {t("helplineWorkspace.qa.toWorkOnIntro")}
              </p>
              <TierGroups
                skills={shownImprovements}
                render={skill => (
                  <ImprovementCard key={skill.key} skill={skill} chatId={detail.chatId} />
                )}
              />
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllImprovements(true)}
                  className="min-h-[40px] self-start rounded-full border border-border-medium px-3 py-1 font-primary text-sm text-typography-900 hover:bg-background-secondary md:min-h-0"
                >
                  {t("helplineWorkspace.qa.showMore", { count: hiddenCount })}
                </button>
              )}
            </>
          ) : (
            <p className="font-primary text-sm text-typography-700">
              {t("helplineWorkspace.qa.toWorkOnEmpty")}
            </p>
          )}
        </section>

        <p
          className="rounded-xl bg-status-sageBg p-4 font-primary text-base text-status-sageFg"
          data-testid="qa-closing"
        >
          {t("helplineWorkspace.qa.closing")}
        </p>
      </article>
    </div>
  );
};

export default HelplineQaDetail;
