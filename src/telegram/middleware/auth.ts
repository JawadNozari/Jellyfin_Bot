import type { Context, NextFunction } from 'grammy';

export const isAdmin = async (ctx: Context, next: NextFunction) => {
	const adminUsername = process.env.ADMIN_USERNAME;

	if (!adminUsername) {
		throw new Error('ADMIN_USERNAME is not set in environment variables');
	}

	const username = ctx.from?.username;

	if (username === adminUsername) {
		await next();
	} else {
		await ctx.reply("Sorry, you don't have permission to use this command.");
	}
};
