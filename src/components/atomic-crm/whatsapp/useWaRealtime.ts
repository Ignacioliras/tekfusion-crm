import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  REALTIME_SUBSCRIBE_STATES,
  type SupabaseClient,
} from "@supabase/supabase-js";
import type { Identifier } from "ra-core";

import { getSupabaseClient } from "../providers/supabase/supabase";

// Live inbox (docs/07, Bandeja): postgres_changes on the two published tables
// (14_tekfusion_whatsapp.sql). Realtime only delivers the rows the user's RLS
// lets them read, and the event is used as a signal alone: its payload is
// dropped and the lists are read again through the API (docs/10).
// ponytail: every change refetches the lists whole (no debounce, no patching
// the cache from the payload); debounce if one corporate number ever gets busy.

type WaTable = "wa_conversations" | "wa_messages";

// FakeRest (demo build, component tests) has no Supabase project behind it:
// no client, no channel.
const getRealtimeClient = (): SupabaseClient | null =>
  import.meta.env.VITE_IS_DEMO === "true" || !import.meta.env.VITE_SUPABASE_URL
    ? null
    : getSupabaseClient();

// A topic is never reused: the client hands back the channel of a topic that
// is still leaving (StrictMode remount, quick chat switch), already subscribed.
let channelCount = 0;

// Calls onChange on every change of the table and each time the channel joins
// (first join and rejoins after a dropped socket: what happened meanwhile was
// not delivered). Returns the unsubscribe.
const listen = (
  client: SupabaseClient,
  table: WaTable,
  filter: string | undefined,
  onChange: () => void,
): (() => void) => {
  const channel = client
    .channel(`${table}-${++channelCount}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table, filter },
      onChange,
    )
    .subscribe((status) => {
      if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) onChange();
    });
  return () => {
    void client.removeChannel(channel);
  };
};

interface WaRealtimeOptions {
  /** False while the user's access is unknown or denied: nothing is opened. */
  enabled: boolean;
  /** The open conversation, if any: its messages are followed too. */
  conversationId?: Identifier;
}

export const useWaRealtime = ({
  enabled,
  conversationId,
}: WaRealtimeOptions): void => {
  const queryClient = useQueryClient();

  // The inbox: a conversation row moves with every new message (last message,
  // unread count), when it is taken, read or archived. The excerpts of the list
  // are wa_messages queries, so both resources are read again.
  useEffect(() => {
    const client = enabled ? getRealtimeClient() : null;
    if (!client) return;
    return listen(client, "wa_conversations", undefined, () => {
      void queryClient.invalidateQueries({ queryKey: ["wa_conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["wa_messages"] });
    });
  }, [enabled, queryClient]);

  // The open conversation: new messages and their delivery marks (a status
  // change touches wa_messages only).
  useEffect(() => {
    const client = enabled ? getRealtimeClient() : null;
    if (!client || conversationId == null) return;
    return listen(
      client,
      "wa_messages",
      `conversation_id=eq.${conversationId}`,
      () => {
        void queryClient.invalidateQueries({ queryKey: ["wa_messages"] });
      },
    );
  }, [enabled, conversationId, queryClient]);
};
