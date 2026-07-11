# @mango-iiif/iiif-search-client

Zero-runtime-dependency TypeScript client for IIIF Content Search API 1.0 and 2.0. It discovers services from Presentation manifests, normalizes search and autocomplete responses, and works in browsers, Node.js 18+, and worker runtimes.

## Install

```sh
npm install @mango-iiif/iiif-search-client
```

## Use

```ts
import { IIIFSearchClient } from '@mango-iiif/iiif-search-client';

const client = IIIFSearchClient.fromManifest(manifestJson);
const results = await client.search({ q: 'watercolor', page: 1 });

for (const hit of results.hits) {
  for (const annotation of hit.annotations) {
    console.log(hit.matchText, annotation.text, annotation.geometry);
  }
}

if (client.hasAutocomplete()) {
  console.log(await client.autocomplete('water'));
}
```

Pass endpoints directly when discovery is handled elsewhere:

```ts
const client = new IIIFSearchClient({
  searchServiceUrl: 'https://example.org/iiif/search',
  autocompleteServiceUrl: 'https://example.org/iiif/autocomplete',
});
```

For environments without global `fetch`, or for authenticated requests, supply `fetcher` in the constructor or `fromManifest` options.

## Functional API

The package also exports `discoverSearchServices`, `requireSearchServices`, `parseSearchResponse`, and `parseAutocompleteResponse`. These can be used independently for gradual integrations and fixture-based parsing.

## Errors

Requests reject with `IIIFSearchError`. Inspect its `code` (`SERVICE_NOT_FOUND`, `AUTOCOMPLETE_UNAVAILABLE`, `NETWORK_ERROR`, `HTTP_ERROR`, or `INVALID_RESPONSE`). HTTP failures are `IIIFSearchHttpError` instances with `status` and `url`.

## Development

```sh
npm install
npm run dev
npm run check
npm pack --dry-run
```

`npm run dev` serves [`demo/index.html`](demo/index.html) with hot reloading and imports the client directly from `src`. The packaged library remains runtime-dependency-free.
