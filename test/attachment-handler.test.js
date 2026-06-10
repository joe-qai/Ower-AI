import { AttachmentHandler } from '../js/attachment.js';
import { describe, test, expect, beforeAll } from 'vitest';

describe('AttachmentHandler', () => {
  let handler;

  beforeAll(() => {
    handler = new AttachmentHandler();
  });

  describe('readFile', () => {
    test('reads a plain text file and returns type "text" with content', async () => {
      const file = new File(['Hello world'], 'hello.txt', { type: 'text/plain' });
      const result = await handler.readFile(file);

      expect(result).toEqual({
        type: 'text',
        content: 'Hello world',
      });
    });

    test('reads a markdown file and returns type "text" with content', async () => {
      const content = '# Title\n\nSome **bold** text.';
      const file = new File([content], 'doc.md', { type: 'text/markdown' });
      const result = await handler.readFile(file);

      expect(result).toEqual({
        type: 'text',
        content,
      });
    });

    test('reads a PNG image and returns type "image" with base64 content', async () => {
      const pixels = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
      const file = new File([pixels], 'image.png', { type: 'image/png' });
      const result = await handler.readFile(file);

      expect(result.type).toBe('image');
      expect(result.content).toMatch(/^data:image\/png;base64,/);
    });

    test('reads a JPEG image and returns type "image" with base64 content', async () => {
      const pixels = new Uint8Array([255, 216, 255, 224]);
      const file = new File([pixels], 'photo.jpg', { type: 'image/jpeg' });
      const result = await handler.readFile(file);

      expect(result.type).toBe('image');
      expect(result.content).toMatch(/^data:image\/jpeg;base64,/);
    });

    test('reads a docx file using mammoth and returns type "text"', async () => {
      globalThis.mammoth = {
        extractRawText: async ({ arrayBuffer }) => ({ value: 'Extracted docx content' }),
      };

      const file = new File(['fake-docx'], 'report.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const result = await handler.readFile(file);

      expect(result).toEqual({
        type: 'text',
        content: 'Extracted docx content',
      });

      delete globalThis.mammoth;
    });

    test('reads an xlsx file using XLSX and returns type "text"', async () => {
      globalThis.XLSX = {
        utils: {
          sheet_to_csv: () => 'col1,col2\nval1,val2',
        },
        read: () => ({
          SheetNames: ['Sheet1'],
          Sheets: { Sheet1: {} },
        }),
      };

      const file = new File(['fake-xlsx'], 'data.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const result = await handler.readFile(file);

      expect(result).toEqual({
        type: 'text',
        content: 'col1,col2\nval1,val2',
      });

      delete globalThis.XLSX;
    });

    test('falls back to plain text for docx when mammoth is not available', async () => {
      const file = new File(['fallback text'], 'report.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const result = await handler.readFile(file);

      expect(result).toEqual({
        type: 'text',
        content: 'fallback text',
      });
    });

    test('falls back to plain text for xlsx when XLSX is not available', async () => {
      const file = new File(['csv,data'], 'data.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const result = await handler.readFile(file);

      expect(result).toEqual({
        type: 'text',
        content: 'csv,data',
      });
    });

    test('handles FileReader error gracefully', async () => {
      const file = new File([''], 'bad.txt', { type: 'text/plain' });
      const originalReader = globalThis.FileReader;

      globalThis.FileReader = class {
        readAsText() {
          this.onerror(new Error('File read error'));
        }
      };

      await expect(handler.readFile(file)).rejects.toThrow('Failed to read file');

      globalThis.FileReader = originalReader;
    });
  });

  describe('readFiles', () => {
    test('reads multiple files and returns an array of results', async () => {
      const files = [
        new File(['file one'], 'a.txt', { type: 'text/plain' }),
        new File(['file two'], 'b.txt', { type: 'text/plain' }),
      ];

      const results = await handler.readFiles(files);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ type: 'text', content: 'file one' });
      expect(results[1]).toEqual({ type: 'text', content: 'file two' });
    });

    test('handles empty FileList', async () => {
      const results = await handler.readFiles([]);
      expect(results).toEqual([]);
    });
  });
});
