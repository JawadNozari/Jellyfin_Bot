import { rules as rawRules } from "./config/rules";
type RuleCategory = keyof typeof rawRules;

export interface RuleSet {
	purge: RegExp[];
	warning: RegExp[];
	warningThreshold: number;
}
export function loadRules(
	categories: RuleCategory[],
	warningThreshold = 3,
): RuleSet {
	const purge: RegExp[] = [];
	const warning: RegExp[] = [];

	for (const category of categories) {
		const rule = rawRules[category];
		purge.push(...rule.purge);
		warning.push(...rule.warning);
	}

	return {
		purge,
		warning,
		warningThreshold,
	};
}
