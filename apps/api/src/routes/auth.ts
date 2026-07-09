import type { FastifyInstance } from "fastify";
import { prisma } from "@tracer/db";
import { devProvider, githubProvider, type OAuthProvider } from "../auth/oauth";
import { statesMatch } from "../auth/state";
import { randomToken } from "../auth/tokens";
import {
  createSession,
  setSessionCookie,
  clearSessionCookie,
  getSessionUser,
  destroySession,
} from "../auth/session";
import { env } from "../env";
import { AppError } from "../errors";

const STATE_COOKIE = "oauth_state";

function providerByName(name: string): OAuthProvider {
  if (name === "github" && env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    return githubProvider(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET);
  }
  return devProvider;
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // Begin the flow: mint state, stash it in a cookie, redirect to the provider's authorize URL.
  app.get("/auth/:provider/login", async (req, reply) => {
    const { provider } = req.params as { provider: string };
    const p = providerByName(provider);
    const state = randomToken(16);
    reply.setCookie(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
    return reply.redirect(p.authorizeUrl(state, `${env.API_URL}/auth/${p.name}/callback`));
  });

  // The dev identity provider — stands in for GitHub, immediately redirecting back with a code.
  app.get("/auth/dev/authorize", async (req, reply) => {
    const { state, redirect_uri, login } = req.query as {
      state?: string;
      redirect_uri?: string;
      login?: string;
    };
    if (!state || !redirect_uri) throw new AppError(400, "BAD_REQUEST", "missing state/redirect_uri");
    const u = new URL(redirect_uri);
    u.searchParams.set("code", `dev:${login ?? "devuser"}`);
    u.searchParams.set("state", state);
    return reply.redirect(u.toString());
  });

  // Finish the flow: verify state (CSRF), exchange the code, upsert the user, start a session.
  app.get("/auth/:provider/callback", async (req, reply) => {
    const { provider } = req.params as { provider: string };
    const { code, state } = req.query as { code?: string; state?: string };
    if (!statesMatch(req.cookies[STATE_COOKIE], state)) {
      throw new AppError(401, "BAD_STATE", "invalid oauth state");
    }
    reply.clearCookie(STATE_COOKIE, { path: "/" });
    if (!code) throw new AppError(400, "BAD_REQUEST", "missing code");

    const p = providerByName(provider);
    const profile = await p.exchangeCode(code, `${env.API_URL}/auth/${p.name}/callback`);
    const user = await prisma.user.upsert({
      where: {
        provider_providerUserId: {
          provider: profile.provider,
          providerUserId: profile.providerUserId,
        },
      },
      update: { email: profile.email, name: profile.name, avatarUrl: profile.avatarUrl },
      create: {
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
      },
    });
    setSessionCookie(reply, await createSession(user.id));
    return reply.redirect(env.WEB_URL);
  });

  app.post("/auth/logout", async (req, reply) => {
    await destroySession(req);
    clearSessionCookie(reply);
    return { ok: true };
  });

  app.get("/auth/me", async (req) => {
    const user = await getSessionUser(req);
    return user
      ? { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl }
      : null;
  });
}
