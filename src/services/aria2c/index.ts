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
		await this.start();
		const isRunning = await aria2.isRunning();
		if (!isRunning) throw new Error('aria2c is not running!');
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
