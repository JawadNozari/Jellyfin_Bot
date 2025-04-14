import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createProgressBar } from "./utils/progressbar";
import { parseSpeed, parseSize } from "./utils/parse";
import type { DownloadLink } from "@/types/download";

const DOWNLOAD_DIR = join(process.cwd(), "downloads");
const RPC_PORT = 6800;
const RPC_SECRET = "jellefin_bot";
const MAX_RETRIES = 5;
const RETRY_DELAY = 1000; // 1 second

// Ensure downloads directory exists
if (!existsSync(DOWNLOAD_DIR)) {
	mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

// Track active downloads
const activeDownloads = new Map<string, DownloadLink>();

interface Aria2Status {
	completedLength: string;
	totalLength: string;
	downloadSpeed: string;
	status: string;
}

interface Aria2Response {
	result: Aria2Status;
	error?: {
		code: number;
		message: string;
	};
}

export class Aria2RPC {
	private rpcProcess: ReturnType<typeof spawn> | null = null;
	private isRunning = false;
	private isReady = false;
	private processError: Error | null = null;

	async start(): Promise<void> {
		if (this.isRunning) {
			await this.waitForReady();
			return;
		}

		return new Promise((resolve, reject) => {
			try {
				console.log("Starting aria2c RPC server...");
				try {
					execSync("pkill -f aria2c");
				} catch {
					// Ignore if no matching process found
				}
				// Start aria2c in RPC mode
				this.rpcProcess = spawn("aria2c", [
					"--enable-rpc",
					`--rpc-listen-port=${RPC_PORT}`,
					`--rpc-secret=${RPC_SECRET}`,
					"--dir",
					DOWNLOAD_DIR,
					"--max-connection-per-server=8",
					"--split=8",
					"--min-split-size=1M",
					"--max-concurrent-downloads=5",
					"--auto-file-renaming=false",
					"--continue=true",
					"--file-allocation=none",
				]);

				// Handle stderr
				if (this.rpcProcess.stderr) {
					this.rpcProcess.stderr.on("data", (data) => {
						const error = data.toString();
						console.error("aria2c stderr:", error);
						this.processError = new Error(error);
					});
				}

				// Handle process errors
				this.rpcProcess.on("error", (error) => {
					console.error("Failed to start aria2c RPC process:", error);
					this.processError = error;
					this.isRunning = false;
					this.isReady = false;
					reject(error);
				});

				// Handle process exit
				this.rpcProcess.on("close", (code) => {
					console.log(`aria2c RPC process exited with code ${code}`);
					this.isRunning = false;
					this.isReady = false;
					if (code !== 0) {
						const error =
							this.processError ||
							new Error(`aria2c RPC process exited with code ${code}`);
						console.error("aria2c RPC process error:", error);
						reject(error);
					}
				});

				this.isRunning = true;
				this.waitForReady().then(resolve).catch(reject);
			} catch (error) {
				console.error("Error starting aria2c RPC:", error);
				reject(error);
			}
		});
	}

	private async waitForReady(retries = 0): Promise<void> {
		if (this.isReady) return;

		try {
			console.log(
				`Attempting to connect to aria2c RPC server (attempt ${retries + 1}/${MAX_RETRIES})...`,
			);

			// Try to connect to the RPC server
			const response = await fetch(`http://localhost:${RPC_PORT}/jsonrpc`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: "1",
					method: "aria2.getVersion",
					params: [`token:${RPC_SECRET}`],
				}),
			});

			if (response.ok) {
				const data = await response.json();
				if (data.result) {
					console.log("aria2c RPC server is ready and responding");
					this.isReady = true;
					return;
				}
			}

			console.log(
				`RPC server not ready yet, waiting ${RETRY_DELAY}ms before retry...`,
			);
		} catch (error) {
			console.log(
				`Connection attempt failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}

		if (retries >= MAX_RETRIES) {
			const error = new Error(
				"Failed to start aria2c RPC server after multiple attempts",
			);
			console.error(error);
			throw error;
		}

		// Wait before retrying
		await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
		return this.waitForReady(retries + 1);
	}

	async stop(): Promise<void> {
		if (this.rpcProcess) {
			console.log("Stopping aria2c RPC server...");
			this.rpcProcess.kill("SIGKILL");
			this.rpcProcess = null;
			this.isRunning = false;
			this.isReady = false;
		}
	}

	async addDownload(link: DownloadLink): Promise<string> {
		if (!this.isRunning || !this.isReady) {
			await this.start();
		}

		try {
			const response = await fetch(`http://localhost:${RPC_PORT}/jsonrpc`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: "1",
					method: "aria2.addUri",
					params: [
						`token:${RPC_SECRET}`,
						[link.url],
						{
							dir: link.downloadPath,
							"max-connection-per-server": 16,
							split: 16,
							"min-split-size": "1M",
						},
					],
				}),
			});

			if (!response.ok) {
				throw new Error(
					`Failed to add download ${link.url}: ${response.statusText}`,
				);
			}

			const data = await response.json();
			if (data.error) {
				throw new Error(
					`Failed to add download ${link.url}: ${data.error.message}`,
				);
			}

			return data.result;
		} catch (error) {
			console.error("Error adding download:", error);
			throw error;
		}
	}

	async getStatus(gid: string): Promise<Aria2Response> {
		try {
			const response = await fetch(`http://localhost:${RPC_PORT}/jsonrpc`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: "1",
					method: "aria2.tellStatus",
					params: [`token:${RPC_SECRET}`, gid],
				}),
			});

			if (!response.ok) {
				throw new Error(`Failed to get status: ${response.statusText}`);
			}

			return response.json();
		} catch (error) {
			console.error("Error getting download status:", error);
			throw error;
		}
	}

	async updateDownloadStatus(link: DownloadLink): Promise<void> {
		if (!link.gid) return;

		try {
			const status = await this.getStatus(link.gid);
			if (status.error) {
				link.status = "failed";
				return;
			}

			const {
				completedLength,
				totalLength,
				downloadSpeed,
				status: ariaStatus,
			} = status.result;

			link.progress = (Number(completedLength) / Number(totalLength)) * 100;
			link.speed = parseSpeed(`${downloadSpeed}B/s`);
			link.size = parseSize(`${totalLength}B`);
			link.downloaded = parseSize(`${completedLength}B`);

			switch (ariaStatus) {
				case "active":
					link.status = "downloading";
					break;
				case "complete":
					link.status = "completed";
					break;
				case "error":
					link.status = "failed";
					break;
				default:
					link.status = "pending";
			}

			// Update progress bar
			link.progressBar = createProgressBar(link.progress);
		} catch (error) {
			console.error("Error updating download status:", error);
			link.status = "failed";
		}
	}
}

// Export a singleton instance
export const aria2RPC = new Aria2RPC();
