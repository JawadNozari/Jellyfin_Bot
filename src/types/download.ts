import type { MediaInfo } from "@/services/utils/extractMediaInfo";

export type DownloadStatus = "pending" | "downloading" | "completed" | "failed";

export interface DownloadLink {
	url: string;
	status: DownloadStatus;
	error?: string;
	progress: number;
	speed: number; // in bytes per second
	size: number; // in bytes
	downloaded: number; // in bytes
	progressBar?: string;
	gid?: string;
	downloadPath: string;
	mediaInfo?: MediaInfo;
}
