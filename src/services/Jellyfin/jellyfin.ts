import { exec } from 'node:child_process';

export interface JellyfinStatus {
	isRunning: boolean;
	PID?: string;
	lastChecked: Date;
}

export const checkJellyfinStatus = async (): Promise<JellyfinStatus> => {
	return new Promise<JellyfinStatus>((resolve) => {
		exec('pgrep -f jellyfin', (error, stdout) => {
			if (stdout.trim()) {
				console.log('✅ Jellyfin is running!');
				resolve({
					isRunning: true,
					PID: stdout.trim(),
					lastChecked: new Date(),
				});
			} else {
				console.log('❌ Jellyfin is NOT running!');
				// Optionally auto-start it here if you want!
				// startJellyfin();
				resolve({
					isRunning: false,
					lastChecked: new Date(),
				});
			}
		});
	});
};
