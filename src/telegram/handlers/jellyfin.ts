import { checkJellyfinStatus } from '@/services/Jellyfin/jellyfin';
import type { MyContext } from '@/types';

export const handleJellyfinStatus = async (ctx: MyContext) => {
	const status = await checkJellyfinStatus();
	const message = [
		'Jellyfin Status:',
		`Running: ${status.isRunning ? '✅' : '❌'}`,
		`PID: ${status.PID || 'Unknown'}`,
		`Last Checked: ${status.lastChecked?.toLocaleString() ?? 'Unknown'}`,
	].join('\n');
	await ctx.reply(message);
};
