import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const isVideoFile = (file: string) => file.endsWith('.mkv');

export function findAllMkvFiles(dir: string): string[] {
	let results: string[] = [];
	for (const entry of readdirSync(dir)) {
		if (entry.startsWith('.')) continue; // Skip hidden files/folders
		const fullPath = join(dir, entry);
		const stat = statSync(fullPath);
		if (stat.isDirectory()) {
			results = results.concat(findAllMkvFiles(fullPath));
		} else if (isVideoFile(fullPath)) {
			results.push(fullPath);
		}
	}
	return results;
}
