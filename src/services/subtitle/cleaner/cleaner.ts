import type { SubtitleFile, SubtitleLine } from "@/types";

interface RuleSet {
	purge: RegExp[];
	warning: RegExp[];
	warningThreshold: number;
}

export function cleanSubtitle(
	subs: SubtitleFile,
	rules: RuleSet,
	log = false,
): SubtitleFile {
	const kept: SubtitleLine[] = [];

	for (const line of subs) {
		const fullText = line.text.join(" ");

		// Purge (hard match)
		if (rules.purge.some((r) => r.test(fullText))) {
			if (log) console.log(`🚫 Removed Line ${line.lineNumber}: ${fullText}`);
			continue;
		}

		// Warning match (count how many warning words appear)
		const warningMatches = rules.warning.filter((r) => r.test(fullText));

		if (warningMatches.length >= rules.warningThreshold) {
			if (log) {
				console.log(
					`⚠️  Removed Line ${line.lineNumber} by warning: (${warningMatches.length} matches):`,
				);
				console.log(`   ${fullText}`);
			}
			continue;
		}

		kept.push(line);
	}

	return kept.map((line, i) => ({ ...line, id: i + 1 }));
}
