import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "@/contracts/appRouter";
import { apiConfig } from "@/lib/api";
import { clearSessionToken, getSessionToken, persistSessionFromResponse } from "@/lib/auth-session";
import type { ReactNode } from "react";

export const trpc = createTRPCReact<AppRouter>();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: apiConfig.trpcUrl,
      transformer: superjson,
      async fetch(input, init) {
        const headers = new Headers(init?.headers);
        const token = await getSessionToken();

        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }

        const response = await globalThis.fetch(input, {
          ...(init ?? {}),
          headers,
        });

        const setCookie = response.headers.get("set-cookie");
        if (setCookie?.includes("heypost_session=")) {
          if (/heypost_session=\s*(?:;|$)/.test(setCookie)) {
            await clearSessionToken();
          } else {
            await persistSessionFromResponse(response);
          }
        }

        return response;
      },
    }),
  ],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
