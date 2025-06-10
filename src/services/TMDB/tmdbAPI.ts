import dotenv from "dotenv";
dotenv.config();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_URL = "https://api.themoviedb.org/3/search";
interface MovieResult {
	id: number;
	title: string;
	release_date?: string;
	// Add other relevant movie properties here
}

interface TVShowResult {
	id: number;
	name: string;
	first_air_date?: string;
    original_language?: string;
	// Add other relevant TV show properties here
}
interface TMDBResponse {
	results: Array<MovieResult | TVShowResult>;
}
type show = {
	title: string;
	season: number;
	episode: number;
    original_language: string;
};
type movie = { title: string; year: number };
type MediaMetadata = MovieResult | TVShowResult | null;

export async function getMediaMetadataTMDB(
    show: show | null,
    movie: movie | null,
): Promise<MediaMetadata> {
	
	if (show) {
		const apiUrl = `${TMDB_API_URL}/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(show.title)}&include_adult=false&language=en-US&page=1`;
		const response = await fetch(apiUrl);
		const data = (await response.json()) as TMDBResponse;

		if (
			data.results &&
			Array.isArray(data.results) &&
			data.results.length > 0
		) {
			return data.results[0]; // Return the first result
		}
	}
	if (movie) {
		const apiUrl = `${TMDB_API_URL}/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(movie.title)}&year=${movie.year.toString()}`;
		const response = await fetch(apiUrl);
		const data = (await response.json()) as TMDBResponse;

		if (
			data?.results &&
			Array.isArray(data.results) &&
			data.results.length > 0
		) {
			return data.results[0]; // Return the first movie title
		}
	}

	return null;
}
