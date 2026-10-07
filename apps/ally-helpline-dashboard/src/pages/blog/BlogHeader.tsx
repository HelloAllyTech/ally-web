import { FC } from "react";

import { Link } from "react-router-dom";

import { BuildingAlly } from "@assets";
import { ROUTES } from "@constants";

import { BLOG_NAME } from "./blogMeta";

type BlogHeaderProps = {
  /** Width of the page's content column, so the header lines up with it. */
  containerClassName?: string;
  /** Renders the search field when provided — the index page only. */
  search?: { value: string; onChange: (value: string) => void };
};

/**
 * Sticky header for the public /blog pages: the "Building Ally" wordmark, the
 * search field on the index, and the one call to action. Anything below it
 * (the tag filter included) scrolls underneath.
 *
 * "Try Ally" points at the app root rather than a hard-coded host: the blog is
 * served by the app itself, so in production that is app.helloally.ai and
 * locally it stays on the dev server instead of jumping to production.
 */
export const BlogHeader: FC<BlogHeaderProps> = ({ containerClassName = "max-w-6xl", search }) => (
  <header className="sticky top-0 z-20 border-b border-gray-900/10 bg-gray-50/95 backdrop-blur">
    <div
      className={`mx-auto flex w-full ${containerClassName} flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6`}
    >
      <Link to={ROUTES.BLOG} aria-label={BLOG_NAME} className="order-1 shrink-0 text-gray-900">
        <BuildingAlly role="img" aria-hidden="true" className="h-6 w-auto sm:h-7" />
      </Link>

      {search && (
        <div className="relative order-3 basis-full sm:order-2 sm:mx-auto sm:max-w-md sm:flex-1 sm:basis-auto">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            role="img"
            aria-label="Search"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            enterKeyHint="search"
            value={search.value}
            onChange={event => search.onChange(event.target.value)}
            placeholder="Search posts"
            aria-label="Search posts"
            className="w-full rounded-lg border border-gray-900/15 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-500 focus:border-gray-900/40 focus:outline-none"
          />
        </div>
      )}

      <a
        href="/"
        className="order-2 ml-auto shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-gray-50 transition-colors hover:bg-gray-800 sm:order-3"
      >
        Try Ally
      </a>
    </div>
  </header>
);
