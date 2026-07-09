import { z } from "zod";

/**
 * The sync wire protocol (S06). A mutation is a sequenced fact about one entity. Clients bootstrap
 * by asking for everything since their `lastSeq`, then receive new deltas live.
 */
export const MutationDeltaSchema = z.object({
  seq: z.number(),
  entity: z.string(), // "issue"
  entityId: z.string(),
  op: z.enum(["create", "update", "delete"]),
  teamId: z.string().nullable(),
  // The originating client mutationId — lets a client ack (drop) its own optimistic mutation.
  mutationId: z.string().nullable(),
  data: z.unknown(), // serialized entity for create/update; null for delete
});
export type MutationDelta = z.infer<typeof MutationDeltaSchema>;

// Client -> server
export const SubscribeSchema = z.object({
  type: z.literal("subscribe"),
  workspaceId: z.string(),
  lastSeq: z.number().default(0),
});
export type Subscribe = z.infer<typeof SubscribeSchema>;

// Presence is EPHEMERAL — it never touches the mutation log (durable vs ephemeral state, ADR-0008).
export const PresenceSchema = z.object({
  type: z.literal("presence"),
  teamId: z.string(),
});
export type Presence = z.infer<typeof PresenceSchema>;

export const ClientMessageSchema = z.discriminatedUnion("type", [SubscribeSchema, PresenceSchema]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

// Server -> client
export const ServerMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("delta"), delta: MutationDeltaSchema }),
  z.object({ type: z.literal("bootstrap-complete"), lastSeq: z.number() }),
  z.object({
    type: z.literal("presence"),
    userId: z.string(),
    name: z.string().nullable(),
    teamId: z.string(),
  }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
