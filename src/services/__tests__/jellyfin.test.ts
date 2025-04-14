import { describe, expect, test } from "bun:test";
import { checkJellyfinStatus } from "../jellyfin";

describe("Jellyfin Service", () => {
	test("should return Jellyfin status with correct structure", async () => {
		const result = await checkJellyfinStatus();

		expect(result).toHaveProperty("isRunning");
		expect(result).toHaveProperty("lastChecked");

		expect(typeof result.isRunning).toBe("boolean");
		expect(result.lastChecked).toBeInstanceOf(Date);

		if (result.version) {
			expect(typeof result.version).toBe("string");
			expect(result.version).toMatch(/^\d+\.\d+\.\d+$/);
		}
	});
});
