import { parseFilename } from './fileNameparser'; // your parser
import { findIMDbId } from './imdbFinder'; // your TMDB/OMDb lookup

type IMDbLookupResult = {
	imdbId: string | null;
	title: string;
	year?: number;
	season?: number;
	episode?: number;
};

export async function extractIMDbInfoFromFilename(filename: string): Promise<IMDbLookupResult> {
	const { title, year, season, episode } = parseFilename(filename);

	try {
		const imdbId = await findIMDbId(title, year, season, episode);
		return { imdbId, title, year, season, episode };
	} catch (err) {
		console.error(`❌ Failed to find IMDb ID for: ${filename}`, err);
		return { imdbId: null, title, year, season, episode };
	}
}
