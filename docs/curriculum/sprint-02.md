# Curriculum Note — Sprint 02: OAuth, Workspaces, Teams & Guest Scoping

## Learning objectives
- Integrate an **identity provider** via the OAuth authorization-code flow, behind a provider
  abstraction so a *fake IdP* can stand in for GitHub in dev/CI.
- Understand **login CSRF** and the `state` parameter that defeats it.
- Model **multi-tenancy** and roles, and enforce **guest team scoping** through one authorization
  spine.
- Practice **session** design and the sessions-vs-JWT tradeoff (ADR-0003).

## Key concepts
- **Provider abstraction (`auth/oauth.ts`).** `OAuthProvider` has `authorizeUrl()` +
  `exchangeCode()`. The `devProvider` is a real, deterministic IdP (the `/auth/dev/authorize`
  route redirects back with a code, exactly like GitHub) — this is how you E2E an OAuth flow with
  no external app. Swapping to GitHub in prod is one env var.
- **The `state` param = login-CSRF defense (`auth/state.ts`).** On `/login` we set a random state
  in a cookie and put it in the authorize URL; on `/callback` we compare them with a constant-time
  check. An attacker who forges a callback has no matching cookie → rejected. See
  `statesMatch` and its test.
- **The authz spine (`@tracer/shared/authz.ts`).** `canAccessTeam` / `visibleTeamIds` are pure
  functions, unit-tested as a role matrix. The route guards are thin wrappers. GUEST is the
  adversarial persona: they see only teams in `guestTeamIds`. Every issue-domain query in later
  sprints funnels through this.
- **Existence non-disclosure.** `requireMembership` returns **404**, not 403, for a workspace the
  user isn't in — so the API never reveals that a workspace they can't see exists.
- **Sessions in Postgres (ADR-0003).** The cookie holds a random token; we store only its hash.
  Instant revocation is the payoff vs. stateless JWTs.
- **Tokens are hashed at rest.** Invite and session tokens follow the same rule as passwords: the
  raw value lives in a cookie/URL, only the hash is stored.

## Exercise questions
1. Delete the `state` cookie check in `/callback`. Which test goes red, and what real attack does
   that represent? (Try forging a callback in `curl`.)
2. A GUEST hits `GET /workspaces/:id/teams`. Trace exactly where their `guestTeamIds` narrows the
   result. What would an IDOR look like if that step were missing?
3. Why does `requireMembership` return 404 instead of 403? What does a 403 leak?
4. ADR-0003 chose sessions over JWTs for revocation. What specific feature becomes trivial with a
   session row that is hard with a stateless JWT?

## Further reading
- OAuth 2.0 authorization-code flow & the `state` parameter (RFC 6749 §10.12)
- Session management (OWASP cheat sheet) · SameSite cookies
- Multi-tenancy via query scoping
