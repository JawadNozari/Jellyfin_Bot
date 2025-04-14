import type { MyContext } from "@/telegram/types/bot";
import { getStorageInfo } from "@/services/storage";

export const handleStorage = async (ctx: MyContext) => {
	const storageInfo = await getStorageInfo();
	const message = `
Storage Information:
Total: ${storageInfo.total}GB
Used: ${storageInfo.used}GB (${storageInfo.percentage}%)
Free: ${storageInfo.free}GB
	`;
	await ctx.reply(message);
};
