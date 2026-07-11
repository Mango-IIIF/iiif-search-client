export const asArray = <T>(value: T | T[] | null | undefined): T[] =>
  value == null ? [] : Array.isArray(value) ? value : [value];

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const stringValue = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

export const idOf = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (!isRecord(value)) return undefined;
  return stringValue(value.id) ?? stringValue(value['@id']);
};

export const firstLabel = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.find((item): item is string => typeof item === 'string');
  if (!isRecord(value)) return undefined;
  for (const labels of Object.values(value)) {
    const label = firstLabel(labels);
    if (label) return label;
  }
  return undefined;
};

export const pageFromUrl = (value: string | undefined, fallback = 1): number => {
  if (!value) return fallback;
  try {
    const parsed = Number(new URL(value).searchParams.get('page'));
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
};

export const withQuery = (base: string, query: Record<string, string | number | undefined>): URL => {
  let url: URL;
  try {
    url = new URL(base);
  } catch (cause) {
    throw new Error(`Invalid service URL: ${base}`, { cause });
  }
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url;
};
