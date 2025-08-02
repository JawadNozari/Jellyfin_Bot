// utils/filenameParser.ts
export interface ParsedFilename {
	title: string;
	year?: number;
	season?: number;
	episode?: number;
	type: 'movie' | 'show';
}

export function parseFilename(filename: string): ParsedFilename {
	const name = filename.replace(/\.[^.]+$/, ''); // Remove extension

	// Show with year: My.Show_2012.S01E02
	const showWithYear = name.match(/(.+)[._](19\d+[2-9]|20\d+[2-9])[._]S(\d{2})E(\d{2})/i);
	if (showWithYear) {
		const [rawTitle, yearStr, season, episode] = showWithYear;
		const title = rawTitle.replace(/[._]/g, ' ').trim();
		return {
			title,
			year: yearStr ? Number.parseInt(yearStr, 10) : undefined,
			season: season ? Number.parseInt(season, 10) : undefined,
			episode: episode ? Number.parseInt(episode, 10) : undefined,
			type: 'show',
		};
	}

	// Show without year: My.Show.S01E02
	const show = name.match(/(.+)[._]S(\d{2})E(\d{2})/i);
	if (show) {
		const [, rawTitle, season, episode] = show;
		const title = rawTitle.replace(/[._]/g, ' ').trim();
		return {
			title,
			season: Number.parseInt(season, 10),
			episode: Number.parseInt(episode, 10),
			type: 'show',
		};
	}

	// Movie: My.Movie_2010
	const movie = name.match(/(.+)[._]((19\d+[2-9]|20\d+[2-9]))/);
	if (movie) {
		const [, rawTitle, year] = movie;
		const title = rawTitle.replace(/[._]/g, ' ').trim();
		return {
			title,
			year: Number.parseInt(year),
			type: 'movie',
		};
	}
	//! Fallback: return just the title
	console.warn(
		`No specific pattern matched for filename: ${filename}. Returning default title with space`,
	);
	return {
		title: name.replace(/[._]/g, ' ').trim(),
		type: 'movie', // Default to movie if no match
	};
}
