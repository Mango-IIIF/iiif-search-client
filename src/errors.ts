export type IIIFSearchErrorCode =
  | 'INVALID_CONFIGURATION'
  | 'SERVICE_NOT_FOUND'
  | 'AUTOCOMPLETE_UNAVAILABLE'
  | 'NETWORK_ERROR'
  | 'HTTP_ERROR'
  | 'INVALID_RESPONSE';

export class IIIFSearchError extends Error {
  readonly code: IIIFSearchErrorCode;
  readonly cause?: unknown;

  constructor(code: IIIFSearchErrorCode, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'IIIFSearchError';
    this.code = code;
    if (options && 'cause' in options) this.cause = options.cause;
  }
}

export class IIIFSearchHttpError extends IIIFSearchError {
  readonly status: number;
  readonly url: string;

  constructor(status: number, url: string) {
    super('HTTP_ERROR', `IIIF request failed with HTTP ${status}: ${url}`);
    this.name = 'IIIFSearchHttpError';
    this.status = status;
    this.url = url;
  }
}
