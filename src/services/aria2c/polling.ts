import type { DownloadLink } from '@/types/download';
import type { Aria2Status } from './types';
import { callAria2 } from './client';
import { createProgressBar } from '../utils/progressbar';
import { parseSpeed, parseSize } from '../utils/parse';
import { updateTerminalOutput } from '../utils/terminalOutput';

export class Aria2Polling {
	private intervals = new Map<string, ReturnType<typeof setInterval>>();
	private static activeDownloads = new Map<string, DownloadLink>();

	start(gid: string, link: DownloadLink): void {
		this.stop(gid);
		Aria2Polling.activeDownloads.set(link.url, link);

		const interval = setInterval(async () => {
			try {
				const response = await callAria2<Aria2Status>('aria2.tellStatus', [gid]);

				if (!response || typeof response !== 'object') {
					throw new Error('Invalid response from aria2c');
				}

				const {
					completedLength = '0',
					totalLength = '0',
					downloadSpeed = '0',
					status: ariaStatus = 'unknown',
					errorMessage = '',
				} = response;

				if (ariaStatus === 'complete' && +completedLength === +totalLength) {
					link.status = 'completed';
					link.progress = 100;
					this.stop(gid);
					Aria2Polling.activeDownloads.delete(link.url);
				} else if (ariaStatus === 'error') {
					link.status = 'failed';
					console.error(`Error: ${errorMessage}`);
					this.stop(gid);
					Aria2Polling.activeDownloads.delete(link.url);
				} else {
					link.progress = (+completedLength / +totalLength) * 100;
					link.speed = parseSpeed(`${downloadSpeed}B/s`);
					link.size = parseSize(`${totalLength}B`);
					link.downloaded = parseSize(`${completedLength}B`);
					link.status = ariaStatus === 'active' ? 'downloading' : 'pending';
				}

				link.progressBar = createProgressBar(link.progress);
				updateTerminalOutput(Aria2Polling.activeDownloads);
			} catch (err) {
				console.error(`Polling failed for ${link.url}`, err);
				link.status = 'failed';
				this.stop(gid);
				Aria2Polling.activeDownloads.delete(link.url);
				updateTerminalOutput(Aria2Polling.activeDownloads);
			}
		}, 1000); // Poll every second for terminal updates

		this.intervals.set(gid, interval);
	}

	stop(gid: string): void {
		const i = this.intervals.get(gid);
		if (i) clearInterval(i);
		this.intervals.delete(gid);
	}

	clear(): void {
		this.intervals.forEach(clearInterval);
		this.intervals.clear();
		Aria2Polling.activeDownloads.clear();
	}
}
