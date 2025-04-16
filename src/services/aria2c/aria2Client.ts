// src/services/aria2c/aria2Client.ts
import { callAria2 } from './client';

export class Aria2Client {
	async addUri(uris: string[], options: Record<string, unknown> = {}): Promise<string> {
		return await callAria2('aria2.addUri', [uris, options]);
	}

	async tellStatus(gid: string): Promise<Record<string, unknown>> {
		return await callAria2('aria2.tellStatus', [gid]);
	}

	async removeDownload(gid: string): Promise<Record<string, unknown>> {
		return await callAria2('aria2.remove', [gid]);
	}

	async pause(gid: string): Promise<Record<string, unknown>> {
		return await callAria2('aria2.pause', [gid]);
	}

	async unpause(gid: string): Promise<Record<string, unknown>> {
		return await callAria2('aria2.unpause', [gid]);
	}

	async getVersion(): Promise<Record<string, unknown>> {
		return await callAria2('aria2.getVersion');
	}

	async isRunning(): Promise<boolean> {
		try {
			await this.getVersion();
			return true;
		} catch {
			return false;
		}
	}
}
