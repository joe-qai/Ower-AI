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
    await controller.addFile(file);
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
    const attachments = controller.getAttachments();
    return optimizer.optimizePrompt(input, attachments, modelType, window.callApi, window.parseResponse);
  },
};
