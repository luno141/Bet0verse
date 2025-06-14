require("dotenv").config();
const { Telegraf } = require("telegraf");
const { PrismaClient } = require("@prisma/client");
const bettingContract = require("./utils/monad");

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const prisma = new PrismaClient();

bot.start((ctx) => {
  ctx.reply("👋 Welcome to Bet0verse!\nUse /register to get started.\nCommands: /linkwallet, /createbet, /placebet, /listmarkets, /resolvebets, /balance, /withdraw");
});

bot.command("register", async (ctx) => {
  const telegramId = String(ctx.from.id);
  const username = ctx.from.username || null;
  try {
    await prisma.user.upsert({
      where: { telegramId },
      update: {},
      create: { telegramId, username },
    });
    ctx.reply("✅ You have entered the Bet0Verse!\nUse /linkwallet <address> to connect your wallet.");
  } catch (err) {
    console.error("Registration error:", err);
    ctx.reply("❌ Registration failed.");
  }
});

bot.command("linkwallet", async (ctx) => {
  const [_, walletAddress] = ctx.message.text.split(" ");
  const telegramId = String(ctx.from.id);

  if (!walletAddress || !walletAddress.startsWith("0x") || walletAddress.length !== 42) {
    return ctx.reply("❗ Usage: /linkwallet <your_wallet_address>");
  }

  try {
    await prisma.user.update({
      where: { telegramId },
      data: { walletAddress },
    });
    ctx.reply(`✅ Wallet linked: ${walletAddress}`);
  } catch (err) {
    console.error("Wallet linking error:", err);
    ctx.reply("❌ Failed to link wallet. Make sure you're registered.");
  }
});

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

    ctx.reply(`🧠 Market created:\n\"${market.question}\"\nMarket ID: ${market.id}`);
  } catch (err) {
    console.error("Create bet error:", err);
    ctx.reply("❌ Failed to create market.");
  }
});

bot.command("placebet", async (ctx) => {
  const args = ctx.message.text.trim().split(" ");
  if (args.length !== 4) {
    return ctx.reply("❗ Usage: /placebet <marketId> <yes|no> <amount>");
  }

  const [, marketIdStr, prediction, amountStr] = args;
  const telegramId = String(ctx.from.id);
  const marketId = parseInt(marketIdStr);
  const amount = parseFloat(amountStr);

  if (isNaN(marketId)) return ctx.reply("❌ Market ID must be a number.");
  if (!["yes", "no"].includes(prediction.toLowerCase())) return ctx.reply("❌ Prediction must be 'yes' or 'no'.");
  if (isNaN(amount) || amount <= 0) return ctx.reply("❌ Invalid amount.");

  try {
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) return ctx.reply("❌ Please register first using /register.");

    const market = await prisma.market.findUnique({ where: { id: marketId } });
    if (!market) return ctx.reply("❌ Market not found.");

    await prisma.bet.create({
      data: {
        userId: user.id,
        marketId: market.id,
        prediction,
        amount,
      },
    });

    ctx.reply(`✅ Bet placed: ${prediction} with ${amount} MONAD on market #${marketId}`);
  } catch (err) {
    console.error("Place bet error:", err);
    ctx.reply("❌ Failed to place bet.");
  }
});

bot.command("listmarkets", async (ctx) => {
  const markets = await prisma.market.findMany({
    where: { status: "open" },
    include: { creator: true },
    orderBy: { createdAt: "desc" },
  });

  if (markets.length === 0) {
    return ctx.reply("No open markets at the moment.");
  }

  const message = markets
    .map(
      (m) =>
        `🆔 ID: ${m.id}\n❓ ${m.question}\n👤 Created by: ${m.creator.username || m.creator.telegramId}\n📅 ${m.createdAt.toLocaleString()}\n---`
    )
    .join("\n\n");

  ctx.reply(message);
});

bot.command("resolvebets", async (ctx) => {
  const [_, marketIdStr, outcome] = ctx.message.text.split(" ");
  const marketId = parseInt(marketIdStr);

  if (!marketIdStr || isNaN(marketId) || !["yes", "no"].includes(outcome)) {
    return ctx.reply("❗ Usage: /resolvebets <marketId> <yes|no>");
  }

  try {
    const market = await prisma.market.findUnique({ where: { id: marketId } });
    if (!market) return ctx.reply("❌ Market not found.");
    if (market.status !== "open") return ctx.reply("⚠️ Market already resolved.");

    await prisma.market.update({
      where: { id: marketId },
      data: { status: "resolved" },
    });

    const winners = await prisma.bet.findMany({
      where: {
        marketId: marketId,
        prediction: outcome,
      },
    });

    if (winners.length === 0) return ctx.reply("⚠️ No winners for this market.");

    await Promise.all(
      winners.map(async (bet) => {
        await prisma.transaction.create({
          data: {
            userId: bet.userId,
            amount: bet.amount * 2,
            txHash: `mocktx_${Date.now()}_${bet.id}`,
            type: "payout",
          },
        });
      })
    );

    ctx.reply(`✅ Market resolved. Paid out ${winners.length} winning bets.`);
  } catch (err) {
    console.error("Resolve bet error:", err);
    ctx.reply("❌ Failed to resolve market.");
  }
});

bot.command("balance", async (ctx) => {
  const telegramId = String(ctx.from.id);
  const user = await prisma.user.findUnique({ where: { telegramId } });

  if (!user) return ctx.reply("❌ You are not registered. Use /register first.");

  const transactions = await prisma.transaction.findMany({ where: { userId: user.id } });
  const balance = transactions.reduce((acc, tx) => {
    return tx.type === "deposit" || tx.type === "payout"
      ? acc + tx.amount
      : acc - tx.amount;
  }, 0);

  ctx.reply(
    `💰 Your current balance is: ${balance.toFixed(2)} MONAD\n🔗 Wallet: ${
      user.walletAddress || "Not linked"
    }`
  );
});

bot.command("withdraw", async (ctx) => {
  const [_, amountStr] = ctx.message.text.split(" ");
  const amount = parseFloat(amountStr);
  const telegramId = String(ctx.from.id);

  if (isNaN(amount) || amount <= 0) {
    return ctx.reply("❗ Usage: /withdraw <amount>");
  }

  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user || !user.walletAddress) {
    return ctx.reply("❌ You must register and link a wallet first.");
  }

  const transactions = await prisma.transaction.findMany({ where: { userId: user.id } });
  const balance = transactions.reduce((acc, tx) => {
    return tx.type === "deposit" || tx.type === "payout"
      ? acc + tx.amount
      : acc - tx.amount;
  }, 0);

  if (amount > balance) {
    return ctx.reply("❌ Insufficient balance.");
  }

  try {
    const txHash = `mock_withdraw_${Date.now()}`;
    await prisma.transaction.create({
      data: {
        userId: user.id,
        amount,
        txHash,
        type: "withdrawal",
      },
    });

    ctx.reply(`✅ Withdrawal of ${amount} MONAD initiated.\n📦 tx: ${txHash}`);
  } catch (err) {
    console.error("Withdraw error:", err);
    ctx.reply("❌ Withdrawal failed.");
  }
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

bot.launch();
console.log("🤖 Bet0verse Frankenstein is ALIVE.");
