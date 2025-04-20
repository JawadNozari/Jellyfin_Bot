import { Aria2RPCProcess } from './rpc';
import { Aria2Polling } from './polling';
import { callAria2 } from './client';
import type { DownloadLink } from '@/types/download';
import { Aria2Client } from './aria2Client';

const aria2 = new Aria2Client();
const processManager = new Aria2RPCProcess();
const poller = new Aria2Polling();

export class Aria2Manager {
	async start() {
		await processManager.start();
	}

	stop() {
		processManager.stop();
		poller.clear();
	}

	async addDownload(link: DownloadLink): Promise<string> {
		// Try to ensure aria2c is running with multiple attempts
		for (let attempts = 0; attempts < 3; attempts++) {
			await this.start();

			try {
				const isRunning = await aria2.isRunning();
				if (isRunning) {
					// aria2c is confirmed running, proceed with download
					const result: string = await callAria2('aria2.addUri', [
						[link.url],
						{
							dir: link.downloadPath,
							'auto-file-renaming': false,
							'check-integrity': true,
							continue: true,
						},
					]);

					link.gid = result;
					poller.start(result, link);

					return result;
				}

				// If we get here, aria2c is not running yet
				console.debug(`Aria2c not running, attempt ${attempts + 1}/3. Waiting before retry...`);
				await new Promise((r) => setTimeout(r, 1000)); // Wait before retry
			} catch (error) {
				console.debug(`Error checking aria2c status (attempt ${attempts + 1}/3):`, error);
				await new Promise((r) => setTimeout(r, 1000)); // Wait before retry
			}
		}

		// If we get here after all attempts, throw error
		throw new Error('aria2c is not running! Failed after multiple attempts.');
	}

	async getStatus(gid: string) {
		return aria2.tellStatus(gid);
	}
	async pause(gid: string) {
		return aria2.pause(gid);
	}
	async unpause(gid: string) {
		return aria2.unpause(gid);
	}
	async remove(gid: string) {
		return aria2.removeDownload(gid);
	}
}

export const aria2RPC = new Aria2Manager();
