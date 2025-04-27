import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { DownloadLink } from '@/types';
import { extractMediaInfo } from '@/utils/extractMediaInfo';
import { Aria2Manager } from './aria2c';
import { Aria2Client } from './aria2c/client';
import { Aria2Polling } from './aria2c/polling';
import { Aria2RPCProcess } from './aria2c/rpc';

const PORT = Number(process.env.RPC_PORT);
if (!PORT) {
	throw new Error('RPC_PORT is not defined. Please set it in your environment variables.');
}
const SECRET = process.env.RPC_SECRET;
if (!SECRET) {
	throw new Error('RPC_SECRET is not defined. Please set it in your environment variables.');
}
const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || './downloads';
if (!DOWNLOAD_DIR) {
	throw new Error('DOWNLOAD_DIR is not defined. Please set it in your environment variables.');
}
const UPDATE_INTERVAL = 1000;
const MAX_CONCURRENT_DOWNLOADS = 4;
const pendingDownloads: DownloadLink[] = [];
const activeDownloads = new Map<string, DownloadLink>();

const aria2 = new Aria2Client(PORT, SECRET);
const rpcProcess = new Aria2RPCProcess();
const poller = new Aria2Polling(aria2);
const manager = new Aria2Manager(aria2, rpcProcess, poller);

export function validateLinks(links: string[]): DownloadLink[] {
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
			const season = mediaInfo.show.season.toString().padStart(2, '0');
			downloadPath = join(DOWNLOAD_DIR, 'Shows', mediaInfo.show.title, `S${season}`);
		}
		if (!existsSync(downloadPath)) {
			mkdirSync(downloadPath, { recursive: true });
		}

		return {
			url,
			status: 'pending',
			progress: 0,
			progressBar: '',
			ETA: '',
			remaining: 0,
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
		const gid = await manager.addDownload(link);
		link.gid = gid;
		activeDownloads.set(link.url, link);
	} catch (error) {
		console.error(`Failed to add download ${link.url}:`, error);
		link.status = 'failed';
	}
}

export async function processDownload(links: DownloadLink[]): Promise<void> {
	pendingDownloads.push(...links);
	const progressInterval = setInterval(async () => {
		let allCompleted = true;

		for (const link of activeDownloads.values()) {
			if (link.status !== 'completed' && link.status !== 'failed') {
				allCompleted = false;
			}
			if (link.status === 'completed' || link.status === 'failed') {
				await startNextDownload();
			}
		}

		// Try to start more downloads if we have capacity
		await startNextDownload();
		if (allCompleted && pendingDownloads.length === 0) {
			clearInterval(progressInterval);
		}
	}, UPDATE_INTERVAL);
}

export async function getDownloadStatus(gid: string): Promise<DownloadLink | undefined> {
	const getStatus = await manager.getStatus(gid);
	if (getStatus && 'url' in getStatus) {
		const { url } = getStatus;
		if (activeDownloads.has(url as string)) {
			return activeDownloads.get(url as string);
		}
	}
	return undefined;
}

export function getActiveDownloads(): DownloadLink[] {
	return Array.from(activeDownloads.values());
}
