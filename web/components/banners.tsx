"use client";

import { Icon } from "./icons";

/**
 * Red banner that surfaces when GitHub has rejected our stored access
 * token. Surfaces above the main scroll area, can't be dismissed —
 * sync stays broken until the user reconnects.
 */
export function TokenInvalidBanner() {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 18px",
        background: "oklch(96% 0.05 25)",
        borderBottom: "1px solid color-mix(in oklch, oklch(60% 0.18 25) 28%, transparent)",
        color: "oklch(38% 0.16 25)",
        fontSize: 12.5,
      }}
    >
      <Icon name="bug" size={14} />
      <span>
        <b>GitHub disconnected.</b> Your token was rejected — syncing is paused
        until you reconnect.
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
        Reconnect GitHub <Icon name="arrowR" size={11} />
      </a>
    </div>
  );
}
