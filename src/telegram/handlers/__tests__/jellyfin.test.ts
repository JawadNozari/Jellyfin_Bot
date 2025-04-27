import { describe, expect, test } from 'bun:test';
import { createMockContext } from '../../__tests__/mocks';
import { handleJellyfinStatus } from '../jellyfin';

describe('Jellyfin Handler', () => {
	test('should format and send Jellyfin status correctly', async () => {
		const ctx = createMockContext();

		await handleJellyfinStatus(ctx);

		expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Jellyfin Status:'));
		expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Running:'));
		expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Version:'));
		expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Last Checked:'));
	});
});
