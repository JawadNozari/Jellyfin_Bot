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
