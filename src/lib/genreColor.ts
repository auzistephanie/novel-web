const PALETTE = [
  { bar: "#c1503a", text: "#c1503a", bg: "rgba(193,80,58,0.1)" }, // brick
  { bar: "#3a5f8a", text: "#3a5f8a", bg: "rgba(58,95,138,0.1)" }, // indigo
  { bar: "#c99a3c", text: "#a97e26", bg: "rgba(201,154,60,0.15)" }, // mustard
  { bar: "#2f4a3e", text: "#2f4a3e", bg: "rgba(47,74,62,0.1)" }, // forest
];

export function getGenreColor(genre: string) {
  let hash = 0;
  for (let i = 0; i < genre.length; i++) {
    hash = (hash * 31 + genre.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
