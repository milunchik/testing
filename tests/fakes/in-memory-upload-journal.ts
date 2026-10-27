import type {
  UploadJournal,
  UploadRecord,
} from '../../src/file-upload-service';

export class InMemoryUploadJournal implements UploadJournal {
  private items: UploadRecord[] = [];

  async append(record: UploadRecord): Promise<void> {
    this.items.push({ ...record });
  }

  get records(): readonly UploadRecord[] {
    return this.items.map((record) => ({ ...record }));
  }

  get size(): number {
    return this.items.length;
  }
}
