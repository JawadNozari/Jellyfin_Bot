import type { DownloadLink } from '@/types';
import { COLORS } from './colors';
import { calculateEta, formatSize, formatSpeed } from './format';

export class Terminaloutput {
	private readonly downloadLink: Map<string, DownloadLink>;
	constructor(downloadLink: Map<string, DownloadLink>) {
		this.downloadLink = downloadLink;
	}

	private readonly formatSeparator = (): string => `${COLORS.gray}${'─'.repeat(80)}${COLORS.reset}`;
	private readonly getStatusEmoji = (status: string): string =>
		this.STATUS_EMOJIS[status as keyof typeof this.STATUS_EMOJIS] || this.STATUS_EMOJIS.pending;
	private readonly getStatusDownload = (status: string): string =>
		status.charAt(0).toUpperCase() + status.slice(1);
	private lastLineCount = 0;
	private isFirstUpdate = true;
	TerminalOutput = (): void => {
		try {
			const output = this.formatTerminalOutput();
			const lines = output.split('\n');

			if (this.isFirstUpdate) {
				process.stdout.write(`\n${output}\n`);
				this.isFirstUpdate = false;
			} else {
				process.stdout.write(`\x1b[${this.lastLineCount}F`);
				process.stdout.write('\x1b[J');
				process.stdout.write(`${output}\n`);
			}
			this.lastLineCount = lines.length;
		} catch (error) {
			console.error('Error updating terminal output:', error);
		}
	};
	update = (): void => {
		this.TerminalOutput();
	};
	private readonly getProgressColor = (progress: number): string => {
		if (progress >= 100) return COLORS.green;
		if (progress >= 75) return COLORS.cyan;
		if (progress >= 50) return COLORS.yellow;
		if (progress >= 25) return COLORS.magenta;
		return COLORS.red;
	};

	private readonly getSpeedColor = (speed: number): string => {
		if (speed > 30 * 1024 * 1024) return COLORS.green; // > 30 MB/s
		if (speed > 20 * 1024 * 1024) return COLORS.yellow; // > 20 MB/s
		return COLORS.red; // <= 20 MB/s
	};

	private readonly formatDownloadEntry = (url: string, link: DownloadLink): string => {
		const statusEmoji = this.getStatusEmoji(link.status);
		const progressColor = this.getProgressColor(link.progress);
		const speedColor = this.getSpeedColor(link.speed);
		const truncatedUrl = url.length > 50 ? `${url.substring(0, 47)}...` : url;
		return (
			`${this.formatSeparator()}` +
			`\n${COLORS.bold}${statusEmoji} ${this.getStatusDownload(link.status)}${COLORS.reset}` +
			`\nURL: ${COLORS.gray}${truncatedUrl}${COLORS.reset}` +
			`\n\n${link.progressBar || ''}  |  ` +
			`Speed: ${speedColor}${formatSpeed(link.speed)}${COLORS.reset}  |  ` +
			`Downloaded: ${progressColor}${formatSize(link.downloaded)}/${formatSize(link.size)}${COLORS.reset}  |  ` +
			`ETA: ${link.ETA}`
		);
	};
	private readonly formatTerminalOutput = (): string => {
		const entries = Array.from(this.downloadLink.entries())
			.map(([url, link]) => this.formatDownloadEntry(url, link))
			.join('\n\n');
		return `\n${entries}\n${this.formatSeparator()}`;
	};

	// Status emojis
	STATUS_EMOJIS = {
		downloading: '⬇️',
		completed: '✅',
		failed: '❌',
		pending: '⏳',
	} as const;
}
