export const normalizeText = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // remove punctuation
    .replace(/\s+/g, ' ')    // normalize spaces
    .trim();
