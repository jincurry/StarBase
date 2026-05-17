"use client";

import { useEffect, useState } from "react";
import { GithubMark, Icon } from "@/components/icons";
import { LangDot, StatusPill } from "@/components/primitives";
import { Markdown } from "@/components/markdown";
import { fmtNumber, fmtRelative } from "@/lib/mock-data";

interface PublicStar {
  owner: string;
  name: string;
  description: string;
  note: string;
  status: "inbox" | "reviewing" | "kept" | "dropped" | "archived";
  language: string | null;
  stars: number;
  topics: string[];
  starred_at: string;
}

export default function SharePage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<PublicStar | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/share/${params.token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then(setData)
      .catch((e) => setError(e.message || "Not found"));
  }, [params.token]);

  if (error) {
    return (
      <main style={{ padding: 64, textAlign: "center", color: "var(--ink-2)" }}>
        <div style={{ fontSize: 18, marginBottom: 6 }}>Share link not found</div>
        <div style={{ fontSize: 13, color: "var(--ink-3)" }}>It may have been revoked.</div>
      </main>
    );
  }
  if (!data) {
    return <main style={{ padding: 64, color: "var(--ink-3)", textAlign: "center" }}>Loading…</main>;
  }

  const githubUrl = `https://github.com/${data.owner}/${data.name}`;
  return (
    <main style={{
      maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px",
    }}>
      <a href="/" style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        textDecoration: "none", color: "var(--ink-2)", fontSize: 13, marginBottom: 32,
      }}>
        <span style={{
          width: 22, height: 22, borderRadius: 6,
          background: "linear-gradient(135deg, oklch(50% 0.18 275), oklch(60% 0.15 295))",
          color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700,
        }}>★</span>
        shared via <b style={{ color: "var(--ink-0)" }}>StarBase</b>
      </a>

      <StatusPill status={data.status} />
      <div style={{ marginTop: 12 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "var(--ink-3)" }}>{data.owner} /</div>
        <h1 style={{
          margin: "2px 0 0", fontFamily: "'JetBrains Mono', monospace",
          fontSize: 28, fontWeight: 600, letterSpacing: "-0.015em",
        }}>{data.name}</h1>
      </div>

      <p style={{ fontSize: 15, color: "var(--ink-1)", lineHeight: 1.6, margin: "16px 0 18px" }}>
        {data.description}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12.5, color: "var(--ink-2)", marginBottom: 28 }}>
        <LangDot language={data.language} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Icon name="star" size={11} /> {fmtNumber(data.stars)}
        </span>
        <span>starred {fmtRelative(data.starred_at)}</span>
      </div>

      <a href={githubUrl} target="_blank" rel="noreferrer" style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "8px 14px", borderRadius: 6, textDecoration: "none",
        background: "oklch(20% 0.01 270)", color: "white", fontSize: 13, fontWeight: 500,
      }}>
        <GithubMark size={14} />
        Open on GitHub
        <Icon name="extLink" size={11} />
      </a>

      {data.topics?.length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 22 }}>
          {data.topics.map((t) => (
            <span key={t} style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 999,
              background: "var(--surface-2)", color: "var(--ink-2)",
              fontFamily: "'JetBrains Mono', monospace",
            }}>{t}</span>
          ))}
        </div>
      )}

      {data.note && (
        <section style={{ marginTop: 36 }}>
          <h2 style={{
            fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
            color: "var(--ink-3)", margin: "0 0 12px",
          }}>The note</h2>
          <div style={{
            padding: "20px 22px", borderRadius: 10,
            background: "oklch(98% 0.025 75)",
            border: "1px solid color-mix(in oklch, oklch(70% 0.14 75) 24%, transparent)",
          }}>
            <Markdown source={data.note} />
          </div>
        </section>
      )}
    </main>
  );
}
