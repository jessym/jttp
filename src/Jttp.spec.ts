import { Jttp } from './Jttp';

describe(Jttp, () => {

  type MockedFetchResonse = {
    body: string | undefined;
    status: number;
    headers?: Record<string, string>;
  };

  function mockFetchSuccess({ body, status, headers }: MockedFetchResonse) {
    const response: Partial<Response> = {
      text: () => Promise.resolve(body as string),
      status,
      headers: headers && new Headers(headers),
    };
    (window.fetch as jest.MockedFunction<typeof window.fetch>).mockResolvedValue(response as Response);
  }

  function mockFetchError(error: any) {
    (window.fetch as jest.MockedFunction<typeof window.fetch>).mockRejectedValue(error);
  }

  beforeEach(() => {
    console.error = jest.fn();
    console.warn = jest.fn();
    window.fetch = jest.fn();
    mockFetchSuccess({ body: undefined, status: 200 });
  });

  it('should initialize without error and without constructor args', async () => {
    // When
    new Jttp();

    // Then
    expect(console.error).not.toHaveBeenCalled();
  });

  it('should initialize with an error when both `window.fetch` and `global.fetch` are unavailable', async () => {
    // Given
    window.fetch = undefined as any;

    // When
    new Jttp();

    // Then
    expect(console.error).toHaveBeenCalledWith('Could not find fetch function on `global` or `window`; please make it available or provide a custom fetch function');
  });

  it('should initialize without error when a custom fetch function is provided, but both `window.fetch` and `global.fetch` are unavailable', async () => {
    // Given
    window.fetch = undefined as any;

    // When
    new Jttp({ fetchInstance: jest.fn() });

    // Then
    expect(console.error).not.toHaveBeenCalled();
  });

  it('should be able to make a GET request', async () => {
    // When
    await new Jttp().get('/test');

    // Then
    expect(window.fetch).toHaveBeenCalledWith('/test', expect.objectContaining({
      method: 'GET',
    }));
  });

  it('should be able to make a POST request', async () => {
    // When
    await new Jttp().post('/test');

    // Then
    expect(window.fetch).toHaveBeenCalledWith('/test', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('should be able to make a PUT request', async () => {
    // When
    await new Jttp().put('/test');

    // Then
    expect(window.fetch).toHaveBeenCalledWith('/test', expect.objectContaining({
      method: 'PUT',
    }));
  });

  it('should be able to make a PATCH request', async () => {
    // When
    await new Jttp().patch('/test');

    // Then
    expect(window.fetch).toHaveBeenCalledWith('/test', expect.objectContaining({
      method: 'PATCH',
    }));
  });

  it('should be able to make a DELETE request', async () => {
    // When
    await new Jttp().delete('/test');

    // Then
    expect(window.fetch).toHaveBeenCalledWith('/test', expect.objectContaining({
      method: 'DELETE',
    }));
  });

  it('should use the baseUrl to construct a final URL', async () => {
    // When
    await new Jttp({ baseUrl: 'https://api.backend.com' }).get('/users');

    // Then
    expect(window.fetch).toHaveBeenCalledWith('https://api.backend.com/users', expect.anything());
  });

  it('should ignore the baseUrl if a complete URL is provided in the request', async () => {
    // When
    await new Jttp({ baseUrl: 'https://api.backend.com' }).get('https://www.google.com/hello');

    // Then
    expect(window.fetch).toHaveBeenCalledWith('https://www.google.com/hello', expect.anything());
  });

  it('should remove a double slash when combining the baseUrl with the request URL', async () => {
    // When
    await new Jttp({ baseUrl: 'https://api.backend.com/' }).get('/users');

    // Then
    expect(window.fetch).toHaveBeenCalledWith('https://api.backend.com/users', expect.anything());
  });

  it('should insert a single slash when combining the baseUrl with the request URL', async () => {
    // When
    await new Jttp({ baseUrl: 'https://api.backend.com' }).get('users');

    // Then
    expect(window.fetch).toHaveBeenCalledWith('https://api.backend.com/users', expect.anything());
  });

  it('should add search parameters at the end of the URL', async () => {
    // When
    await new Jttp().get('/users', { searchParams: { abc: '123' } });

    // Then
    expect(window.fetch).toHaveBeenCalledWith('/users?abc=123', expect.anything());
  });

  it('should allow custom headers', async () => {
    // When
    await new Jttp().get('/endpoint', { headers: { 'Authorization': 'Quack' } });

    // Then
    expect(window.fetch).toHaveBeenCalledWith('/endpoint', expect.objectContaining({
      headers: {
        'Authorization': 'Quack',
      },
    }));
  });

  it('should automatically stringify and set the content type to `application/json` for JSON bodies', async () => {
    // When
    await new Jttp().post('/json', {
      bodyJson: { abc: 123 },
    });

    // Then
    expect(window.fetch).toHaveBeenCalledWith('/json', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"abc":123}'
    }));
  });

  it('should not set the content type to `application/json` for non-JSON bodies', async () => {
    // When
    await new Jttp().post('/json', {
      body: 'Hello!',
    });

    // Then
    expect(window.fetch).toHaveBeenCalledWith('/json', expect.objectContaining({
      method: 'POST',
      headers: {},
      body: 'Hello!'
    }));
  });

  it('should return both text and json in the response', async () => {
    // Given
    mockFetchSuccess({ status: 200, body: '{"hello":"world"}' });

    // When
    const response = await new Jttp().get('/endpoint');

    // Then
    expect(response.body).toEqual('{"hello":"world"}');
    expect(response.bodyJson).toEqual({ hello: 'world' });
  });

  it('should return undefined for json and log a warning when attempting to access it as such if the response is non-json', async () => {
    // Given
    mockFetchSuccess({ status: 200, body: 'Tada 🎉' });

    // When
    const response = await new Jttp().get('/endpoint');

    // Then
    expect(response.body).toEqual('Tada 🎉');
    expect(response.bodyJson).toEqual(undefined);
    expect(console.warn).toHaveBeenCalledWith('You\'re trying to access the response body as JSON, but it could not be parsed as such');
  });

  it('should throw an error if the server could not be reached', (done) => {
    // Given
    mockFetchError(new Error('Server unavailable'));

    // When
    new Jttp().get('/endpoint')
      .catch((err: Jttp.ResponseError) => {

        // Then
        expect(err.request).toBeDefined();
        expect(err.response.status).toEqual(0);
        expect(console.error).toHaveBeenCalledWith('An HTTP error occurred', expect.anything());
        done();
      });
  });

  it('should throw an error if the server returns a response with status code >= 400', (done) => {
    // Given
    mockFetchSuccess({ body: '{"error":"email_invalid"}', status: 400 });

    // When
    new Jttp().get('/endpoint')
      .catch((err: Jttp.ResponseError) => {

        // Then
        expect(err.request).toBeDefined();
        expect(err.response.status).toEqual(400);
        expect(err.response.body).toEqual('{"error":"email_invalid"}');
        expect(err.response.bodyJson).toEqual({ error: 'email_invalid' });
        expect(console.error).toHaveBeenCalledWith('An HTTP error occurred', expect.anything());
        done();
      });
  });

});