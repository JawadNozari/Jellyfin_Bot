import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { RPC_PORT, RPC_SECRET, MAX_RETRIES, RETRY_DELAY, DOWNLOAD_DIR } from './constants';

export class Aria2RPCProcess {
	private process: ReturnType<typeof spawn> | null = null;
	private ready = false;

	async start(): Promise<void> {
		if (this.process) return this.waitForReady();

		try {
			execSync('pkill -f aria2c');
		} catch {}

		if (!existsSync(DOWNLOAD_DIR)) {
			await mkdir(DOWNLOAD_DIR, { recursive: true });
		}

		this.process = spawn('aria2c', [
			'--enable-rpc',
			`--rpc-listen-port=${RPC_PORT}`,
			`--rpc-secret=${RPC_SECRET}`,
			'--dir',
			DOWNLOAD_DIR,
			'--max-connection-per-server=16',
			'--split=8',
			'--min-split-size=1M',
			'--max-concurrent-downloads=3',
			'--auto-file-renaming=false',
			'--continue=true',
			'--allow-overwrite=true',
			'--file-allocation=none',
			'--max-tries=5',
			'--retry-wait=10',
			'--connect-timeout=30',
			'--timeout=30',
			'--max-file-not-found=5',
			'--max-tries=5',
			'--rpc-max-request-size=10M',
			'--rpc-save-upload-metadata=false',
			'--disable-ipv6=true',
		]);

		this.process.stderr?.on('data', (data) => console.error('aria2c stderr:', data.toString()));

		this.process.on('spawn', () => {
			this.ready = true;
		});
		this.process.on('exit', (code, signal) => {
			if (code !== 0) {
				console.error(`aria2c failed to start with exit code ${code} and signal ${signal}`);
			}
		});

		return this.waitForReady();
	}

	private async waitForReady(retries = 0): Promise<void> {
		if (this.ready) return;

		if (retries === 0) {
			await new Promise((r) => setTimeout(r, 1000));
		}

		try {
			const res = await fetch(`http://localhost:${RPC_PORT}/jsonrpc`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: '1',
					method: 'aria2.getVersion',
					params: [`token:${RPC_SECRET}`],
				}),
				keepalive: true,
			});

			if (res.ok) {
				const data = await res.json();
				if (data.result) {
					this.ready = true;
					return;
				}
			}
		} catch (error) {
			if (retries === 0) {
				console.error('Error while checking aria2c status:', error);
			}
		}

		if (!this.ready) {
			if (retries >= MAX_RETRIES) {
				throw new Error(
					'aria2c RPC server failed to start. Please ensure aria2c is installed and accessible.',
				);
			}
			await new Promise((r) => setTimeout(r, RETRY_DELAY));
			return this.waitForReady(retries + 1);
		}
	}

	stop(): void {
		this.process?.kill('SIGKILL');
		this.process = null;
		this.ready = false;
	}
}
