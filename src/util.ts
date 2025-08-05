export const COLORS = [
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
  "gray",
] as const;

export function colorForCmd(id: number) {
  return COLORS[id % COLORS.length]!;
}

export function splitIntoChunks(str: string, size: number) {
  return str.match(new RegExp(".{1," + size + "}", "g")) || [];
}
