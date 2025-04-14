export interface JellyfinStatus {
	isRunning: boolean;
	version?: string;
	lastChecked: Date;
}

export const checkJellyfinStatus = async (): Promise<JellyfinStatus> => {
	// TODO: Implement actual Jellyfin status check logic
	return {
		isRunning: true,
		version: "10.8.0",
		lastChecked: new Date(),
	};
};
