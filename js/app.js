const CryptoUtils = {
  key: 'SecretKey2024XYZ',
  
  encrypt: function(text) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length);
      result += String.fromCharCode(charCode);
    }
    return btoa(unescape(encodeURIComponent(result)));
  },
  
  decrypt: function(encoded) {
    try {
      const text = decodeURIComponent(escape(atob(encoded)));
      let result = '';
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length);
        result += String.fromCharCode(charCode);
      }
      return result;
    } catch (e) {
      return '';
    }
  }
};

const SECRET_CONFIG = [
  'OxEXAhZOZEoYQllaQTp3OzQLBgFIFSJLGl1dHUJp',
  'IA5OBi8GDCIxR0Z1YS09bhYkE0oOAz8LK0BVelg6CBcbXRclCBUSFg4ESWpcaw8KGiQk',
  'OxEXAhZOZEoYQllaQTp3OzQLBgFIFSJLGl1dHVU/Nz8gBBMbWgIiARxdb1tQZQ==',
  ['fAYLExFbKAoUQlxXQDE2NCA=', 'MgINFxZZeUtJH1ZeVSsx'],
  ['fAwOEwIROEoeV15XRjktMzwLEA==', 'MgINFxZZIggYVVUfBnZodzUJAgEN'],
  ['fBMKFgAbOA==', 'MgINFxZZPQwdV18fQmp3ag==']
];

const CONFIG = {
  base_url: CryptoUtils.decrypt(SECRET_CONFIG[0].replace(/\s/g, '')),
  api_key: CryptoUtils.decrypt(SECRET_CONFIG[1].replace(/\s/g, '')),
  video_poll_url: CryptoUtils.decrypt(SECRET_CONFIG[2].replace(/\s/g, '')),
  models: {
    text: {
      name: 'Text Model',
      endpoint: CryptoUtils.decrypt(SECRET_CONFIG[3][0].replace(/\s/g, '')),
      model_name: CryptoUtils.decrypt(SECRET_CONFIG[3][1].replace(/\s/g, '')),
      description: '文本生成模型'
    },
    image: {
      name: 'Image Model',
      endpoint: CryptoUtils.decrypt(SECRET_CONFIG[4][0].replace(/\s/g, '')),
      model_name: CryptoUtils.decrypt(SECRET_CONFIG[4][1].replace(/\s/g, '')),
      description: '图像生成模型'
    },
    video: {
      name: 'Video Model',
      endpoint: CryptoUtils.decrypt(SECRET_CONFIG[5][0].replace(/\s/g, '')),
      model_name: CryptoUtils.decrypt(SECRET_CONFIG[5][1].replace(/\s/g, '')),
      description: '视频生成模型'
    }
  }
};

let messages = [];

const MarkdownParser = {
  parse: function(text) {
    if (!text) return '';
    
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
    });
    
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/^[\*\-] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^---$/gm, '<hr>');
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<h[1-6]>)/g, '$1');
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<pre>)/g, '$1');
    html = html.replace(/(<\/pre>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)<\/p>/g, '$1');
    
    return html;
  }
};

function getModelConfig(modelType) {
  const models = CONFIG.models;
  if (!models[modelType]) {
    throw new Error(`未知的模型类型: ${modelType}`);
  }
  return models[modelType];
}

async function callApi(modelType, prompt, options = {}) {
  const modelConfig = getModelConfig(modelType);
  const url = `${CONFIG.base_url}${modelConfig.endpoint}`;
  const apiKey = CONFIG.api_key;

  if (!url || !apiKey) {
    throw new Error('API配置无效');
  }

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  let body = {};

  switch (modelType) {
    case 'text':
      const messages = [];
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });
      body = {
        model: modelConfig.model_name,
        messages: messages,
        max_tokens: options.maxTokens || 2048,
        temperature: options.temperature ?? 0.7
      };
      break;
    case 'image':
      body = {
        model: modelConfig.model_name,
        prompt: prompt,
        n: 1,
        size: '1024x1024'
      };
      break;
    case 'video':
      body = {
        model: modelConfig.model_name,
        prompt: prompt,
        duration: 180,
        resolution: '4k'
      };
      break;
    default:
      throw new Error(`不支持的模型类型: ${modelType}`);
  }

  const controller = new AbortController();
  const timeout = options.timeout || 60000;
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API请求失败: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    
    if (modelType === 'video') {
      const videoId = responseData.video_id;
      if (!videoId) {
        throw new Error('创建视频任务失败，未返回video_id');
      }
      return await pollVideoStatus(videoId);
    }

    return responseData;
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}

const ROUTER_SYSTEM_PROMPT = `你是 Ower AI，一个智能AI助手，支持文本对话、图片生成和视频生成。

工作规则：
- 普通聊天、问答、写作等 → 直接用自然语言回复用户，保持友好有温度
- 用户要求写提示词(prompt) → 正常回复，先写中文提示词，空行后写英文版
- 用户要求生成/画图片 → 在回复开头加上【IMAGE】标记，后面跟上英文图片提示词
- 用户要求生成视频 → 在回复开头加上【VIDEO】标记，后面跟上英文视频提示词
- 如果不确定用户意图，正常对话即可，不要拒绝回答`;

async function routeIntent(userMessage) {
  const raw = await callApi('text', userMessage, {
    systemPrompt: ROUTER_SYSTEM_PROMPT,
    temperature: 0.7,
    maxTokens: 1024
  });
  const content = parseResponse('text', raw);
  
  if (content.startsWith('【IMAGE】')) {
    return { intent: 'image', prompt: content.replace('【IMAGE】', '').trim() };
  } else if (content.startsWith('【VIDEO】')) {
    return { intent: 'video', prompt: content.replace('【VIDEO】', '').trim() };
  } else {
    return { intent: 'text', response: content };
  }
}

async function pollVideoStatus(videoId) {
  const apiKey = CONFIG.api_key;
  const maxRetries = 60;
  const retryInterval = 5000;

  const headers = {
    'Authorization': `Bearer ${apiKey}`
  };

  for (let i = 0; i < maxRetries; i++) {
    try {
      const url = `${CONFIG.video_poll_url}${videoId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`查询视频状态失败: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (result.status === 'completed') {
        return { url: result.remixed_from_video_id };
      } else if (result.status === 'failed') {
        throw new Error(`视频生成失败: ${result.error?.message || '未知错误'}`);
      } else if (result.status === 'queued' || result.status === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, retryInterval));
        continue;
      } else {
        throw new Error(`未知状态: ${result.status}`);
      }
    } catch (error) {
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryInterval));
        continue;
      }
      throw error;
    }
  }

  throw new Error('视频生成超时');
}

function parseResponse(modelType, response) {
  switch (modelType) {
    case 'text':
      return response.choices?.[0]?.message?.content || response.text || '无响应';
    case 'image':
      return response.data?.[0]?.url || response.url || null;
    case 'video':
      return response.url || null;
    default:
      return response;
  }
}

function generateFilename(type, extension) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${type}-${timestamp}.${extension}`;
}

async function downloadFromUrl(url, filename) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('下载失败');
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  } catch (e) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

function init() {
  setupEventListeners();
}

function setupEventListeners() {
  const userInput = document.getElementById('userInput');
  const sendBtn = document.getElementById('sendBtn');
  const clearBtn = document.getElementById('clearBtn');

  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);
  clearBtn.addEventListener('click', clearMessages);
}

async function sendMessage() {
  const userInput = document.getElementById('userInput');
  const sendBtn = document.getElementById('sendBtn');
  const message = userInput.value.trim();

  if (!message) return;

  addMessage('user', message);
  userInput.value = '';
  sendBtn.disabled = true;

  addLoadingIndicator();

  try {
    const decision = await routeIntent(message);

    if (!decision || !decision.intent) {
      removeLoadingIndicator();
      addMessage('bot', '抱歉，我没有理解您的意思，请再描述一下？');
      sendBtn.disabled = false;
      scrollToBottom();
      return;
    }

    const { intent } = decision;

    if (intent === 'image' || intent === 'video') {
      const prompt = decision.prompt || message;
      const response = await callApi(intent, prompt);
      const result = parseResponse(intent, response);

      removeLoadingIndicator();

      if (result) {
        if (intent === 'image') addImageMessage(result);
        else addVideoMessage(result);
      } else {
        addMessage('bot', `未能生成${intent === 'image' ? '图片' : '视频'}`);
      }
    } else {
      removeLoadingIndicator();
      addTextMessage(decision.response || '...');
    }
  } catch (error) {
    removeLoadingIndicator();
    if (error.name === 'AbortError') {
      addMessage('bot', '大模型较忙，请稍后再试！');
    } else {
      showError(error.message);
    }
  } finally {
    sendBtn.disabled = false;
    scrollToBottom();
  }
}

function addMessage(sender, content) {
  const chatMessages = document.getElementById('chatMessages');
  
  const welcomeMessage = document.querySelector('.welcome-message');
  if (welcomeMessage) {
    welcomeMessage.remove();
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}`;

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = content;

  const timeSpan = document.createElement('span');
  timeSpan.className = 'message-time';
  timeSpan.textContent = getCurrentTime();

  contentDiv.appendChild(timeSpan);
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);

  messages.push({ sender, content, time: new Date() });
}

function addTextMessage(content) {
  const chatMessages = document.getElementById('chatMessages');

  const welcomeMessage = document.querySelector('.welcome-message');
  if (welcomeMessage) {
    welcomeMessage.remove();
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = 'message bot';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.innerHTML = MarkdownParser.parse(content);

  const timeSpan = document.createElement('span');
  timeSpan.className = 'message-time';
  timeSpan.textContent = getCurrentTime();

  contentDiv.appendChild(timeSpan);
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);

  messages.push({ sender: 'bot', content, type: 'text', time: new Date() });
  scrollToBottom();
}

function showImageLightbox(url) {
  const existing = document.querySelector('.image-lightbox');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'image-lightbox';

  const container = document.createElement('div');
  container.className = 'lightbox-container';

  const img = document.createElement('img');
  img.src = url;
  img.alt = '预览';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'lightbox-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = () => overlay.remove();

  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.parentNode) overlay.remove();
  }, { once: true });

  container.appendChild(img);
  container.appendChild(closeBtn);
  overlay.appendChild(container);
  document.body.appendChild(overlay);
}

function addImageMessage(url) {
  const chatMessages = document.getElementById('chatMessages');

  const welcomeMessage = document.querySelector('.welcome-message');
  if (welcomeMessage) {
    welcomeMessage.remove();
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = 'message bot';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';

  const img = document.createElement('img');
  img.className = 'thumbnail';
  img.src = url;
  img.alt = '生成的图片';
  img.onload = () => scrollToBottom();
  img.onclick = () => showImageLightbox(url);

  const downloadBtn = document.createElement('button');
  downloadBtn.className = 'download-btn';
  downloadBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
    下载图片 (.png)
  `;
  downloadBtn.onclick = () => {
    downloadFromUrl(url, generateFilename('image', 'png'));
  };

  const timeSpan = document.createElement('span');
  timeSpan.className = 'message-time';
  timeSpan.textContent = getCurrentTime();

  contentDiv.appendChild(img);
  contentDiv.appendChild(downloadBtn);
  contentDiv.appendChild(timeSpan);
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);

  messages.push({ sender: 'bot', content: url, type: 'image', time: new Date() });
  scrollToBottom();
}

function addVideoMessage(url) {
  const chatMessages = document.getElementById('chatMessages');

  const welcomeMessage = document.querySelector('.welcome-message');
  if (welcomeMessage) {
    welcomeMessage.remove();
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = 'message bot';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';

  const video = document.createElement('video');
  video.src = url;
  video.controls = true;
  video.style.maxWidth = '100%';
  video.onloadeddata = () => scrollToBottom();

  const downloadBtn = document.createElement('button');
  downloadBtn.className = 'download-btn';
  downloadBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
    下载视频 (.mp4)
  `;
  downloadBtn.onclick = () => {
    downloadFromUrl(url, generateFilename('video', 'mp4'));
  };

  const timeSpan = document.createElement('span');
  timeSpan.className = 'message-time';
  timeSpan.textContent = getCurrentTime();

  contentDiv.appendChild(video);
  contentDiv.appendChild(downloadBtn);
  contentDiv.appendChild(timeSpan);
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);

  messages.push({ sender: 'bot', content: url, type: 'video', time: new Date() });
  scrollToBottom();
}

function addLoadingIndicator() {
  const chatMessages = document.getElementById('chatMessages');

  const welcomeMessage = document.querySelector('.welcome-message');
  if (welcomeMessage) {
    welcomeMessage.remove();
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = 'message bot';
  messageDiv.id = 'loadingMessage';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'loading-indicator';
  
  for (let i = 0; i < 3; i++) {
    const span = document.createElement('span');
    loadingDiv.appendChild(span);
  }

  contentDiv.appendChild(loadingDiv);
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);

  scrollToBottom();
}

function removeLoadingIndicator() {
  const loadingMessage = document.getElementById('loadingMessage');
  if (loadingMessage) {
    loadingMessage.remove();
  }
}

function showError(message) {
  const chatMessages = document.getElementById('chatMessages');

  const welcomeMessage = document.querySelector('.welcome-message');
  if (welcomeMessage) {
    welcomeMessage.remove();
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = 'message bot';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content error-message';
  contentDiv.textContent = `错误: ${message}`;

  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);

  scrollToBottom();
}

function clearMessages() {
  const chatMessages = document.getElementById('chatMessages');
  chatMessages.innerHTML = `
    <div class="welcome-message">
      <div class="welcome-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 15h-8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2z"></path>
          <path d="M16 21h2a2 2 0 0 0 2-2v-4"></path>
          <path d="M2 15h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"></path>
          <path d="M8 21H6a2 2 0 0 1-2-2v-4"></path>
        </svg>
      </div>
      <h2>欢迎使用智能助手</h2>
      <p>输入您的需求，系统会自动处理</p>
      <p class="hint">提示：输入"生成图片..."或"生成视频..."来创建媒体内容</p>
    </div>
  `;
  messages = [];
}

function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  const chatMessages = document.getElementById('chatMessages');
  setTimeout(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 100);
}

document.addEventListener('DOMContentLoaded', init);