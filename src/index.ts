import { Bot } from "grammy";
import { logger } from "@/telegram/middleware/logger";
import { mainKeyboard } from "@/telegram/keyboards/main";
import {
	handleDownload,
	handleStorage,
	handleJellyfinStatus,
	handleDownloadLinks,
} from "@/telegram/handlers";
import { sessionMiddleware } from "@/telegram/session";
import type { MyContext } from "@/telegram/types/bot";

// Create bot instance
const bot = new Bot<MyContext>(process.env.BOT_TOKEN || "");

// Initialize session middleware
bot.use(sessionMiddleware);

// Use logger middleware
bot.use(logger);

// Command handlers
bot.command("start", async (ctx) => {
	await ctx.reply(
		"Welcome to the Jellyfin Download Bot! Use the keyboard below to interact with the bot.",
		{ reply_markup: mainKeyboard },
	);
});

// Handle keyboard button clicks
bot.hears("📥 Download", handleDownload);
bot.hears("💾 Check Storage", handleStorage);
bot.hears("🔍 Check Jellyfin Status", handleJellyfinStatus);

// Handle all other messages
bot.on("message", async (ctx) => {
	if (ctx.session.waitingForLink && ctx.message?.reply_to_message) {
		// Extract links from the reply
		const messageText = ctx.message?.text || "";
		const links = messageText
			.split(/\s+/)
			.filter(
				(link) => link.startsWith("http://") || link.startsWith("https://"),
			);

		if (links.length > 0) {
			await handleDownloadLinks(ctx, links);
		} else {
			await ctx.reply(
				"No valid links found in your message. Please send one or more valid download links.",
				{ reply_markup: { force_reply: true } },
			);
		}
	} else {
		await ctx.reply(
			"Please use the keyboard buttons to interact with the bot.",
			{
				reply_markup: mainKeyboard,
			},
		);
	}
});

// Start the bot
console.log("Starting bot...");
bot.start();
