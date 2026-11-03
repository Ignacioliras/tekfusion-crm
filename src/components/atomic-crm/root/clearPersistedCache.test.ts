import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it } from "vitest";

import { authProvider } from "../providers/fakerest/authProvider";
import {
  PERSISTED_CACHE_KEY,
  clearPersistedCache,
  setPersistedQueryClient,
} from "./clearPersistedCache";

const seedCache = () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(["deals", "getList"], [{ id: 1, name: "Lead X" }]);
  localStorage.setItem(PERSISTED_CACHE_KEY, '{"clientState":{"queries":[]}}');
  return queryClient;
};

describe("clearPersistedCache", () => {
  afterEach(() => localStorage.removeItem(PERSISTED_CACHE_KEY));

  it("removes the persisted cache and the in-memory queries", () => {
    const queryClient = seedCache();

    clearPersistedCache(queryClient);

    expect(localStorage.getItem(PERSISTED_CACHE_KEY)).toBeNull();
    expect(queryClient.getQueryData(["deals", "getList"])).toBeUndefined();
  });

  it("clears the registered query client on logout", async () => {
    const queryClient = seedCache();
    setPersistedQueryClient(queryClient);

    await authProvider.logout({});

    expect(localStorage.getItem(PERSISTED_CACHE_KEY)).toBeNull();
    expect(queryClient.getQueryData(["deals", "getList"])).toBeUndefined();
  });
});
