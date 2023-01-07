# Yesttp: Lightweight HTTP Client

## Creating an instance

```ts
const yesttp = new Yesttp();
```

The class can also be instantiated with a configuration object:

```ts
const yesttp = new Yesttp({
  baseUrl: 'https://api.backend.com',
  requestInterceptor: (request) => Promise.resolve(request),
  responseErrorIntercepter: (request, response) => Promise.reject(response),
  responseSuccessInterceptor: (request, response) => Promise.resolve(response),
});
```

## Instance Request API

```ts
yesttp.get('/users');

yesttp.post('/users', {
  // Request options
});
```

Here's a list of the available request options:

```ts
type RequestOptions = {
  searchParams?: Record<string, string | undefined>;
  headers?: Record<string, string | undefined>;
  body?: any;
  bodyJson?: any;
};
```

## Instance Response API

```ts
const response = await yesttp.get<User>('/users/123');
```

Here, the response is an object with the following properties:

```ts
type Response<T> = {
  status: number;
  headers: Record<string, string>;
  body: string;
  bodyJson: T;
};
```
