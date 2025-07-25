import fs, { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import * as color from './consoleColors';
import { runCommand } from './commandLine';
import { convertToUtf8 } from './utf8subs';
import { AdjustFlags } from './adjustFlags';
import { execFile } from 'node:child_process';
import { verifySubtitle } from './verifySubtitle';
import { unlink, rename } from 'node:fs/promises';
import { type LanguageCode, getLanguageCodeFromName, getLanguageCodes } from './languageCodes';
import { parseSRT } from '../cleaner/parser';
import { cleanSubtitle } from '../cleaner/cleaner';
import { toSRT } from '../cleaner/formatter';
import { loadRules } from '../cleaner/loadRules';
import { validate } from '../cleaner/validator';

const exec = promisify(execFile);
type SubtitleProcessorOptions = {
	videoPath: string;
	subtitlePath: string;
	subtitleLang: LanguageCode;
	audioLang: LanguageCode;

	shouldConvert?: boolean;
	shouldClean?: boolean;
	shouldSync?: boolean;
	keepSubtitle?: boolean;
};
interface SubtitleTrack {
	id: number;
	language: string;
	isDefault: boolean;
	isForced: boolean;
	name?: string;
}
type MergeOptions = {
	language: string;
	title?: string;
	outputPath?: string;
};
const options = {
	shouldConvert: true,
	shouldClean: true,
	shouldSync: true,
	keepSubtitle: false,
};
export class SubtitleProcessor {
	private readonly videoPath: string;
	private readonly subtitlePath: string;
	private readonly subtitleLang: LanguageCode;
	private readonly audioLang: LanguageCode;
	private readonly subtitleBase: string;
	private readonly shouldConvert: boolean;
	private readonly shouldClean: boolean;
	private readonly shouldSync: boolean;
	private readonly keepSubtitle: boolean;
	constructor({
		videoPath,
		subtitlePath,
		subtitleLang,
		audioLang,
		shouldConvert,
		shouldClean,
		shouldSync,
		keepSubtitle,
	}: SubtitleProcessorOptions) {
		this.videoPath = videoPath;
		this.subtitlePath = subtitlePath;
		this.subtitleLang = subtitleLang;
		this.audioLang = audioLang;
		this.subtitleBase = path.basename(subtitlePath);
		this.shouldConvert = shouldConvert ?? options.shouldConvert;
		this.shouldClean = shouldClean ?? options.shouldClean;
		this.shouldSync = shouldSync ?? options.shouldSync;
		this.keepSubtitle = keepSubtitle ?? options.keepSubtitle;
	}
	close() {
		fs.closeSync(fs.openSync(this.videoPath, 'r'));
	}
	async process() {
		const videoBase = path.basename(this.videoPath);

		const Converted = this.shouldConvert && (await this.convertSubToUtf8());
		if (this.shouldConvert && !Converted) {
			console.error('❌ Conversion failed. Skipping subtitle.');
			return;
		}

		const Cleaned = this.shouldClean && (await this.cleanAds());
		if (this.shouldClean && !Cleaned) {
			console.error('❌ Cleaning failed. Skipping subtitle.');
			return;
		}

		const Synced = this.shouldSync && (await this.syncWithVideo());
		if (this.shouldSync && !Synced) {
			console.error('❌ Syncing failed. Skipping subtitle.');
			return;
		}

		await this.merge();

		//TODO: This needs to be more dynamic and not hardcoded
		//Adjust the flags of the copied video file
		const AdjustFlagsInstance = new AdjustFlags({
			videoPath: this.videoPath,
			subLang: this.subtitleLang,
			audioLang: this.audioLang,
		});
		await AdjustFlagsInstance.adjustFlags();
		console.log(`✅ Adjusted flags for: ${color.AQUA}${videoBase}${color.RESET}`);
	}

	private async convertSubToUtf8(): Promise<boolean> {
		if (this.subtitleBase.startsWith('._')) {
			throw new Error(`Skipping Apple resource fork file: ${this.subtitleBase}`);
		}
		try {
			await convertToUtf8(this.subtitlePath);
			await verifySubtitle(this.subtitlePath);
			return true;
		} catch (error) {
			console.error('❌ UTF-8 conversion failed:', error);
			return false;
		}
	}

	private async cleanAds(): Promise<boolean> {
		console.log(`🧹 Removing Ads from ${color.GREEN}${this.subtitleLang}${color.RESET} Subtitle`);
		const srt = readFileSync(this.subtitlePath, 'utf-8');

		const parsed = parseSRT(srt);
		const errors = validate(parsed);

		if (errors.length > 0) {
			console.error('\n‼️ Validation errors:', errors);
				console.error('❌ Ad cleaning failed!');
			return false;
		} 
			console.log('\n✅ Subtitle file is valid.\n');

			const rules = loadRules(['general', 'persian']);
			const cleaned = cleanSubtitle(parsed, rules, true);
			const output = toSRT(cleaned);
			writeFileSync(this.subtitlePath, output);
			console.log(`\n✅ Cleaned subtitle written to ${this.subtitlePath}`);
			return true;
	}

	private async syncWithVideo(): Promise<boolean> {
		const args = [this.videoPath, '-i', this.subtitlePath, '-o', this.subtitlePath];
		console.log(
			`🔄 Syncing ${color.GREEN}${this.subtitleLang}${color.RESET} subtitle with video...`,
		);
		return await runCommand('ffsubsync', args, 'pipe')
			.then(() => {
				verifySubtitle(this.subtitlePath);
				console.log(
					`✅ Synced ${color.GREEN}${this.subtitleLang}${color.RESET} subtitle with video.`,
				);
				return true;
			})
			.catch((err) => {
				console.error('❌ Subtitle syncing failed:', err);
				return false;
			});
	}

	private async merge() {
		const language = getLanguageCodeFromName(this.subtitleLang) || 'und';

		await this.mergeSubtitle({
			language: language,
			title: this.subtitleLang,
		});

		console.log(`✅ Merged ${color.GREEN}${this.subtitleLang}${color.RESET} subtitle.`);
	}

	async mergeSubtitle(options: MergeOptions) {
		const { language, title, outputPath } = options;
		if (this.subtitleBase.startsWith('._')) {
			throw new Error(`Skipping Apple resource fork file: ${this.subtitleBase}`);
		}
		if (this.videoPath.startsWith('._')) {
			throw new Error(`Skipping Apple resource fork file: ${this.videoPath}`);
		}
		if (!fs.existsSync(this.videoPath))
			throw new Error(`❌ Video file not found: ${this.videoPath}`);
		if (!fs.existsSync(this.subtitlePath))
			throw new Error(`❌ Subtitle file not found: ${this.subtitlePath}`);

		const videoExt = path.extname(this.videoPath);
		const videoBase = path.basename(this.videoPath, videoExt);
		const subtitleTitle = title || language.toUpperCase();
		const tempOutput =
			outputPath || path.join(path.dirname(this.videoPath), `${videoBase}_merged.mkv`); // Adjust this path if needed

		try {
			await this.removeSubtitleByLanguage(this.videoPath, this.subtitleLang);

			const cmdArgs = [
				'-o',
				`${tempOutput}`, // ✅ Output to a *temporary* file
				`${this.videoPath}`,
				'--language',
				`0:${language}`,
				'--track-name',
				`0:${subtitleTitle} (Forced)`,
				'--default-track',
				'0:yes',
				'--forced-track',
				'0:yes',
				`${this.subtitlePath}`,
			];

			return new Promise<void>((resolve, reject) => {
				return runCommand('mkvmerge', cmdArgs, 'pipe')

					.catch((err) => {
						console.error('❌ Merging failed:', err.name);
						console.error('❌ Merging failed:', err.cause);
						console.error('❌ Merging failed:', err.stack);
						console.error('❌ Merging failed:', err.message);
						reject(err);
					})
					.finally(async () => {
						await unlink(this.videoPath);
						await rename(tempOutput, this.videoPath);
						if (!this.keepSubtitle) {
							await unlink(this.subtitlePath);
						}
						resolve();
					});
			});
		} catch (err: unknown) {
			if (err instanceof Error) {
				throw new Error(`❌ Failed to copy video file: ${err.message}`);
			}
		}
	}
	async removeSubtitleByLanguage(inputPath: string, languageName: string): Promise<void> {
		const videoExt = path.extname(inputPath);
		const videoBase = path.basename(inputPath, videoExt);

		const filePath = path.join(path.dirname(inputPath), `${videoBase}_RemovingSub.mkv`);
		const getLangCode = getLanguageCodes[languageName];
		if (!getLangCode) {
			console.error('Language must be capitalized. For example: Persian, English, etc.');
			return Promise.reject(`Unknown language name: ${languageName}`);
		}
		const { stdout } = await exec('mkvmerge', ['-J', inputPath]);
		const data = JSON.parse(stdout);
		const subsToRemove = data.tracks
			.filter((track: { type: string; properties: { language: string } }) => {
				return track.type === 'subtitles' && getLangCode.includes(track.properties.language);
			})
			.map((track: { id: number }) => track.id);
		if (subsToRemove.length === 0) {
			console.log(
				`✅ No duplicated subtitles for language ${color.GREEN}${languageName}${color.RESET}`,
			);
			// return file_temp file even if no subtitles found
			return;
		}

		const subsToRemoveStr = `!${subsToRemove.join(',')}`;
		const args = ['-o', filePath, '-s', subsToRemoveStr, inputPath];

		await runCommand('mkvmerge', args, 'pipe');
		const isRemoved = await this.verifySubtitleRemoval(filePath, getLangCode);
		if (!isRemoved) {
			return Promise.reject(`Failed to remove subtitles with language '${languageName}'.`);
		}

		await unlink(inputPath);
		await rename(filePath, inputPath);

		console.log(
			`✅ Subtitles with language ${color.GREEN}${languageName}${color.RESET} removed to avoid duplicates.`,
		);
		return;
	}

	//verify removal of subtitles
	async verifySubtitleRemoval(inputPath: string, langCodes: string[]): Promise<boolean> {
		const { stdout } = await exec('mkvmerge', ['-J', inputPath]);
		const data = JSON.parse(stdout);

		const subsToRemove = data.tracks
			.filter((track: { type: string; properties: { language: string } }) => {
				return track.type === 'subtitles' && langCodes.includes(track.properties.language);
			})
			.map((track: { id: number }) => track.id);

		if (subsToRemove.length !== 0) {
			return false;
		}
		return true;
	}
}
