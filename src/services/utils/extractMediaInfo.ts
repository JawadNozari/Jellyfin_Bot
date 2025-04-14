export interface MediaInfo {
	show?: {
		title: string;
		season: number;
		episode: number;
	};
	movie?: {
		title: string;
		year: number;
	};
	originalTitle: string;
}

export function extractMediaInfo(filename: string): MediaInfo {
	const Regex_Shows =
		/^(?<title>.*?)S(?<season>\d{1,2})E(?<episode>\d{2,3}|\d)/i;
	const Regex_Movies = /^(?<title>.+?)(?:\.|_)(?<year>(?:19|20)\d{2})/i;

	const match_Show = filename.match(Regex_Shows);
	const match_Movie = filename.match(Regex_Movies);
	const originalTitle = filename;

	let show: MediaInfo["show"] | undefined;
	let movie: MediaInfo["movie"] | undefined;

	if (match_Show?.groups) {
		show = {
			title: match_Show.groups.title.replace(/[._]/g, " ").trim(),
			season: Number.parseInt(match_Show.groups.season),
			episode: Number.parseInt(match_Show.groups.episode),
		};
	}

	if (match_Movie?.groups) {
		movie = {
			title: match_Movie.groups.title.replace(/[._]/g, " ").trim(),
			year: Number.parseInt(match_Movie.groups.year, 10),
		};
	}

	// If neither matches, return back the original title
	if (!show && !movie) {
		return { originalTitle };
	}

	return { show, movie, originalTitle };
}
