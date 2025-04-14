import { describe, expect, test } from "bun:test";
import { handleDownload, handleDownloadLinks } from "../download";
import { createMockContext } from "../../__tests__/mocks";

describe("Download Handler", () => {
	test("should set waitingForLink to true when download button is clicked", async () => {
		const ctx = createMockContext();

		await handleDownload(ctx);

		expect(ctx.session.waitingForLink).toBe(true);
		expect(ctx.reply).toHaveBeenCalledWith(
			"Please send the download link(s) in reply to this message.",
		);
	});

	test("should handle download links correctly", async () => {
		const ctx = createMockContext();
		const links = ["https://example.com/file1", "https://example.com/file2"];

		await handleDownloadLinks(ctx, links);

		expect(ctx.reply).toHaveBeenCalledWith("Received 2 link(s) for download.");
	});
});
