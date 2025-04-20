import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { extractMediaInfo } from './utils/extractMediaInfo';
import { formatSpeed, formatSize } from './utils/format';
import type { DownloadLink } from '@/types/download';
// import { aria2RPC } from './aria2RPC';
import { aria2RPC } from './aria2c';
const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || './downloads';
const UPDATE_INTERVAL = 1000; // Update every second
const MAX_CONCURRENT_DOWNLOADS = 4; // Maximum number of concurrent downloads

// Track active downloads
const activeDownloads = new Map<string, DownloadLink>();
const pendingDownloads: DownloadLink[] = [];

export function validateLinks(links: string[]): DownloadLink[] {
	// Ensure downloads directory exists
	if (!existsSync(DOWNLOAD_DIR)) {
		//console.log('Creating downloads directory...');
		async () => await mkdirSync(DOWNLOAD_DIR, { recursive: true });
	}
	return links.map((url) => {
		const fileName = url.split('/').pop() || 'unknown';
		const mediaInfo = extractMediaInfo(fileName);
		let downloadPath = DOWNLOAD_DIR;

		if (mediaInfo.movie) {
			downloadPath = join(
				DOWNLOAD_DIR,
				'Movies',
				`${mediaInfo.movie.title}_${mediaInfo.movie.year}`,
			);
		} else if (mediaInfo.show) {
			downloadPath = join(DOWNLOAD_DIR, 'Shows', mediaInfo.show.title, `S${mediaInfo.show.season}`);
		}

		// Ensure the directory exists
		if (!existsSync(downloadPath)) {
			mkdirSync(downloadPath, { recursive: true });
		}

		return {
			url,
			status: 'pending',
			progress: 0,
			progressBar: '',
			speed: 0,
			size: 0,
			downloaded: 0,
			downloadPath,
			mediaInfo,
		};
	});
}

async function startNextDownload(): Promise<void> {
	// Check if we can start more downloads
	const activeCount = Array.from(activeDownloads.values()).filter(
		(link) => link.status === 'downloading',
	).length;

	if (activeCount >= MAX_CONCURRENT_DOWNLOADS || pendingDownloads.length === 0) {
		return;
	}

	// Get the next pending download
	const link = pendingDownloads.shift();
	if (!link) return;

	try {
		link.status = 'downloading';
		const gid = await aria2RPC.addDownload(link);
		link.gid = gid;
		activeDownloads.set(link.url, link);
	} catch (error) {
		console.error(`Failed to add download ${link.url}:`, error);
		link.status = 'failed';
	}
}

export async function processDownload(links: DownloadLink[]): Promise<void> {
	// Add all links to pending downloads
	pendingDownloads.push(...links);

	// Set up progress update interval
	const progressInterval = setInterval(async () => {
		let allCompleted = true;

		// Update status of active downloads
		for (const link of activeDownloads.values()) {
			if (link.gid) {
				const status = await aria2RPC.getStatus(link.gid);
				//console.log(status);
			}

			if (link.status !== 'completed' && link.status !== 'failed') {
				allCompleted = false;
			} else if (link.status === 'completed' || link.status === 'failed') {
				// Try to start next download when one completes or fails
				await startNextDownload();
			}
		}

		// Try to start more downloads if we have capacity
		await startNextDownload();

		// Clear interval if all downloads are complete
		if (allCompleted && pendingDownloads.length === 0) {
			clearInterval(progressInterval);
		}
	}, UPDATE_INTERVAL);
}

export function getDownloadStatus(): string {
	const active = getActiveDownloads();
	if (active.length === 0) {
		return 'No active downloads';
	}

	return active
		.map((link) => {
			const fileName = link.url.split('/').pop() || 'unknown';
			const mediaInfo = extractMediaInfo(fileName);
			let displayName = fileName;

			if (mediaInfo.movie) {
				displayName = `${mediaInfo.movie.title} (${mediaInfo.movie.year})`;
			} else if (mediaInfo.show) {
				displayName = `${mediaInfo.show.title} S${mediaInfo.show.season}E${mediaInfo.show.episode}`;
			}

			return (
				`${displayName}:` +
				`${link.progressBar || ''}` +
				`\nProgress: ${link.progress.toFixed(1)}%` +
				`\nSpeed: ${formatSpeed(link.speed)}` +
				`\nSize: ${formatSize(link.downloaded)}/${formatSize(link.size)}`
			);
		})
		.join('\n\n');
}

export function getActiveDownloads(): DownloadLink[] {
	return Array.from(activeDownloads.values());
}
