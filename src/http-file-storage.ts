import type {
  FileStorage,
  StoredFile,
  UploadFile,
} from './file-upload-service';

export class HttpFileStorage implements FileStorage {
  constructor(private baseUrl: string) {}

  async upload(file: UploadFile): Promise<StoredFile> {
    const form = new FormData();
    form.set(
      'file',
      new Blob([new Uint8Array(file.content)], { type: file.mimeType }),
      file.filename,
    );
    form.set('size', String(file.size));
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/files`, {
        method: 'POST',
        body: form,
      });
    } catch (cause) {
      throw new Error('STORAGE_UNAVAILABLE', { cause });
    }
    if (!response.ok) throw new Error('STORAGE_UNAVAILABLE');
    let data: unknown;
    try {
      data = await response.json();
    } catch (cause) {
      throw new Error('INVALID_STORAGE_RESPONSE', { cause });
    }
    if (
      typeof data !== 'object' ||
      data === null ||
      !('id' in data) ||
      typeof data.id !== 'string' ||
      data.id.trim() === '' ||
      !('url' in data) ||
      typeof data.url !== 'string' ||
      !URL.canParse(data.url) ||
      new URL(data.url).protocol !== 'https:'
    ) {
      throw new Error('INVALID_STORAGE_RESPONSE');
    }
    return { id: data.id, url: data.url };
  }
}
