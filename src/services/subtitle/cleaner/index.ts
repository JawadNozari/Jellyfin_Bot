import { readFileSync, writeFileSync } from 'node:fs';
import { cleanSubtitle } from './cleaner';
import { toSRT } from './formatter';
import { loadRules } from './loadRules';
import { parseSRT } from './parser';
import { validate } from './validator';

const srt = readFileSync('example.srt', 'utf-8');

const parsed = parseSRT(srt);
const errors = validate(parsed);

if (errors.length > 0) {
	console.error('\n‼️ Validation errors:', errors);
} else {
	console.log('\n✅ Subtitle file is valid.\n');

	const rules = loadRules(['general', 'persian']);
	const cleaned = cleanSubtitle(parsed, rules, true);
	const output = toSRT(cleaned);
	writeFileSync('example.srt', output);

	console.log('\n✅ Cleaned subtitle written to subtitle.cleaned.srt');
}
