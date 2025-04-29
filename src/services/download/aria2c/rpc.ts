import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import type { FileAllocationMode } from '@/types/aria2c';

const PORT = Number(process.env.RPC_PORT);
if (!PORT) {
	throw new Error('RPC_PORT is not defined. Please set it in your environment variables.');
}
const SECRET = process.env.RPC_SECRET;

if (!SECRET) {
	throw new Error('RPC_SECRET is not defined. Please set it in your environment variables.');
}
const DOWNLOAD_DIRECTORY = process.env.DOWNLOAD_DIR;
if (!DOWNLOAD_DIRECTORY || DOWNLOAD_DIRECTORY === undefined) {
	throw new Error('DOWNLOAD_DIR is not defined. Please set it in your environment variables.');
}
export class Aria2RPCProcess {
	private ready = false;
	private readonly RPC_PORT;
	private readonly RPC_SECRET;
	private readonly DOWNLOAD_DIR: string;
	private readonly SPLIT: number;
	private readonly TIMEOUT: number;
	private readonly MAX_RETRIES: number;
	private readonly RETRY_DELAY: number;
	private readonly ALLOW_RETRY: boolean;
	private readonly CONTINUE: boolean;
	private readonly FILE_ALLOCATION: FileAllocationMode;
	private readonly MAX_CONCURRENT_DOWNLOADS: number;

	private process: ReturnType<typeof spawn> | null = null;
	constructor() {
		this.SPLIT = 5;
		this.TIMEOUT = 30;
		this.MAX_RETRIES = 4;
		this.RPC_PORT = PORT;
		this.RETRY_DELAY = 3000;
		this.ALLOW_RETRY = true;
		this.CONTINUE = true;
		this.RPC_SECRET = SECRET;
		this.FILE_ALLOCATION = 'none';
		this.MAX_CONCURRENT_DOWNLOADS = 4;
		this.DOWNLOAD_DIR =
			DOWNLOAD_DIRECTORY ??
			(() => {
				throw new Error('DOWNLOAD_DIR is not defined.');
			})();
	}
	async start(): Promise<void> {
		if (this.process) {
			return this.waitForReady();
		}
		if (this.process && this.ready) {
			return Promise.resolve();
		}
		if (!existsSync(this.DOWNLOAD_DIR)) {
			await mkdir(this.DOWNLOAD_DIR, { recursive: true });
		}

		const aria2Config = [
			'--enable-rpc',
			`--rpc-listen-port=${this.RPC_PORT}`,
			`--rpc-secret=${this.RPC_SECRET}`,
			'--dir',
			this.DOWNLOAD_DIR,
			`--split=${this.SPLIT}`,
			`--allow-overwrite=${this.ALLOW_RETRY}`,
			`--timeout=${this.TIMEOUT}`,
			`--max-tries=${this.MAX_RETRIES}`,
			`--continue=${this.CONTINUE}`,
			'--retry-wait=10',
			'--connect-timeout=30',
			`--file-allocation=${this.FILE_ALLOCATION}`,
			'--auto-file-renaming=false',
			'--rpc-max-request-size=10M',
			`--max-concurrent-downloads=${this.MAX_CONCURRENT_DOWNLOADS}`,
			'--max-connection-per-server=2',
		];
		this.process = spawn('aria2c', aria2Config);

		this.process.stderr?.on('data', (data) => {
			const message = data.toString().trim();
			if (message) {
				console.error('aria2c stderr:', message);
			}
		});

		this.process.stdout?.on('data', (data) => {
			const message = data.toString().trim();
			if (message?.includes(`IPv4 RPC: listening on TCP port ${this.RPC_PORT}`)) {
				console.info('aria2c RPC server started successfully');
				this.ready = true;
			}
		});

		this.process.on('error', (error) => {
			console.error('Failed to start aria2c process:', error);
			this.ready = false;
		});

		this.process.on('exit', (code, signal) => {
			this.ready = false;
			// if (code !== 0) {
			// 	console.error(`aria2c process exited with code ${code} and signal ${signal}`);
			// }
		});

		await new Promise((r) => setTimeout(r, 1000));
		return this.waitForReady();
	}

	private async waitForReady(retries = 0): Promise<void> {
		if (this.ready) return Promise.resolve();
		if (!this.process) {
			throw new Error('aria2c process is not running');
		}
		const delayMs = this.RETRY_DELAY * Math.min(retries, 3);
		await new Promise((r) => setTimeout(r, delayMs));

		try {
			if (retries === 0) {
				console.debug(
					`Checking aria2c RPC server (attempt ${retries + 1}/${this.MAX_RETRIES + 1})...`,
				);
			}
			const res = await fetch(`http://localhost:${this.RPC_PORT}/jsonrpc`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: '1',
					method: 'aria2.getVersion',
					params: [`token:${this.RPC_SECRET}`],
				}),
				keepalive: true,
				signal: AbortSignal.timeout(5000),
			});

			if (res.ok) {
				try {
					const data = await res.json();
					if (data?.result) {
						if (!this.ready) {
							console.info(`aria2c RPC server is ready (version: ${data.result.version})`);
						}
						this.ready = true;
						return;
					}
				} catch (parseError) {
					console.error('Error parsing aria2c response:', parseError);
				}
			} else {
				console.error(`aria2c RPC server responded with status: ${res.status}`);
			}
		} catch (error) {
			if (retries === 0) {
				console.error(`Connection error (attempt ${retries + 1}/${this.MAX_RETRIES + 1}):`, error);
			}
		}
		if (!this.ready) {
			if (retries >= this.MAX_RETRIES) {
				this.stop();
				throw new Error(
					'aria2c RPC server failed to start after multiple attempts. Please ensure aria2c is installed and accessible.',
				);
			}

			return this.waitForReady(retries + 1);
		}
	}
	stop(): void {
		this.process?.kill('SIGKILL');
		this.process = null;
		this.ready = false;
	}
}
