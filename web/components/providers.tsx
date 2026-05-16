"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Tag } from "@/lib/types";
import { TAGS as MOCK_TAGS } from "@/lib/mock-data";
import { useTags } from "@/lib/queries";
import { Toasts } from "./toasts";

// Single global query client per browser tab.
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;
function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => getQueryClient());
  return (
    <QueryClientProvider client={client}>
      <TagsProvider>
        {children}
        <Toasts />
      </TagsProvider>
    </QueryClientProvider>
  );
}

// ----- Tags context ---------------------------------------------------------

interface TagsState {
  tags: Tag[];
  tagById: (id: number) => Tag | undefined;
}

const TagsContext = createContext<TagsState>({
  tags: MOCK_TAGS,
  tagById: (id) => MOCK_TAGS.find((t) => t.id === id),
});

function TagsProvider({ children }: { children: ReactNode }) {
  const q = useTags();
  const value = useMemo<TagsState>(() => {
    // Prefer live data; fall back to mocks while offline / pre-auth so UI still renders.
    const tags = q.data && q.data.length > 0 ? q.data : MOCK_TAGS;
    const byId = new Map(tags.map((t) => [t.id, t]));
    return {
      tags,
      tagById: (id: number) => byId.get(id),
    };
  }, [q.data]);
  return <TagsContext.Provider value={value}>{children}</TagsContext.Provider>;
}

export function useTagsCtx(): TagsState {
  return useContext(TagsContext);
}
