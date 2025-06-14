const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

async function main() {
  await prisma.user.create({
    data: {
      telegramId: "123456789",
      username: "testuser",
    },
  });
}

main()
  .then(() => {
    console.log("Seeding done.");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
