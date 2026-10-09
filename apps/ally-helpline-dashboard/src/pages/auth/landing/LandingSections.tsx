import { FC } from "react";

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared/featureFlag";
import { Ally } from "@assets";
import { ALLY_PRIVACY_POLICY_URL, ALLY_TERMS_URL, ALLY_URL, ROUTES } from "@constants";

import {
  ChatIcon,
  CommentIcon,
  DocumentIcon,
  ExternalIcon,
  LeafIcon,
  LockIcon,
  MicIcon,
  MicOffIcon,
  PathIcon,
  PersonOffIcon,
  ShieldIcon,
} from "./LandingIcons";
import { safeLink, SECTION_IDS } from "./links";
import { ContactHills, NightSun } from "./NightScene";
import { LANGUAGE_OPTIONS } from "../../../components/language-selector/LanguageSelector";

/*
 * Everything below the sign-in hero. Every word is a `landing.*` key, so the
 * whole page is edited, translated and published from the admin console's
 * Translation Management — no deploy needed to change the copy.
 */

const FEATURES = [
  { key: "rolePlay", Icon: MicIcon },
  { key: "pathways", Icon: PathIcon },
  { key: "scribe", Icon: DocumentIcon },
  { key: "helpline", Icon: ChatIcon },
  { key: "feedback", Icon: CommentIcon },
  { key: "selfCare", Icon: LeafIcon },
] as const;

/*
 * The same four promises the Scribe screen's carousel makes, by the same keys:
 * they are one set of claims, so editing one wording updates both places.
 */
const PRIVACY_POINTS = [
  { key: "carousel.slides.noRecording", Icon: MicOffIcon },
  { key: "carousel.slides.noTrainingData", Icon: ShieldIcon },
  { key: "carousel.slides.personalInfoRemoved", Icon: PersonOffIcon },
  { key: "carousel.slides.encrypted", Icon: LockIcon },
] as const;

const gutter = "px-[clamp(20px,5vw,72px)]";
const container = "mx-auto w-full max-w-[1296px]";
const eyebrow = "m-0 text-base font-semibold text-primary-500";
const sectionTitle =
  "m-0 font-primary text-[clamp(32px,3.4vw,44px)] font-medium leading-[1.15] tracking-[-0.01em]";
const lede = "m-0 font-secondary text-xl leading-[30px] text-secondary-600";
const footerLink =
  "inline-flex min-h-[44px] items-center px-2 text-base text-primary-500 underline underline-offset-2 hover:text-primary-600";

const WhatsInside: FC = () => {
  const { t } = useTranslation();
  return (
    <section id={SECTION_IDS.inside} className={`${gutter} pb-24 pt-10`}>
      <div className={`${container} flex flex-col gap-10`}>
        <div className="flex max-w-[720px] flex-col gap-3">
          <p className={eyebrow}>{t("landing.inside.eyebrow")}</p>
          <h2 className={sectionTitle}>{t("landing.inside.title")}</h2>
          <p className={lede}>{t("landing.inside.body")}</p>
        </div>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-5 p-0">
          {FEATURES.map(({ key, Icon }) => (
            <li
              key={key}
              className="flex flex-col gap-3.5 rounded-2xl border border-border bg-white p-7"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
                <Icon />
              </span>
              <h3 className="m-0 font-primary text-[22px] font-semibold leading-[30px]">
                {t(`landing.inside.${key}.title`)}
              </h3>
              <p className="m-0 font-secondary text-lg leading-[27px] text-secondary-600">
                {t(`landing.inside.${key}.body`)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

const Privacy: FC = () => {
  const { t } = useTranslation();
  return (
    <section id={SECTION_IDS.privacy} className={`${gutter} bg-background-tertiary py-[88px]`}>
      <div className={`${container} flex flex-wrap items-start gap-12`}>
        <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-3">
          <p className={eyebrow}>{t("landing.privacy.eyebrow")}</p>
          <h2 className={sectionTitle}>{t("landing.privacy.title")}</h2>
          <p className={lede}>{t("landing.privacy.body")}</p>
        </div>
        <ul className="m-0 grid min-w-0 flex-[1.4_1_480px] list-none grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-4 p-0">
          {PRIVACY_POINTS.map(({ key, Icon }) => (
            <li key={key} className="flex items-start gap-3.5 rounded-[14px] bg-white p-[22px]">
              <Icon className="h-6 w-6 shrink-0 text-primary-500" />
              <span className="text-lg leading-[26px]">{t(key)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

/* Only where the app offers a language choice — otherwise it promises a
   picker the learner can't find. */
const Languages: FC = () => {
  const { t } = useTranslation();
  if (!FEATURE_FLAGS_MAP.LANGUAGE_SELECTOR_FLAG) return null;
  return (
    <section className={`${gutter} pb-10 pt-[72px]`}>
      <div className={`${container} flex flex-wrap items-center gap-x-6 gap-y-4`}>
        <h2 className="m-0 font-primary text-xl font-medium">{t("landing.languages.title")}</h2>
        <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0">
          {LANGUAGE_OPTIONS.map(option => (
            <li
              key={option.code}
              lang={option.code}
              className="rounded-full border border-border-medium bg-white px-4 py-2 text-[17px]"
            >
              {option.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

const Contact: FC = () => {
  const { t } = useTranslation();
  const href = safeLink(t("landing.contact.href"), ALLY_URL);
  const isWebLink = href.startsWith("http");
  return (
    <section className={`${gutter} pb-[88px] pt-8`}>
      <div
        className={`${container} relative flex flex-wrap items-center justify-between gap-8 overflow-hidden rounded-3xl bg-night-sky p-[clamp(32px,5vw,64px)] text-white`}
      >
        <NightSun className="absolute bottom-[26px] left-[55%] h-16 w-16" />
        <ContactHills />
        <div className="relative flex min-w-0 flex-[1_1_420px] flex-col gap-3 pb-10">
          <h2 className="m-0 font-primary text-[clamp(30px,3.2vw,42px)] font-medium leading-[1.15] tracking-[-0.01em]">
            {t("landing.contact.title")}
          </h2>
          <p className="m-0 max-w-[560px] font-secondary text-xl leading-[30px] text-night-mist">
            {t("landing.contact.body")}
          </p>
        </div>
        <div className="relative pb-10">
          <a
            href={href}
            {...(isWebLink ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="inline-flex h-[52px] items-center justify-center rounded-[10px] bg-white px-7 text-[17px] font-semibold text-typography-900 no-underline hover:bg-background"
          >
            {t("landing.contact.button")}
          </a>
        </div>
      </div>
    </section>
  );
};

const Footer: FC = () => {
  const { t } = useTranslation();
  return (
    <footer className={`${gutter} border-t border-border pb-10 pt-9`}>
      <div className={`${container} flex flex-wrap items-start justify-between gap-6`}>
        <div className="flex flex-col gap-2 font-secondary text-base text-secondary-600">
          <Ally className="h-7 w-auto self-start text-primary-500" />
          <span>{t("landing.footer.tagline")}</span>
          <span className="text-[15px]">
            {t("landing.footer.copyright", { year: new Date().getFullYear() })}
          </span>
        </div>
        <nav aria-label={t("landing.footer.label")} className="flex flex-wrap gap-x-2 gap-y-1">
          <Link to={ROUTES.BLOG} className={footerLink}>
            {t("landing.footer.blog")}
          </Link>
          <Link to={ROUTES.CHANGELOG} className={footerLink}>
            {t("landing.footer.whatsNew")}
          </Link>
          <a href={ALLY_TERMS_URL} className={footerLink}>
            {t("landing.footer.terms")}
          </a>
          <a href={ALLY_PRIVACY_POLICY_URL} className={footerLink}>
            {t("landing.footer.privacy")}
          </a>
          <a
            href={ALLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${footerLink} gap-1`}
          >
            {t("landing.footer.website")}
            <ExternalIcon className="h-4 w-4" />
          </a>
        </nav>
      </div>
    </footer>
  );
};

export const LandingSections: FC = () => (
  <>
    <WhatsInside />
    <Privacy />
    <Languages />
    <Contact />
    <Footer />
  </>
);
