import { findAllMkvFiles } from './searchFolders'; // Your recursive file scanner
import { getSubtitleTracks } from './scanForSubtitles'; // Uses mkvmerge
import { getAudioTracks } from './scanForAudio';
import readline from 'node:readline';
import path from 'node:path';
const PERSIAN_LANG_CODES = ['per', 'fa'];

export function findFilesMissingPersianSubtitles(rootDir: string): string[] {
	const files = findAllMkvFiles(rootDir);
	const missing: string[] = [];
	console.log(`🔍 Searching for files missing Persian subtitles in: ${rootDir}`);
	for (const file of files) {
		print(`🔍 Scanning: ${file}`);
		const subtitleTracks = getSubtitleTracks(file);
		const audioTracks = getAudioTracks(file);

		if (audioTracks.length === 0) {
			continue;
		}
		// Check if any subtitle track is Persian

		if (subtitleTracks.length === 0) {
			missing.push(file);
			continue;
		}
		const hasPersianAudio = audioTracks.some((track) =>
			PERSIAN_LANG_CODES.includes(track.language?.toLowerCase()),
		);
		if (hasPersianAudio) {
			continue;
		}
		const hasPersian = subtitleTracks.some((track) =>
			PERSIAN_LANG_CODES.includes(track.language?.toLowerCase()),
		);

		if (!hasPersian) {
			missing.push(file);
		}
	}

	return missing;
}

function print(message: string) {
	readline.cursorTo(process.stdout, 0);
	readline.clearLine(process.stdout, 0);
	process.stdout.write(`${message}`);
}
