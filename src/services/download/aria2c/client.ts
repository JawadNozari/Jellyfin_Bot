import type { Aria2Status, DownloadTask } from '@/types';

export class Aria2Client {
	private queue: DownloadTask[] = [];
	private isProcessing = false;
	constructor(
		private RPC_PORT: number,
		private RPC_SECRET: string,
	) {}
	async addUri(uris: string[], options: Record<string, unknown> = {}): Promise<string> {
		return await this.callAria2('aria2.addUri', [uris, options]);
	}
	addToQueue(uris: string[], options: Record<string, unknown> = {}) {
		this.queue.push({ uris, options });
		this.processQueue();
	}

	async tellStatus(gid: string): Promise<Aria2Status> {
		return await this.callAria2<Aria2Status>('aria2.tellStatus', [gid]);
	}
	async removeDownload(gid: string): Promise<void> {
		return await this.callAria2('aria2.remove', [gid]);
	}
	async pause(gid: string): Promise<void> {
		return await this.callAria2('aria2.pause', [gid]);
	}
	async unpause(gid: string): Promise<void> {
		return await this.callAria2('aria2.unpause', [gid]);
	}
	async getVersion(): Promise<Record<string, unknown>> {
		return await this.callAria2('aria2.getVersion');
	}

	async isRunning(): Promise<boolean> {
		try {
			await this.getVersion();
			return true;
		} catch {
			return false;
		}
	}

	private sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

	async retry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
		try {
			return await fn();
		} catch (err) {
			if (!retries) throw err;
			await this.sleep(delay);
			return this.retry(fn, retries - 1, delay * 1.5);
		}
	}

	async callAria2<T>(method: string, params: unknown[] = []): Promise<T> {
		return this.retry(async () => {
			const res = await fetch(`http://localhost:${this.RPC_PORT}/jsonrpc`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: '1',
					method,
					params: [`token:${this.RPC_SECRET}`, ...params],
				}),
				keepalive: true,
			});

			if (!res.ok) {
				throw Object.assign(new Error(`HTTP error! status: ${res.status}`), {
					cause: { status: res.status, statusText: res.statusText },
				});
			}

			const data = await res.json().catch(() => {
				throw new Error('Invalid JSON response');
			});

			if (data.error) {
				throw Object.assign(new Error(data.error.message || 'RPC Error'), { cause: data.error });
			}

			return data.result;
		});
	}
	private async processQueue() {
		if (this.isProcessing) return;
		this.isProcessing = true;

		while (this.queue.length > 0) {
			const task = this.queue.shift();
			if (!task) continue;

			try {
				console.log('Adding URI to Aria2:', task.uris);
				await this.addUri(task.uris, task.options || {});
			} catch (error) {
				console.error('Failed to add URI:', error);
				// Maybe push it back into the queue if you want retry logic?
			}
		}

		this.isProcessing = false;
	}
}
