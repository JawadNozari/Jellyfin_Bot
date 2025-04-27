import type { DownloadLink } from '@/types';
import type { Aria2Client } from './client';
import type { Aria2Polling } from './polling';
import type { Aria2RPCProcess } from './rpc';

export class Aria2Manager {
	private queue: DownloadLink[] = [];
	private activeDownloads = new Map<string, DownloadLink>();
	private isRunning = false;

	constructor(
		private readonly aria2Client: Aria2Client,
		private readonly rpcProcess: Aria2RPCProcess,
		private readonly poller: Aria2Polling,
	) {}

	async start() {
		await this.rpcProcess.start();
		this.isRunning = true;
		this.processQueue(); // start processing
	}

	stop() {
		this.isRunning = false;
		this.rpcProcess.stop();
		this.poller.clear();
	}
	addToQueue(link: DownloadLink) {
		this.queue.push(link);
		this.processQueue(); // trigger processing
	}
	private async processQueue() {
		if (!this.isRunning || this.activeDownloads.size >= 4) {
			return; // Limit to max concurrent downloads
		}

		const next = this.queue.shift();
		if (!next) {
			return;
		}

		try {
			const gid = await this.aria2Client.addUri([next.url], next.options || {});
			this.activeDownloads.set(gid, next);
			this.poller.start(gid, next); // Poll the new download

			console.log(`Started download: ${next.url}`);
		} catch (error) {
			console.error(`Failed to start download: ${next.url}`, error);
			this.queue.unshift(next); // Requeue it
		}

		// Keep processing more if slots are available
		this.processQueue();
	}
	async pauseAll() {
		for (const gid of this.activeDownloads.keys()) {
			await this.aria2Client.pause(gid);
		}
		console.log('All active downloads paused.');
	}

	async resumeAll() {
		for (const gid of this.activeDownloads.keys()) {
			await this.aria2Client.unpause(gid);
		}
		console.log('All paused downloads resumed.');
	}
	async addDownload(link: DownloadLink): Promise<string> {
		// Try to ensure aria2c is running with multiple attempts
		for (let attempts = 0; attempts < 3; attempts++) {
			await this.start();

			try {
				const isRunning = await this.aria2Client.isRunning();
				if (!isRunning) {
					console.debug(`Aria2c not running, attempt ${attempts + 1}/3. Waiting before retry...`);
					await new Promise((r) => setTimeout(r, 1000)); // Wait before retry
				}
				// aria2c is confirmed running, proceed with download
				const result: string = await this.aria2Client.addUri([link.url], {
					dir: link.downloadPath,
					'auto-file-renaming': false,
					'check-integrity': true,
					continue: true,
				});
				link.gid = result;
				this.poller.start(result, link);

				return result;
			} catch (error) {
				console.debug(`Error checking aria2c status (attempt ${attempts + 1}/3):`, error);
				await new Promise((r) => setTimeout(r, 1000)); // Wait before retry
			}
		}

		// If we get here after all attempts, throw error
		throw new Error('aria2c is not running! Failed after multiple attempts.');
	}

	async getStatus(gid: string) {
		return this.aria2Client.tellStatus(gid);
	}
	async pause(gid: string) {
		return this.aria2Client.pause(gid);
	}
	async unpause(gid: string) {
		return this.aria2Client.unpause(gid);
	}
	async remove(gid: string) {
		return this.aria2Client.removeDownload(gid);
	}
}
