import { FC } from "react";

import { Ally } from "@assets";
import { sanitizeHtml } from "@utils";

type LegalPageProps = {
  title: string;
  html?: string;
  isLoading?: boolean;
};

/**
 * Public, unauthenticated legal page: Logo + Heading + sanitized HTML body.
 * Content is authored by a super admin in the admin dashboard Settings tab.
 */
export const LegalPage: FC<LegalPageProps> = ({ title, html, isLoading }) => {
  const sanitized = sanitizeHtml(html ?? "");

  return (
    <div className="min-h-dvh bg-white font-primary">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center mb-8">
          <Ally />
        </div>
        <h1 className="text-3xl font-secondary text-typography-900 mb-6">{title}</h1>
        {isLoading ? (
          <p className="text-typography-700">Loading…</p>
        ) : sanitized ? (
          <div
            className="max-w-none text-typography-800 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:my-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:my-1.5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:my-1 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 [&_li]:my-0.5 [&_blockquote]:border-l-4 [&_blockquote]:border-primary-300 [&_blockquote]:pl-4 [&_blockquote]:my-2 [&_blockquote]:italic"
            dangerouslySetInnerHTML={{ __html: sanitized }}
          />
        ) : (
          <p className="text-typography-700">This content has not been published yet.</p>
        )}
      </div>
    </div>
  );
};
