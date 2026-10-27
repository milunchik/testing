import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const RATE_URL = 'https://api.example.com/rate';
export const STORAGE_URL = 'https://storage.example.com/files';
export const handlers = [
  http.get(RATE_URL, () => HttpResponse.json({ rate: 41.25 })),
  http.post(STORAGE_URL, () =>
    HttpResponse.json(
      {
        id: 'file-12',
        url: 'https://storage.example.com/files/file-12',
      },
      { status: 201 },
    ),
  ),
];
export const server = setupServer(...handlers);
