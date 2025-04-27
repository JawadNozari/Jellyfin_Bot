import type { DownloadLink, SessionData } from '@/types';

export const initialSession = (): SessionData => ({
	counter: 0,
	waitingForLink: false,
	activeDownloads: [],
});

export const resetWaitingForLink = (session: SessionData): SessionData => ({
	...session,
	waitingForLink: false,
});

export const setWaitingForLink = (session: SessionData): SessionData => ({
	...session,
	waitingForLink: true,
});

export const addActiveDownloads = (
	session: SessionData,
	downloads: DownloadLink[],
): SessionData => ({
	...session,
	activeDownloads: [...session.activeDownloads, ...downloads],
});
// queue links that were sended after the command
export const queueActiveDownloads = (
	session: SessionData,
	downloads: DownloadLink[],
): SessionData => ({
	...session,
	activeDownloads: [
		...session.activeDownloads.filter((download) => download.status !== 'pending'),
		...downloads,
	],
});

export const removeCompletedDownloads = (session: SessionData): SessionData => ({
	...session,
	activeDownloads: session.activeDownloads.filter((download) => download.status !== 'completed'),
});
