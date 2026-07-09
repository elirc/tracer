import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const workspaces = [
    { name: "Acme", slug: "acme" },
    { name: "Globex", slug: "globex" },
    { name: "Initech", slug: "initech" },
  ];

  for (const w of workspaces) {
    await prisma.workspace.upsert({
      where: { slug: w.slug },
      update: {},
      create: w,
    });
  }

  console.log(`Seeded ${workspaces.length} workspaces.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
