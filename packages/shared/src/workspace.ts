import { z } from "zod";

/**
 * The Workspace API contract — the single source of truth shared by `api` and `web`.
 * Per ADR-0002, hand-written Zod schemas ARE the API contract; Prisma's generated types
 * (in @tracer/db) are the storage shape and are allowed to diverge from this.
 */
export const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "slug must be kebab-case"),
  createdAt: z.string().datetime(),
});

export type Workspace = z.infer<typeof WorkspaceSchema>;

export const WorkspaceListSchema = z.array(WorkspaceSchema);

/** The echo message exchanged over /ws in the walking skeleton (Sprint 01). */
export const EchoMessageSchema = z.object({
  type: z.literal("echo"),
  payload: z.string(),
  ts: z.number(),
});

export type EchoMessage = z.infer<typeof EchoMessageSchema>;
