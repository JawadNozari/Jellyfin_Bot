import type { MyContext } from '@/telegram/types/bot';
import type { DownloadLink } from '@/types/download';
import {
	setWaitingForLink,
	addActiveDownloads,
	resetWaitingForLink,
	removeCompletedDownloads,
} from '@/telegram/session/manager';
import { validateLinks, processDownload } from '@/services/download';
import { formatSpeed, formatSize } from '@/services/utils/format';
import { updateTerminalOutput } from '@/services/utils/terminalOutput';

// Track active downloads and their progress messages
const activeDownloads = new Map<
	string,
	{
		messages: Map<string, { messageId: number; lastProgress: string }>;
		links: DownloadLink[];
	}
>();

const UPDATE_INTERVAL = 3500; // Update every 3.5 seconds

export const handleDownload = async (ctx: MyContext) => {
	ctx.session = setWaitingForLink(ctx.session);
	await ctx.reply('Please send the download link(s) in reply to this message.', {
		reply_markup: { force_reply: true },
	});
};

export const handleDownloadLinks = async (ctx: MyContext, links: string[]) => {
	if (!ctx.from?.id || !ctx.chat?.id) {
		await ctx.reply('Error: Could not identify user or chat');
		return;
	}

	const userId = ctx.from.id.toString();
	const chatId = ctx.chat.id;

	// Reset waiting state
	ctx.session = resetWaitingForLink(ctx.session);

	// Validate links
	const validatedLinks = validateLinks(links);

	// Add to active downloads
	ctx.session = addActiveDownloads(ctx.session, validatedLinks);

	// Send initial response
	await ctx.reply(`Starting download of ${validatedLinks.length} file(s)...`);

	// Create a map to store message IDs for each download
	const messages = new Map<string, { messageId: number; lastProgress: string }>();

	// Send initial progress messages for each file
	for (const link of validatedLinks) {
		let displayName = link.url.split('/').pop() || 'unknown';
		if (link.mediaInfo) {
			if (link.mediaInfo.movie) {
				displayName = `${link.mediaInfo.movie.title} (${link.mediaInfo.movie.year})`;
			} else if (link.mediaInfo.show) {
				displayName = `${link.mediaInfo.show.title} S${link.mediaInfo.show.season} E${link.mediaInfo.show.episode}`;
			}
		}

		const initialMessage = await ctx.reply(
			`📥 Downloading: ${displayName}\n\nStatus: Pending\nProgress: 0%\nSpeed: 0 B/s\nSize: 0 B / 0 B`,
		);
		messages.set(link.url, {
			messageId: initialMessage.message_id,
			lastProgress: '',
		});
	}

	// Store the messages and links for this user
	activeDownloads.set(userId, {
		messages,
		links: validatedLinks,
	});

	// Start download process in the background
	processDownload(validatedLinks).catch(async (error) => {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		await ctx.reply(`Error during download: ${errorMessage}`);
	});

	// Set up progress updates
	const progressInterval = setInterval(async () => {
		const userDownloads = activeDownloads.get(userId);
		if (!userDownloads) {
			clearInterval(progressInterval);
			return;
		}

		let allCompleted = true;

		// Update each download's progress message
		for (const link of userDownloads.links) {
			const messageInfo = userDownloads.messages.get(link.url);
			if (!messageInfo) continue;

			let displayName = link.url.split('/').pop() || 'unknown';
			if (link.mediaInfo) {
				if (link.mediaInfo.movie) {
					displayName = `${link.mediaInfo.movie.title} (${link.mediaInfo.movie.year})`;
				} else if (link.mediaInfo.show) {
					displayName = `${link.mediaInfo.show.title} S${link.mediaInfo.show.season}E${link.mediaInfo.show.episode}`;
				}
			}

			const progressMessage =
				`${link.status === 'completed' ? '✅ Download Completed:' : '📥 Downloading:'} ${displayName}\n` +
				`\n${link.progressBar || ''}` +
				`\n${link.status === 'downloading' ? `Speed: ${formatSpeed(link.speed)}` : ''}` +
				`\nSize: ${link.status === 'completed' ? formatSize(link.size) : `${formatSize(link.downloaded)} / ${formatSize(link.size)}`}`;

			// Only update if the message has changed
			if (progressMessage !== messageInfo.lastProgress) {
				try {
					await ctx.api.editMessageText(chatId, messageInfo.messageId, progressMessage);
					messageInfo.lastProgress = progressMessage;
					userDownloads.messages.set(link.url, messageInfo);
				} catch (error) {
					// Ignore "message not modified" errors
					if (error instanceof Error && !error.message.includes('message is not modified')) {
						console.error('Error updating progress message:', error);
					}
				}
			}

			if (link.status !== 'completed') {
				allCompleted = false;
			}
		}

		// Update terminal output
		const terminalDownloads = new Map<string, DownloadLink>();
		for (const [userId, userData] of activeDownloads) {
			for (const link of userData.links) {
				terminalDownloads.set(link.url, link);
			}
		}
		updateTerminalOutput(terminalDownloads);

		// Check if all downloads are complete
		if (allCompleted) {
			clearInterval(progressInterval);
			activeDownloads.delete(userId);
			ctx.session = removeCompletedDownloads(ctx.session);
			await ctx.reply('All downloads completed successfully! 🎉');
		}
	}, UPDATE_INTERVAL);
};
