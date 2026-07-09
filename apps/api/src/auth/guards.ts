import type { FastifyRequest } from "fastify";
import { prisma, type Membership, type User } from "@tracer/db";
import { getSessionUser } from "./session";
import { AppError } from "../errors";

/** Require an authenticated user or 401. */
export async function requireUser(req: FastifyRequest): Promise<User> {
  const user = await getSessionUser(req);
  if (!user) throw new AppError(401, "UNAUTHENTICATED", "Sign in required");
  return user;
}

/**
 * Require the user to belong to the workspace. We return 404 (not 403) so the API never
 * discloses that a workspace the user can't see even exists (existence non-disclosure).
 */
export async function requireMembership(userId: string, workspaceId: string): Promise<Membership> {
  const m = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  if (!m) throw new AppError(404, "NOT_FOUND", "Workspace not found");
  return m;
}

export function requireAdmin(m: Membership): void {
  if (m.role !== "ADMIN") throw new AppError(403, "FORBIDDEN", "Admin access required");
}
