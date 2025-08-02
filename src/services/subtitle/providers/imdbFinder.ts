// imdbFinder.ts
import axios from 'axios';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const OMDB_API_KEY = process.env.OMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const OMDB_BASE_URL = 'https://www.omdbapi.com/';

export async function findIMDbId(
	title: string,
	year?: number,
	season?: number,
	episode?: number,
): Promise<string | null> {
	const tmdbResult = await searchTMDB(title, year, season, episode);
	if (tmdbResult) return tmdbResult;
	return await searchOMDb(title, year, season, episode);
}

async function searchTMDB(
	title: string,
	year?: number,
	season?: number,
	episode?: number,
): Promise<string | null> {
	try {
		const isShow = typeof season === 'number' && typeof episode === 'number';
		const url = `${TMDB_BASE_URL}/search/${isShow ? 'tv' : 'movie'}`;
		const response = await axios.get(url, {
			params: {
				api_key: TMDB_API_KEY,
				query: title,
				...(year ? { year } : {}),
			},
		});

		const results = response.data.results;
		if (!results || results.length === 0) return null;

		const id = results[0].id;

		if (isShow) {
			const tvResponse = await axios.get(
				`${TMDB_BASE_URL}/tv/${id}/season/${season}/episode/${episode}`,
				{
					params: { api_key: TMDB_API_KEY },
				},
			);
			return tvResponse.data?.external_ids?.imdb_id || null;
		}
		const movieResponse = await axios.get(`${TMDB_BASE_URL}/movie/${id}`, {
			params: { api_key: TMDB_API_KEY },
		});
		return movieResponse.data?.imdb_id || null;
	} catch (error) {
		return null;
	}
}

async function searchOMDb(
	title: string,
	year?: number,
	season?: number,
	episode?: number,
): Promise<string | null> {
	try {
		const response = await axios.get(OMDB_BASE_URL, {
			params: {
				apikey: OMDB_API_KEY,
				t: title,
				...(year ? { y: year } : {}),
				...(season && episode ? { Season: season, Episode: episode } : {}),
			},
		});
		if (response.data?.imdbID) return response.data.imdbID;
		return null;
	} catch (error) {
		return null;
	}
}
