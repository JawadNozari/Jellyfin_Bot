import type { SubtitleLine } from '@/types';

export function parseSRT(srt: string): SubtitleLine[] {
	const lines = srt.split(/\r?\n/);
	const result: SubtitleLine[] = [];

	let i = 0;
	while (i < lines.length) {
		const lineNumber = i + 1;

		const index = Number.parseInt(lines[i] ?? '');
		const timecode = lines[i + 1];
		const timeMatch = timecode?.match(
			/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/,
		);

		if (Number.isNaN(index) || !timeMatch) {
			i++;
			continue;
		}

		const start = timeMatch[1] as string;
		const end = timeMatch[2] as string;

		const textLines: string[] = [];
		i += 2;

		while (
			i < lines.length &&
			lines[i] !== undefined &&
			typeof lines[i] === 'string' &&
			lines[i]?.trim() !== ''
		) {
			textLines.push(lines[i] as string);
			i++;
		}

		result.push({
			id: index,
			start,
			end,
			text: textLines,
			lineNumber,
		});

		while (i < lines.length && lines[i]?.trim() === '') {
			i++;
		}
	}
	return result;
}
