import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { ConversationStore } from '../js/conversation-store.js';

describe('ConversationStore', () => {
  let store;

  beforeEach(() => {
    localStorage.clear();
    store = new ConversationStore();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('starts with one default conversation', () => {
    expect(store.getAll()).toHaveLength(1);
    expect(store.getCurrent()).toBeTruthy();
    expect(store.getCurrent().title).toBe('新对话');
  });

  test('creates a new conversation and switches to it', () => {
    const prev = store.getCurrentId();
    const conv = store.createConversation();

    expect(conv.id).toBeTruthy();
    expect(conv.title).toBe('新对话');
    expect(conv.messages).toEqual([]);
    expect(store.getCurrentId()).not.toBe(prev);
    expect(store.getAll()).toHaveLength(2);
  });

  test('addMessage saves to current conversation and sets title from first user message', () => {
    const conv = store.createConversation();
    store.addMessage({ sender: 'user', content: 'Hello world' });

    const current = store.getCurrent();
    expect(current.messages).toHaveLength(1);
    expect(current.messages[0].content).toBe('Hello world');
    expect(store.getAll().find(c => c.id === conv.id).title).toBe('Hello world');
  });

  test('appends messages without changing title', () => {
    store.createConversation();
    store.addMessage({ sender: 'user', content: 'First msg' });
    store.addMessage({ sender: 'bot', content: 'Reply' });
    store.addMessage({ sender: 'user', content: 'Second msg' });

    expect(store.getCurrent().messages).toHaveLength(3);
  });

  test('switchConversation changes current id', () => {
    const c1 = store.createConversation();
    const c2 = store.createConversation();

    store.switchConversation(c1.id);
    expect(store.getCurrentId()).toBe(c1.id);

    store.switchConversation(c2.id);
    expect(store.getCurrentId()).toBe(c2.id);
  });

  test('deleteConversation removes conversation and switches', () => {
    const c1 = store.createConversation();
    store.createConversation();

    store.deleteConversation(c1.id);
    expect(store.getAll()).toHaveLength(2);
    expect(store.getCurrentId()).not.toBe(c1.id);
  });

  test('deleteConversation creates a new one if deleting last', () => {
    const all = store.getAll();
    all.forEach(c => store.deleteConversation(c.id));

    expect(store.getAll()).toHaveLength(1);
    expect(store.getCurrent()).toBeTruthy();
  });

  test('renameConversation updates title', () => {
    const conv = store.createConversation();
    store.renameConversation(conv.id, '自定义标题');

    expect(store.getAll().find(c => c.id === conv.id).title).toBe('自定义标题');
  });

  test('persists across store instances', () => {
    const s1 = new ConversationStore();
    s1.createConversation();
    s1.addMessage({ sender: 'user', content: 'Persist test' });
    const c1Id = s1.getCurrentId();

    const s2 = new ConversationStore();
    expect(s2.getAll().length).toBeGreaterThanOrEqual(2);
    const reloaded = s2.getAll().find(c => c.id === c1Id);
    expect(reloaded).toBeTruthy();
    s2.switchConversation(c1Id);
    expect(s2.getCurrent().messages[0].content).toBe('Persist test');
  });

  test('clearCurrent removes all messages in current conversation', () => {
    store.createConversation();
    store.addMessage({ sender: 'user', content: 'Msg 1' });
    store.addMessage({ sender: 'bot', content: 'Reply' });

    store.clearCurrent();
    expect(store.getCurrent().messages).toHaveLength(0);
  });

  test('getAll returns most recently updated conversation first', async () => {
    const c1 = store.createConversation();
    const c2 = store.createConversation();
    store.switchConversation(c1.id);
    store.addMessage({ sender: 'user', content: 'Old' });

    await new Promise(r => setTimeout(r, 10));

    store.switchConversation(c2.id);
    store.addMessage({ sender: 'user', content: 'Recent' });

    const all = store.getAll();
    expect(all[0].id).toBe(c2.id);
  });
});
