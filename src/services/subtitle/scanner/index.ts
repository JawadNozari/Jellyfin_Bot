import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

interface SubtitleTrack {
	language: string;
	codec: string;
}

interface SubtitleInfo {
	path: string;
	subtitleTracks: SubtitleTrack[];
}

const isVideoFile = (file: string) =>
	file.endsWith('.mkv') || file.endsWith('.mp4') || file.endsWith('.avi');

function findAllMkvFiles(dir: string): string[] {
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

function getSubtitleTracks(file: string): SubtitleTrack[] {
	try {
		console.log(`🔍 Reading subtitles from: ${file}`);
		const output = execSync(`mkvmerge -J "${file}"`, { encoding: 'utf-8' });
		const json = JSON.parse(output);

		const subs = json.tracks
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			.filter((track: any) => track.type === 'subtitles')
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			.map((track: any) => ({
				language: track.properties.language ?? 'und',
				codec: track.codec,
			}));

		return subs;
	} catch (err) {
		console.error(`❌ Error reading: ${file}`, err);
		return [];
	}
}
export function scanPersianSubtitlesOnly(rootDir: string): SubtitleInfo[] {
	const files = findAllMkvFiles(rootDir);
	const results: SubtitleInfo[] = [];

	for (const file of files) {
		const subtitleTracks = getSubtitleTracks(file);

		// Filter only Persian subtitle tracks
		const persianSubs = subtitleTracks.filter((track) => track.language === 'per');

		if (persianSubs.length > 0) {
			results.push({ path: file, subtitleTracks: persianSubs });
		}
	}

	return results;
}

export function scanAllSubtitles(rootDir: string): SubtitleInfo[] {
	const files = findAllMkvFiles(rootDir);
	const results: SubtitleInfo[] = [];

	for (const file of files) {
		const subtitleTracks = getSubtitleTracks(file);
		results.push({ path: file, subtitleTracks });
	}

	return results;
}

export function printSummary(results: SubtitleInfo[]) {
	const langCount: Record<string, number> = {};

	for (const { path, subtitleTracks } of results) {
		console.log(`\n📄 ${path}`);
		if (subtitleTracks.length === 0) {
			console.log('   ❌ No subtitles');
			continue;
		}

		for (const track of subtitleTracks) {
			console.log(`   🏷️  ${track.language} (${track.codec})`);
			langCount[track.language] = (langCount[track.language] ?? 0) + 1;
		}
	}

	// console.log('\n📊 Subtitle Language Summary:');
	// for (const [lang, count] of Object.entries(langCount)) {
	// 	console.log(`   ${lang}: ${count}`);
	// }
}
