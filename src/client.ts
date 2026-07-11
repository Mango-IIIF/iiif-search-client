import { requireSearchServices } from './discovery';
import { IIIFSearchError, IIIFSearchHttpError } from './errors';
import { parseAutocompleteResponse, parseSearchResponse } from './parse';
import type { AutocompleteQuery, AutocompleteSuggestion, Fetcher, IIIFSearchClientOptions, SearchQuery, SearchResult } from './types';
import { withQuery } from './utils';

export class IIIFSearchClient {
  readonly searchServiceUrl: string;
  readonly autocompleteServiceUrl: string | undefined;
  private readonly fetcher: Fetcher;

  constructor(options: IIIFSearchClientOptions) {
    if (!options?.searchServiceUrl) throw new IIIFSearchError('INVALID_CONFIGURATION', 'searchServiceUrl is required');
    try { new URL(options.searchServiceUrl); } catch (cause) { throw new IIIFSearchError('INVALID_CONFIGURATION', 'searchServiceUrl must be an absolute URL', { cause }); }
    if (options.autocompleteServiceUrl) {
      try { new URL(options.autocompleteServiceUrl); } catch (cause) { throw new IIIFSearchError('INVALID_CONFIGURATION', 'autocompleteServiceUrl must be an absolute URL', { cause }); }
    }
    const fetcher = options.fetcher ?? globalThis.fetch;
    if (!fetcher) throw new IIIFSearchError('INVALID_CONFIGURATION', 'No fetch implementation is available');
    this.searchServiceUrl = options.searchServiceUrl;
    this.autocompleteServiceUrl = options.autocompleteServiceUrl;
    this.fetcher = fetcher.bind(globalThis) as Fetcher;
  }

  static fromManifest(manifest: unknown, options: { fetcher?: Fetcher } = {}): IIIFSearchClient {
    const services = requireSearchServices(manifest);
    return new IIIFSearchClient({ ...services, ...options });
  }

  hasAutocomplete(): boolean { return Boolean(this.autocompleteServiceUrl); }

  async search(query: SearchQuery): Promise<SearchResult> {
    if (!query?.q?.trim()) throw new IIIFSearchError('INVALID_CONFIGURATION', 'A non-empty search query is required');
    return parseSearchResponse(await this.request(withQuery(this.searchServiceUrl, { ...query, q: query.q.trim() })));
  }

  async autocomplete(query: string | AutocompleteQuery): Promise<AutocompleteSuggestion[]> {
    if (!this.autocompleteServiceUrl) throw new IIIFSearchError('AUTOCOMPLETE_UNAVAILABLE', 'This client has no autocomplete service');
    const params = typeof query === 'string' ? { q: query } : query;
    if (!params?.q?.trim()) throw new IIIFSearchError('INVALID_CONFIGURATION', 'A non-empty autocomplete query is required');
    return parseAutocompleteResponse(await this.request(withQuery(this.autocompleteServiceUrl, { ...params, q: params.q.trim() })));
  }

  private async request(url: URL): Promise<unknown> {
    let response: Response;
    try { response = await this.fetcher(url, { headers: { Accept: 'application/json, application/ld+json' } }); }
    catch (cause) { throw new IIIFSearchError('NETWORK_ERROR', `IIIF request failed: ${url}`, { cause }); }
    if (!response.ok) throw new IIIFSearchHttpError(response.status, url.toString());
    try { return await response.json(); }
    catch (cause) { throw new IIIFSearchError('INVALID_RESPONSE', `IIIF response was not valid JSON: ${url}`, { cause }); }
  }
}
