"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createTRPCClient,
  httpBatchLink,
  httpLink,
  isNonJsonSerializable,
  splitLink,
} from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import SuperJSON from "superjson";

import type { AppRouter } from "../server/api/root";
import { env } from "~/env";

export const queryClient = new QueryClient();

const options = {
  url: `${env.NEXT_PUBLIC_WEB_URL}/api/trpc`,
} as const;

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    splitLink({
      condition: (op) => isNonJsonSerializable(op.input),
      true: httpLink({
        ...options,
        transformer: {
          serialize: (data) => data,
          deserialize: SuperJSON.deserialize,
        },
      }),
      false: httpBatchLink({
        ...options,
        transformer: SuperJSON,
      }),
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});

export const TRPCProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
