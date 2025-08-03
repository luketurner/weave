export const COLORS = [
  "red",
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
