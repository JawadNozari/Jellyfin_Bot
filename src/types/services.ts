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

export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'failed';

export interface DownloadLink {
	url: string;
	status: DownloadStatus;
	error?: string;
	progress: number;
	speed: number;
	size: number;
	downloaded: number;
	remaining: number;
	progressBar?: string;
	ETA: string;
	gid?: string;
	downloadPath: string;
	mediaInfo?: MediaInfo;
	options?: Record<string, unknown>;
}
