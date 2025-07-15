export interface SubtitleLine {
	id: number;
	start: string;
	end: string;
	text: string[];
	lineNumber: number;
}

export type SubtitleFile = SubtitleLine[];
