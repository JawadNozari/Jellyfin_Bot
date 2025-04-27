import { session } from 'grammy';
import { initialSession } from './manager';

export const sessionMiddleware = session({
	initial: initialSession,
});
