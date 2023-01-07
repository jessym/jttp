export class Jttp {

  private readonly baseUrl: string | undefined;
  private readonly fetchInstance: typeof fetch;
  private readonly requestInterceptor: Jttp.RequestInterceptor;
  private readonly responseErrorInterceptor: Jttp.ResponseErrorInterceptor;
  private readonly responseSuccessInterceptor: Jttp.ResponseSuccessInterceptor;

  private static get windowFetch(): typeof fetch {
    if (typeof window !== 'undefined' && window.fetch) return window.fetch.bind(window);
    if (typeof global !== 'undefined' && global.fetch) return global.fetch.bind(global);
    console.error('Could not find fetch function on `global` or `window`; please make it available or provide a custom fetch function');
    return undefined as unknown as typeof fetch;
  }

  public constructor({
    baseUrl = undefined,
    fetchInstance = Jttp.windowFetch,
    requestInterceptor = Jttp.defaultRequestInterceptor,
    responseErrorIntercepter = Jttp.defaultResponseErrorInterceptor,
    responseSuccessInterceptor = Jttp.defaultResponseSuccessInterceptor,
  } = {} as Jttp.ConstructorArgs) {
    this.baseUrl = baseUrl;
    this.fetchInstance = fetchInstance;
    this.requestInterceptor = requestInterceptor;
    this.responseErrorInterceptor = responseErrorIntercepter;
    this.responseSuccessInterceptor = responseSuccessInterceptor;
  }

  public get<T>(url: string, options = {} as Omit<Jttp.RequestOptions, 'url' | 'method' | 'body' | 'bodyJson'>): Promise<Jttp.Response<T>> {
    return this.makeRequest({ ...options, url, method: 'GET' });
  }

  public post<T>(url: string, options = {} as Omit<Jttp.RequestOptions, 'url' | 'method'>): Promise<Jttp.Response<T>> {
    return this.makeRequest({ ...options, url, method: 'POST' });
  }

  public put<T>(url: string, options = {} as Omit<Jttp.RequestOptions, 'url' | 'method'>): Promise<Jttp.Response<T>> {
    return this.makeRequest({ ...options, url, method: 'PUT' });
  }

  public patch<T>(url: string, options = {} as Omit<Jttp.RequestOptions, 'url' | 'method'>): Promise<Jttp.Response<T>> {
    return this.makeRequest({ ...options, url, method: 'PATCH' });
  }

  public delete<T>(url: string, options = {} as Omit<Jttp.RequestOptions, 'url' | 'method'>): Promise<Jttp.Response<T>> {
    return this.makeRequest({ ...options, url, method: 'DELETE' });
  }

  private async makeRequest<T>(opts: Jttp.RequestOptions): Promise<Jttp.Response<T>> {
    const options = await this.requestInterceptor({
      ...opts,
      url: this.constructCompleteUrl(opts),
      headers: {
        ...opts.headers,
        'Content-Type': opts.headers?.['Content-Type'] || (opts.bodyJson ? 'application/json' : undefined),
      },
    });

    let response: Response;
    try {
      response = await this.fetchInstance(options.url, {
        method: options.method,
        headers: this.removeUndefinedMappings(options.headers || {}),
        body: options.bodyJson ? JSON.stringify(opts.bodyJson) : options.body,
      });
    } catch (e) {
      return this.responseErrorInterceptor(options, { status: 0, body: undefined, bodyJson: undefined, headers: {} });
    }
    return this.handleResponse(options, response);
  }

  private async handleResponse<T>(request: Jttp.RequestOptions, fetchResponse: Response): Promise<Jttp.Response<T>> {
    let text: string | undefined;
    let json: T | undefined;
    let invalidJsonResponse = false;
    try {
      text = await fetchResponse.text();
      if (typeof text !== 'undefined') {
        json = JSON.parse(text);
      }
    } catch (ignored) {
      invalidJsonResponse = true;
    }
    const response: Jttp.Response<T> = {
      headers: this.parseFetchHeaders(fetchResponse.headers || new Headers()),
      status: fetchResponse?.status,
      body: text as string,
      get bodyJson(): T {
        if (invalidJsonResponse) {
          console.warn('You\'re trying to access the response body as JSON, but it could not be parsed as such');
        }
        return json as T;
      }
    };

    // Success
    if (response.status >= 200 && response.status < 400) {
      return this.responseSuccessInterceptor(request, response);
    }

    // Error
    return this.responseErrorInterceptor(request, response);
  }

  private constructCompleteUrl({ url, searchParams }: Jttp.RequestOptions): string {
    let completeUrl = '';
    if (url.match(/^https?:\/\//)) {
      completeUrl += url;
    } else {
      const baseUrl = this.baseUrl || '';
      const insertSlash = !baseUrl.endsWith('/') && !url.startsWith('/');
      const removeSlash = baseUrl.endsWith('/') && url.startsWith('/');
      if (removeSlash) {
        completeUrl = `${baseUrl.slice(0, -1)}${url}`;
      } else {
        completeUrl += `${baseUrl}${insertSlash ? '/' : ''}${url}`;
      }
    }
    const searchParamsStrippedOfUndefined = { ...searchParams } as Record<string, string>;
    Object.entries(searchParamsStrippedOfUndefined).forEach(([key, value]) => {
      if (typeof value === 'undefined') {
        delete searchParamsStrippedOfUndefined[key];
      }
    });
    const params = new URLSearchParams(searchParamsStrippedOfUndefined).toString();
    if (params) {
      completeUrl += `?${params}`;
    }
    return completeUrl;
  }

  private removeUndefinedMappings(obj: Record<string, string | undefined>): Record<string, string> {
    const result: Record<string, string> = {}
    for (const key in obj) {
      const value = obj[key];
      if (value !== undefined && value !== null) {
        result[key] = value;
      }
    }
    return result
  }

  private parseFetchHeaders(fetchHeaders: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    fetchHeaders.forEach((value, key) => result[key] = value);
    return result;
  }

}

export namespace Jttp {

  export type RequestInterceptor = (request: RequestOptions) => Promise<RequestOptions>;
  export const defaultRequestInterceptor: RequestInterceptor = (request) => Promise.resolve(request);

  export type ResponseErrorInterceptor = (request: RequestOptions, response: ResponseWithOptionalBody) => Promise<any>;
  export const defaultResponseErrorInterceptor: ResponseErrorInterceptor = (request, response) => {
    const error: Jttp.ResponseError = { request, response };
    console.error('An HTTP error occurred', error);
    throw error;
  };

  export type ResponseSuccessInterceptor = (request: RequestOptions, response: ResponseWithOptionalBody) => Promise<any>;
  export const defaultResponseSuccessInterceptor: Jttp.ResponseErrorInterceptor = (request, response) => Promise.resolve(response);

  export type ConstructorArgs = {
    baseUrl?: string;
    fetchInstance?: typeof fetch,
    requestInterceptor?: RequestInterceptor;
    responseErrorIntercepter?: ResponseErrorInterceptor;
    responseSuccessInterceptor?: ResponseSuccessInterceptor;
  };

  export type RequestOptions = {
    url: string;
    searchParams?: Record<string, string | undefined>;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    headers?: Record<string, string | undefined>;
    body?: any;
    bodyJson?: any;
  };

  export type Response<T> = {
    status: number;
    headers: Record<string, string>;
    body: string;
    bodyJson: T;
  };

  export type ResponseError = {
    request: RequestOptions;
    response: ResponseWithOptionalBody;
  };

  type ResponseWithOptionalBody = AllowUndefined<Response<any>, 'body' | 'bodyJson'>;

  type AllowUndefined<T, K extends keyof T> = Omit<T, K> & {
    [P in K]: T[K] | undefined;
  };

}
