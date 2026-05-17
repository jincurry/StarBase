"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Shared markdown renderer with project styling. Used for the README tab
 * and the Notes preview mode.
 */
export function Markdown({ source }: { source: string }) {
  return (
    <div className="sb-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
      <style jsx>{`
        .sb-md :global(h1) {
          font-size: 22px;
          font-weight: 600;
          margin: 8px 0 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border);
          letter-spacing: -0.01em;
        }
        .sb-md :global(h2) {
          font-size: 16px;
          font-weight: 600;
          margin: 22px 0 10px;
          padding-bottom: 5px;
          border-bottom: 1px solid var(--border-soft);
        }
        .sb-md :global(h3) {
          font-size: 14px;
          font-weight: 600;
          margin: 18px 0 8px;
        }
        .sb-md :global(p) {
          font-size: 13.5px;
          line-height: 1.65;
          color: var(--ink-1);
          margin: 0 0 12px;
        }
        .sb-md :global(ul),
        .sb-md :global(ol) {
          margin: 0 0 14px;
          padding-left: 22px;
          font-size: 13.5px;
          color: var(--ink-1);
          line-height: 1.7;
        }
        .sb-md :global(li > p) {
          margin: 0;
        }
        .sb-md :global(pre) {
          background: oklch(20% 0.01 270);
          color: oklch(92% 0.01 270);
          padding: 12px 14px;
          border-radius: 8px;
          font-size: 12px;
          line-height: 1.65;
          overflow: auto;
          margin: 0 0 14px;
          font-family: "JetBrains Mono", monospace;
        }
        .sb-md :global(code) {
          font-family: "JetBrains Mono", monospace;
          font-size: 0.92em;
        }
        .sb-md :global(p code),
        .sb-md :global(li code) {
          padding: 1px 5px;
          background: var(--surface-2);
          color: var(--ink-0);
          border-radius: 4px;
        }
        .sb-md :global(a) {
          color: var(--accent);
          text-decoration: none;
        }
        .sb-md :global(a:hover) {
          text-decoration: underline;
        }
        .sb-md :global(blockquote) {
          margin: 0 0 14px;
          padding: 4px 12px;
          border-left: 3px solid var(--border-strong);
          color: var(--ink-2);
          font-size: 13px;
        }
        .sb-md :global(table) {
          border-collapse: collapse;
          font-size: 12.5px;
          margin: 0 0 14px;
          width: 100%;
        }
        .sb-md :global(th),
        .sb-md :global(td) {
          padding: 6px 10px;
          border: 1px solid var(--border);
          text-align: left;
        }
        .sb-md :global(th) {
          background: var(--surface-1);
          font-weight: 600;
        }
        .sb-md :global(img) {
          max-width: 100%;
          border-radius: 6px;
        }
        .sb-md :global(hr) {
          border: none;
          border-top: 1px solid var(--border);
          margin: 18px 0;
        }
      `}</style>
    </div>
  );
}
