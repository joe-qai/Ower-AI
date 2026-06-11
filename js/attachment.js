const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MAX_IMAGE_FILE_SIZE = 20 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2048;
const COMPRESS_QUALITY = 0.8;

export class AttachmentHandler {
  async readFile(file) {
    if (IMAGE_TYPES.includes(file.type)) {
      if (file.size > MAX_IMAGE_FILE_SIZE) {
        throw new Error(`图片过大: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)，最大支持 ${MAX_IMAGE_FILE_SIZE / 1024 / 1024}MB`);
      }
      const content = await this._compressImage(file);
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

  async _compressImage(file) {
    const dataUrl = await this._readAsDataURL(file);
    if (file.size < 1024 * 1024) {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error(`Failed to decode image: ${file.name}`));
        img.src = dataUrl;
      });
      if (img.width <= MAX_IMAGE_DIMENSION && img.height <= MAX_IMAGE_DIMENSION) {
        return dataUrl;
      }
    }
    return this._downsample(dataUrl, file.name);
  }

  async _downsample(dataUrl, fileName) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_IMAGE_DIMENSION) {
          height = Math.round(height * MAX_IMAGE_DIMENSION / width);
          width = MAX_IMAGE_DIMENSION;
        }
        if (height > MAX_IMAGE_DIMENSION) {
          width = Math.round(width * MAX_IMAGE_DIMENSION / height);
          height = MAX_IMAGE_DIMENSION;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', COMPRESS_QUALITY));
      };
      img.onerror = () => reject(new Error(`Failed to decode image: ${fileName}`));
      img.src = dataUrl;
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
