import { jest } from "bun:test";
import type { MyContext } from "../types/bot";

export const createMockContext = (
	overrides: Partial<MyContext> = {},
): MyContext => {
	return {
		session: {
			counter: 0,
			waitingForLink: false,
		},
		reply: jest.fn().mockResolvedValue({ message_id: 1 }),
		...overrides,
	} as unknown as MyContext;
};
