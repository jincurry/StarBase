"use client";

import { useEffect, useState } from "react";
import { Icon } from "../icons";
import { primaryBtn } from "../primitives";
import { useT } from "@/lib/i18n/context";
import type { TKey } from "@/lib/i18n/dict";

interface Props {
  onContinue: () => void;
  onStartSync?: (inboxCount: number) => Promise<void> | void;
  /** When provided, the screen renders this progress instead of running its own fake timer. */
  liveProgress?: number;
  liveStage?: string;
  liveDone?: boolean;
}

export function WelcomeScreen({ onContinue, onStartSync, liveProgress, liveStage, liveDone }: Props) {
  const t = useT();
  const [step, setStep] = useState(0); // 0 choose · 2 syncing · 3 done
  const [choice, setChoice] = useState(30);
  const [fakeProgress, setFakeProgress] = useState(0);
  const [fakeStage, setFakeStage] = useState("");
  const FAKE_STAGES = [
    t("welcome.syncing.running"),
    t("welcome.syncing.running"),
    t("welcome.syncing.running"),
    t("welcome.syncing.running"),
  ];

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

  const choices: { v: number; tk: TKey; hk: TKey; rec: boolean }[] = [
    { v: 10, tk: "welcome.choice.10", hk: "welcome.choice.10.hint", rec: false },
    { v: 30, tk: "welcome.choice.30", hk: "welcome.choice.30.hint", rec: true },
    { v: 100, tk: "welcome.choice.100", hk: "welcome.choice.100.hint", rec: false },
    { v: -1, tk: "welcome.choice.all", hk: "welcome.choice.all.hint", rec: false },
  ];

  return (
    <div style={{
      height: "100%", overflow: "auto",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "60px 24px",
      background: "radial-gradient(ellipse 600px 400px at 50% 0%, oklch(97% 0.012 260), transparent), var(--surface-1)",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: "linear-gradient(135deg, oklch(28% 0 0), oklch(40% 0.04 260))",
        color: "white", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 26, fontWeight: 700, marginBottom: 22,
        boxShadow: "0 8px 28px color-mix(in oklch, oklch(20% 0 0) 28%, transparent)",
      }}>★</div>

      {step < 2 && (
        <>
          <h1 style={{ fontSize: 26, margin: "0 0 8px", fontWeight: 600, letterSpacing: "-0.02em" }}>
            {t("welcome.title")}
          </h1>
          <p style={{ fontSize: 14, color: "var(--ink-2)", margin: "0 0 32px", textAlign: "center", maxWidth: 480, lineHeight: 1.55 }}>
            {t("welcome.body")}
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
                    {t(c.tk)}
                    {c.rec && (
                      <span style={{
                        marginLeft: 8, fontSize: 10, padding: "1px 6px", borderRadius: 4,
                        background: "var(--accent)", color: "white", fontWeight: 500,
                      }}>{t("welcome.recommended")}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 2 }}>{t(c.hk)}</div>
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "'JetBrains Mono', monospace" }}>
                  {c.v === -1 ? "all" : c.v} {t("welcome.choice.inbox_suffix")}
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
            {t("welcome.start")} <Icon name="arrowR" size={13} />
          </button>
        </>
      )}

      {step === 2 && (
        <div style={{ width: 460, maxWidth: "100%", textAlign: "center" }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 8px" }}>{t("welcome.syncing.title")}</h2>
          <p style={{ fontSize: 13, color: "var(--ink-2)", margin: "0 0 24px" }}>{stage}</p>
          <div style={{
            height: 8, borderRadius: 999, background: "var(--surface-2)",
            overflow: "hidden", border: "1px solid var(--border-soft)",
          }}>
            <div style={{
              height: "100%", width: progress + "%",
              background: "linear-gradient(90deg, var(--accent), oklch(55% 0.06 260))",
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
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 8px" }}>{t("welcome.done.title")}</h2>
          <p style={{ fontSize: 13, color: "var(--ink-2)", margin: "0 0 24px" }}>
            {choice === -1 ? "All your" : choice} {t("welcome.choice.inbox_suffix")}
          </p>
          <button onClick={onContinue} style={{ ...primaryBtn, padding: "10px 22px", fontSize: 13 }}>
            {t("welcome.done.cta")}
          </button>
        </div>
      )}
    </div>
  );
}
