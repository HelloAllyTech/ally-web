import { Components } from "react-markdown";

/**
 * Compact markdown renderers shared by the copilot chat + rehearsal report.
 * Kept local to roleplay-studio (report-content keeps its own map) with
 * tighter spacing suited to chat bubbles and side panels.
 */
export const roleplayMarkdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-lg font-semibold text-typography-900 mt-4 mb-2">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold text-typography-900 mt-4 mb-2">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-typography-900 mt-3 mb-1">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-sm text-typography-900 leading-relaxed mb-2 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 pl-2">{children}</ul>,
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1 mb-2 pl-2">{children}</ol>
  ),
  li: ({ children }) => <li className="text-sm text-typography-900 leading-relaxed">{children}</li>,
  hr: () => <hr className="border-border-light my-3" />,
  strong: ({ children }) => (
    <strong className="font-semibold text-typography-900">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-primary-500 underline">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="bg-neutral-100 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="bg-neutral-100 rounded p-3 text-xs font-mono overflow-x-auto mb-2">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-2">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border-light px-2 py-1 text-left font-semibold text-typography-900">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border-light px-2 py-1 text-typography-900">{children}</td>
  ),
};
