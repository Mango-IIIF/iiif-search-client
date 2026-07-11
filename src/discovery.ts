import { IIIFSearchError } from './errors';
import type { IIIFSearchVersion, SearchServices } from './types';
import { asArray, idOf, isRecord, stringValue } from './utils';

const SEARCH_1 = 'http://iiif.io/api/search/1/search';
const AUTOCOMPLETE_1 = 'http://iiif.io/api/search/1/autocomplete';

const profiles = (service: Record<string, unknown>): string[] =>
  asArray(service.profile ?? service['@profile']).flatMap((profile) => {
    if (typeof profile === 'string') return [profile];
    const id = idOf(profile);
    return id ? [id] : [];
  });

const serviceVersion = (service: Record<string, unknown>): IIIFSearchVersion | undefined => {
  const type = stringValue(service.type) ?? stringValue(service['@type']);
  if (type === 'SearchService2') return 2;
  if (type === 'SearchService1' || profiles(service).includes(SEARCH_1)) return 1;
  return undefined;
};

const isAutocomplete = (service: Record<string, unknown>, version: IIIFSearchVersion): boolean => {
  const type = stringValue(service.type) ?? stringValue(service['@type']);
  return version === 2
    ? type === 'AutoCompleteService2' || type === 'AutocompleteService2'
    : profiles(service).includes(AUTOCOMPLETE_1) || type === 'AutoCompleteService1';
};

export const discoverSearchServices = (manifest: unknown): SearchServices | null => {
  if (!isRecord(manifest)) return null;
  const rawServices = typeof manifest.getProperty === 'function'
    ? (manifest.getProperty as (name: string) => unknown)('service') ??
      (manifest.getProperty as (name: string) => unknown)('services')
    : manifest.service ?? manifest.services;

  for (const value of asArray(rawServices)) {
    if (!isRecord(value)) continue;
    const version = serviceVersion(value);
    const searchServiceUrl = idOf(value);
    if (!version || !searchServiceUrl) continue;
    let autocompleteServiceUrl: string | undefined;
    for (const nested of asArray(value.service ?? value.services)) {
      if (isRecord(nested) && isAutocomplete(nested, version)) {
        autocompleteServiceUrl = idOf(nested);
        if (autocompleteServiceUrl) break;
      }
    }
    return autocompleteServiceUrl
      ? { searchServiceUrl, autocompleteServiceUrl, version }
      : { searchServiceUrl, version };
  }
  return null;
};

export const requireSearchServices = (manifest: unknown): SearchServices => {
  const services = discoverSearchServices(manifest);
  if (!services) throw new IIIFSearchError('SERVICE_NOT_FOUND', 'No IIIF Content Search 1.0 or 2.0 service was found');
  return services;
};
