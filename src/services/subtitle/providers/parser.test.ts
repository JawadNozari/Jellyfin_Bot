import { MediaFileParser } from './parser';

// Example usage and testing
function testParser() {
	const testFiles = [
		'The_Monkey_2025_10bit_1080p_x265_WEBRip_AAC_YIFY_30NAMA.mp4',
		'The_Maze_Runner_2014_Bluray-1080p_Proper.mp4',
		'Ballerina_2025_WEBRip-1080p.mp4',
		'My_Oxford_Year_2025_1080p_WEB-DL_6CH_YIFY_30NAMA.mp4',
		'Better_Call_Saul_S02E02_10bit_x265_2160p_WEBRip_6CH_PSA_30NAMA.mkv',
	];

	console.log('=== Media File Parser Test Results ===\n');

	const mediaFileParser = new MediaFileParser();
	for (const filename of testFiles) {
		const parsed = mediaFileParser.parseMediaFile(filename);
		console.log(`File: ${filename}`);
		console.log(`Title: ${parsed.title}`);
		console.log(`Year: ${parsed.year || 'Not detected'}`);
		parsed.type === 'show' && console.log(`Season: ${parsed.season || 'Not detected'}`);
		parsed.type === 'show' && console.log(`Episode: ${parsed.episode || 'Not detected'}`);
		console.log(`Type: ${parsed.type}`);
		console.log(`Release Type: ${parsed.releaseType || 'Not detected'}`);
		console.log(`Resolution: ${parsed.resolution || 'Not detected'}`);
		console.log(
			`Additional Info: ${parsed.additionalDetails && parsed.additionalDetails.length > 0 ? parsed.additionalDetails.join(', ') : 'None'}`,
		);
		console.log('---');
	}

	// Example subtitle matching
	console.log('\n=== Subtitle Matching Example ===');
	const mediaFile = 'The_Maze_Runner_2014_Bluray-1080p_Proper.mp4';
	const subtitleFiles = [
		"Maze Runner Trailer #2.srt",
		"the maze runner.TVCENTER.srt",
		"The.Maze.Runner.2014.Bluray.Nightmovie.srt",
		"The.Maze.Runner.2014.Bluray.srt",
		"The.Maze.Runner.2014.720p.BluRay.x264-SPARKS.srt",
		"The.Maze.Runner.2014.720p.BluRay.x264-SPARKS.Fa.srt"
	];

	const bestSubtitle = mediaFileParser.findBestSubtitle(mediaFile, subtitleFiles);
	if (bestSubtitle) {
		console.log(`Best subtitle match: ${bestSubtitle.filename} (Score: ${bestSubtitle.score}%)`);
	} else {
		console.log('No suitable subtitle match found');
	}
}

// Run the test
testParser();
