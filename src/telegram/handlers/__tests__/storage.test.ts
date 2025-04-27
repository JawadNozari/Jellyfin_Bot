import { describe, expect, test } from 'bun:test';
import { createMockContext } from '../../__tests__/mocks';
import { handleStorage } from '../storage';

describe('Storage Handler', () => {
	test('should format and send storage information correctly', async () => {
		const ctx = createMockContext();

		await handleStorage(ctx);

		expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Storage Information:'));
		expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Total:'));
		expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Used:'));
		expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Free:'));
	});
});
