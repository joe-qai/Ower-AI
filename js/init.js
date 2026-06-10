(function () {
  'use strict';

  const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
  const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  class AttachmentHandler {
    async readFile(file) {
      if (IMAGE_TYPES.includes(file.type)) {
        const content = await this._readAsDataURL(file);
        return { type: 'image', content };
      }
      if (file.type === DOCX_TYPE && window.mammoth) {
        const buf = await this._readAsArrayBuffer(file);
        const result = await window.mammoth.extractRawText({ arrayBuffer: buf });
        return { type: 'text', content: result.value };
      }
      if (file.type === XLSX_TYPE && window.XLSX) {
        const buf = await this._readAsArrayBuffer(file);
        const workbook = window.XLSX.read(buf, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const csv = window.XLSX.utils.sheet_to_csv(firstSheet);
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
        reader.onerror = () => reject(new Error('Failed to read file: ' + file.name));
        reader.readAsText(file);
      });
    }

    _readAsDataURL(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file: ' + file.name));
        reader.readAsDataURL(file);
      });
    }

    _readAsArrayBuffer(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file: ' + file.name));
        reader.readAsArrayBuffer(file);
      });
    }
  }

  class AttachmentController {
    constructor() {
      this._handler = new AttachmentHandler();
      this._files = [];
      this._area = document.getElementById('attachmentArea');
    }

    async addFile(file) {
      const result = await this._handler.readFile(file);
      const entry = { name: file.name, ...result };
      this._files.push(entry);
      this._renderAll();
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
      return this._files.slice();
    }

    hasAttachments() {
      return this._files.length > 0;
    }

    _renderAll() {
      if (!this._area) return;
      this._area.innerHTML = '';
      this._files.forEach((entry, i) => {
        const chip = document.createElement('div');
        chip.className = 'attachment-chip';
        chip.innerHTML =
          '<span class="chip-name">' + this._escape(entry.name) + '</span>' +
          '<span class="chip-remove" data-index="' + i + '">&times;</span>';
        chip.querySelector('.chip-remove').onclick = () => this.removeFile(i);
        this._area.appendChild(chip);
      });
    }

    _escape(str) {
      var div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  }

  var PATTERNS_CONTENT =
    '# Prompt Patterns\n' +
    '\n' +
    '## Pattern Selection Guide\n' +
    '\n' +
    '| Pattern | Best For | Token Cost | Reliability |\n' +
    '|---------|----------|------------|-------------|\n' +
    '| Zero-shot | Simple, well-defined tasks | Low | Medium |\n' +
    '| Few-shot | Tasks needing format guidance | Medium | High |\n' +
    '| Chain-of-Thought | Reasoning, math, logic | Medium-High | High |\n' +
    '| ReAct | Multi-step tasks with tools | High | Very High |\n' +
    '| Tree-of-Thoughts | Complex problem solving | Very High | Very High |\n' +
    '\n' +
    '## Zero-Shot Prompting\n' +
    '**When to use:** Simple classification, extraction, formatting, or generation tasks.\n' +
    '**Basic Structure:** Role, task, constraints, input, output_format\n' +
    '**Best Practices:** Be specific, specify output format, include constraints, use role priming\n' +
    '\n' +
    '## Few-Shot Prompting\n' +
    '**When to use:** Tasks needing specific output format or consistent style.\n' +
    '**Basic Structure:** Task description, examples (input-output pairs), actual input\n' +
    '\n' +
    '## Chain-of-Thought (CoT)\n' +
    '**When to use:** Reasoning, math, logic, multi-step analysis.\n' +
    '**Variants:** Zero-shot CoT ("think step by step"), Manual CoT, Self-consistency, Least-to-most\n' +
    '\n' +
    '## ReAct Pattern (Reasoning + Acting)\n' +
    '**When to use:** Tasks requiring external tools or iterative problem solving.\n' +
    '**Structure:** Thought -> Action -> Observation -> Answer\n' +
    '\n' +
    '## Tree-of-Thoughts (ToT)\n' +
    '**When to use:** Complex problems requiring exploration of multiple solution paths.\n' +
    '**Structure:** Generate candidates -> Evaluate -> Select -> Execute -> Verify';

  var OPTIMIZATION_CONTENT =
    '# Prompt Optimization\n' +
    '\n' +
    '## The Optimization Loop\n' +
    'Baseline -> Measure Results -> Diagnose Issues -> Change One -> Repeat\n' +
    '\n' +
    '## Diagnostic Framework\n' +
    '| Failure Type | Common Causes |\n' +
    '|--------------|---------------|\n' +
    '| Format errors | Unclear format spec, no examples |\n' +
    '| Hallucinations | Lack of grounding, vague instructions |\n' +
    '| Inconsistency | Ambiguous instructions, high temperature |\n' +
    '| Over-verbosity | No length constraints |\n' +
    '| Under-performance | Wrong pattern choice, insufficient context |\n' +
    '| Edge case failures | Missing constraint handling |\n' +
    '\n' +
    '## Optimization Techniques\n' +
    '1. Instruction Refinement - Be specific about length, focus, audience\n' +
    '2. Constraint Tightening - Explicit output format and validation rules\n' +
    '3. Example Calibration - Match examples to real input distribution\n' +
    '4. Output Scaffolding - Provide structured output templates\n' +
    '\n' +
    '## Token Reduction Strategies\n' +
    '| Strategy | Savings | Risk |\n' +
    '|----------|---------|------|\n' +
    '| Remove redundant instructions | 10-20% | Low |\n' +
    '| Shorten examples | 20-40% | Medium |\n' +
    '| Compress context | 30-50% | High |\n' +
    '| Switch to zero-shot | 40-60% | High |\n' +
    '\n' +
    '## Common Mistakes\n' +
    '- Multiple changes at once -> One change per iteration\n' +
    '- Testing on training examples -> Hold out validation set\n' +
    '- No baseline measurement -> Always measure first\n' +
    '- Skipping failure analysis -> Diagnose before changing';

  var EMBEDDED = {
    'prompt-patterns.md': PATTERNS_CONTENT,
    'prompt-optimization.md': OPTIMIZATION_CONTENT,
  };

  var LOAD_MAP = {
    text: ['prompt-patterns.md', 'prompt-optimization.md'],
    image: ['prompt-patterns.md'],
    video: ['prompt-patterns.md'],
  };

  class SkillLoader {
    constructor() {
      this._cache = {};
    }

    async loadSkill(modelType) {
      if (this._cache[modelType]) {
        return this._cache[modelType];
      }

      var files = LOAD_MAP[modelType] || LOAD_MAP.text;
      var contents = [];

      for (var i = 0; i < files.length; i++) {
        var text = EMBEDDED[files[i]];
        if (text) contents.push(text);
      }

      var doc = { modelType: modelType, raw: contents.join('\n\n') };
      this._cache[modelType] = doc;
      return doc;
    }
  }

  class PromptBuilder {
    buildOptimizationPrompt(userInput, attachments, skillDoc, modelType) {
      var lines = [
        'You are a prompt optimizer. Rewrite the user input into a better version following the rules below.',
        '',
        '## Rules',
        skillDoc.raw,
      ];

      if (attachments.length > 0) {
        var parts = [];
        for (var i = 0; i < attachments.length; i++) {
          parts.push('[' + attachments[i].name + ']\n' + attachments[i].content);
        }
        lines.push('', '## User Attachments', parts.join('\n\n'));
      }

      lines.push(
        '',
        '## User Input',
        userInput,
        '',
        '## Output',
        'Rewrite the user input to be more clear, specific and effective. Output ONLY the rewritten content - no prefixes, no explanations, no markdown formatting around it, no "optimized prompt:" labels.',
      );

      return lines.join('\n');
    }

    selectPattern(taskType, skillDoc) {
      return { name: 'zero-shot', description: 'Simple direct prompt' };
    }
  }

  class Optimizer {
    constructor() {
      this._skillLoader = new SkillLoader();
      this._promptBuilder = new PromptBuilder();
    }

    async optimizePrompt(userInput, attachments, modelType, callApi, parseResponse, options) {
      options = options || {};
      var timeout = options.timeout || 5000;

      try {
        var skillDoc = await this._skillLoader.loadSkill(modelType);
        var optimizationPrompt = this._promptBuilder.buildOptimizationPrompt(
          userInput, attachments, skillDoc, modelType
        );

        var response = await this._withTimeout(
          callApi('text', optimizationPrompt),
          timeout
        );

        var optimized = parseResponse('text', response);
        if (optimized && optimized.trim()) {
          return optimized;
        }
      } catch (e) {
        // fall through
      }

      return userInput;
    }

    _withTimeout(promise, ms) {
      return Promise.race([
        promise,
        new Promise(function (_, reject) {
          setTimeout(function () { reject(new Error('Timeout')); }, ms);
        }),
      ]);
    }
  }

  var controller = new AttachmentController();
  var optimizer = new Optimizer();
  var attachBtn = document.getElementById('attachBtn');
  var fileInput = document.getElementById('fileInput');

  if (attachBtn && fileInput) {
    attachBtn.addEventListener('click', function () {
      fileInput.click();
    });

    fileInput.addEventListener('change', async function () {
      for (var i = 0; i < fileInput.files.length; i++) {
        await controller.addFile(fileInput.files[i]);
      }
      fileInput.value = '';
    });
  }

  window.__attachments = {
    getAll: function () { return controller.getAttachments(); },
    hasAny: function () { return controller.hasAttachments(); },
    clear: function () { controller.clear(); },
  };

  window.__optimizer = {
    optimize: async function (input, modelType) {
      var attachments = controller.getAttachments();
      return optimizer.optimizePrompt(input, attachments, modelType, window.callApi, window.parseResponse);
    },
  };
})();

(function () {
  'use strict';

  var STORAGE_KEY_CONVERSATIONS = 'ower_conversations';
  var STORAGE_KEY_CURRENT = 'ower_current';
  var MSG_PREFIX = 'ower_msg_';

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function loadJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  class ConversationStore {
    constructor() {
      this._conversations = loadJSON(STORAGE_KEY_CONVERSATIONS, []);
      this._currentId = loadJSON(STORAGE_KEY_CURRENT, null);
      if (this._conversations.length === 0) {
        this._createInternal('新对话');
      }
    }

    createConversation() {
      return this._createInternal('新对话');
    }

    _createInternal(title) {
      var id = genId();
      var now = Date.now();
      var conv = { id: id, title: title, created: now, updated: now };
      this._conversations.push(conv);
      this._currentId = id;
      this._saveMeta();
      this._saveMessages(id, []);
      return { id: id, title: title, messages: [] };
    }

    getCurrent() {
      var conv = this._conversations.find(function (c) { return c.id === this._currentId; }.bind(this));
      if (!conv) return null;
      var messages = this._loadMessages(conv.id);
      return { id: conv.id, title: conv.title, created: conv.created, updated: conv.updated, messages: messages };
    }

    getCurrentId() {
      return this._currentId;
    }

    getAll() {
      return this._conversations.slice().sort(function (a, b) { return b.updated - a.updated; });
    }

    switchConversation(id) {
      if (this._conversations.some(function (c) { return c.id === id; })) {
        this._currentId = id;
        this._saveMeta();
      }
    }

    deleteConversation(id) {
      var idx = this._conversations.findIndex(function (c) { return c.id === id; });
      if (idx === -1) return;
      this._conversations.splice(idx, 1);
      localStorage.removeItem(MSG_PREFIX + id);
      if (this._currentId === id) {
        this._currentId = this._conversations.length > 0
          ? this._conversations[this._conversations.length - 1].id
          : null;
      }
      if (this._conversations.length === 0) {
        this._createInternal('新对话');
      }
      this._saveMeta();
    }

    renameConversation(id, title) {
      var conv = this._conversations.find(function (c) { return c.id === id; });
      if (conv) {
        conv.title = title;
        this._saveMeta();
      }
    }

    addMessage(msg) {
      var conv = this._conversations.find(function (c) { return c.id === this._currentId; }.bind(this));
      if (!conv) return;
      var messages = this._loadMessages(conv.id);
      messages.push({
        sender: msg.sender,
        content: msg.content,
        type: msg.type || 'text',
        attachments: msg.attachments || null,
        time: msg.time instanceof Date ? msg.time.toISOString() : (msg.time || new Date().toISOString()),
      });
      conv.updated = Date.now();
      if (messages.length === 1 && msg.sender === 'user') {
        conv.title = msg.content.slice(0, 50);
      }
      this._saveMeta();
      this._saveMessages(conv.id, messages);
    }

    clearCurrent() {
      var conv = this._conversations.find(function (c) { return c.id === this._currentId; }.bind(this));
      if (conv) {
        this._saveMessages(conv.id, []);
        conv.updated = Date.now();
        this._saveMeta();
      }
    }

    _loadMessages(id) {
      return loadJSON(MSG_PREFIX + id, []);
    }

    _saveMessages(id, messages) {
      localStorage.setItem(MSG_PREFIX + id, JSON.stringify(messages));
    }

    _saveMeta() {
      localStorage.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(this._conversations));
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(this._currentId));
    }
  }

  var convStore = new ConversationStore();
  window.__convStore = convStore;

  window.__convActions = {
    create: function () {
      convStore.createConversation();
      if (typeof window.loadConversationMessages === 'function') {
        window.loadConversationMessages();
      }
      if (typeof window.renderConversationList === 'function') {
        window.renderConversationList();
      }
    },
    switchTo: function (id) {
      convStore.switchConversation(id);
      if (typeof window.loadConversationMessages === 'function') {
        window.loadConversationMessages();
      }
      if (typeof window.renderConversationList === 'function') {
        window.renderConversationList();
      }
    },
    remove: function (id) {
      convStore.deleteConversation(id);
      if (typeof window.loadConversationMessages === 'function') {
        window.loadConversationMessages();
      }
      if (typeof window.renderConversationList === 'function') {
        window.renderConversationList();
      }
    },
    rename: function (id, title) {
      convStore.renameConversation(id, title);
      if (typeof window.renderConversationList === 'function') {
        window.renderConversationList();
      }
    },
  };
})();
