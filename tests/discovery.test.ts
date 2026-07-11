import { describe, expect, it } from 'vitest';
import { discoverSearchServices, IIIFSearchClient } from '../src';

describe('search service discovery', () => {
  it('discovers v1 search and autocomplete services', () => {
    const manifest = { service: { '@id': 'https://example.org/search', profile: 'http://iiif.io/api/search/1/search', service: { '@id': 'https://example.org/autocomplete', profile: 'http://iiif.io/api/search/1/autocomplete' } } };
    expect(discoverSearchServices(manifest)).toEqual({ searchServiceUrl: 'https://example.org/search', autocompleteServiceUrl: 'https://example.org/autocomplete', version: 1 });
  });

  it('discovers v2 services', () => {
    const manifest = { service: [{ id: 'https://example.org/search', type: 'SearchService2', service: [{ id: 'https://example.org/autocomplete', type: 'AutoCompleteService2' }] }] };
    const client = IIIFSearchClient.fromManifest(manifest);
    expect(client.searchServiceUrl).toBe('https://example.org/search');
    expect(client.hasAutocomplete()).toBe(true);
  });

  it('returns null for unsupported and v0 services', () => {
    expect(discoverSearchServices({ service: { '@id': 'x', profile: 'http://iiif.io/api/search/0/search' } })).toBeNull();
  });
});
