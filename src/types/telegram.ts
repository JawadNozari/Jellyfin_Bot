import type { Context } from 'grammy';
import type { DownloadLink } from './services';

export interface SessionData {
	counter: number;
	waitingForLink: boolean;
	activeDownloads: DownloadLink[];
}

export interface MyContext extends Context {
	session: SessionData;
}
