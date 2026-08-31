import { FC } from "react";

import { Link } from "react-router-dom";

import { ALLY_PRIVACY_POLICY_URL, ALLY_TERMS_URL, ALLY_URL, ROUTES } from "@constants";

/**
 * Shared footer for the public /blog pages. Holds the secondary navigation the
 * header used to carry (the changelog link in particular), so the header stays
 * a title and nothing else.
 */
export const BlogFooter: FC<{ containerClassName?: string; className?: string }> = ({
  // Matches the width of the page's own content column so the footer lines up
  // with it — the post page is narrower than the index and changelog.
  containerClassName = "max-w-6xl",
  className = "",
}) => (
  <footer className={`blog-serif mt-16 border-t border-[#141413]/10 bg-[#FAF9F5] ${className}`}>
    <div
      className={`mx-auto flex ${containerClassName} flex-col gap-4 px-6 py-8 text-sm text-[#87867F] sm:flex-row sm:items-center sm:justify-between`}
    >
      <p>© {new Date().getFullYear()} Ally</p>
      <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link to={ROUTES.BLOG} className="transition-colors hover:text-[#141413]">
          Blog
        </Link>
        <Link to={ROUTES.CHANGELOG} className="transition-colors hover:text-[#141413]">
          Changelog
        </Link>
        <a
          href={ALLY_PRIVACY_POLICY_URL}
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-[#141413]"
        >
          Privacy
        </a>
        <a
          href={ALLY_TERMS_URL}
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-[#141413]"
        >
          Terms
        </a>
        <a
          href={ALLY_URL}
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-[#141413]"
        >
          helloally.ai
        </a>
      </nav>
    </div>
  </footer>
);
