import type { QueryClient } from "@tanstack/react-query";

// Default key of createAsyncStoragePersister (CRM.tsx does not override it).
export const PERSISTED_CACHE_KEY = "REACT_QUERY_OFFLINE_CACHE";

let registeredQueryClient: QueryClient | undefined;

// CRM.tsx registers the client it persists, so the auth providers can clear it.
export const setPersistedQueryClient = (queryClient: QueryClient): void => {
  registeredQueryClient = queryClient;
};

// On logout: on a shared PC the next user must not see the previous one's data.
export const clearPersistedCache = (
  queryClient: QueryClient | undefined = registeredQueryClient,
): void => {
  queryClient?.clear();
  // After clear(): the persister may write the (now empty) cache back.
  if (typeof window !== "undefined") {
    window.localStorage?.removeItem(PERSISTED_CACHE_KEY);
  }
};
