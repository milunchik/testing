import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { FileUploadService, type UploadFile } from '../src/file-upload-service';
import { HttpFileStorage } from '../src/http-file-storage';
import { InMemoryUploadJournal } from './fakes/in-memory-upload-journal';
import { server, STORAGE_URL } from './msw/server';

const timestamp = '2026-03-15T10:00:00.000Z';
const stored = {
  id: 'file-12',
  url: 'https://storage.example.com/files/file-12',
};
function file(size = 4, mimeType = 'application/pdf'): UploadFile {
  return {
    filename: 'report.pdf',
    mimeType,
    size,
    content: new Uint8Array(size),
  };
}

class FailingUploadJournal extends InMemoryUploadJournal {
  override async append(): Promise<void> {
    throw new Error('JOURNAL_UNAVAILABLE');
  }
}

describe('FileUploadService — варіант 12', () => {
  const storage = {
    upload: vi.fn<(file: UploadFile) => Promise<typeof stored>>(),
  };
  let journal: InMemoryUploadJournal;
  let service: FileUploadService;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(timestamp));
    storage.upload.mockReset().mockResolvedValue(stored);
    journal = new InMemoryUploadJournal();
    service = new FileUploadService(storage, journal);
  });
  afterEach(() => vi.useRealTimers());

  it.each(['application/pdf', 'image/png', 'image/jpeg', 'text/plain'])(
    'приймає дозволений MIME-тип %s',
    async (mimeType) => {
      expect((await service.upload(file(4, mimeType))).mimeType).toBe(mimeType);
      expect(journal.size).toBe(1);
    },
  );
  it('успіх: передає файл один раз та створює правильний запис журналу', async () => {
    const input = file();
    const expected = {
      ...stored,
      filename: 'report.pdf',
      mimeType: 'application/pdf',
      size: 4,
      uploadedAt: timestamp,
    };
    expect(await service.upload(input)).toEqual(expected);
    expect(journal.records).toEqual([expected]);
    expect(journal.size).toBe(1);
    expect(storage.upload).toHaveBeenCalledTimes(1);
    expect(storage.upload).toHaveBeenCalledWith(input);
  });
  it.each([5242879, 5242880])(
    'приймає %s байтів на межі 5 MiB',
    async (size) => {
      expect((await service.upload(file(size))).size).toBe(size);
      expect(journal.size).toBe(1);
    },
  );
  it.each([
    [null, 'INVALID_FILE'],
    [undefined, 'INVALID_FILE'],
    [{}, 'INVALID_FILE'],
    [{ ...file(), filename: '' }, 'INVALID_FILE'],
    [{ ...file(), filename: '   ' }, 'INVALID_FILE'],
    [{ ...file(), filename: 12 }, 'INVALID_FILE'],
    [{ ...file(), mimeType: undefined }, 'INVALID_FILE'],
    [{ ...file(), mimeType: '' }, 'INVALID_FILE'],
    [{ ...file(), content: undefined }, 'INVALID_FILE'],
    [{ ...file(), content: [0, 0, 0, 0] }, 'INVALID_FILE'],
    [file(0), 'INVALID_FILE_SIZE'],
    [{ ...file(), size: -1 }, 'INVALID_FILE_SIZE'],
    [{ ...file(), size: 1.5 }, 'INVALID_FILE_SIZE'],
    [{ ...file(), size: NaN }, 'INVALID_FILE_SIZE'],
    [{ ...file(), size: Infinity }, 'INVALID_FILE_SIZE'],
    [{ ...file(), size: undefined }, 'INVALID_FILE_SIZE'],
    [file(5242881), 'FILE_TOO_LARGE'],
    [{ ...file(), size: 3 }, 'FILE_SIZE_MISMATCH'],
    [file(4, 'application/x-msdownload'), 'UNSUPPORTED_FILE_TYPE'],
    [file(4, 'text/html'), 'UNSUPPORTED_FILE_TYPE'],
  ])('відхилення %# без завантаження та запису', async (input, code) => {
    await expect(service.upload(input as UploadFile)).rejects.toThrow(code);
    expect(storage.upload).not.toHaveBeenCalled();
    expect(journal.records).toEqual([]);
  });
  it('відхилення нового файлу зберігає попередні записи журналу', async () => {
    await service.upload(file());
    const before = journal.records;
    storage.upload.mockClear();
    await expect(service.upload(file(0))).rejects.toThrow('INVALID_FILE_SIZE');
    expect(journal.records).toEqual(before);
    expect(journal.size).toBe(1);
    expect(storage.upload).not.toHaveBeenCalled();
  });
  it('відмова сховища не створює успішного запису', async () => {
    storage.upload.mockRejectedValue(new Error('STORAGE_UNAVAILABLE'));
    await expect(service.upload(file())).rejects.toThrow('STORAGE_UNAVAILABLE');
    expect(journal.records).toEqual([]);
  });
  it('відмова журналу: шлюз завершився, успішний запис не створено', async () => {
    const broken = new FailingUploadJournal();
    await expect(
      new FileUploadService(storage, broken).upload(file()),
    ).rejects.toThrow('JOURNAL_UNAVAILABLE');
    expect(storage.upload).toHaveBeenCalledTimes(1);
    expect(broken.records).toEqual([]);
  });
});

describe('HttpFileStorage та FileUploadService — реальний fetch через MSW', () => {
  const storage = new HttpFileStorage('https://storage.example.com');
  let journal: InMemoryUploadJournal;
  let service: FileUploadService;
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(timestamp));
    journal = new InMemoryUploadJournal();
    service = new FileUploadService(storage, journal);
  });
  afterEach(() => vi.useRealTimers());

  it('успіх HTTP 201: POST містить ім’я, MIME, розмір і точні байти', async () => {
    const requests: Request[] = [];
    const forms: FormData[] = [];
    server.use(
      http.post(STORAGE_URL, async ({ request }) => {
        requests.push(request);
        forms.push(await request.formData());
        return HttpResponse.json(stored, { status: 201 });
      }),
    );
    const input = {
      ...file(),
      filename: 'звіт 12.pdf',
      content: new Uint8Array([37, 80, 68, 70]),
    };
    expect(await service.upload(input)).toEqual({
      ...stored,
      filename: 'звіт 12.pdf',
      mimeType: 'application/pdf',
      size: 4,
      uploadedAt: timestamp,
    });
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('https://storage.example.com/files');
    expect(requests[0].method).toBe('POST');
    expect(requests[0].headers.get('content-type')).toContain(
      'multipart/form-data; boundary=',
    );
    const uploaded = forms[0].get('file');
    expect(uploaded).toBeInstanceOf(File);
    if (!(uploaded instanceof File)) throw new Error('Expected uploaded file');
    expect(uploaded.name).toBe('звіт 12.pdf');
    expect(uploaded.type).toBe('application/pdf');
    expect(Array.from(new Uint8Array(await uploaded.arrayBuffer()))).toEqual([
      37, 80, 68, 70,
    ]);
    expect(forms[0].get('size')).toBe('4');
    expect(journal.records).toEqual([
      {
        ...stored,
        filename: 'звіт 12.pdf',
        mimeType: 'application/pdf',
        size: 4,
        uploadedAt: timestamp,
      },
    ]);
  });
  it.each([400, 413, 500, 503])(
    'відхиляє HTTP %s без запису журналу',
    async (status) => {
      server.use(
        http.post(STORAGE_URL, () => new HttpResponse(null, { status })),
      );
      await expect(service.upload(file())).rejects.toThrow(
        'STORAGE_UNAVAILABLE',
      );
      expect(journal.records).toEqual([]);
    },
  );
  it.each([
    null,
    {},
    { id: 12, url: stored.url },
    { id: '', url: stored.url },
    { id: '12' },
    { id: '12', url: 12 },
    { id: '12', url: 'broken' },
    { id: '12', url: 'http://storage.example.com/12' },
  ])('відхиляє некоректну HTTP-відповідь %j', async (body) => {
    server.use(http.post(STORAGE_URL, () => HttpResponse.json(body)));
    await expect(service.upload(file())).rejects.toThrow(
      'INVALID_STORAGE_RESPONSE',
    );
    expect(journal.records).toEqual([]);
  });
  it('відхиляє неправильний JSON без запису журналу', async () => {
    server.use(http.post(STORAGE_URL, () => new HttpResponse('{broken')));
    await expect(service.upload(file())).rejects.toThrow(
      'INVALID_STORAGE_RESPONSE',
    );
    expect(journal.size).toBe(0);
  });
  it('мережева відмова має стабільний код і зберігає причину', async () => {
    server.use(http.post(STORAGE_URL, () => HttpResponse.error()));
    await expect(service.upload(file())).rejects.toMatchObject({
      message: 'STORAGE_UNAVAILABLE',
      cause: expect.any(Error),
    });
    expect(journal.records).toEqual([]);
  });
  it('відхилений файл взагалі не породжує HTTP-запит', async () => {
    let requests = 0;
    server.use(
      http.post(STORAGE_URL, () => {
        requests++;
        return HttpResponse.json(stored);
      }),
    );
    await expect(service.upload(file(0))).rejects.toThrow('INVALID_FILE_SIZE');
    expect(requests).toBe(0);
    expect(journal.records).toEqual([]);
  });
  it('відмова журналу не відкочує вже виконане HTTP-завантаження', async () => {
    const remoteFiles: string[] = [];
    server.use(
      http.post(STORAGE_URL, async ({ request }) => {
        const form = await request.formData();
        const uploaded = form.get('file');
        if (uploaded instanceof File) remoteFiles.push(uploaded.name);
        return HttpResponse.json(stored, { status: 201 });
      }),
    );
    const broken = new FailingUploadJournal();
    await expect(
      new FileUploadService(storage, broken).upload(file()),
    ).rejects.toThrow('JOURNAL_UNAVAILABLE');
    expect(remoteFiles).toEqual(['report.pdf']);
    expect(broken.records).toEqual([]);
  });
  it('після перевизначень відновлює стандартний обробник', async () => {
    expect((await service.upload(file())).id).toBe('file-12');
    expect(journal.size).toBe(1);
  });
});
