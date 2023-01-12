# Yesttp: Lightweight HTTP Client

## Installation

```
npm install yesttp

yarn add yesttp
```

## Creating an instance

```ts
import { Yesttp } from 'yesttp';

const yesttp = new Yesttp();
```

The class can also be instantiated with a configuration object:

```ts
const yesttp = new Yesttp({
  baseUrl: 'https://api.backend.com',
  requestInterceptor: (request) => Promise.resolve(request),
  responseErrorIntercepter: (request, response) => Promise.reject({ request, response }),
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

Here's an overview of the available request options:

```ts
export type GetOptions = {
  searchParams?: Record<string, string | undefined>;
  headers?: Record<string, string | undefined>;
};

export type RequestOptions = {
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
