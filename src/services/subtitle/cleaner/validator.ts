import type { SubtitleFile } from '@/types';

export function isValidTimestamp(ts: string): boolean {
	return /^\d{2}:\d{2}:\d{2},\d{3}$/.test(ts);
}

export function validate(subs: SubtitleFile): string[] {
	const errors: string[] = [];

	for (let i = 0; i < subs.length; i++) {
		const line = subs[i];
		if (!line) {
			errors.push(`Missing subtitle at index ${i}`);
			continue;
		}

		const { id, start, end } = line;

		if (!Number.isInteger(id) || id <= 0) {
			errors.push(`Invalid ID at index ${i}: got "${id}"`);
		}
		if (id !== i + 1) {
			errors.push(`Unexpected ID at #${id}, expected ${i + 1}`);
			break;
		}

		if (!isValidTimestamp(start)) errors.push(`Invalid start time in #${id}`);
		if (!isValidTimestamp(end)) errors.push(`Invalid end time in #${id}`);
		if (start >= end) errors.push(`Start >= end in #${id}`);
		//@ts-ignore
		if (i > 0 && subs[i - 1] && subs[i - 1].end > start) {
			errors.push(`Overlap at #${id} with previous (#${subs[i - 1]?.id})`);
		}
	}

	return errors;
}
