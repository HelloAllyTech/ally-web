import { FC } from "react";

import { BlogFooter } from "./BlogFooter";
import { BlogHeader } from "./BlogHeader";
import { CHANGELOG_DESCRIPTION, CHANGELOG_TITLE } from "./blogMeta";
import { CodeActivityHeatmap } from "./CodeActivityHeatmap";
import { ProductUpdatesFeed } from "./ProductUpdatesFeed";
import { usePageMeta } from "./usePageMeta";

/**
 * The public changelog: how much was built (the code-activity heatmap), then
 * what changed for the people who use Ally (feature-level product updates,
 * each already live in production). It used to list one line per merge per
 * repo, read straight from ally-changelog's journal; the journal is now the
 * input product updates are built from, not something this page shows.
 */
export const Changelog: FC = () => {
  usePageMeta({
    title: CHANGELOG_TITLE,
    description: CHANGELOG_DESCRIPTION,
    url: "/blog/changelog",
  });

  return (
    <div className="blog-serif flex min-h-dvh flex-col bg-[#FAF9F5] text-[#29261f]">
      <BlogHeader />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-3xl">Changelog</h1>

        <CodeActivityHeatmap />

        <ProductUpdatesFeed />
      </div>
      <BlogFooter />
    </div>
  );
};
