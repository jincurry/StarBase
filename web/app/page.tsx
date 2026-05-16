"use client";

import { GithubMark, Icon } from "@/components/icons";

export default function Landing() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "80px 24px",
      background:
        "radial-gradient(ellipse 700px 500px at 50% 0%, oklch(96% 0.05 275), transparent), var(--surface-1)",
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 14, marginBottom: 28,
        background: "linear-gradient(135deg, oklch(50% 0.18 275), oklch(60% 0.15 295))",
        color: "white", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 30, fontWeight: 700,
        boxShadow: "0 8px 28px color-mix(in oklch, oklch(50% 0.18 275) 35%, transparent)",
      }}>★</div>

      <h1 style={{
        margin: 0, fontSize: 44, fontWeight: 600, letterSpacing: "-0.025em",
        textAlign: "center", maxWidth: 720, lineHeight: 1.1,
      }}>
        Process your GitHub stars like an inbox.
      </h1>
      <p style={{
        margin: "18px 0 0", fontSize: 16, color: "var(--ink-2)",
        textAlign: "center", maxWidth: 560, lineHeight: 1.55,
      }}>
        Triage, tag, take notes, and rediscover. Turn drive-by stars into a
        searchable knowledge base — instead of a graveyard.
      </p>

      <a href="/api/auth/github" style={{
        marginTop: 32, display: "inline-flex", alignItems: "center", gap: 10,
        padding: "12px 22px", borderRadius: 8, textDecoration: "none",
        background: "oklch(20% 0.01 270)", color: "white",
        fontSize: 14, fontWeight: 600,
        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
      }}>
        <GithubMark size={16} />
        Continue with GitHub
        <Icon name="arrowR" size={14} />
      </a>

      <div style={{ marginTop: 12, fontSize: 12, color: "var(--ink-3)" }}>
        Read-only access to your stars. Notes & tags stay private.
      </div>

      <div style={{
        marginTop: 64,
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16, maxWidth: 880, width: "100%",
      }}>
        <Feature
          icon="inbox"
          title="Inbox-first"
          text="New stars land in an inbox. You triage, then they leave. The list goes to zero."
        />
        <Feature
          icon="note"
          title="Notes & tags"
          text="Capture why you cared. Searchable, exportable to Markdown, Obsidian, or JSON."
        />
        <Feature
          icon="review"
          title="Rediscover"
          text="Weekly Review surfaces what you forgot — and what's worth a second look."
        />
      </div>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <div style={{
      padding: "20px 18px", borderRadius: 10,
      background: "var(--surface-0)", border: "1px solid var(--border)",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: "var(--accent-soft)", color: "var(--accent)",
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10,
      }}>
        <Icon name={icon} size={16} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55 }}>{text}</div>
    </div>
  );
}
