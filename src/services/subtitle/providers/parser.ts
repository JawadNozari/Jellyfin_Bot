import { SubsourceApi } from './subsourceAPI';
import type { Subtitle } from './types'; // you'll need to define this interface

export class SubsourceParser {
	api: SubsourceApi;
	providerName = '';
	tvseries: boolean;
	title: string;
	currentLanguage: string;
	season: string;
	season_no_padding: string;

	constructor(config: {
		tvseries: boolean;
		title: string;
		currentLanguage: string;
		season: string;
	}) {
		this.api = new SubsourceApi();
		this.tvseries = config.tvseries;
		this.title = config.title.toLowerCase();
		this.currentLanguage = config.currentLanguage;
		this.season = config.season;
		this.season_no_padding = String(Number.parseInt(config.season, 10));
	}

	parseSearchMovieResponse(response: {
		data: { found: Array<{ subCount: number; type: string; title: string; linkName: string }> };
	}): Record<string, string> {
		const data = response.data;
		const foundItems = data.found;
		const parsedResponse: Record<string, string> = {};

		if (!foundItems || foundItems.length === 0) return {};

		for (const release of foundItems) {
			if (this.skipSearchMovieItem(release)) continue;

			if (this.tvseries) {
				parsedResponse.season = `season-${this.season_no_padding}`;
			}
			parsedResponse.link_name = release.linkName;
			break; // only use the first match
		}
		return parsedResponse;
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	parseGetMovieResponse(response: any): Subtitle[] {
		const data = response.data;
		const subtitles: Subtitle[] = [];

		for (const sub of data.subs) {
			if (this.skipGetMovieItem(sub)) continue;
			const requestData = this.setPostData(sub);
			const subtitleName = sub.releaseName;
			if (this.skipTvSeries(subtitleName)) continue;

			subtitles.push({
				provider: this.providerName,
				name: subtitleName,
				requestData,
			});
		}
		return subtitles;
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	setPostData(x: any): Record<string, string> {
		return {
			movie: x.linkName,
			lang: x.lang,
			id: String(x.subId),
			release_name: x.releaseName,
			api_method: 'get_sub',
		};
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	skipSearchMovieItem(item: any): boolean {
		const requiredKeys = ['subCount', 'type', 'title', 'linkName'];
		if (!this.keysExist(item, requiredKeys)) return true;
		if (item.subCount === 0) return true;
		if (this.tvseries && item.type === 'Movie') return true;
		if (!this.tvseries && item.type === 'TVSeries') return true;
		if (item.title.toLowerCase() !== this.title) return true;
		return false;
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	skipGetMovieItem(item: any): boolean {
		const requiredKeys = ['releaseName', 'linkName', 'lang', 'subId'];
		if (!this.keysExist(item, requiredKeys)) return true;
		if (!this.languageMatch(item.lang)) return true;
		return false;
	}

	skipTvSeries(subtitleName: string): boolean {
		if (!this.tvseries) return false;
		const patterns = ['s01e', 's02e', 'season', 'episode'];
		return !patterns.some((p) => subtitleName.toLowerCase().includes(p));
	}

	languageMatch(lang: string): boolean {
		return lang.toLowerCase() === this.currentLanguage.toLowerCase();
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	private keysExist(obj: Record<string, any>, keys: string[]): boolean {
		return keys.every((k) => k in obj);
	}
}
