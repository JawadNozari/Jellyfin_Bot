import { findAllMkvFiles } from "./searchFolders"; // Your recursive file scanner
import { getSubtitleTracks } from "./scanForSubtitles"; // Uses mkvmerge

const PERSIAN_LANG_CODES = ["per", "fa"];

export function findFilesMissingPersianSubtitles(rootDir: string): string[] {
  const files = findAllMkvFiles(rootDir);
  const missing: string[] = [];

  for (const file of files) {
    const subtitleTracks = getSubtitleTracks(file);

    const hasPersian = subtitleTracks.some(track =>
      PERSIAN_LANG_CODES.includes(track.language?.toLowerCase())
    );

    if (!hasPersian) {
      missing.push(file);
    }
  }

  return missing;
}
