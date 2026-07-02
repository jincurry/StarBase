"use client";

import { Icon } from "./icons";
import { useT } from "@/lib/i18n/context";

/**
 * Red banner that surfaces when GitHub has rejected our stored access
 * token. Surfaces above the main scroll area, can't be dismissed —
 * sync stays broken until the user reconnects.
 */
export function TokenInvalidBanner() {
  const t = useT();
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 18px",
        background: "color-mix(in oklch, oklch(60% 0.18 25) 12%, var(--surface-1))",
        borderBottom: "1px solid color-mix(in oklch, oklch(60% 0.18 25) 28%, transparent)",
        color: "color-mix(in oklch, oklch(60% 0.18 25) 60%, var(--ink-0))",
        fontSize: 12.5,
      }}
    >
      <Icon name="bug" size={14} />
      <span>
        <b>{t("banner.disconnected.title")}</b> {t("banner.disconnected.body")}
      </span>
      <a
        href="/api/auth/github"
        style={{
          marginLeft: "auto",
          padding: "4px 12px",
          borderRadius: 6,
          background: "oklch(50% 0.18 25)",
          color: "white",
          fontSize: 12,
          fontWeight: 600,
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        {t("banner.reconnect")} <Icon name="arrowR" size={11} />
      </a>
    </div>
  );
}
