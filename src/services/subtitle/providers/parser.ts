type MediaFileInfo = {
	title: string;
	year?: number;
	season?: number;
	episode?: number;
	type: 'movie' | 'show';
	releaseType: string;
	resolution: string;
	additionalDetails?: string[];
};
type additionalInfo = {
	releaseType: string;
	resolution: string;
	additionalDetails?: string[];
};
class MediaFileParser {
	readonly SHOW_WITH_YEAR = /(.+)[._](19\d+[0-9]|20\d+[0-9])[._]S(\d{2})E(\d{2})/i;
	readonly SHOW_WITHOUT_YEAR = /(.+)[._]S(\d{2})E(\d{2})/i;
	readonly MOVIE_WITH_YEAR = /([\w .()-]+?)[ ._(\-)]*(?:\(?(19\d+[0-9]|20\d+[0-9])\)?[ ._-]*)/i;
	// Release types regex - captures common release sources
	readonly RELEASE_TYPE_REGEX =
		/(?:^|_|-)((?:BluRay|Bluray|WEB-DL|WEBRip|WEB|DVDRip|BDRip|HDRip|CAMRip|TS|TC|R5|DVDSCR|HDTV|PDTV|SDTV|TVRip))(?:$|_|-)/i;

	// Format/Resolution regex - captures quality indicators
	readonly RESOLUTION_REGEX = /(?:^|_|-)((?:2160p|1080p|720p|480p|4K|UHD|HD|SD))(?:$|_|-)/i;

	// Additional info regex - captures various metadata
	readonly ADDITIONAL_INFO_REGEX =
		/(?:^|_|-)(?:(10bit|8bit|x264|x265|HEVC|H\.264|H\.265|AAC|DTS|AC3|6CH|5\.1|7\.1|Atmos|HDR|HDR10|Dolby\.?Vision|DV|Extended|Director\.?s?\.?Cut|Unrated|Proper|Repack|INTERNAL|LIMITED|COMPLETE|MULTI|DUAL|SUBBED|DUBBED|iNTERNAL|READNFO|YIFY|PSA|30NAMA|RARBG|[A-Z]{2,4}))(?:$|_|-)/gi;
	/**
	 * Extract title, year, season, and episode information from filename
	 */
	parseMediaFile(filename: string): MediaFileInfo {
		const nameWithoutExtension = filename.replace(/\.[^.]+$/, '');
		// Try show with year pattern first
		let match = nameWithoutExtension.match(this.SHOW_WITH_YEAR);
		if (match) {
			const title = match[1].replace(/[._]/g, ' ').trim();
			const year = Number.parseInt(match[2]);
			const season = Number.parseInt(match[3]);
			const episode = Number.parseInt(match[4]);
			const additionalInfoObj = this.parseRemainingPart(
				nameWithoutExtension.substring(match[0].length),
			);
			return {
				title,
				year,
				season,
				episode,
				type: 'show',
				releaseType: additionalInfoObj.releaseType,
				resolution: additionalInfoObj.resolution,
				additionalDetails: additionalInfoObj.additionalDetails,
			};
		}

		// Try show without year pattern
		match = nameWithoutExtension.match(this.SHOW_WITHOUT_YEAR);
		if (match) {
			const title = match[1].replace(/[._]/g, ' ').trim();
			const season = Number.parseInt(match[2]);
			const episode = Number.parseInt(match[3]);
			const additionalInfoObj = this.parseRemainingPart(
				nameWithoutExtension.substring(match[0].length),
			);
			return {
				title,
				season,
				episode,
				type: 'show',
				releaseType: additionalInfoObj.releaseType,
				resolution: additionalInfoObj.resolution,
				additionalDetails: additionalInfoObj.additionalDetails,
			};
		}

		// Try movie with year pattern
		match = nameWithoutExtension.match(this.MOVIE_WITH_YEAR);
		if (match) {
			const title = match[1].replace(/[._]/g, ' ').trim();
			const year = Number.parseInt(match[2]);
			const additionalInfoObj = this.parseRemainingPart(
				nameWithoutExtension.substring(match[0].length),
			);
			return {
				title,
				year,
				type: 'movie',
				releaseType: additionalInfoObj.releaseType,
				resolution: additionalInfoObj.resolution,
				additionalDetails: additionalInfoObj.additionalDetails,
			};
		}
		// If no pattern matches, return the whole filename as title
		return {
			title: nameWithoutExtension.replace(/[._]/g, ' ').trim(),
			type: 'movie',
			releaseType: '',
			resolution: '',
		};
	}

	/**
	 * Parse only the remaining part of filename after title/year extraction
	 */
	parseRemainingPart(remainingPart: string): additionalInfo {
		// Initialize result object
		const result: additionalInfo = {
			releaseType: '',
			resolution: '',
			additionalDetails: [],
		};

		// Remove leading separators
		const cleanPart = remainingPart.replace(/^[._-]+/, '');

		// Extract release type
		const releaseMatch = cleanPart.match(this.RELEASE_TYPE_REGEX);

		if (releaseMatch) {
			result.releaseType = releaseMatch[1];
		}

		// Extract resolution
		const resolutionMatch = cleanPart.match(this.RESOLUTION_REGEX);
		if (resolutionMatch) {
			result.resolution = resolutionMatch[1];
		}

		// Extract additional information
		const additionalMatches = cleanPart.matchAll(this.ADDITIONAL_INFO_REGEX);
		const additionalSet = new Set<string>(); // Use Set to avoid duplicates

		for (const match of additionalMatches) {
			if (
				match[1] &&
				!this.isReleaseTypeOrResolution(match[1], result.releaseType, result.resolution)
			) {
				additionalSet.add(match[1]);
			}
		}

		result.additionalDetails = Array.from(additionalSet);
		return result;
	}

	/**
	 * Check if a matched string is already captured as release type or resolution
	 */
	isReleaseTypeOrResolution(value: string, releaseType?: string, resolution?: string): boolean {
		return (
			(!!releaseType && value.toLowerCase() === releaseType.toLowerCase()) ||
			(!!resolution && value.toLowerCase() === resolution.toLowerCase())
		);
	}

	/**
	 * Calculate similarity score between two media files for subtitle matching
	 */
	public calculateSimilarity(mediaFile: MediaFileInfo, subtitleFile: MediaFileInfo): number {
		let score = 0;
		const maxScore = 100;
		// If Filename contains Trailer or Sample, skip it
		if (
			mediaFile.title.toLowerCase().includes('trailer') ||
			mediaFile.title.toLowerCase().includes('sample') ||
			mediaFile.title.toLowerCase().includes('hdts')
		) {
			return 0;
		}
		if (mediaFile.title && subtitleFile.title) {
			if (mediaFile.title.toLowerCase() === subtitleFile.title.toLowerCase()) {
				score += 50;
			}
		}

		if (mediaFile.title.toLowerCase() === subtitleFile.title.toLowerCase()) {
			// Release type match (40 points)
			if (mediaFile.releaseType && subtitleFile.releaseType) {
				if (mediaFile.releaseType.toLowerCase() === subtitleFile.releaseType.toLowerCase()) {
					score += 20;
				}
			}

			// Resolution match (30 points)
			if (mediaFile.resolution && subtitleFile.resolution) {
				if (mediaFile.resolution.toLowerCase() === subtitleFile.resolution.toLowerCase()) {
					score += 20;
				}
			}

			// Additional info matches (30 points total, distributed among matches)
			if (
				mediaFile.additionalDetails &&
				mediaFile.additionalDetails.length > 0 &&
				subtitleFile.additionalDetails &&
				subtitleFile.additionalDetails.length > 0
			) {
				const mediaInfoLower = mediaFile.additionalDetails.map((info) => info.toLowerCase());
				const subtitleInfoLower = subtitleFile.additionalDetails.map((info) => info.toLowerCase());

				const commonInfo = mediaInfoLower.filter((info) => subtitleInfoLower.includes(info));
				const maxPossibleMatches = Math.max(mediaInfoLower.length, subtitleInfoLower.length);

				if (maxPossibleMatches > 0) {
					score += (commonInfo.length / maxPossibleMatches) * 10;
				}
			}
		}
		return Math.round(score);
	}

	/**
	 * Find best matching subtitle for a media file
	 */
	findBestSubtitle(
		mediaFilename: string,
		subtitleFilenames: string[],
	): { filename: string; score: number } | null {
		const mediaInfo = this.parseMediaFile(mediaFilename);
		let bestMatch = null;
		let bestScore = 0;
		for (const subtitleFilename of subtitleFilenames) {
			const subtitleInfo = this.parseMediaFile(subtitleFilename);

			const score = this.calculateSimilarity(mediaInfo, subtitleInfo);

			if (score > bestScore) {
				bestScore = score;
				bestMatch = { filename: subtitleFilename, score };
			}
		}

		return bestMatch;
	}
}

export { MediaFileParser, type MediaFileInfo };
