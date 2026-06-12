import type { Metadata } from "next";
import ShareView from "./share-view";

// Server wrapper: provides per-share metadata (dynamic title, Open
// Graph card, robots noindex — shared notes are link-access only, we
// don't want them crawled into search engines).
export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  const base = process.env.API_BASE_INTERNAL || "http://localhost:8080";
  try {
    const res = await fetch(`${base}/api/share/${params.token}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const d = await res.json();
      const title = `${d.owner}/${d.name} · StarBase`;
      return {
        title,
        description: d.description || undefined,
        robots: { index: false, follow: false },
        openGraph: {
          title: `${d.owner}/${d.name}`,
          description: d.description || "",
          type: "article",
          siteName: "StarBase",
        },
        twitter: {
          card: "summary",
          title: `${d.owner}/${d.name}`,
          description: d.description || "",
        },
      };
    }
  } catch {
    // API unreachable during build/SSR — fall through to the generic shell.
  }
  return {
    title: "Shared star · StarBase",
    robots: { index: false, follow: false },
  };
}

export default function SharePage({ params }: { params: { token: string } }) {
  return <ShareView token={params.token} />;
}
