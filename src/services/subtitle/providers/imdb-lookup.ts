// utils/imdb-lookup.ts
import axios from 'axios';
import type { ParsedFilename } from './fileNameparser';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const OMDB_API_KEY = process.env.OMDB_API_KEY || '';

export type IMDbLookupResult = {
	title: string;
	imdbId: string;
	year?: number;
	type: 'movie' | 'series';
	season?: number;
	episode?: number;
};

export async function getIMDbIdFromFilename(input: ParsedFilename): Promise<IMDbLookupResult> {
	// Try TMDB first
	try {
		if (input.season && input.episode) {
			// Series: Get tv_id → then external_ids
			const search = await axios.get('https://api.themoviedb.org/3/search/tv', {
				params: { api_key: TMDB_API_KEY, query: input.title, first_air_date_year: input.year },
			});

			const show = search.data.results[0];
			if (show) {
				const external = await axios.get(
					`https://api.themoviedb.org/3/tv/${show.id}/external_ids`,
					{ params: { api_key: TMDB_API_KEY } },
				);

				const imdbId = external.data.imdb_id;
				if (imdbId)
					return {
						title: input.title,
						imdbId,
						year: input.year,
						type: 'series',
						season: input.season,
						episode: input.episode,
					};
			}
		} else {
			// Movie: Direct search
			const search = await axios.get('https://api.themoviedb.org/3/search/movie', {
				params: { api_key: TMDB_API_KEY, query: input.title, year: input.year },
			});

			const movie = search.data.results[0];
			if (movie) {
				const external = await axios.get(
					`https://api.themoviedb.org/3/movie/${movie.id}/external_ids`,
					{ params: { api_key: TMDB_API_KEY } },
				);

				const imdbId = external.data.imdb_id;
				if (imdbId)
					return {
						title: input.title,
						imdbId,
						year: input.year,
						type: 'movie',
					};
			}
		}
	} catch (err) {
		if (err instanceof Error) {
			console.warn('TMDB lookup failed:', err.message);
		} else {
			console.warn('TMDB lookup failed:', err);
		}
	}

	// Fallback to OMDb
	try {
		const query =
			input.season && input.episode ? `${input.title} Season ${input.season}` : input.title;
		const yearPart = input.year ? `&y=${input.year}` : '';

		const resp = await axios.get(
			`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(query)}${yearPart}`,
		);

		if (resp.data?.imdbID) {
			return {
				title: input.title,
				imdbId: resp.data.imdbID,
				year: input.year,
				type: resp.data.Type === 'series' ? 'series' : 'movie',
			};
		}
	} catch (err) {
		if (err instanceof Error) {
			console.warn('OMDb fallback failed:', err.message);
		} else {
			console.warn('OMDb fallback failed:', err);
		}
	}

	throw new Error('Failed to retrieve IMDb ID');
}
