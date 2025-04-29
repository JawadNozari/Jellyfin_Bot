// contextHelpers.ts
import { SessionManager } from './manager';
import type { MyContext } from '@/types';
import type { DownloadLink } from '@/types';

export function applySessionHelpers(ctx: MyContext) {
	ctx.setWaitingForLink = () => {
		ctx.session = SessionManager.setWaitingForLink(ctx.session);
	};

	ctx.resetWaitingForLink = () => {
		ctx.session = SessionManager.resetWaitingForLink(ctx.session);
	};

	ctx.addDownloads = (downloads: DownloadLink[]) => {
		ctx.session = SessionManager.addActiveDownloads(ctx.session, downloads);
	};

	ctx.removeCompletedDownloads = () => {
		ctx.session = SessionManager.removeCompletedDownloads(ctx.session);
	};
}
