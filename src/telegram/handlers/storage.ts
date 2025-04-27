import { getStorageInfo } from '@/services/storage/storage';
import type { MyContext } from '@/types';

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
