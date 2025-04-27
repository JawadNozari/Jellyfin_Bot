import {
	handleDownload,
	handleDownloadLinks,
	handleJellyfinStatus,
	handleStorage,
} from '@/telegram/handlers';
import { mainKeyboard } from '@/telegram/keyboards/main';
import { logger } from '@/telegram/middleware/logger';
import { sessionMiddleware } from '@/telegram/session';
import { Bot } from 'grammy';
import type { MyContext } from './types';

const bot = new Bot<MyContext>(process.env.BOT_TOKEN || '');
bot.use(sessionMiddleware);
bot.use(logger);

bot.command('start', async (ctx) => {
	await ctx.reply(
		'Welcome to the Jellyfin Download Bot! Use the keyboard below to interact with the bot.',
		{ reply_markup: mainKeyboard },
	);
});

bot.hears('📥 Download', handleDownload);
bot.hears('💾 Check Storage', handleStorage);
bot.hears('🔍 Check Jellyfin Status', handleJellyfinStatus);

bot.on('message', async (ctx) => {
	if (ctx.session.waitingForLink) {
		// Extract links from the reply
		const messageText = ctx.message?.text || '';
		const links = messageText
			.split(/\s+/)
			.filter((link) => link.startsWith('http://') || link.startsWith('https://'));

		if (links.length > 0) {
			await handleDownloadLinks(ctx, links);
		} else {
			await ctx.reply(
				'No valid links found in your message. Please send one or more valid download links.',
				{ reply_markup: { force_reply: true } },
			);
		}
		return;
	}
	if (!ctx.session.waitingForLink) {
		await ctx.reply('Please use the keyboard below!', {
			reply_markup: mainKeyboard,
		});
		return;
	}
});

bot.catch((err) => {
	console.error(err);
});

bot.start();
