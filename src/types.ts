export type IIIFSearchVersion = 1 | 2;

export interface SearchServices {
  searchServiceUrl: string;
  autocompleteServiceUrl?: string;
  version: IIIFSearchVersion;
}

export interface SearchQuery {
  q: string;
  motivation?: string;
  date?: string;
  user?: string;
  page?: number;
}

export interface AutocompleteQuery extends Omit<SearchQuery, 'page'> {
  min?: number;
}

export interface SearchGeometry {
  canvasId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SearchAnnotation {
  id: string;
  text: string;
  label?: string;
  geometry?: SearchGeometry;
}

export interface SearchHit {
  id: string;
  matchText?: string;
  annotations: SearchAnnotation[];
}

export interface SearchResult {
  total: number;
  totalPages: number;
  currentPage: number;
  nextPageUrl?: string;
  prevPageUrl?: string;
  hits: SearchHit[];
}

export interface AutocompleteSuggestion {
  match: string;
  count?: number;
  url?: string;
  label?: string;
  language?: string;
}

export type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface IIIFSearchClientOptions {
  searchServiceUrl: string;
  autocompleteServiceUrl?: string;
  fetcher?: Fetcher;
}
