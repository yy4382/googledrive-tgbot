import { Bot, session } from "grammy";
import { hydrateFiles } from "@grammyjs/files";
import { CONFIG, debugLog } from "./config.js";
import type { MyContext, SessionData } from "./types.js";
import { setupCommands } from "./commands/index.js";
import { setupFileHandler } from "./handlers/fileHandler.js";
import { setupCallbackHandler } from "./handlers/callbackHandler.js";
import { setupTextHandler } from "./handlers/textHandler.js";
import { createDatabaseSession } from "./services/sessionStorage.js";
import { db } from "./services/databaseService.js";

async function main() {
  console.log("🤖 Starting Telegram Bot...");
  debugLog(
    "Environment:",
    CONFIG.SERVER.NODE_ENV,
    CONFIG.IS_DEV ? "(debug mode)" : ""
  );

  const bot = new Bot<MyContext>(CONFIG.BOT_TOKEN, {
    client: CONFIG.BOT_API.USE_LOCAL_SERVER
      ? {
          apiRoot: CONFIG.BOT_API.SERVER_URL,
        }
      : undefined,
  });

  if (CONFIG.BOT_API.USE_LOCAL_SERVER) {
    console.log(`🏠 Using local Bot API server: ${CONFIG.BOT_API.SERVER_URL}`);
  }

  // Use custom session storage that persists to database
  const { storage, initial, getSessionKey } = createDatabaseSession();
  bot.use(
    session({
      initial,
      storage,
      getSessionKey,
    })
  );

  bot.api.config.use(hydrateFiles(CONFIG.BOT_TOKEN));

  // User session recovery middleware
  bot.use(async (ctx, next) => {
    if (ctx.from) {
      // Ensure userId is set correctly
      if (!ctx.session.user.userId || ctx.session.user.userId === 0) {
        ctx.session.user.userId = ctx.from.id;
        debugLog(`Session initialized for user ${ctx.from.id}`);
      }

      // Log session restoration for debugging
      if (ctx.session.user.googleTokens) {
        debugLog(`Session restored for user ${ctx.from.id} with Google tokens`);
      }
    }
    await next();
  });

  setupCommands(bot);
  setupFileHandler(bot);
  setupCallbackHandler(bot);
  setupTextHandler(bot);

  // Global error handler
  bot.catch(async (err) => {
    console.error("❌ Bot error:", err);

    // Try to send error message to user if context available
    if (err.ctx && err.ctx.chat) {
      try {
        await err.ctx.reply(
          "⚠️ Sorry, something went wrong. Please try again."
        );
      } catch (replyError) {
        debugLog("Could not send error message to user:", replyError);
      }
    }
  });

  // Log database status on startup
  try {
    const usersWithTokens = await db.getUsersWithTokens();
    if (usersWithTokens.length > 0) {
      console.log(
        `📊 Restored ${usersWithTokens.length} authenticated users from database`
      );
      debugLog(
        "Users with tokens:",
        usersWithTokens.map((u) => u.userId)
      );
    } else {
      console.log("📊 No authenticated users found in database");
    }
  } catch (error) {
    console.warn("⚠️ Could not check database status:", error);
  }

  console.log("✅ Bot configured, starting...");

  try {
    const botInfo = await bot.api.getMe();
    console.log(`🚀 Bot @${botInfo.username} started successfully!`);
    await bot.start();
  } catch (error) {
    console.error("❌ Failed to start bot:", error);
    throw error;
  }
}

main().catch((error) => {
  console.error("❌ Failed to start bot:", error);
  process.exit(1);
});
