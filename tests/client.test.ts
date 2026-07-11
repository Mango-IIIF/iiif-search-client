import { describe, expect, it, vi } from 'vitest';
import { IIIFSearchClient, IIIFSearchError, IIIFSearchHttpError } from '../src';

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json' },
});

describe('IIIFSearchClient', () => {
  it('builds search parameters and normalizes a response', async () => {
    const fetcher = vi.fn(async (_input: string | URL) => jsonResponse({
      '@type': 'sc:AnnotationList',
      resources: [{ '@id': 'https://example.org/a/1', resource: { chars: 'a bird' }, on: 'https://example.org/c/1#xywh=1,2,3,4' }],
    }));
    const client = new IIIFSearchClient({ searchServiceUrl: 'https://example.org/search?existing=yes', fetcher });
    const result = await client.search({ q: ' bird ', motivation: 'painting', page: 2 });
    expect(String(fetcher.mock.calls[0]?.[0])).toBe('https://example.org/search?existing=yes&q=bird&motivation=painting&page=2');
    expect(result.hits[0]?.annotations[0]?.geometry).toEqual({ canvasId: 'https://example.org/c/1', x: 1, y: 2, w: 3, h: 4 });
  });

  it('throws typed HTTP and network errors', async () => {
    const http = new IIIFSearchClient({ searchServiceUrl: 'https://example.org/search', fetcher: async () => jsonResponse({}, 503) });
    await expect(http.search({ q: 'bird' })).rejects.toBeInstanceOf(IIIFSearchHttpError);
    const network = new IIIFSearchClient({ searchServiceUrl: 'https://example.org/search', fetcher: async () => { throw new Error('offline'); } });
    await expect(network.search({ q: 'bird' })).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('reports unavailable autocomplete', async () => {
    const client = new IIIFSearchClient({ searchServiceUrl: 'https://example.org/search' });
    expect(client.hasAutocomplete()).toBe(false);
    await expect(client.autocomplete('bir')).rejects.toBeInstanceOf(IIIFSearchError);
  });
});
