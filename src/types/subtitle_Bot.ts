// Types
export interface SubtitleFolder {
	name: string;
	path: string;
	mediaType: string;
}

export interface MergeSettings {
	subtitleLang: string;
	audioLang: string;
	shouldConvert: boolean;
	shouldClean: boolean;
	shouldSync: boolean;
	keepSubtitle: boolean;
}

export interface MergeOptions {
	folderPath: string;
	subtitleLang: string;
	audioLang: string;
	shouldConvert: boolean;
	shouldClean: boolean;
	shouldSync: boolean;
	keepSubtitle: boolean;
}
