import type { DownloadLink, SessionData } from '@/types';
export namespace SessionManager {
	export function initialSession(): SessionData {
		return {
			counter: 0,
			waitingForLink: false,
			waitingForCategory: false,
			activeDownloads: [],
		};
	}

	export function resetWaitingForLink(session: SessionData): SessionData {
		return {
			...session,
			waitingForLink: false,
		};
	}

	export function setWaitingForLink(session: SessionData): SessionData {
		return {
			...session,
			waitingForLink: true,
		};
	}
	export function resetWaitingForCategory(session: SessionData): SessionData {
		return {
			...session,
			waitingForCategory: false,
		};
	}

	export function setWaitingForCategory(session: SessionData): SessionData {
		return {
			...session,
			waitingForCategory: true,
		};
	}
	export function addActiveDownloads(session: SessionData, downloads: DownloadLink[]): SessionData {
		return {
			...session,
			activeDownloads: [...session.activeDownloads, ...downloads],
		};
	}

	export function queueActiveDownloads(
		session: SessionData,
		downloads: DownloadLink[],
	): SessionData {
		return {
			...session,
			activeDownloads: [
				...session.activeDownloads.filter((d) => d.status !== 'pending'),
				...downloads,
			],
		};
	}

	export function removeCompletedDownloads(session: SessionData): SessionData {
		return {
			...session,
			activeDownloads: session.activeDownloads.filter((d) => d.status !== 'completed'),
		};
	}
}
