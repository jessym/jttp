import { Yesttp } from './index';

describe(Yesttp, () => {

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
    new Yesttp();

    // Then
    expect(console.error).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('should throw an error when attempting to make a request without `window.fetch` and `global.fetch`', (done) => {
    // Given
    window.fetch = undefined as any;

    // When
    const action = () => new Yesttp().get('/users');

    // Then
    action().catch(err => {
      expect(err.message).toEqual('[Yesttp] Could not find fetch function on `global` or `window`, please make it available there');
      done();
    });
  });

  it('should be able to make a GET request', async () => {
    // When
    await new Yesttp().get('/test');

    // Then
    expect(window.fetch).toHaveBeenCalledWith('/test', expect.objectContaining({
      method: 'GET',
    }));
  });

  it('should be able to make a POST request', async () => {
    // When
    await new Yesttp().post('/test');

    // Then
    expect(window.fetch).toHaveBeenCalledWith('/test', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('should be able to make a PUT request', async () => {
    // When
    await new Yesttp().put('/test');

    // Then
    expect(window.fetch).toHaveBeenCalledWith('/test', expect.objectContaining({
      method: 'PUT',
    }));
  });

  it('should be able to make a PATCH request', async () => {
    // When
    await new Yesttp().patch('/test');

    // Then
    expect(window.fetch).toHaveBeenCalledWith('/test', expect.objectContaining({
      method: 'PATCH',
    }));
  });

  it('should be able to make a DELETE request', async () => {
    // When
    await new Yesttp().delete('/test');

    // Then
    expect(window.fetch).toHaveBeenCalledWith('/test', expect.objectContaining({
      method: 'DELETE',
    }));
  });

  it('should use the baseUrl to construct a final URL', async () => {
    // When
    await new Yesttp({ baseUrl: 'https://api.backend.com' }).get('/users');

    // Then
    expect(window.fetch).toHaveBeenCalledWith('https://api.backend.com/users', expect.anything());
  });

  it('should ignore the baseUrl if a complete URL is provided in the request', async () => {
    // When
    await new Yesttp({ baseUrl: 'https://api.backend.com' }).get('https://www.google.com/hello');

    // Then
    expect(window.fetch).toHaveBeenCalledWith('https://www.google.com/hello', expect.anything());
  });

  it('should remove a double slash when combining the baseUrl with the request URL', async () => {
    // When
    await new Yesttp({ baseUrl: 'https://api.backend.com/' }).get('/users');

    // Then
    expect(window.fetch).toHaveBeenCalledWith('https://api.backend.com/users', expect.anything());
  });

  it('should insert a single slash when combining the baseUrl with the request URL', async () => {
    // When
    await new Yesttp({ baseUrl: 'https://api.backend.com' }).get('users');

    // Then
    expect(window.fetch).toHaveBeenCalledWith('https://api.backend.com/users', expect.anything());
  });

  it('should add search parameters at the end of the URL', async () => {
    // When
    await new Yesttp().get('/users', { searchParams: { abc: '123' } });

    // Then
    expect(window.fetch).toHaveBeenCalledWith('/users?abc=123', expect.anything());
  });

  it('should allow custom headers', async () => {
    // When
    await new Yesttp().get('/endpoint', { headers: { 'Authorization': 'Quack' } });

    // Then
    expect(window.fetch).toHaveBeenCalledWith('/endpoint', expect.objectContaining({
      headers: {
        'Authorization': 'Quack',
      },
    }));
  });

  it('should automatically stringify and set the content type to `application/json` for bodies', async () => {
    // When
    await new Yesttp().post('/json', {
      body: { abc: 123 },
    });

    // Then
    expect(window.fetch).toHaveBeenCalledWith('/json', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"abc":123}'
    }));
  });

  it('should not set the content type to `application/json` for raw bodies', async () => {
    // When
    await new Yesttp().post('/json', {
      bodyRaw: 'Hello!',
    });

    // Then
    expect(window.fetch).toHaveBeenCalledWith('/json', expect.objectContaining({
      method: 'POST',
      headers: {},
      body: 'Hello!'
    }));
  });

  it('should allow for a typed body property in the response object', async () => {
    // Given
    type ExampleResponse = { hello: string };
    mockFetchSuccess({ status: 200, body: '{"hello":"world"}' });

    // When
    const response = await new Yesttp().get<ExampleResponse>('/endpoint');

    // Then
    expect(response.body.hello).toEqual('world');
  });

  it('should return both text and json in the response', async () => {
    // Given
    mockFetchSuccess({ status: 200, body: '{"hello":"world"}' });

    // When
    const response = await new Yesttp().get('/endpoint');

    // Then
    expect(response.bodyRaw).toEqual('{"hello":"world"}');
    expect(response.body).toEqual({ hello: 'world' });
  });

  it('should pass through the "credentials" setting at constructor time', async () => {
    // When
    await new Yesttp({ credentials: 'same-origin' }).post('/');

    // Then
    expect(window.fetch).toHaveBeenCalledWith('/', expect.objectContaining({
      method: 'POST',
      credentials: 'same-origin',
    }));
  });

  it('should pass through the "credentials" setting at request time', async () => {
    // When
    await new Yesttp().post('/', {
      credentials: 'include',
    });

    // Then
    expect(window.fetch).toHaveBeenCalledWith('/', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }));
  });

  it('should give priority to request "credentials" instead of construct "credentials"', async () => {
    // When
    await new Yesttp({ credentials: 'same-origin' }).post('/', {
      credentials: 'omit',
    });

    // Then
    expect(window.fetch).toHaveBeenCalledWith('/', expect.objectContaining({
      method: 'POST',
      credentials: 'omit',
    }));
  });

  it('should not pass along credentials when they aren\'t supplied', async () => {
    // When
    await new Yesttp().post('/');

    // Then
    expect(window.fetch).toHaveBeenCalledWith('/', expect.objectContaining({
      method: 'POST',
      credentials: undefined,
    }));
  });

  it('should return undefined for json and log a warning when attempting to access it as such if the response is non-json', async () => {
    // Given
    mockFetchSuccess({ status: 200, body: 'Tada 🎉' });

    // When
    const response = await new Yesttp().get('/endpoint');

    // Then
    expect(response.bodyRaw).toEqual('Tada 🎉');
    expect(response.body).toEqual(undefined);
    expect(console.warn).toHaveBeenCalledWith('[Yesttp] You\'re trying to access the response body as JSON, but it could not be parsed as such');
  });

  it('should throw an error if the server could not be reached', (done) => {
    // Given
    const error = new Error('Server unavailable');
    mockFetchError(error);

    // When
    new Yesttp().get('/endpoint')
      .catch((e: Yesttp.ResponseError) => {

        // Then
        expect(e.request).toBeDefined();
        expect(e.response.status).toEqual(0);
        expect(console.error).toHaveBeenCalledWith('[Yesttp] An HTTP error occurred', expect.anything(), error);
        done();
      });
  });

  it('should throw an error if the server returns a response with status code >= 400', (done) => {
    // Given
    mockFetchSuccess({ body: '{"error":"email_invalid"}', status: 400 });

    // When
    new Yesttp().get('/endpoint')
      .catch((err: Yesttp.ResponseError) => {

        // Then
        expect(err.request).toBeDefined();
        expect(err.response.status).toEqual(400);
        expect(err.response.bodyRaw).toEqual('{"error":"email_invalid"}');
        expect(err.response.body).toEqual({ error: 'email_invalid' });
        expect(console.error).toHaveBeenCalledWith('[Yesttp] An HTTP error occurred', expect.anything());
        done();
      });
  });

});