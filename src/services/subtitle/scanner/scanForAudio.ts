import { execSync } from 'node:child_process';

interface SubtitleTrack {
	language: string;
	codec: string;
}

export function getAudioTracks(file: string): SubtitleTrack[] {
	try {
		const output = execSync(`mkvmerge -J "${file}"`, { encoding: 'utf-8' });
		const json = JSON.parse(output);

		const audioTracks = json.tracks
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			.filter((track: any) => track.type === 'audio')
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			.map((track: any) => ({
				language: track.properties.language ?? 'und',
				codec: track.codec,
			}));

		return audioTracks;
	} catch (err) {
		console.error(`❌ Unable to read: ${file}`);
		return [];
	}
}
