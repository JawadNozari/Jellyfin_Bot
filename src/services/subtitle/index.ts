import * as path from 'node:path';
import { existsSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import * as color from './utils/consoleColors';
import { SubtitleProcessor } from './utils/subtitleProcessor';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { scanPersianSubtitlesOnly, printSummary } from './scanner';
import { findFilesMissingPersianSubtitles } from './scanner/findFilesMissingSubtitle';
//  import { SubsourceApi } from './providers/subsourceAPI';
const Regex_Shows = /^(?<title>.*?)S(?<season>\d{1,2})E(?<episode>\d{2,3}|\d)/i;
const Regex_Movies = /^(?<title>.+?)(?:\.|_)(?<year>(?:19|20)\d{2})/i;

// const api = new SubsourceApi();
// const response = await api.searchMovie("tt1375666"); // Inception
// if (api.responseStatusOk(response)) {
// 	console.log("✅ Movie search success:", response.data);
// } else {
// 	console.log("❌ Failed to fetch movie");
// }
function extractMeta(filename: string) {
	const showMatch = filename.match(Regex_Shows);
	if (showMatch?.groups) {
		return {
			type: 'show',
			title: showMatch.groups.title?.toLowerCase().replace(/[\W_]+/g, ''),
			season: showMatch.groups.season,
			episode: showMatch.groups.episode,
		};
	}

	const movieMatch = filename.match(Regex_Movies);
	if (movieMatch?.groups) {
		return {
			type: 'movie',
			title: movieMatch.groups.title?.toLowerCase().replace(/[\W_]+/g, ''),
			year: movieMatch.groups.year,
		};
	}

	return null;
}
async function safeRename(oldPath: string, newPath: string): Promise<void> {
	try {
		const content = await readFile(oldPath);
		await writeFile(newPath, content);

		if (existsSync(newPath)) {
			try {
				await unlink(oldPath);
			} catch (unlinkError) {
				console.warn(
					`Warning: Could not delete original file ${oldPath}. You may want to delete it manually.`,
				);
			}
		} else {
			throw new Error(`Failed to verify new file at ${newPath}`);
		}
	} catch (error) {
		throw new Error(`Safe rename failed: ${error}`);
	}
}

// const results = scanPersianSubtitlesOnly('/Volumes/SSD/Jellyfin/Media/');
// printSummary(results);

async function processFolder(folderPath: string) {
	//console.log(`✅ Found Subtitle in: ${color.SKY}${folderPath}${color.RESET}`);

	const subtitleFiles = (await readdir(folderPath))
		.filter((f) => path.extname(f) === '.srt' && !f.startsWith('._') && !f.startsWith('.'))
		.sort((a, b) => a.localeCompare(b));
	const videoFiles = (await readdir(folderPath))
		.filter(
			(f) =>
				['.mkv', '.mp4', '.avi'].includes(path.extname(f)) &&
				!f.startsWith('._') &&
				!f.startsWith('.'),
		)
		.sort((a, b) => a.localeCompare(b));
	if (subtitleFiles.length === 0) {
		// console.log('⚠️  No subtitles found in the specified directory.');
		return;
	}
	if (videoFiles.length === 0) {
		console.log('⚠️  No video files found in the specified directory.');
		return;
	}

	for (const sub of subtitleFiles) {
		const subMeta = extractMeta(sub);
		if (!subMeta) {
			console.warn(`⚠️  Skipping unmatched subtitle: ${color.SKY}${sub}${color.RESET}`);
			continue;
		}

		const match = videoFiles.find((vid) => {
			const vidMeta = extractMeta(vid);
			if (!vidMeta) return false;

			if (subMeta.type === 'show' && vidMeta.type === 'show') {
				return (
					vidMeta.title === subMeta.title &&
					vidMeta.season === subMeta.season &&
					vidMeta.episode === subMeta.episode
				);
			}

			if (subMeta.type === 'movie' && vidMeta.type === 'movie') {
				return vidMeta.title === subMeta.title && vidMeta.year === subMeta.year;
			}

			return false;
		});

		if (!match) {
			console.warn(`❌ No match found for subtitle: ${color.SKY}${sub}${color.RESET}`);
			continue;
		}

		const videoPath = path.join(folderPath, match);
		const oldSubtitlePath = path.join(folderPath, sub);
		const newSubtitleBase = path.parse(match).name;
		const newSubtitlePath = path.join(folderPath, `${newSubtitleBase}.srt`);

		if (oldSubtitlePath !== newSubtitlePath) {
			try {
				await safeRename(oldSubtitlePath, newSubtitlePath);
			} catch (error) {
				console.error(`❌ Failed to rename: ${error}`);
				// continue;
			}
		}
		const subLanguage = 'Persian';
		const audioLanguage = 'English';

		console.log(`\n${('-').repeat(100)}\n`);
		console.log(`Subtitle: ${color.SKY}${sub}${color.RESET}`);
		console.log(`Video:    ${color.SKY}${match}${color.RESET}\n`);
		console.log(`Preferred Subtitle Language: ${color.GREEN}${subLanguage}${color.RESET}`);
		console.log(`Preferred Audio Language:    ${color.GREEN}${audioLanguage}${color.RESET}\n`);
		// Continue with your SubtitleProcessor
		const processor = new SubtitleProcessor({
			videoPath: videoPath,
			subtitlePath: newSubtitlePath,
			subtitleLang: subLanguage,
			audioLang: audioLanguage,
			keepSubtitle: false,
			// shouldConvert: !disableConvert,
			// shouldClean: !disableClean,
			// shouldSync: !disableSync,
		});
		await processor.process();
	}
}
export async function searchAndProcessFolders(
	dir: string,
	processFolder: (folderPath: string) => void | Promise<void>,
): Promise<void> {
	const entries = await readdir(dir, { withFileTypes: true });

	let containsTargetFile = false;

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			// Recursively search subfolders
			await searchAndProcessFolders(fullPath, processFolder);
		} else if (entry.isFile()) {
			const ext = path.extname(entry.name).toLowerCase();
			if (ext === '.srt') {
				containsTargetFile = true;
			}
		}
	}

	if (containsTargetFile) {
		await processFolder(dir);
	}
}

// Call it on a root folder
await searchAndProcessFolders('/Volumes/SSD/Jellyfin/Media', processFolder)
	.then(() => console.log('\n\n✅ Search completed.\n\n'))
	.catch(console.error);

	
const missing = findFilesMissingPersianSubtitles('/Volumes/SSD/Jellyfin/Media/');
if (missing.length) {
	for (const f of missing) {
		console.log('❌  ', f);
	}
	console.log(`\n📂 ${missing.length} file(s) missing Persian subtitles:\n`);
} else {
	console.log('✅ All files contain Persian subtitles!');
}
