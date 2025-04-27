export function parseSpeed(speedStr: string): number {
	const match = speedStr.match(/^(\d+(?:\.\d+)?)(\w+)\/s$/);
	if (!match) return 0;

	const [, value, unit] = match;
	const numValue = Number.parseFloat(value);

	switch (unit) {
		case 'B':
			return numValue;
		case 'KiB':
			return numValue * 1024;
		case 'MiB':
			return numValue * 1024 * 1024;
		case 'GiB':
			return numValue * 1024 * 1024 * 1024;
		default:
			return 0;
	}
}

export function parseSize(sizeStr: string): number {
	const match = sizeStr.match(/^(\d+(?:\.\d+)?)(\w+)$/);
	if (!match) return 0;

	const [, value, unit] = match;
	const numValue = Number.parseFloat(value);

	switch (unit) {
		case 'B':
			return numValue;
		case 'KiB':
			return numValue * 1024;
		case 'MiB':
			return numValue * 1024 * 1024;
		case 'GiB':
			return numValue * 1024 * 1024 * 1024;
		default:
			return 0;
	}
}
