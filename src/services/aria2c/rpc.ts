import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { RPC_PORT, RPC_SECRET, MAX_RETRIES, RETRY_DELAY, DOWNLOAD_DIR } from './constants';

export class Aria2RPCProcess {
	private process: ReturnType<typeof spawn> | null = null;
	private ready = false;

	async start(): Promise<void> {
		if (this.process && this.ready) {
			// Process is already running and ready
			return Promise.resolve();
		}

		// If process exists but isn't ready, wait for it
		if (this.process) {
			return this.waitForReady();
		}

		// Kill any existing aria2c processes to avoid port conflicts
		try {
			console.debug('Stopping any existing aria2c processes...');
			execSync('pkill -f aria2c', { stdio: 'ignore' });
			// Give it a short time to fully terminate
			await new Promise((r) => setTimeout(r, 500));
		} catch (error) {
			// Ignore errors - it's OK if no processes were found to kill
		}

		// Ensure download directory exists
		if (!existsSync(DOWNLOAD_DIR)) {
			console.debug(`Creating download directory: ${DOWNLOAD_DIR}`);
			await mkdir(DOWNLOAD_DIR, { recursive: true });
		}

		console.debug('Starting aria2c process...');
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

		this.process.stderr?.on('data', (data) => {
			const message = data.toString().trim();
			if (message) {
				console.error('aria2c stderr:', message);
			}
		});

		this.process.stdout?.on('data', (data) => {
			const message = data.toString().trim();
			if (message?.includes('RPC: listening on')) {
				console.info('aria2c RPC server started successfully');
				this.ready = true;
			}
		});

		this.process.on('spawn', () => {
			console.debug('aria2c process spawned');
		});

		this.process.on('error', (error) => {
			console.error('Failed to start aria2c process:', error);
			this.ready = false;
		});

		this.process.on('exit', (code, signal) => {
			this.ready = false;
			if (code !== 0) {
				console.error(`aria2c process exited with code ${code} and signal ${signal}`);
			}
		});

		// Wait a bit for process to start before checking RPC
		await new Promise((r) => setTimeout(r, 1000));
		return this.waitForReady();
	}

	private async waitForReady(retries = 0): Promise<void> {
		// If already marked as ready, we can return immediately
		if (this.ready) return Promise.resolve();

		// If the process isn't running at all, we can't wait for it
		if (!this.process) {
			throw new Error('aria2c process is not running');
		}

		// Add an initial delay that increases with retry count
		const delayMs = retries === 0 ? 1000 : RETRY_DELAY * Math.min(retries, 3);
		await new Promise((r) => setTimeout(r, delayMs));

		try {
			// Only log on first attempt or when debugging
			if (retries === 0) {
				console.debug(`Checking aria2c RPC server (attempt ${retries + 1}/${MAX_RETRIES + 1})...`);
			}
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
				signal: AbortSignal.timeout(5000), // 5 second timeout
			});

			if (res.ok) {
				try {
					const data = await res.json();
					if (data?.result) {
						// Only log on first success
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
			// Only log serious errors or first attempt
			if (retries === 0) {
				console.error(`Connection error (attempt ${retries + 1}/${MAX_RETRIES + 1}):`, error);
			}
		}

		// If we reach here, the server isn't ready yet
		if (!this.ready) {
			if (retries >= MAX_RETRIES) {
				this.stop(); // Stop the failed process
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
