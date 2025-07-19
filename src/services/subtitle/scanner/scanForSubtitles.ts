import { execSync } from 'node:child_process';

interface SubtitleTrack {
	language: string;
	codec: string;
}

export function getSubtitleTracks(file: string): SubtitleTrack[] {
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
