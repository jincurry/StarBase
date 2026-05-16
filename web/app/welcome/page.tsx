"use client";

import { useRouter } from "next/navigation";
import { WelcomeScreen } from "@/components/screens/welcome-screen";
import { api } from "@/lib/api";

export default function WelcomePage() {
  const router = useRouter();
  return (
    <WelcomeScreen
      onContinue={() => router.push("/inbox")}
      onStartSync={async (n) => {
        try { await api.initialSync(n); } catch {}
      }}
    />
  );
}
