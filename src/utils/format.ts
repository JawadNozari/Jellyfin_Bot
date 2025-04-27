export function formatSpeed(bytesPerSecond: number): string {
	if (bytesPerSecond >= 1024 * 1024 * 1024) {
		return `${(bytesPerSecond / (1024 * 1024 * 1024)).toFixed(2)} GB/s`;
	}
	if (bytesPerSecond >= 1024 * 1024) {
		return `${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`;
	}
	if (bytesPerSecond >= 1024) {
		return `${(bytesPerSecond / 1024).toFixed(2)} KB/s`;
	}
	return `${bytesPerSecond} B/s`;
}

export function formatSize(bytes: number): string {
	if (bytes >= 1024 * 1024 * 1024) {
		return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
	}
	if (bytes >= 1024 * 1024) {
		return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	}
	if (bytes >= 1024) {
		return `${(bytes / 1024).toFixed(2)} KB`;
	}
	return `${bytes} B`;
}

function formatEta(seconds: number | null): string {
	if (seconds === null) return '∞'; // Infinite or unknown

	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	const remainingSeconds = seconds % 60;

	if (hours > 0) {
		return `${hours}h ${remainingMinutes}m`;
	}
	if (minutes > 0) {
		return `${minutes}m ${remainingSeconds}s`;
	}
	return `${remainingSeconds}s`;
}

export function calculateEta(
	totalLength: number,
	completedLength: number,
	downloadSpeed: number,
): string | null {
	if (downloadSpeed <= 0) return null; // paused or stalled

	const remaining = totalLength - completedLength;
	const etaSeconds = remaining / downloadSpeed;

	return formatEta(Math.ceil(etaSeconds));
}
