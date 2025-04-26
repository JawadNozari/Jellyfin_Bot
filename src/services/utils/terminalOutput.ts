import type { DownloadLink } from '@/types/download';
import { formatSpeed, formatSize, formatTime } from './format';
// ANSI color codes
const COLORS = {
	reset: '\x1b[0m',
	bold: '\x1b[1m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m',
	yellow: '\x1b[33m',
	green: '\x1b[32m',
	red: '\x1b[31m',
	magenta: '\x1b[35m',
	gray: '\x1b[90m',
} as const;

// Status emojis
const STATUS_EMOJIS = {
	downloading: '⏬',
	completed: '✅',
	failed: '❌',
	pending: '⏳',
} as const;

// Helper functions for formatting
const formatHeader = (): string =>
	`${COLORS.bold}${COLORS.blue}=== Active Downloads ===${COLORS.reset}\n`;

const formatSeparator = (): string => `${COLORS.gray}${'─'.repeat(80)}${COLORS.reset}`;

const getStatusEmoji = (status: string): string =>
	STATUS_EMOJIS[status as keyof typeof STATUS_EMOJIS] || STATUS_EMOJIS.pending;
const getStatusDownload = (status: string): string =>
	status.charAt(0).toUpperCase() + status.slice(1);

const getProgressColor = (progress: number): string => {
	if (progress >= 100) return COLORS.green;
	if (progress >= 75) return COLORS.cyan;
	if (progress >= 50) return COLORS.yellow;
	if (progress >= 25) return COLORS.magenta;
	return COLORS.red;
};

const getSpeedColor = (speed: number): string => {
	if (speed > 30 * 1024 * 1024) return COLORS.green; // > 30 MB/s
	if (speed > 20 * 1024 * 1024) return COLORS.yellow; // > 20 MB/s
	return COLORS.red; // <= 20 MB/s
};

const calculateRemainingTime = (total: number, downloaded: number, speed: number): string => {
	if (speed === 0 || total === 0) return '--:--';
	const remainingBytes = total - downloaded;
	const remainingSeconds = Math.ceil(remainingBytes / speed);
	return formatTime(remainingSeconds);
};

// Format a single download entry
const formatDownloadEntry = (url: string, link: DownloadLink): string => {
	const statusEmoji = getStatusEmoji(link.status);
	const progressColor = getProgressColor(link.progress);
	const speedColor = getSpeedColor(link.speed);

	// Truncate URL to fit in terminal
	const truncatedUrl = url.length > 50 ? `${url.substring(0, 47)}...` : url;

	const remainingTime =
		link.status === 'downloading'
			? `  |  ETA: ${calculateRemainingTime(link.size, link.downloaded, link.speed)}`
			: '';

	return (
		`${formatSeparator()}` +
		`\n${COLORS.bold}${statusEmoji} ${getStatusDownload(link.status)}${COLORS.reset}` +
		`\nURL: ${COLORS.gray}${truncatedUrl}${COLORS.reset}` +
		`\n\n${link.progressBar || ''}  |  Speed: ${speedColor}${formatSpeed(link.speed)}${COLORS.reset}  |  Downloaded: ${progressColor}${formatSize(link.downloaded)}/${formatSize(link.size)}${COLORS.reset}${remainingTime}`
	);
};

// Main formatting function
export const formatTerminalOutput = (downloads: Map<string, DownloadLink>): string => {
	if (downloads.size === 0) {
		return `${COLORS.cyan}No active downloads${COLORS.reset}`;
	}

	const entries = Array.from(downloads.entries())
		.map(([url, link]) => formatDownloadEntry(url, link))
		.join('\n\n');

	return `${formatHeader()}${entries}\n${formatSeparator()}`;
};

let lastLineCount = 0;
let isFirstUpdate = true;

// Update terminal output
export const updateTerminalOutput = (downloads: Map<string, DownloadLink>): void => {
	try {
		const output = formatTerminalOutput(downloads);
		const lines = output.split('\n');

		if (isFirstUpdate) {
			// For the first update, just print the output
			process.stdout.write(`\n${output}\n`);
			isFirstUpdate = false;
		} else {
			// Move cursor up by the number of lines in the previous output
			process.stdout.write(`\x1b[${lastLineCount}F`);
			// Clear from cursor to end of screen
			process.stdout.write('\x1b[J');
			// Write the new output
			process.stdout.write(`${output}\n`);
		}

		// Store the number of lines for next update
		lastLineCount = lines.length;
	} catch (error) {
		console.error('Error updating terminal output:', error);
	}
};
