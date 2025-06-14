require("dotenv").config();
const { Telegraf } = require("telegraf");
const { PrismaClient } = require("@prisma/client");
const bettingContract = require("./utils/monad");


const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const prisma = new PrismaClient();

// /start command
bot.start((ctx) => {
  ctx.reply("👋 Welcome to Bet0verse!\nUse /register to get started.");
});

// /register command
bot.command("register", async (ctx) => {
  const telegramId = String(ctx.from.id);
  const username = ctx.from.username || null;

  try {
    await prisma.user.upsert({
      where: { telegramId },
      update: {},
      create: { telegramId, username },
    });
    ctx.reply("✅ You are registered!");
  } catch (err) {
    console.error("Registration error:", err);
    ctx.reply("❌ Registration failed.");
  }
});

// /linkwallet <walletAddress>
bot.command("linkwallet", async (ctx) => {
  const [_, walletAddress] = ctx.message.text.split(" ");
  const telegramId = String(ctx.from.id);

  if (!walletAddress || !walletAddress.startsWith("0x") || walletAddress.length !== 42) {
    return ctx.reply("❗ Usage: /linkwallet <your_wallet_address>");
  }

  try {
    const user = await prisma.user.update({
      where: { telegramId },
      data: { walletAddress }
    });
    ctx.reply(`✅ Wallet linked: ${walletAddress}`);
  } catch (err) {
    console.error("Wallet linking error:", err);
    ctx.reply("❌ Failed to link wallet. Make sure you're registered.");
  }
});

// /createbet <question>
bot.command("createbet", async (ctx) => {
  const telegramId = String(ctx.from.id);
  const question = ctx.message.text.replace("/createbet", "").trim();

  if (!question) return ctx.reply("❗ Usage: /createbet Will it rain tomorrow?");

  try {
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) return ctx.reply("❌ Please register first using /register.");

    const market = await prisma.market.create({
      data: {
        question,
        createdBy: user.id,
      },
    });

    ctx.reply(`🧠 Market created:\n"${market.question}"\nMarket ID: ${market.id}`);
  } catch (err) {
    console.error("Create bet error:", err);
    ctx.reply("❌ Failed to create market.");
  }
});

// /placebet <marketId> <yes|no> <amount>
bot.command("placebet", async (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length !== 4) {
    return ctx.reply("❗ Usage: /placebet <marketId> <yes|no> <amount>");
  }

  const [, marketId, prediction, amountStr] = args;
  const telegramId = String(ctx.from.id);
  const amount = parseFloat(amountStr);

  if (!["yes", "no"].includes(prediction)) {
    return ctx.reply("❌ Prediction must be 'yes' or 'no'.");
  }

  try {
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) return ctx.reply("❌ Please register first using /register.");

    const market = await prisma.market.findUnique({ where: { id: parseInt(marketId) } });
    if (!market) return ctx.reply("❌ Market not found.");

    await prisma.bet.create({
      data: {
        userId: user.id,
        marketId: market.id,
        prediction,
        amount,
      },
    });

    ctx.reply(`✅ Bet placed: ${prediction} with ${amount} coins on market #${marketId}`);
  } catch (err) {
    console.error("Place bet error:", err);
    ctx.reply("❌ Failed to place bet.");
  }
});

// /listmarkets – List all open markets
bot.command("listmarkets", async (ctx) => {
  const markets = await prisma.market.findMany({
    where: { status: "open" },
    include: { creator: true },
    orderBy: { createdAt: "desc" }
  });

  if (markets.length === 0) {
    return ctx.reply("No open markets at the moment.");
  }

  const message = markets.map(m =>
    `🆔 ID: ${m.id}\n❓ ${m.question}\n👤 Created by: ${m.creator.username || m.creator.telegramId}\n📅 ${m.createdAt.toLocaleString()}\n---`
  ).join("\n\n");

  ctx.reply(message);
});

// /resolvebets <marketId> <yes|no>
bot.command("resolvebets", async (ctx) => {
  const [_, marketId, outcome] = ctx.message.text.split(" ");

  if (!marketId || !["yes", "no"].includes(outcome)) {
    return ctx.reply("Usage: /resolvebets <marketId> <yes|no>");
  }

  const market = await prisma.market.findUnique({ where: { id: Number(marketId) } });
  if (!market) return ctx.reply("❌ Market not found.");
  if (market.status !== "open") return ctx.reply("⚠️ Market already closed or resolved.");

  await prisma.market.update({
    where: { id: Number(marketId) },
    data: { status: "resolved" }
  });

  const winners = await prisma.bet.findMany({
    where: {
      marketId: Number(marketId),
      prediction: outcome
    }
  });

  if (winners.length === 0) return ctx.reply("⚠️ No winners for this market.");

  await Promise.all(winners.map(async (bet) => {
    await prisma.transaction.create({
      data: {
        userId: bet.userId,
        amount: bet.amount * 2,
        txHash: `mocktx_${Date.now()}_${bet.id}`,
        type: "payout"
      }
    });
  }));

  ctx.reply(`✅ Market resolved. Paid out ${winners.length} winning bets.`);
});

// /balance – Show user balance + wallet
bot.command("balance", async (ctx) => {
  const telegramId = String(ctx.from.id);
  const user = await prisma.user.findUnique({ where: { telegramId } });

  if (!user) return ctx.reply("❌ You are not registered. Use /register first.");

  const transactions = await prisma.transaction.findMany({ where: { userId: user.id } });
  const balance = transactions.reduce((acc, tx) => {
    return tx.type === "deposit" ? acc + tx.amount : acc - tx.amount;
  }, 0);

  ctx.reply(`💰 Your current balance is: ${balance.toFixed(2)} MONAD\n🔗 Wallet: ${user.walletAddress || "Not linked"}`);
});

// Launch the bot
bot.launch();
console.log("🤖 Bet0verse Frankenstein is ALIVE.");
