import type { Context, NextFunction } from 'grammy';

export const logger = async (ctx: Context, next: NextFunction) => {
	const start = Date.now();
	await next();
	const ms = Date.now() - start;
	// console.log(`Response time: ${ms}ms`);
};
