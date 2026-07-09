import { PrismaClient, type StateType } from "@prisma/client";

const prisma = new PrismaClient();

const STATES: ReadonlyArray<{ name: string; type: StateType; position: number; color: string }> = [
  { name: "Backlog", type: "BACKLOG", position: 0, color: "#8b93a1" },
  { name: "Todo", type: "UNSTARTED", position: 1, color: "#6b7280" },
  { name: "In Progress", type: "STARTED", position: 2, color: "#f5a623" },
  { name: "Done", type: "DONE", position: 3, color: "#2fbf71" },
  { name: "Canceled", type: "CANCELED", position: 4, color: "#6b7280" },
];

const TITLES = [
  "Set up the CI pipeline",
  "Design the sync protocol",
  "Fix the flaky websocket test",
  "Add a keyboard shortcuts help overlay",
  "Investigate slow board render",
  "Write the onboarding docs",
  "Migrate ordering to fractional indexing",
  "Add a dark mode toggle",
  "Handle offline reconnect gracefully",
  "Rate-limit the auth endpoints",
  "Build the issue labels UI",
  "Audit the list endpoints for N+1 queries",
];

const PRIORITIES = ["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"] as const;

async function main() {
  // The dev user matches the dev OAuth provider — after seeding, "Sign in (dev)" lands you here.
  const user = await prisma.user.upsert({
    where: { provider_providerUserId: { provider: "dev", providerUserId: "devuser" } },
    update: {},
    create: { provider: "dev", providerUserId: "devuser", email: "devuser@dev.local", name: "devuser" },
  });

  let ws = await prisma.workspace.findUnique({ where: { slug: "demo" } });
  if (!ws) {
    ws = await prisma.workspace.create({
      data: {
        name: "Demo",
        slug: "demo",
        memberships: { create: { userId: user.id, role: "ADMIN", guestTeamIds: [] } },
      },
    });
  }

  let team = await prisma.team.findFirst({ where: { workspaceId: ws.id, key: "ENG" } });
  if (!team) {
    team = await prisma.team.create({
      data: {
        workspaceId: ws.id,
        name: "Engineering",
        key: "ENG",
        workflowStates: { create: STATES.map((s) => ({ ...s })) },
      },
    });
  }
  const states = await prisma.workflowState.findMany({
    where: { teamId: team.id },
    orderBy: { position: "asc" },
  });

  if ((await prisma.issue.count({ where: { teamId: team.id } })) === 0) {
    const perStateIndex: Record<string, number> = {};
    for (let n = 0; n < TITLES.length; n++) {
      const state = states[n % states.length]!;
      const idx = (perStateIndex[state.id] = (perStateIndex[state.id] ?? 0) + 1);
      const updated = await prisma.team.update({
        where: { id: team.id },
        data: { issueCounter: { increment: 1 } },
      });
      await prisma.issue.create({
        data: {
          teamId: team.id,
          number: updated.issueCounter,
          title: TITLES[n]!,
          stateId: state.id,
          priority: PRIORITIES[n % PRIORITIES.length]!,
          sortOrder: String(idx).padStart(6, "0"),
          assigneeId: n % 3 === 0 ? user.id : null,
        },
      });
    }
  }

  console.log(`Seeded demo workspace (sign in as "devuser") — ${TITLES.length} issues in ENG.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
