export interface Aria2Status {
	completedLength: string;
	totalLength: string;
	downloadSpeed: string;
	status: string;
	errorCode?: string;
	errorMessage?: string;
}

export interface Aria2Response {
	result: Aria2Status;
	error?: {
		code: number;
		message: string;
	};
}

export interface DownloadTask {
	uris: string[];
	options?: Record<string, unknown>;
	priority?: 'high' | 'normal' | 'low';
}
