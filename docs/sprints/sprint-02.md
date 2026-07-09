# Sprint 02 — GitHub OAuth, Workspaces, Teams & Roles

**Branch:** `sprint-02/oauth-workspaces` · **Size:** M · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** OAuth is the new material (Meridian hand-rolled passwords; here we integrate an identity provider). Plus the workspace/team/membership model with a GUEST role scoped to specific teams — the authz shape the sync engine must honor in S6/S13.

## A — Issues
1. `Sign in with GitHub (OAuth code flow) + sessions`
2. `Workspace / Team / Membership model; roles ADMIN, MEMBER, GUEST(teams[])`
3. `Invites (email token, fast-forward) + workspace switcher UI`
4. `Authz guards: workspace-level + team-level`

## B — Commits
| # | Commit | Notes |
|---|--------|------|
| 1 | `feat(db): User, Workspace, Team, Membership (+ guestTeamIds), Session, Invite` | |
| 2 | `feat(api): github oauth — redirect + callback, token exchange` | **[fix-later-in-PR]** v1 omits the `state` parameter |
| 3 | `test(api): login CSRF — forged callback accepted, FAILS` | demonstrates the attack: attacker's code lands in victim's session |
| 4 | `fix(api): oauth state param — signed, single-use, verified` | the OAuth-CSRF arc; commit body explains what `state` actually protects |
| 5 | `feat(api): sessions + requireAuth (fast-forward from Meridian S2)` | |
| 6 | `feat(api): workspace/team guards — requireMembership, requireTeamAccess` | GUEST resolves through `guestTeamIds`; every issue-domain query in later sprints must go through `teamScope()` |
| 7 | `feat(api): invites + accept flow` | |
| 8 | `feat(web): sign-in page, oauth flow, session context, workspace switcher` | |
| 9 | `feat(web): team creation + member management UI` | |
| 10 | `test(api): authz matrix — role × endpoint; guest sees only granted teams` | |
| 11 | `test(e2e): oauth login (mocked provider) → create workspace → create team` | how to E2E an OAuth flow: fake IdP server in the test harness |
| 12 | `docs: ADR-0003 OAuth + sessions (not JWT — same reasoning as Meridian, linked); curriculum note` | |

## C — Review order
Commits 2→3→4 as a story → `teamScope()` guard (6) → the E2E's fake IdP (11).

## D — Teaching comments (~10)
- code flow diagram — 📘 authorization code flow step by step; why the token exchange happens server-side; where PKCE would enter (public clients)
- `state` fix — ⚠️ login CSRF: the subtle OAuth attack juniors never see coming; signed single-use state
- token storage — 🔍 review-lens: we keep the GitHub access token? No — discard after profile fetch; store only what you need
- `teamScope()` — 🔗 this helper is the authz spine; S6's sync channels and S13's audit both test against it; GUEST is the adversarial persona
- fake IdP in E2E — 📘 never E2E against a real third party; the same simulator lesson as Meridian S9, applied to auth
- membership model — 📘 role on the *membership*, not the user — users belong to many workspaces

## E — Debate
**"Store the provider's access token for later API calls?"** Yes: future GitHub integration (issue↔PR links). No: a stored token is a liability with no current consumer. **Resolution:** discard now; file `integration/github` issue documenting re-consent flow when needed. Lesson: *don't hold secrets speculatively.*

## F/G — Close
- Squash: `feat(sprint-02): github oauth, workspaces, teams, guest scoping (closes #…)`
- Deferred: email/password fallback, GitHub integration.
- Recap idea: *OAuth bugs are protocol bugs — you fix them by understanding the flow, not the library.*
