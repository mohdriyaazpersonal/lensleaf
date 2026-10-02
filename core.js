export const MAX_BYTES = 20 * 1024 * 1024;
export const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];
export function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.type))
    throw new Error("Use JPG, PNG, WebP, GIF or AVIF images.");
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_BYTES)
    throw new Error("Each image must be between 1 byte and 20 MB.");
  return true;
}
export function parseTags(value) {
  return [
    ...new Set(
      String(value)
        .split(",")
        .map((x) => x.trim().toLowerCase().slice(0, 40))
        .filter(Boolean),
    ),
  ].slice(0, 12);
}
export function filterPhotos(
  photos,
  {
    query = "",
    collection = "All photographs",
    favorite = false,
    tag = "",
    sort = "newest",
  } = {},
) {
  const q = query.trim().toLowerCase();
  return photos
    .filter(
      (p) =>
        (collection === "All photographs" || p.collection === collection) &&
        (!favorite || p.favorite) &&
        (!tag || p.tags.includes(tag)) &&
        [p.title, p.collection, ...p.tags].join(" ").toLowerCase().includes(q),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : b.created - a.created || a.id.localeCompare(b.id),
    );
}
export const demoPhotos = [
  ["amber-coast", "Amber coast", "Coast & water", ["coast", "warm"], false],
  ["quiet-peaks", "Quiet peaks", "Wild places", ["mountains", "mist"], true],
  ["golden-hour", "Golden hour", "Open spaces", ["desert", "warm"], false],
  ["blue-hour", "Blue hour", "Coast & water", ["ocean", "blue"], true],
  ["green-valley", "Green valley", "Wild places", ["forest", "green"], false],
  ["still-water", "Still water", "Open spaces", ["lake", "quiet"], false],
].map(([id, title, collection, tags, favorite], i) => ({
  id,
  title,
  collection,
  tags,
  favorite,
  demo: true,
  created: 1700000000000 - i * 1000,
  src: `assets/${id}.svg`,
}));
