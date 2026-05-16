"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WelcomeScreen } from "@/components/screens/welcome-screen";
import { api, HttpError } from "@/lib/api";
import { useMe, useSyncStatus } from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";

export default function WelcomePage() {
  const router = useRouter();
  const me = useMe();
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const sync = useSyncStatus(syncing);

  useEffect(() => {
    if (me.error instanceof HttpError && me.error.status === 401) {
      router.replace("/");
    }
  }, [me.error, router]);

  // If user already completed initial sync, skip Welcome.
  useEffect(() => {
    if (me.data?.sync?.initial_sync_completed) {
      router.replace("/inbox");
    }
  }, [me.data, router]);

  // Watch for job done.
  useEffect(() => {
    const job = sync.data?.job;
    if (!syncing) return;
    if (job && job.status === "done") {
      setSyncing(false);
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["stars", "all"] });
      // small delay so the user sees 100% before bouncing
      setTimeout(() => router.replace("/inbox"), 600);
    }
    if (job && job.status === "failed") {
      setSyncing(false);
    }
  }, [sync.data, syncing, qc, router]);

  const job = sync.data?.job;
  const progress =
    job && job.progress_total > 0
      ? Math.min(100, Math.round((job.progress_done / job.progress_total) * 100))
      : job && job.progress_done > 0
      ? Math.min(95, job.progress_done % 100) // fake progress before total is known
      : 0;

  return (
    <WelcomeScreen
      onContinue={() => router.push("/inbox")}
      onStartSync={async (n) => {
        setSyncing(true);
        try {
          await api.initialSync(n);
          qc.invalidateQueries({ queryKey: ["sync-status"] });
        } catch (err) {
          setSyncing(false);
          throw err;
        }
      }}
      liveProgress={syncing ? progress : undefined}
      liveStage={
        job?.status === "running" ? "Syncing your stars…" :
        job?.status === "pending" ? "Queued — waiting for a worker…" :
        job?.status === "failed" ? `Failed: ${job.error_message || "unknown error"}` :
        undefined
      }
      liveDone={job?.status === "done"}
    />
  );
}
