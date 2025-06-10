import type { Context } from 'grammy';
import type { DownloadLink } from './services';

export interface SessionData {
	counter: number;
	waitingForLink: boolean;
	waitingForCategory: boolean;
	activeDownloads: DownloadLink[];
}

export interface MyContext extends Context {
	session: SessionData;
	setWaitingForLink: () => void;
	resetWaitingForLink: () => void;
	setWaitingForCategory: () => void;
	resetWaitingForCategory: () => void;
	removeCompletedDownloads: () => void;
	addDownloads: (downloads: DownloadLink[]) => void;
}
