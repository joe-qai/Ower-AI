import { AttachmentController } from './attachment-ui.js';
import { Optimizer } from './llm-optimizer.js';

const controller = new AttachmentController();
const optimizer = new Optimizer();
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');

attachBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', async () => {
  for (const file of fileInput.files) {
    try {
      await controller.addFile(file);
    } catch (err) {
      console.error('Failed to add file:', err);
    }
  }
  fileInput.value = '';
});

window.__attachments = {
  getAll: () => controller.getAttachments(),
  hasAny: () => controller.hasAttachments(),
  clear: () => controller.clear(),
};

window.__optimizer = {
  optimize: async (input, modelType) => {
    const attachments = controller.getAttachments().filter(a => a.type !== 'image');
    return optimizer.optimizePrompt(input, attachments, modelType, window.callApi, window.parseResponse);
  },
};
