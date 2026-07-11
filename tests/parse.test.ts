import { describe, expect, it } from 'vitest';
import { parseAutocompleteResponse, parseSearchResponse } from '../src';

describe('search response parsing', () => {
  it('normalizes v1 hits, snippets, multi-annotation hits, and paging', () => {
    const result = parseSearchResponse({
      '@id': 'https://example.org/search?q=hand&page=2', '@type': 'sc:AnnotationList', startIndex: 10,
      within: { total: 21, last: 'https://example.org/search?q=hand&page=3' },
      prev: 'https://example.org/search?q=hand&page=1', next: 'https://example.org/search?q=hand&page=3',
      resources: [
        { '@id': 'a1', resource: { chars: 'A bird in the hand' }, on: 'https://example.org/canvas#xywh=200,100,150,30' },
        { '@id': 'a2', resource: { chars: 'is worth two' }, on: 'https://example.org/canvas#xywh=200,140,170,30' },
      ],
      hits: [{ annotations: ['a1', 'a2'], match: 'hand is', before: 'A bird in the ', after: ' worth two' }],
    });
    expect(result).toMatchObject({ total: 21, totalPages: 3, currentPage: 2, nextPageUrl: expect.any(String), prevPageUrl: expect.any(String) });
    expect(result.hits[0]).toMatchObject({ matchText: 'A bird in the hand is worth two', annotations: [{ id: 'a1' }, { id: 'a2' }] });
  });

  it('normalizes v2 annotations and contextual snippets', () => {
    const result = parseSearchResponse({
      type: 'AnnotationPage', id: 'https://example.org/search?q=bird',
      items: [{ id: 'a1', type: 'Annotation', body: { type: 'TextualBody', value: 'birds' }, target: { source: 'https://example.org/canvas', selector: { type: 'FragmentSelector', value: 'xywh=pixel:1.5,2,3,4' } } }],
      annotations: [{ type: 'AnnotationPage', items: [{ motivation: 'contextualizing', target: { source: 'a1', selector: [{ type: 'TextQuoteSelector', prefix: 'two ', exact: 'birds', suffix: ' fly' }] } }] }],
    });
    expect(result.hits[0]).toMatchObject({ matchText: 'two birds fly', annotations: [{ text: 'birds', geometry: { canvasId: 'https://example.org/canvas', x: 1.5, y: 2, w: 3, h: 4 } }] });
  });

  it('rejects unknown response shapes', () => {
    expect(() => parseSearchResponse({ data: [] })).toThrow(/not a IIIF/);
  });
});

describe('autocomplete response parsing', () => {
  it('normalizes v1 terms', () => {
    expect(parseAutocompleteResponse({ terms: [{ match: 'bird', count: 15, url: 'https://example.org/search?q=bird', label: 'Bird' }] })).toEqual([{ match: 'bird', count: 15, url: 'https://example.org/search?q=bird', label: 'Bird' }]);
  });

  it('normalizes extended v2 terms', () => {
    expect(parseAutocompleteResponse({ type: 'TermPage', items: [{ value: 'bird', total: 12, label: { en: ['Bird'] }, language: 'en', service: [{ id: 'https://example.org/search?q=bird', type: 'SearchService2' }] }] })).toEqual([{ match: 'bird', count: 12, url: 'https://example.org/search?q=bird', label: 'Bird', language: 'en' }]);
  });
});
