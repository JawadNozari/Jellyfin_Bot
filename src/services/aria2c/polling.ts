import type { DownloadLink } from '@/types/download';
import type { Aria2Status } from './types';
import { callAria2 } from './client';
import { createProgressBar } from '../utils/progressbar';
import { parseSpeed, parseSize } from '../utils/parse';

export class Aria2Polling {
	private intervals = new Map<string, ReturnType<typeof setInterval>>();

	start(gid: string, link: DownloadLink): void {
		this.stop(gid);

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
				} else if (ariaStatus === 'error') {
					link.status = 'failed';
					console.error(`Error: ${errorMessage}`);
					this.stop(gid);
				} else {
					link.progress = (+completedLength / +totalLength) * 100;
					link.speed = parseSpeed(`${downloadSpeed}B/s`);
					link.size = parseSize(`${totalLength}B`);
					link.downloaded = parseSize(`${completedLength}B`);
					link.status = ariaStatus === 'active' ? 'downloading' : 'pending';
				}

				link.progressBar = createProgressBar(link.progress);
			} catch (err) {
				console.error(`Polling failed for ${link.url}`, err);
				link.status = 'failed';
				this.stop(gid);
			}
		}, 1000);

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
	}
}
