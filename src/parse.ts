import { IIIFSearchError } from './errors';
import type { AutocompleteSuggestion, SearchAnnotation, SearchGeometry, SearchHit, SearchResult } from './types';
import { asArray, firstLabel, idOf, isRecord, pageFromUrl, stringValue } from './utils';

const textOf = (body: unknown): string => {
  if (typeof body === 'string') return body;
  if (Array.isArray(body)) return body.map(textOf).filter(Boolean).join(' ');
  if (!isRecord(body)) return '';
  return stringValue(body.value) ?? stringValue(body.chars) ?? stringValue(body['@value']) ?? '';
};

const targetInfo = (target: unknown): { source?: string; selector?: unknown } => {
  if (typeof target === 'string') return { source: target };
  if (!isRecord(target)) return {};
  const source = idOf(target.source) ?? idOf(target) ?? stringValue(target.full);
  return { ...(source ? { source } : {}), selector: target.selector };
};

const geometryOf = (target: unknown): SearchGeometry | undefined => {
  const { source, selector } = targetInfo(target);
  const candidates = [source, ...asArray(selector).flatMap((item) => {
    if (typeof item === 'string') return [item];
    return isRecord(item) ? [stringValue(item.value), idOf(item)].filter((v): v is string => Boolean(v)) : [];
  })];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const match = candidate.match(/(?:^|[#&?])xywh=(?:pixel:)?(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (!match) continue;
    const canvasId = (source ?? candidate).split('#')[0];
    if (!canvasId) continue;
    return { canvasId, x: Number(match[1]), y: Number(match[2]), w: Number(match[3]), h: Number(match[4]) };
  }
  return undefined;
};

const annotationOf = (value: unknown): SearchAnnotation | undefined => {
  if (!isRecord(value)) return undefined;
  const id = idOf(value);
  if (!id) return undefined;
  const text = textOf(value.body ?? value.resource);
  const label = firstLabel(value.label);
  const geometry = geometryOf(value.target ?? value.on);
  return {
    id,
    text,
    ...(label ? { label } : {}),
    ...(geometry ? { geometry } : {}),
  };
};

const linkOf = (value: unknown): string | undefined => idOf(value);

const pageMetadata = (data: Record<string, unknown>, count: number) => {
  const id = idOf(data);
  const nextPageUrl = linkOf(data.next);
  const prevPageUrl = linkOf(data.prev);
  const collection = isRecord(data.partOf) ? data.partOf : isRecord(data.within) ? data.within : undefined;
  const totalValue = collection?.total;
  const total = typeof totalValue === 'number' && totalValue >= 0 ? totalValue : count;
  const currentPage = pageFromUrl(id, prevPageUrl ? pageFromUrl(prevPageUrl) + 1 : 1);
  const lastUrl = collection ? linkOf(collection.last) : undefined;
  const lastPage = pageFromUrl(lastUrl, 0);
  const totalPages = lastPage > 0 ? lastPage : nextPageUrl ? Math.max(currentPage + 1, Math.ceil(total / Math.max(count, 1))) : currentPage;
  return { total, totalPages, currentPage, ...(nextPageUrl ? { nextPageUrl } : {}), ...(prevPageUrl ? { prevPageUrl } : {}) };
};

const selectorSnippet = (selector: unknown): string | undefined => {
  if (!isRecord(selector)) return undefined;
  const exact = stringValue(selector.exact);
  if (!exact) return undefined;
  return `${stringValue(selector.prefix) ?? ''}${exact}${stringValue(selector.suffix) ?? ''}`;
};

const parseV1 = (data: Record<string, unknown>): SearchResult => {
  const annotations = asArray(data.resources).map(annotationOf).filter((v): v is SearchAnnotation => Boolean(v));
  const byId = new Map(annotations.map((annotation) => [annotation.id, annotation]));
  const rawHits = asArray(data.hits).filter(isRecord);
  const hits: SearchHit[] = rawHits.length
    ? rawHits.map((hit, index) => {
        const linked = asArray(hit.annotations).map(idOf).filter((id): id is string => Boolean(id)).map((id) => byId.get(id)).filter((v): v is SearchAnnotation => Boolean(v));
        const match = stringValue(hit.match);
        const selectorText = asArray(hit.selectors).map(selectorSnippet).find(Boolean);
        const middle = match ?? selectorText ?? linked.map((annotation) => annotation.text).join(' ');
        const matchText = `${stringValue(hit.before) ?? ''}${middle}${stringValue(hit.after) ?? ''}`;
        return { id: idOf(hit) ?? `hit-${index + 1}`, ...(matchText ? { matchText } : {}), annotations: linked };
      })
    : annotations.map((annotation) => ({ id: annotation.id, annotations: [annotation] }));
  return { ...pageMetadata(data, hits.length), hits };
};

const v2Context = (data: Record<string, unknown>): Map<string, string> => {
  const result = new Map<string, string>();
  for (const page of asArray(data.annotations)) {
    if (!isRecord(page)) continue;
    for (const annotation of asArray(page.items)) {
      if (!isRecord(annotation)) continue;
      const target = annotation.target;
      if (!isRecord(target)) continue;
      const source = idOf(target.source);
      const snippet = asArray(target.selector).map(selectorSnippet).find(Boolean);
      if (source && snippet && !result.has(source)) result.set(source, snippet);
    }
  }
  return result;
};

const parseV2 = (data: Record<string, unknown>): SearchResult => {
  const context = v2Context(data);
  const hits: SearchHit[] = asArray(data.items).map(annotationOf).filter((v): v is SearchAnnotation => Boolean(v)).map((annotation) => {
    const matchText = context.get(annotation.id);
    return { id: annotation.id, ...(matchText ? { matchText } : {}), annotations: [annotation] };
  });
  return { ...pageMetadata(data, hits.length), hits };
};

export const parseSearchResponse = (value: unknown): SearchResult => {
  if (!isRecord(value)) throw new IIIFSearchError('INVALID_RESPONSE', 'Search response must be a JSON object');
  if (Array.isArray(value.items) || value.type === 'AnnotationPage') return parseV2(value);
  if (Array.isArray(value.resources) || value['@type'] === 'sc:AnnotationList') return parseV1(value);
  throw new IIIFSearchError('INVALID_RESPONSE', 'Response is not a IIIF Content Search 1.0 or 2.0 result');
};

export const parseAutocompleteResponse = (value: unknown): AutocompleteSuggestion[] => {
  if (!isRecord(value)) throw new IIIFSearchError('INVALID_RESPONSE', 'Autocomplete response must be a JSON object');
  if (Array.isArray(value.terms)) {
    return value.terms.filter(isRecord).flatMap((term) => {
      const match = stringValue(term.match);
      if (!match) return [];
      const count = typeof term.count === 'number' ? term.count : undefined;
      const url = stringValue(term.url);
      const label = firstLabel(term.label);
      return [{ match, ...(count !== undefined ? { count } : {}), ...(url ? { url } : {}), ...(label ? { label } : {}) }];
    });
  }
  if (Array.isArray(value.items) || value.type === 'TermPage') {
    return asArray(value.items).filter(isRecord).flatMap((term) => {
      const match = stringValue(term.value);
      if (!match) return [];
      const count = typeof term.total === 'number' ? term.total : undefined;
      const label = firstLabel(term.label);
      const language = stringValue(term.language);
      const searchService = asArray(term.service).find(isRecord);
      const url = idOf(searchService);
      return [{ match, ...(count !== undefined ? { count } : {}), ...(url ? { url } : {}), ...(label ? { label } : {}), ...(language ? { language } : {}) }];
    });
  }
  throw new IIIFSearchError('INVALID_RESPONSE', 'Response is not a IIIF Content Search 1.0 or 2.0 autocomplete result');
};
