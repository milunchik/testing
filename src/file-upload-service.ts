export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const ALLOWED_MIME_TYPES: readonly string[] = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
];

export interface UploadFile {
  filename: string;
  mimeType: string;
  size: number;
  content: Uint8Array;
}

export interface StoredFile {
  id: string;
  url: string;
}

export interface UploadRecord extends StoredFile {
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface FileStorage {
  upload(file: UploadFile): Promise<StoredFile>;
}

export interface UploadJournal {
  append(record: UploadRecord): Promise<void>;
}

export class FileUploadService {
  constructor(
    private storage: FileStorage,
    private journal: UploadJournal,
  ) {}

  async upload(file: UploadFile): Promise<UploadRecord> {
    if (
      typeof file !== 'object' ||
      file === null ||
      typeof file.filename !== 'string' ||
      file.filename.trim() === '' ||
      typeof file.mimeType !== 'string' ||
      file.mimeType.trim() === '' ||
      !(file.content instanceof Uint8Array)
    ) {
      throw new Error('INVALID_FILE');
    }
    if (!Number.isSafeInteger(file.size) || file.size <= 0) {
      throw new Error('INVALID_FILE_SIZE');
    }
    if (file.size > MAX_FILE_SIZE) throw new Error('FILE_TOO_LARGE');
    if (file.content.byteLength !== file.size)
      throw new Error('FILE_SIZE_MISMATCH');
    if (!ALLOWED_MIME_TYPES.includes(file.mimeType)) {
      throw new Error('UNSUPPORTED_FILE_TYPE');
    }
    const stored = await this.storage.upload(file);
    const record: UploadRecord = {
      ...stored,
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };
    await this.journal.append(record);
    return record;
  }
}
