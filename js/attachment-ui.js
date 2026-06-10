import { AttachmentHandler } from './attachment.js';

export class AttachmentController {
  constructor() {
    this._handler = new AttachmentHandler();
    this._files = [];
    this._area = document.getElementById('attachmentArea');
  }

  async addFile(file) {
    const result = await this._handler.readFile(file);
    const entry = { name: file.name, ...result };
    this._files.push(entry);
    this._renderChip(entry, this._files.length - 1);
    return entry;
  }

  removeFile(index) {
    this._files.splice(index, 1);
    this._renderAll();
  }

  clear() {
    this._files = [];
    this._renderAll();
  }

  getAttachments() {
    return [...this._files];
  }

  hasAttachments() {
    return this._files.length > 0;
  }

  getContentMap() {
    const map = {};
    for (const f of this._files) {
      map[f.name] = f.content;
    }
    return map;
  }

  _renderChip(entry, index) {
    const chip = document.createElement('div');
    chip.className = 'attachment-chip';
    chip.dataset.index = index;
    chip.innerHTML = `
      <span class="chip-name">${this._escape(entry.name)}</span>
      <span class="chip-remove" data-index="${index}">&times;</span>
    `;
    chip.querySelector('.chip-remove').addEventListener('click', () => {
      this.removeFile(index);
    });
    this._area.appendChild(chip);
  }

  _renderAll() {
    this._area.innerHTML = '';
    this._files.forEach((f, i) => this._renderChip(f, i));
  }

  _escape(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
