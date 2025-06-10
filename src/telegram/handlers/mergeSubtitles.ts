import { readdir } from 'node:fs/promises';
import * as path from 'node:path';
import type { MyContext } from '@/types';
import { extractMediaInfo } from '@/utils/extractMediaInfo';

export async function searchAndProcessFolders(
	dir: string,
): Promise<{ name: string; path: string }[]> {
	if (!dir || typeof dir !== 'string') {
		throw new Error('Invalid directory path');
	}
	const results: { name: string; path: string }[] = [];
	const entries = await readdir(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			// Recursively search subfolders
			const subResults = await searchAndProcessFolders(fullPath);
			results.push(...subResults);
		} else if (entry.isFile()) {
			const ext = path.extname(entry.name).toLowerCase();
			if (ext === '.srt' && !entry.name.includes('._')) {
				results.push({ name: entry.name, path: fullPath });
			}
		}
	}
	// Filter out directories that do not contain subtitle files
	// remove [] from the array
	const filteredDir = results.filter((dir) => dir.name.endsWith('.srt'));

	console.log(filteredDir);
	return filteredDir;
}

const Categories = {
	Movies: 'Movies',
	Shows: 'Shows',
	Animations: 'Animations',
	Hindi: 'Hindi',
	Horror: 'Horror',
};
export const handleMergeSubtitles = async (context: MyContext) => {
	// Extract file name from folder path and send each name to the user. User can select which one to merge
	if (!context.from?.id || !context.chat?.id) {
		await context.reply('Error: Could not identify user or chat');
		return;
	}

	const userId = context.from.id.toString();
	const chatId = context.chat.id;
	await context
		.reply(
			' Which category do you want to merge subtitles for? Please select one of the following options:',
			{
				reply_markup: {
					force_reply: true,
					keyboard: Object.values(Categories).map((category) => [category]),
				},
			},
		)
		.then(() => {
			context.session.waitingForCategory = true;
		})
		.catch(console.error);
};

export async function handleCategorySelection(context: MyContext, category: string): Promise<void> {
	if (!context.from?.id || !context.chat?.id) {
		await context.reply('Error: Could not identify user or chat');
		return;
	}

	const userId = context.from.id.toString();
	const chatId = context.chat.id;

	try {
		const rootDir = '/Volumes/SSD/Jellyfin/Media';
		const categoryPath = path.join(rootDir, category);
		const folders = await searchAndProcessFolders(categoryPath);

		if (folders.length === 0) {
			await context.reply(`No folders containing subtitles found in ${category}.`);
			return;
		}
		const mediaInfoList = folders.map((folder) => {
			const mediaInfo = extractMediaInfo(folder.name);
			return mediaInfo ? mediaInfo.originalTitle : folder.name;
		});
		console.log('Media Info List:', mediaInfoList);
		await context.reply('Please select a folder to merge subtitles from the following list:', {
			reply_markup: {
				force_reply: true,
				inline_keyboard: mediaInfoList.map((name) => [
					{
						text: name,
						callback_data: `select_subtitle::${name}`,
					},
				]),
			},
		});
		// for (const folder of folders) {
		//     const mediaInfo = extractMediaInfo(folder.name);
		//     if (mediaInfo) {
		//         await context.reply(
		//             `Found media: ${mediaInfo.originalTitle} \nPath: ${folder.path}`,
		//         );
		//     } else {
		//         await context.reply(`Could not extract media info from ${folder.name}`);
		//     }
		// }
	} catch (error) {
		console.error('Error processing category:', error);
		const errorMessage =
			error && typeof error === 'object' && 'message' in error
				? (error as { message: string }).message
				: String(error);
		await context.reply(`Error processing category ${category}: ${errorMessage}`);
	}
}
