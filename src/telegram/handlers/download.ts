import { processDownload, validateLinks } from '@/services';
import {
	addActiveDownloads,
	removeCompletedDownloads,
	resetWaitingForLink,
	setWaitingForLink,
} from '@/telegram/session/manager';
import type { DownloadLink, MyContext } from '@/types';
import { calculateEta, formatSize, formatSpeed } from '@/utils/format';

// Track active downloads and their progress messages
const activeDownloads = new Map<
	string,
	{
		messages: Map<string, { messageId: number; lastProgress: string }>;
		links: DownloadLink[];
	}
>();

const UPDATE_INTERVAL = 8000; // Update every 3.5 seconds

export const handleDownload = async (ctx: MyContext) => {
	ctx.session = setWaitingForLink(ctx.session);
	await ctx.reply('Please send the download link(s)');
};

export const handleDownloadLinks = async (ctx: MyContext, links: string[]) => {
	if (!ctx.from?.id || !ctx.chat?.id) {
		await ctx.reply('Error: Could not identify user or chat');
		return;
	}
	const userId = ctx.from.id.toString();
	const chatId = ctx.chat.id;

	const userDownloads = activeDownloads.get(userId);
	// Validate links
	const validatedLinks = validateLinks(links);

	// If there are already active downloads, merge them with the new ones
	if (userDownloads) {
		userDownloads.links.push(...validatedLinks);
		await ctx.reply(
			`You are already downloading files. Added ${validatedLinks.length} more file(s) to the queue.`,
		);
	} else {
		// If no active downloads, start from scratch
		await ctx.reply(`Starting download of ${validatedLinks.length} file(s)...`);
	}

	// Add to active downloads (Merge new links with existing ones if there are any)
	ctx.session = addActiveDownloads(ctx.session, validatedLinks);

	// Send initial progress messages for new downloads
	const messages = new Map<string, { messageId: number; lastProgress: string }>();
	for (const link of validatedLinks) {
		let displayName = link.url.split('/').pop() || 'unknown';
		if (link.mediaInfo) {
			if (link.mediaInfo.movie) {
				displayName = `${link.mediaInfo.movie.title} (${link.mediaInfo.movie.year})`;
			} else if (link.mediaInfo.show) {
				displayName = `${link.mediaInfo.show.title} S${link.mediaInfo.show.season}E${link.mediaInfo.show.episode}`;
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

	// Store the updated messages and links for this user
	if (userDownloads) {
		// Merge old messages with new messages
		userDownloads.messages = new Map([...userDownloads.messages, ...messages]);
	} else {
		// Store new user download data
		activeDownloads.set(userId, {
			messages,
			links: validatedLinks,
		});
	}

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

			const remainingTime =
				link.status === 'downloading'
					? `ETA: ${calculateEta(link.size, link.downloaded, link.speed)}`
					: '';
			const progressMessage =
				`${link.status === 'completed' ? '✅ Download Completed:' : '📥 Downloading:'} ${displayName}\n` +
				`\n${link.progressBar || ''}` +
				`\n${link.status === 'downloading' ? `Speed: ${formatSpeed(link.speed)}` : ''}` +
				`\n${link.status === 'completed' ? '' : remainingTime}` +
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
						console.log('Too many requests to Telegram API, Limit reached');
					}
				}
			}

			if (link.status !== 'completed') {
				allCompleted = false;
			}
		}

		// Clear interval if all downloads are complete
		if (allCompleted && userDownloads.links.length === 0) {
			clearInterval(progressInterval);
			activeDownloads.delete(userId);
			ctx.session = removeCompletedDownloads(ctx.session);
			// Reset waiting state
			ctx.session = resetWaitingForLink(ctx.session);
			await ctx.reply('All downloads completed successfully! 🎉');
		}
	}, UPDATE_INTERVAL);
};
