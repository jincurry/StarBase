"use client";

import { useEffect, useState } from "react";
import { Icon } from "../icons";
import { primaryBtn } from "../primitives";

interface Props {
  onContinue: () => void;
  onStartSync?: (inboxCount: number) => Promise<void> | void;
  /** When provided, the screen renders this progress instead of running its own fake timer. */
  liveProgress?: number;
  liveStage?: string;
  liveDone?: boolean;
}

const FAKE_STAGES = [
  "Fetching starred repos…",
  "Hydrating metadata…",
  "Building search index…",
  "Almost done…",
];

export function WelcomeScreen({ onContinue, onStartSync, liveProgress, liveStage, liveDone }: Props) {
  const [step, setStep] = useState(0); // 0 choose · 2 syncing · 3 done
  const [choice, setChoice] = useState(30);
  const [fakeProgress, setFakeProgress] = useState(0);
  const [fakeStage, setFakeStage] = useState("");

  // If no liveProgress is supplied, fall back to the prototype's fake timer.
  useEffect(() => {
    if (step !== 2 || liveProgress != null) return;
    let p = 0;
    const t = setInterval(() => {
      p += Math.random() * 7 + 3;
      setFakeProgress(Math.min(p, 100));
      setFakeStage(FAKE_STAGES[Math.min(Math.floor(p / 25), 3)]);
      if (p >= 100) {
        clearInterval(t);
        setTimeout(() => setStep(3), 400);
      }
    }, 110);
    return () => clearInterval(t);
  }, [step, liveProgress]);

  // When live progress completes, advance to step 3.
  useEffect(() => {
    if (step === 2 && liveDone) setStep(3);
  }, [step, liveDone]);

  const progress = liveProgress ?? fakeProgress;
  const stage = liveStage ?? fakeStage;

  const choices = [
    { v: 10, t: "Just the latest 10", h: "Stay light. Process what's fresh.", rec: false },
    { v: 30, t: "Latest 30", h: "Recommended. A useful starting batch.", rec: true },
    { v: 100, t: "Latest 100", h: "Power user. You'll have work to do.", rec: false },
    { v: -1, t: "Everything", h: "Triage your entire history.", rec: false },
  ];

  return (
    <div style={{
      height: "100%", overflow: "auto",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "60px 24px",
      background: "radial-gradient(ellipse 600px 400px at 50% 0%, oklch(98% 0.04 275), transparent), var(--surface-1)",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: "linear-gradient(135deg, oklch(50% 0.18 275), oklch(60% 0.15 295))",
        color: "white", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 26, fontWeight: 700, marginBottom: 22,
        boxShadow: "0 8px 28px color-mix(in oklch, oklch(50% 0.18 275) 35%, transparent)",
      }}>★</div>

      {step < 2 && (
        <>
          <h1 style={{ fontSize: 26, margin: "0 0 8px", fontWeight: 600, letterSpacing: "-0.02em" }}>
            Welcome to StarBase
          </h1>
          <p style={{ fontSize: 14, color: "var(--ink-2)", margin: "0 0 32px", textAlign: "center", maxWidth: 480, lineHeight: 1.55 }}>
            We'll pull your GitHub stars and put the latest ones into your inbox for triage. Everything else gets quietly archived — searchable, but not in your way.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 460, maxWidth: "100%" }}>
            {choices.map((c) => (
              <button key={c.v} onClick={() => setChoice(c.v)} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 18px", borderRadius: 10,
                border: `1.5px solid ${choice === c.v ? "var(--accent)" : "var(--border)"}`,
                background: choice === c.v ? "var(--accent-soft)" : "var(--surface-0)",
                textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.15s",
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  border: `1.5px solid ${choice === c.v ? "var(--accent)" : "var(--border-strong)"}`,
                  background: choice === c.v ? "var(--accent)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "white",
                }}>{choice === c.v && <Icon name="check" size={10} stroke={3} />}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-0)" }}>
                    {c.t}
                    {c.rec && (
                      <span style={{
                        marginLeft: 8, fontSize: 10, padding: "1px 6px", borderRadius: 4,
                        background: "var(--accent)", color: "white", fontWeight: 500,
                      }}>recommended</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 2 }}>{c.h}</div>
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "'JetBrains Mono', monospace" }}>
                  {c.v === -1 ? "all" : c.v} → inbox
                </div>
              </button>
            ))}
          </div>

          <button onClick={async () => {
            setStep(2);
            try { await onStartSync?.(choice); } catch {}
          }} style={{
            ...primaryBtn, marginTop: 28, padding: "10px 22px", fontSize: 13, fontWeight: 600,
            display: "inline-flex", alignItems: "center", gap: 7,
          }}>
            Start syncing <Icon name="arrowR" size={13} />
          </button>
        </>
      )}

      {step === 2 && (
        <div style={{ width: 460, maxWidth: "100%", textAlign: "center" }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 8px" }}>Syncing your stars…</h2>
          <p style={{ fontSize: 13, color: "var(--ink-2)", margin: "0 0 24px" }}>{stage}</p>
          <div style={{
            height: 8, borderRadius: 999, background: "var(--surface-2)",
            overflow: "hidden", border: "1px solid var(--border-soft)",
          }}>
            <div style={{
              height: "100%", width: progress + "%",
              background: "linear-gradient(90deg, oklch(55% 0.18 275), oklch(65% 0.16 295))",
              transition: "width 0.2s ease-out",
            }} />
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>
            {Math.floor(progress)}%
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ width: 460, maxWidth: "100%", textAlign: "center" }}>
          <div style={{
            width: 48, height: 48, margin: "0 auto 16px", borderRadius: "50%",
            background: "oklch(95% 0.06 145)", color: "oklch(45% 0.13 145)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}><Icon name="check" size={22} stroke={3} /></div>
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 8px" }}>You're all set</h2>
          <p style={{ fontSize: 13, color: "var(--ink-2)", margin: "0 0 24px" }}>
            {choice === -1 ? "All your" : choice} repos are ready in your inbox. The rest are archived but searchable.
          </p>
          <button onClick={onContinue} style={{ ...primaryBtn, padding: "10px 22px", fontSize: 13 }}>
            Open my Inbox
          </button>
        </div>
      )}
    </div>
  );
}
