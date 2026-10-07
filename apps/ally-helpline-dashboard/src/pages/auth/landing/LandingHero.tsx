import { FC, MouseEvent } from "react";

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared/featureFlag";
import { Ally } from "@assets";
import { ROUTES } from "@constants";
import { LANGUAGE_CHANGE_SOURCE } from "@constants/analyticsEvents";

import { ArrowDownIcon } from "./LandingIcons";
import { scrollToSection, SECTION_IDS } from "./links";
import { NightSun } from "./NightScene";
import LanguageSelector from "../../../components/language-selector/LanguageSelector";

const jumpTo = (id: string) => (event: MouseEvent<HTMLAnchorElement>) => {
  event.preventDefault();
  scrollToSection(id);
};

const navLinkClass =
  "inline-flex min-h-[44px] items-center px-3 text-base text-night-mist no-underline hover:text-white";

/** Wordmark, section links and (when the app offers one) the language picker. */
export const LandingNav: FC = () => {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t("landing.nav.label")}
      className="relative z-20 mx-auto flex max-w-[1296px] items-center justify-between gap-4 py-5"
    >
      <a
        href={`#${SECTION_IDS.top}`}
        onClick={jumpTo(SECTION_IDS.top)}
        aria-label={t("landing.nav.home")}
        className="inline-flex min-h-[44px] items-center text-white"
      >
        <Ally className="h-9 w-auto" />
      </a>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-1 md:flex">
          <a
            href={`#${SECTION_IDS.inside}`}
            onClick={jumpTo(SECTION_IDS.inside)}
            className={navLinkClass}
          >
            {t("landing.nav.inside")}
          </a>
          <a
            href={`#${SECTION_IDS.privacy}`}
            onClick={jumpTo(SECTION_IDS.privacy)}
            className={navLinkClass}
          >
            {t("landing.nav.privacy")}
          </a>
          <Link to={ROUTES.BLOG} className={navLinkClass}>
            {t("landing.nav.blog")}
          </Link>
        </div>
        {/* Same gate as the sidebar's selector: one switch decides whether
            the app offers a language choice anywhere. */}
        {FEATURE_FLAGS_MAP.LANGUAGE_SELECTOR_FLAG && (
          <div className="rounded-xl bg-white px-2 py-1 text-typography-900">
            <LanguageSelector source={LANGUAGE_CHANGE_SOURCE.LOGIN} />
          </div>
        )}
      </div>
    </nav>
  );
};

/** The left half of the hero: what Ally is, beside the sign-in card. */
export const LandingHero: FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-7">
      <NightSun className="h-[88px] w-[88px]" />
      <h1 className="m-0 max-w-[600px] font-primary text-[clamp(40px,4.4vw,60px)] font-medium leading-[1.12] tracking-[-0.015em] text-white">
        {t("landing.hero.title")}
      </h1>
      <p className="m-0 max-w-[540px] font-secondary text-[21px] leading-[31px] text-night-mist">
        {t("landing.hero.body")}
      </p>
      <a
        href={`#${SECTION_IDS.inside}`}
        onClick={jumpTo(SECTION_IDS.inside)}
        className="inline-flex min-h-[44px] items-center gap-2 self-start text-[17px] font-medium text-white underline underline-offset-4"
      >
        {t("landing.hero.seeInside")}
        <ArrowDownIcon className="h-[18px] w-[18px]" />
      </a>
    </div>
  );
};
