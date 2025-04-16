import { RPC_PORT, RPC_SECRET, MAX_RETRIES, RETRY_DELAY } from './constants';

async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	retries = MAX_RETRIES,
	delay = RETRY_DELAY,
): Promise<T> {
	try {
		return await fn();
	} catch (error) {
		if (retries === 0) throw error;
		await new Promise((resolve) => setTimeout(resolve, delay));
		return retryWithBackoff(fn, retries - 1, delay * 1.5);
	}
}

export async function callAria2<T>(method: string, params: unknown[] = []): Promise<T> {
	return retryWithBackoff(async () => {
		const response = await fetch(`http://localhost:${RPC_PORT}/jsonrpc`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: '1',
				method,
				params: [`token:${RPC_SECRET}`, ...params],
			}),
			keepalive: true,
		});

		if (!response.ok) {
			const error = new Error(`HTTP error! status: ${response.status}`);
			error.cause = { status: response.status, statusText: response.statusText };
			throw error;
		}

		let data: { result: T; error?: { message: string; code: number } };
		try {
			data = await response.json();
		} catch (error) {
			throw new Error('Failed to parse JSON response');
		}

		if (data.error) {
			const error = new Error(data.error.message || 'Unknown RPC error');
			error.cause = data.error;
			throw error;
		}

		return data.result;
	});
}
