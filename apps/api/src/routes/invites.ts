import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@tracer/db";
import { requireUser, requireMembership, requireAdmin } from "../auth/guards";
import { randomToken, hashToken } from "../auth/tokens";
import { AppError } from "../errors";

const CreateInvite = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER", "GUEST"]).default("MEMBER"),
});
const AcceptInvite = z.object({ token: z.string().min(1) });

export async function inviteRoutes(app: FastifyInstance): Promise<void> {
  // Admin invites by email. The token is single-use, hashed at rest, and expiring —
  // same rules as a session token. Real email delivery lands in Sprint 10; for now we log it.
  app.post("/api/v1/workspaces/:wsId/invites", async (req, reply) => {
    const user = await requireUser(req);
    const { wsId } = req.params as { wsId: string };
    const m = await requireMembership(user.id, wsId);
    requireAdmin(m);
    const body = CreateInvite.parse(req.body);
    const token = randomToken();
    await prisma.invite.create({
      data: {
        workspaceId: wsId,
        email: body.email,
        role: body.role,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      },
    });
    console.log(`[invite] ${body.email} -> ${env_web()}/invite?token=${token}`);
    reply.code(201);
    return { ok: true };
  });

  app.post("/api/v1/invites/accept", async (req) => {
    const user = await requireUser(req);
    const { token } = AcceptInvite.parse(req.body);
    const invite = await prisma.invite.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw new AppError(400, "INVALID_INVITE", "invite invalid or expired");
    }
    await prisma.$transaction([
      prisma.membership.upsert({
        where: { userId_workspaceId: { userId: user.id, workspaceId: invite.workspaceId } },
        update: {},
        create: {
          userId: user.id,
          workspaceId: invite.workspaceId,
          role: invite.role,
          guestTeamIds: [],
        },
      }),
      prisma.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
    ]);
    return { workspaceId: invite.workspaceId };
  });
}

function env_web(): string {
  return process.env.WEB_URL ?? "http://localhost:5173";
}
