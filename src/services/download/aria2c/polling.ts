import type { DownloadLink } from '@/types';
import { parseSize, parseSpeed } from '@/utils/parse';
import { createProgressBar } from '@/utils/progressbar';
import { Terminaloutput } from '@/utils/terminalOutput';
import type { Aria2Client } from './client';

export class Aria2Polling {
	private intervals = new Map<string, ReturnType<typeof setInterval>>();
	private static activeDownloads = new Map<string, DownloadLink>();
	private aria2call: Aria2Client;
	private terminalOutput: Terminaloutput;
	constructor(aria2call: Aria2Client) {
		this.aria2call = aria2call;
		this.terminalOutput = new Terminaloutput(Aria2Polling.activeDownloads);
	}
	start(gid: string, link: DownloadLink): void {
		this.stop(gid);
		Aria2Polling.activeDownloads.set(link.url, link);
		const interval = setInterval(async () => {
			try {
				const response = await this.aria2call.tellStatus(gid);

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
				this.terminalOutput.update();
			} catch (err) {
				console.error(`Polling failed for ${link.url}`, err);
				link.status = 'failed';
				this.stop(gid);
				Aria2Polling.activeDownloads.delete(link.url);
				this.terminalOutput.update();
			}
		}, 250);

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
