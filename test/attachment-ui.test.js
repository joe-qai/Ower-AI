import { describe, test, expect, beforeEach } from 'vitest';
import { AttachmentController } from '../js/attachment-ui.js';

describe('AttachmentController', () => {
  let controller;

  beforeEach(() => {
    document.body.innerHTML = `
      <div class="attachment-area" id="attachmentArea"></div>
      <input type="file" id="fileInput" multiple>
      <button id="attachBtn"></button>
      <input type="text" id="userInput">
    `;
    controller = new AttachmentController();
  });

  test('initializes with empty attachments', () => {
    expect(controller.getAttachments()).toEqual([]);
  });

  test('adds a file and creates a chip in the attachment area', async () => {
    const file = new File(['test'], 'hello.txt', { type: 'text/plain' });
    await controller.addFile(file);

    const attachments = controller.getAttachments();
    expect(attachments).toHaveLength(1);
    expect(attachments[0].name).toBe('hello.txt');

    const chips = document.querySelectorAll('.attachment-chip');
    expect(chips).toHaveLength(1);
    expect(chips[0].textContent).toContain('hello.txt');
  });

  test('adds multiple files and creates chips for each', async () => {
    const file1 = new File(['a'], 'a.txt', { type: 'text/plain' });
    const file2 = new File(['b'], 'b.txt', { type: 'text/plain' });

    await controller.addFile(file1);
    await controller.addFile(file2);

    expect(controller.getAttachments()).toHaveLength(2);
    expect(document.querySelectorAll('.attachment-chip')).toHaveLength(2);
  });

  test('removes a file and its chip by index', async () => {
    const file = new File(['test'], 'hello.txt', { type: 'text/plain' });
    await controller.addFile(file);

    controller.removeFile(0);

    expect(controller.getAttachments()).toHaveLength(0);
    expect(document.querySelectorAll('.attachment-chip')).toHaveLength(0);
  });

  test('clears all files and chips', async () => {
    await controller.addFile(new File(['a'], 'a.txt', { type: 'text/plain' }));
    await controller.addFile(new File(['b'], 'b.txt', { type: 'text/plain' }));

    controller.clear();

    expect(controller.getAttachments()).toHaveLength(0);
    expect(document.querySelectorAll('.attachment-chip')).toHaveLength(0);
  });

  test('hasAttachments returns true when files are present', async () => {
    expect(controller.hasAttachments()).toBe(false);

    await controller.addFile(new File(['a'], 'a.txt', { type: 'text/plain' }));

    expect(controller.hasAttachments()).toBe(true);
  });

  test('getContentMap returns name-to-content mapping', async () => {
    await controller.addFile(new File(['hello world'], 'hello.txt', { type: 'text/plain' }));

    const map = controller.getContentMap();
    expect(map).toEqual({ 'hello.txt': 'hello world' });
  });
});
