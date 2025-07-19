// src/subtitle/providers/subsource/api.ts
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';

export class SubsourceApi {
	private client: AxiosInstance;
	private baseUrls = {
		search_movie: 'https://api.subsource.net/v1/movie/search',
		get_movie: 'https://api.subsource.net/api/getMovie',
		get_sub: 'https://api.subsource.net/api/getSub',
		download_sub: 'https://api.subsource.net/api/downloadSub',
	};

	//!FIX THIS
	method!: string;
	providerName!: string;
	call_limit!: number;

	constructor() {
		this.client = axios.create();
	}
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	responseStatusOk(response: any): boolean {
		const status = response?.status;
		const url = response?.config?.url;
		const statusText = response?.statusText;

		console.log(`${url} status_code: ${status} ${statusText}`);

		return status === 200;
	}
	async searchMovie(imdbId: string): Promise<AxiosResponse> {
		return this.client.post(this.baseUrls.search_movie, { query: imdbId });
	}

	async getMovie(lang: string, movieName: string): Promise<AxiosResponse> {
		return this.client.post(this.baseUrls.get_movie, {
			langs: [lang],
			movieName,
		});
	}

	async getTVSeries(lang: string, movieName: string, season: string): Promise<AxiosResponse> {
		return this.client.post(this.baseUrls.get_movie, {
			langs: [lang],
			movieName,
			season,
		});
	}

	async getSub(movie: string, lang: string, id: string): Promise<AxiosResponse> {
		return this.client.post(this.baseUrls.get_sub, {
			movie,
			lang,
			id,
		});
	}

	isResponseOk(res: AxiosResponse): boolean {
		return res.status === 200;
	}

	getDownloadUrl(token: string): string {
		return `${this.baseUrls.download_sub}/${token}`;
	}
}
