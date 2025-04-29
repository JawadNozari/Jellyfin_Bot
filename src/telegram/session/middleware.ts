import { session } from 'grammy';
import { SessionManager } from './manager';
import type { MiddlewareFn } from 'grammy';
import type { MyContext } from '@/types';
import { applySessionHelpers } from './contextHelpers';
export const sessionMiddleware = session({
	initial: SessionManager.initialSession,
});

export const ContextHelpersMiddleware: MiddlewareFn<MyContext> = async (ctx, next) => {
	applySessionHelpers(ctx);
	await next();
};
