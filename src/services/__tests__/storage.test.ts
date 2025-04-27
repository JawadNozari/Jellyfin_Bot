import { describe, expect, test } from 'bun:test';
import { getStorageInfo } from '../storage/storage';

describe('Storage Service', () => {
	test('should return storage information with correct structure', async () => {
		const result = await getStorageInfo();

		expect(result).toHaveProperty('total');
		expect(result).toHaveProperty('used');
		expect(result).toHaveProperty('free');
		expect(result).toHaveProperty('percentage');

		expect(typeof result.total).toBe('number');
		expect(typeof result.used).toBe('number');
		expect(typeof result.free).toBe('number');
		expect(typeof result.percentage).toBe('number');

		expect(result.total).toBeGreaterThan(0);
		expect(result.used).toBeGreaterThanOrEqual(0);
		expect(result.free).toBeGreaterThanOrEqual(0);
		expect(result.percentage).toBeGreaterThanOrEqual(0);
		expect(result.percentage).toBeLessThanOrEqual(100);
	});
});
