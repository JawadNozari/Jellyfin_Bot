import type { SubtitleLine } from "@/types";

export function removeLine(subs: SubtitleLine[], id: number): SubtitleLine[] {
  return subs.filter(line => line.id !== id).map((line, i) => ({
    ...line,
    id: i + 1,
  }));
}

export function addLine(
  subs: SubtitleLine[],
  newLine: Omit<SubtitleLine, "id">
): SubtitleLine[] {
  const newSubs = [...subs, { ...newLine, id: -1 }];
  return newSubs
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((line, i) => ({ ...line, id: i + 1 }));
}
