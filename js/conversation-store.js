const STORAGE_KEY_CONVERSATIONS = 'ower_conversations';
const STORAGE_KEY_CURRENT = 'ower_current';
const MSG_PREFIX = 'ower_msg_';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export class ConversationStore {
  constructor() {
    this._conversations = loadJSON(STORAGE_KEY_CONVERSATIONS, []);
    this._currentId = loadJSON(STORAGE_KEY_CURRENT, null);
    if (this._conversations.length === 0) {
      this._createInternal(this._firstTitle());
    }
  }

  createConversation() {
    return this._createInternal(this._firstTitle());
  }

  _createInternal(title) {
    const id = genId();
    const now = Date.now();
    const conv = { id, title, created: now, updated: now };
    this._conversations.push(conv);
    this._currentId = id;
    this._saveMeta();
    this._saveMessages(id, []);
    return { ...conv, messages: [] };
  }

  getCurrent() {
    const conv = this._conversations.find(c => c.id === this._currentId);
    if (!conv) return null;
    const messages = this._loadMessages(conv.id);
    return { ...conv, messages };
  }

  getCurrentId() {
    return this._currentId;
  }

  getAll() {
    return [...this._conversations].sort((a, b) => b.updated - a.updated);
  }

  switchConversation(id) {
    if (this._conversations.some(c => c.id === id)) {
      this._currentId = id;
      this._saveMeta();
    }
  }

  deleteConversation(id) {
    const idx = this._conversations.findIndex(c => c.id === id);
    if (idx === -1) return;
    this._conversations.splice(idx, 1);
    localStorage.removeItem(MSG_PREFIX + id);
    if (this._currentId === id) {
      this._currentId = this._conversations.length > 0
        ? this._conversations[this._conversations.length - 1].id
        : null;
    }
    if (this._conversations.length === 0) {
      this._createInternal(this._firstTitle());
    }
    this._saveMeta();
  }

  renameConversation(id, title) {
    const conv = this._conversations.find(c => c.id === id);
    if (conv) {
      conv.title = title;
      this._saveMeta();
    }
  }

  addMessage(msg) {
    const conv = this._conversations.find(c => c.id === this._currentId);
    if (!conv) return;
    const messages = this._loadMessages(conv.id);
    messages.push({ ...msg, time: msg.time || new Date().toISOString() });
    conv.updated = Date.now();
    if (messages.length === 1 && msg.sender === 'user') {
      conv.title = msg.content.slice(0, 50);
    }
    this._saveMeta();
    this._saveMessages(conv.id, messages);
  }

  clearCurrent() {
    const conv = this._conversations.find(c => c.id === this._currentId);
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

  _firstTitle() {
    return '新对话';
  }
}
