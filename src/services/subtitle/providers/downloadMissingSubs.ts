import { getIMDbIdFromFilename } from './imdb-lookup';
import { getMovieSubtitles, getSeriesSubtitles, type Subtitle } from './popkorn/popkorn';
import { MediaFileParser } from './parser';
import path from 'node:path';
import axios from 'axios';
import fs from 'node:fs';
export async function downloadMissingSubs(folderPath: string) {
	// extract filename from path
	const fileName = path.basename(folderPath);
	console.log(`Downloading missing subtitles for: ${fileName}`);

	const mediaFileParser = new MediaFileParser();
	const parsed = mediaFileParser.parseMediaFile(fileName);
	//const bestSubtitle = mediaFileParser.findBestSubtitle(mediaFile, subtitleFiles);
	if (!parsed) throw new Error('Failed to parse filename');

	const { title, year, season, episode } = parsed;
	console.log(`\n\nParsed media file: ${JSON.stringify(parsed)}`);
	// const { title, imdbId, year, type, season, episode } = await getIMDbIdFromFilename(fileName);
	const imdbIdResult = await getIMDbIdFromFilename(parsed);
	const { imdbId, type } = imdbIdResult;
	if (!imdbId) {
		console.warn(`\nNo IMDb ID found for ${title}. Skipping subtitle download.`);
		return;
	}
	let foundSubtitles: Subtitle[] = [];
	// Setting a timeout to not hammer the API too quickly.
	if (type === 'movie') {
		await getMovieSubtitles(imdbId)
			.then((subtitles) => {
				if (subtitles.length === 0) {
					console.warn(
						`\nNo subtitles found for ${title} with IMDb ID ${imdbId}. Skipping subtitle download.`,
					);
					return;
				}
				foundSubtitles = subtitles;
			})
			.catch((error) => {
				console.error(`Failed to fetch subtitles for ${title}:`, error);
			});
	} else if (type === 'series') {
		if (season !== undefined && episode !== undefined) {
			await getSeriesSubtitles(imdbId, season, episode).then((subtitles) => {
				if (subtitles.length === 0) {
					console.warn(`No subtitles found for ${title}. Skipping subtitle download.`);
					return;
				}
				foundSubtitles = subtitles;
			});
		} else {
			console.warn(`Missing season or episode information for series: ${title}`);
			return;
		}
	} else {
		console.warn(`Unknown type for ${title}: ${type}`);
		return;
	}
	// Find the best subtitle match with help of findBestSubtitle method from MediaFileParser
	if (foundSubtitles && foundSubtitles.length > 0) {
		const subtitleFilenames = foundSubtitles.map((sub) => sub.file_name);
		const bestSubtitleMatch = mediaFileParser.findBestSubtitle(fileName, subtitleFilenames);
		if (bestSubtitleMatch) {
			const bestSubtitle = foundSubtitles.find(
				(sub) => sub.file_name === bestSubtitleMatch.filename,
			);
			if (bestSubtitle) {
				console.log(
					`\n\nBest subtitle match for ${title}:\n${fileName}\n${bestSubtitle.file_name}\nscore: ${bestSubtitleMatch.score}\n\n`,
				);
				console.log(bestSubtitle);
				// Download the subtitle
				const subtitleUrl = bestSubtitle.uri;
				await downloadSubtitle(subtitleUrl, folderPath);
			} else {
				console.warn(`\n\nBest subtitle filename not found in subtitle list for ${title}`);
			}
		} else {
			console.warn(`\n\nNo suitable subtitle match found for ${title}`);
		}
	} else {
		console.warn(`\n\nNo subtitles found for ${title}`);
	}
}

async function downloadSubtitle(subtitleUrl: string, videoPath: string) {
	// Find video file (first .mkv, .mp4, etc.) in the folder

	const { dir, name } = path.parse(videoPath); // name = 'test', dir = '/Volumes/SSD/Media/Movies/Test'
	const subtitlePath = path.join(dir, `${name}.srt`);

	try {
		const response = await axios.get(subtitleUrl, { responseType: 'stream' });
		const writer = fs.createWriteStream(subtitlePath);

		response.data.pipe(writer);

		await new Promise<void>((resolve, reject) => {
			writer.on('finish', () => resolve());
			writer.on('error', () => reject());
		});

		console.log(`✅ Subtitle saved as: ${subtitlePath}`);
	} catch (err) {
		if (err instanceof Error) {
			console.error('❌ Failed to download subtitle:', err.message);
		} else {
			console.error('❌ Failed to download subtitle:', err);
		}
	}
}
