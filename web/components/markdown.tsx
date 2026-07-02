"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

// GitHub-flavoured sanitize schema: keep the defaults (which mirror GitHub's
// own allowlist) but let images keep their sizing/alignment attributes that
// project READMEs rely on.
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    img: [...(defaultSchema.attributes?.img ?? []), "width", "height", "align"],
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "align"],
  },
};

export interface MarkdownRepo {
  owner: string;
  name: string;
}

// READMEs reference images/links relative to the repo root. Rendered on our
// origin those 404, so resolve them against GitHub: images go to
// raw.githubusercontent.com (blob pages return HTML, not image bytes),
// links go to the repo's blob view.
function resolveUrl(url: string | undefined, repo: MarkdownRepo | undefined, kind: "img" | "link"): string | undefined {
  if (!url || url.startsWith("#") || url.startsWith("data:") || url.startsWith("mailto:")) return url;
  if (/^(https?:)?\/\//i.test(url)) {
    if (kind === "img") {
      // github.com/o/r/blob/ref/path serves an HTML page — swap to raw bytes.
      const m = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/i);
      if (m) return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}`;
    }
    return url;
  }
  if (!repo) return url;
  const path = url.replace(/^\.\//, "").replace(/^\//, "");
  return kind === "img"
    ? `https://raw.githubusercontent.com/${repo.owner}/${repo.name}/HEAD/${path}`
    : `https://github.com/${repo.owner}/${repo.name}/blob/HEAD/${path}`;
}

/**
 * Shared markdown renderer with project styling. Used for the README tab
 * and the Notes preview mode. Pass `repo` when rendering a repo README so
 * relative image/link paths resolve against that repository.
 */
export function Markdown({ source, repo }: { source: string; repo?: MarkdownRepo }) {
  return (
    <div className="sb-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
        components={{
          img: ({ node, src, ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img {...props} src={resolveUrl(src, repo, "img")} loading="lazy" />
          ),
          a: ({ node, href, ...props }) => {
            const resolved = resolveUrl(href, repo, "link");
            const external = !!resolved && !resolved.startsWith("#");
            return (
              <a
                {...props}
                href={resolved}
                {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
              />
            );
          },
        }}
      >{source}</ReactMarkdown>
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
          height: auto;
          border-radius: 6px;
        }
        .sb-md :global([align="center"]) {
          text-align: center;
        }
        .sb-md :global(summary) {
          cursor: pointer;
          font-size: 13px;
          color: var(--ink-1);
          margin-bottom: 8px;
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
