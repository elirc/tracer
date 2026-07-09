import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma, type User } from "@tracer/db";
import { randomToken, hashToken } from "./tokens";

const COOKIE = "tracer_session";
const TTL_MS = 30 * 24 * 3600 * 1000; // 30 days

/**
 * Server-side sessions in Postgres (ADR-0003). The cookie carries a random token; we persist
 * only its hash. This buys instant revocation (delete the row) — the reason we chose sessions
 * over stateless JWTs.
 */
export async function createSession(userId: string): Promise<string> {
  const token = randomToken();
  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt: new Date(Date.now() + TTL_MS) },
  });
  return token;
}

export function setSessionCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(COOKIE, { path: "/" });
}

export async function getSessionUser(req: FastifyRequest): Promise<User | null> {
  const token = req.cookies[COOKIE];
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function destroySession(req: FastifyRequest): Promise<void> {
  const token = req.cookies[COOKIE];
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}
