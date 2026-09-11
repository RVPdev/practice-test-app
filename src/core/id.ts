const SLUG_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'item';
}

export function randomSuffix(length = 6): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += SLUG_ALPHABET[Math.floor(Math.random() * SLUG_ALPHABET.length)];
  }
  return out;
}

export function makeSetId(title: string): string {
  return `${slugify(title)}-${randomSuffix()}`;
}

export function nextSequentialId(existingIds: string[], prefix: string): string {
  const max = existingIds.reduce((highest, id) => {
    if (!id.startsWith(prefix)) return highest;
    const n = Number.parseInt(id.slice(prefix.length), 10);
    return Number.isFinite(n) && n > highest ? n : highest;
  }, 0);
  return `${prefix}${max + 1}`;
}

export function uniqueSlug(text: string, existingIds: string[]): string {
  const base = slugify(text);
  if (!existingIds.includes(base)) return base;
  let n = 2;
  while (existingIds.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
