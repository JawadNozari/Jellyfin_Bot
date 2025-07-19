import { SubsourceParser } from './parser';
import type { Subtitle } from './types';

export class Subsource extends SubsourceParser {
	constructor(config: {
		tvseries: boolean;
		title: string;
		currentLanguage: string;
		season: string;
	}) {
		super(config);
		this.providerName = 'subsource';
		this.api.providerName = this.providerName;
	}

	async startSearch(imdbId: string): Promise<Subtitle[]> {
		this.api.call_limit = 5;
		const releaseData = await this.findRelease(imdbId);
		if (!releaseData) return [];
		return await this.findSubtitles(releaseData);
	}

	private async findRelease(imdbId: string): Promise<Record<string, string> | null> {
		const response = await this.api.searchMovie(imdbId);
		if (!this.api.responseStatusOk(response)) return null;
		return this.parseSearchMovieResponse(response);
	}

	private async findSubtitles(requestData: Record<string, string>): Promise<Subtitle[]> {
		if (!requestData || !requestData.link_name) return [];


        
		const response = this.tvseries
			? await this.api.getTVSeries(this.currentLanguage, requestData.link_name, requestData.season)
			: await this.api.getMovie(this.currentLanguage, requestData.link_name);

		if (!this.api.responseStatusOk(response)) return [];

		return this.parseGetMovieResponse(response);
	}
}
