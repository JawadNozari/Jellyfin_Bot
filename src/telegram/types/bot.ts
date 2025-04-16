import type { Context } from 'grammy';
import type { DownloadLink } from '@/types/download';

export interface SessionData {
	counter: number;
	waitingForLink: boolean;
	activeDownloads: DownloadLink[];
}

export interface MyContext extends Context {
	session: SessionData;
}
