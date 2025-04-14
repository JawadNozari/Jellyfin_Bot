import type { SessionData } from "@/telegram/types/bot";
import type { DownloadLink } from "@/types/download";

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

export const removeCompletedDownloads = (
	session: SessionData,
): SessionData => ({
	...session,
	activeDownloads: session.activeDownloads.filter(
		(download) => download.status !== "completed",
	),
});
