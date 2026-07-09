export interface OAuthProfile {
  provider: string;
  providerUserId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

export interface OAuthProvider {
  name: string;
  authorizeUrl(state: string, redirectUri: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<OAuthProfile>;
}

/**
 * A local, deterministic OAuth provider for dev + CI — no external GitHub app required.
 * The /auth/dev/authorize route (routes/auth.ts) plays the identity provider: it redirects
 * back to our callback with a code, exactly like GitHub would. This is how you E2E an OAuth
 * flow without a real IdP (the "fake IdP in the test harness" pattern).
 */
export const devProvider: OAuthProvider = {
  name: "dev",
  authorizeUrl(state, redirectUri) {
    const u = new URL("http://localhost:3001/auth/dev/authorize");
    u.searchParams.set("state", state);
    u.searchParams.set("redirect_uri", redirectUri);
    return u.toString();
  },
  exchangeCode(code) {
    // The dev IdP encodes the "user" in the code as `dev:<login>`; default to a single dev user.
    const login = code.startsWith("dev:") ? code.slice(4) : "devuser";
    return Promise.resolve({
      provider: "dev",
      providerUserId: login,
      email: `${login}@dev.local`,
      name: login,
    });
  },
};

/** GitHub provider — used in prod when GITHUB_CLIENT_ID/SECRET are configured. */
export function githubProvider(clientId: string, clientSecret: string): OAuthProvider {
  return {
    name: "github",
    authorizeUrl(state, redirectUri) {
      const u = new URL("https://github.com/login/oauth/authorize");
      u.searchParams.set("client_id", clientId);
      u.searchParams.set("redirect_uri", redirectUri);
      u.searchParams.set("scope", "read:user user:email");
      u.searchParams.set("state", state);
      return u.toString();
    },
    async exchangeCode(code, redirectUri) {
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
      });
      const token = (await tokenRes.json()) as { access_token?: string };
      if (!token.access_token) throw new Error("github token exchange failed");
      const userRes = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${token.access_token}`, "User-Agent": "tracer" },
      });
      const gh = (await userRes.json()) as { id: number; login: string; name?: string; email?: string; avatar_url?: string };
      return {
        provider: "github",
        providerUserId: String(gh.id),
        email: gh.email ?? `${gh.login}@users.noreply.github.com`,
        name: gh.name ?? gh.login,
        avatarUrl: gh.avatar_url,
      };
      // We keep only the profile — the access token is discarded (no stored secret we don't need).
    },
  };
}
