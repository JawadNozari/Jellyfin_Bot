import { describe, expect, test } from "bun:test";
import { processDownload, validateLinks } from "../download";
import type { DownloadLink } from "@/types/download";

describe("Download Service", () => {
	describe("validateLinks", () => {
		test("should validate and return correct number of links", () => {
			const links = ["https://example.com/file1", "https://example.com/file2"];
			const result = validateLinks(links);

			expect(result).toHaveLength(2);
			expect(result[0]).toHaveProperty("url", links[0]);
			expect(result[0]).toHaveProperty("status", "pending");
			expect(result[0]).toHaveProperty("progress", 0);
			expect(result[0]).toHaveProperty("speed", 0);
			expect(result[0]).toHaveProperty("size", 0);
			expect(result[0]).toHaveProperty("downloaded", 0);

			expect(result[1]).toHaveProperty("url", links[1]);
			expect(result[1]).toHaveProperty("status", "pending");
			expect(result[1]).toHaveProperty("progress", 0);
			expect(result[1]).toHaveProperty("speed", 0);
			expect(result[1]).toHaveProperty("size", 0);
			expect(result[1]).toHaveProperty("downloaded", 0);
		});

		test("should handle empty array", () => {
			const result = validateLinks([]);
			expect(result).toHaveLength(0);
		});
	});

	describe("processDownload", () => {
		test("should process download and return success message", async () => {
			const links: DownloadLink[] = [
				{
					url: "https://example.com/file1",
					status: "pending",
					progress: 0,
					speed: 0,
					size: 0,
					downloaded: 0,
				},
				{
					url: "https://example.com/file2",
					status: "pending",
					progress: 0,
					speed: 0,
					size: 0,
					downloaded: 0,
				},
			];

			const result = await processDownload(links);
			expect(result).toBe("Download started successfully!");
		});
	});
});
