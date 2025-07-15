import type { SubtitleLine } from "@/types";
export function toSRT(subs: SubtitleLine[]): string {
  return subs
    .map(({ id, start, end, text }) => `${id}\n${start} --> ${end}\n${text.join('\n')}`)
    .join("\n\n");
}
