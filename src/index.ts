import {
	handleDownload,
	handleDownloadLinks,
	handleJellyfinStatus,
	handleStorage,
	handleMergeSubtitles,
	handleCategorySelection,
} from '@/telegram/handlers';
import { mainKeyboard } from '@/telegram/keyboards/main';
import { logger } from '@/telegram/middleware/logger';

import { Bot } from 'grammy';
import type { MyContext } from './types';
import { sessionMiddleware, ContextHelpersMiddleware } from './telegram/session';

const bot = new Bot<MyContext>(process.env.BOT_TOKEN || '');

bot.use(sessionMiddleware);
bot.use(ContextHelpersMiddleware);

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
bot.hears('💽 Merge Subtitles to Video', handleMergeSubtitles);

bot.on('message', async (ctx) => {
	if (ctx.session.waitingForLink) {
		console.log('Received message while waiting for link:', ctx.message?.text);
		console.log(ctx.session.waitingForLink);
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
	if (ctx.session.waitingForCategory) {
		// Handle category selection for merging subtitles
		const category = ctx.message?.text;
		if (category) {
			await handleCategorySelection(ctx, category);
			ctx.session.waitingForCategory = false; // Reset the waiting state
		} else {
			await ctx.reply('Please select a valid category from the options provided.');
		}
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
