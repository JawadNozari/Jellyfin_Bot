import fs from 'node:fs/promises';

const LANGUAGE = 'Farsi/Persian';

const headers = {
	Accept: 'application/json, text/plain, */*',
	'Accept-Encoding': 'gzip, deflate, br',
	'Accept-Language': 'en-US,en;q=0.5',
	Connection: 'keep-alive',
	Host: 'api.subsource.net',
	'If-None-Match': 'W/"1f4c-0jlVP/mLgynBkJj0MJmLwVvMZbs"',
	Origin: 'https://subsource.net',
	Referer: 'https://subsource.net/',
	'Sec-Fetch-Dest': 'empty',
	'Sec-Fetch-Mode': 'cors',
	'Sec-Fetch-Site': 'same-site',
	'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
};

async function getSubtitles() {
	const res = await fetch('https://api.subsource.net/api/latestsSubs?page=1', { headers });
	const content = await res.json();
	if (!content.success) {
		throw new Error("couldn't get the subtitles from subsource.net");
	}
	return content.latests;
}

async function getTrackedSubtitles(fileName = 'ids.json'): Promise<number[]> {
	const data = await fs.readFile(fileName, 'utf-8');
	return JSON.parse(data);
}

async function updateTrackedSubtitles(data: number[], fileName = 'ids.json') {
	await fs.writeFile(fileName, JSON.stringify(data, null, 2));
}

async function getMovie(id: string, lang: string, movie: string, justSubName = false) {
	const res = await fetch('https://api.subsource.net/api/getSub', {
		method: 'POST',
		headers: {
			...headers,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ id, lang, movie }),
	});

	const content = await res.json();
	return justSubName ? content.sub.ri[0] : content.movie;
}

async function getImdb(id: string, lang: string, movie: string) {
	const movieData = await getMovie(id, lang, movie, false);
	return {
		slug: movieData.imdbLink,
		url: `https://imdb.com/title/${movieData.imdbLink}`,
	};
}

async function searchMovieInSerfil(imdbSlug: string, isSeries: boolean): Promise<string | false> {
	const url = isSeries
		? `https://serfil.top/series/${imdbSlug}`
		: `https://serfil.top/movies/${imdbSlug}`;

	const res = await fetch(url);
	return res.status === 200 ? url : false;
}

// async function sendMessage({ chat_id, text }: { chat_id: number; text: string }) {
// 	const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
// 	await fetch(url, {
// 		method: 'POST',
// 		headers: { 'Content-Type': 'application/json' },
// 		body: JSON.stringify({ chat_id, text, parse_mode: 'Markdown' }),
// 	});
// }

// async function sendSubtitle(text: string) {
// 	for (const adminID of ADMIN_IDS) {
// 		await sendMessage({ chat_id: adminID, text });
// 	}
// }

async function getNewSubtitles() {
	const subtitles = await getSubtitles();
	const trackedSubtitles = await getTrackedSubtitles();

	const newSubtitles = [];

	for (const subtitle of subtitles) {
		if (subtitle.lang !== LANGUAGE) continue;

		const subtitleLink = subtitle.full_link.split('/');
		const subtitleID = subtitleLink.at(-1);
		const subtitleName = subtitleLink[2];
		const subtitleLang = subtitleLink[3];

		if (trackedSubtitles.includes(Number(subtitleID))) continue;

		const subName = await getMovie(subtitleID, subtitleLang, subtitleName, true);
		const imdb = await getImdb(subtitleID, subtitleLang, subtitleName);
		const isSeries = subtitle.type === 'TV-Series';
		const seriesLabel = isSeries ? '🚺🚺🚺🚺🚺' : '';

		const serif = await searchMovieInSerfil(imdb.slug, isSeries);
		const serifText = serif ? `\n\nserfil: \`yes\` ✅ [SerFil](${serif})` : '\n\nserfil: `no` 🔴';

		const text =
			`${seriesLabel}` +
			`\nname: ${subName}` +
			`\nimdb link: [imdb](${imdb.url})` +
			`\ntype: ${subtitle.type}` +
			`${serifText}` +
			`\n\nsite url: [link](https://subsource.net${subtitle.full_link})`;

		// await sendSubtitle(text);
		newSubtitles.push(subtitle);
		trackedSubtitles.push(Number(subtitleID));
	}

	await updateTrackedSubtitles(trackedSubtitles);
	return newSubtitles;
}

async function searchSubsource(query: string) {
	const url = `https://api.subsource.net/api/searchMovie?q=${encodeURIComponent(query)}`;

	const res = await fetch(url, {
		headers: {
			Accept: 'application/json',
			'User-Agent': 'Mozilla/5.0',
			Origin: 'https://subsource.net',
			Referer: 'https://subsource.net/',
		},
	});

	console.log('Search URL:', url);
	console.log('Response Status:', res.status);
	if (!res.ok) {
		throw new Error(`Failed to fetch subtitles for query: ${query}`);
	}
	console.log('Response Headers:', res.headers.get('Content-Type'));
	if (!res.headers.get('Content-Type')?.includes('application/json')) {
		throw new Error(`Unexpected response format for query: ${query}`);
	}
	console.log(`\n\n\n\nData: ${res}`);
	const data = await res.json();

	if (!data.success || data.subtitles.length === 0) {
		throw new Error(`No subtitle found for query: ${query}`);
	}

	// Filter for Farsi subtitle
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const sub = data.subtitles.find((s: any) => s.lang === LANGUAGE);
	if (!sub) throw new Error('No Farsi subtitle found');

	return sub;
}

async function getSubDownloadLinkFromSearch(movieName: string): Promise<string> {
	const subtitle = await searchSubsource(movieName);
	const subLinkParts = subtitle.full_link.split('/');
	// biome-ignore lint/style/noNonNullAssertion: <explanation>
	const id = subLinkParts.at(-1)!;
	const movie = subLinkParts[2];
	const lang = subLinkParts[3];

	const subDetails = await getMovie(id, lang, movie, true);
	return `https://subsource.net${subtitle.full_link}`;
}

// getNewSubtitles().then(console.log).catch(console.error);
(async () => {
	const link = await getSubDownloadLinkFromSearch('Dune Part Two 2024');
	console.log('Subtitle Link:', link);
})();
