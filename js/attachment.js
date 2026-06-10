const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export class AttachmentHandler {
  async readFile(file) {
    if (IMAGE_TYPES.includes(file.type)) {
      const content = await this._readAsDataURL(file);
      return { type: 'image', content };
    }
    if (file.type === DOCX_TYPE && globalThis.mammoth) {
      const buf = await this._readAsArrayBuffer(file);
      const result = await globalThis.mammoth.extractRawText({ arrayBuffer: buf });
      return { type: 'text', content: result.value };
    }
    if (file.type === XLSX_TYPE && globalThis.XLSX) {
      const buf = await this._readAsArrayBuffer(file);
      const workbook = globalThis.XLSX.read(buf, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const csv = globalThis.XLSX.utils.sheet_to_csv(firstSheet);
      return { type: 'text', content: csv };
    }
    const content = await this._readAsText(file);
    return { type: 'text', content };
  }

  async readFiles(files) {
    const results = [];
    for (const file of files) {
      const result = await this.readFile(file);
      results.push(result);
    }
    return results;
  }

  _readAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsText(file);
    });
  }

  _readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsDataURL(file);
    });
  }

  _readAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsArrayBuffer(file);
    });
  }
}
