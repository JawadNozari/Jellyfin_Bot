import type { MyContext } from "@/telegram/types/bot";
import { checkJellyfinStatus } from "@/services/jellyfin";

export const handleJellyfinStatus = async (ctx: MyContext) => {
	const status = await checkJellyfinStatus();
	const message = `
Jellyfin Status:
Running: ${status.isRunning ? "✅" : "❌"}
Version: ${status.version || "Unknown"}
Last Checked: ${status.lastChecked.toLocaleString()}
	`;
	await ctx.reply(message);
};
