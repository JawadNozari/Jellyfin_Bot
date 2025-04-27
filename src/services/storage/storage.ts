export interface StorageInfo {
	total: number;
	used: number;
	free: number;
	percentage: number;
}

export const getStorageInfo = async (): Promise<StorageInfo> => {
	// TODO: Implement actual storage check logic
	return {
		total: 1000,
		used: 500,
		free: 500,
		percentage: 50,
	};
};
