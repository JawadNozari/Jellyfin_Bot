const PROGRESS_BAR_LENGTH = 20;
const PROGRESS_BAR_CHAR = "█";
const PROGRESS_BAR_EMPTY_CHAR = "░";

export const createProgressBar = (progress: number): string => {
	// Ensure progress is between 0 and 100
	const validProgress = Math.max(0, Math.min(100, progress)).toFixed(1);
	const filledLength = Math.round(
		(Number(validProgress) / 100) * PROGRESS_BAR_LENGTH,
	);
	const emptyLength = PROGRESS_BAR_LENGTH - filledLength;

	const filledBar = PROGRESS_BAR_CHAR.repeat(filledLength);
	const emptyBar = PROGRESS_BAR_EMPTY_CHAR.repeat(emptyLength);

	return `[${filledBar}${emptyBar}] ${validProgress}%`;
};
