export async function getRemoteFileSize(url: string): Promise<number | null> {
	try {
		const res = await fetch(url, { method: "HEAD" });
		if (!res.ok) return null;

		const length = res.headers.get("content-length");
		return length ? Number.parseInt(length, 10) : null;
	} catch (err) {
		console.error("Failed to get remote file size:", err);
		return null;
	}
}
