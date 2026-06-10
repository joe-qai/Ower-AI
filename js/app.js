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

const RAW_CONFIG = {
  base_url: 'https://apihub.agnes-ai.com/v1',
  api_key: 'sk-tJrGGHuvGUud4EAp8kwtnRreHlbQMH8tWmaYsw6yXh3VPIAG',
  video_poll_url: 'https://apihub.agnes-ai.com/agnesapi?video_id=',
  text_endpoint: '/chat/completions',
  text_model: 'agnes-2.0-flash',
  image_endpoint: '/images/generations',
  image_model: 'agnes-image-2.1-flash',
  video_endpoint: '/videos',
  video_model: 'agnes-video-v2.0'
};

const CONFIG = {
  base_url: CryptoUtils.decrypt(CryptoUtils.encrypt(RAW_CONFIG.base_url)),
  api_key: CryptoUtils.decrypt(CryptoUtils.encrypt(RAW_CONFIG.api_key)),
  video_poll_url: CryptoUtils.decrypt(CryptoUtils.encrypt(RAW_CONFIG.video_poll_url)),
  models: {
    text: {
      name: 'Text Model',
      endpoint: CryptoUtils.decrypt(CryptoUtils.encrypt(RAW_CONFIG.text_endpoint)),
      model_name: CryptoUtils.decrypt(CryptoUtils.encrypt(RAW_CONFIG.text_model)),
      description: '文本生成模型'
    },
    image: {
      name: 'Image Model',
      endpoint: CryptoUtils.decrypt(CryptoUtils.encrypt(RAW_CONFIG.image_endpoint)),
      model_name: CryptoUtils.decrypt(CryptoUtils.encrypt(RAW_CONFIG.image_model)),
      description: '图像生成模型'
    },
    video: {
      name: 'Video Model',
      endpoint: CryptoUtils.decrypt(CryptoUtils.encrypt(RAW_CONFIG.video_endpoint)),
      model_name: CryptoUtils.decrypt(CryptoUtils.encrypt(RAW_CONFIG.video_model)),
      description: '视频生成模型'
    }
  }
};

let messages = [];

function isModelQuestion(prompt) {
  const keywords = ['你好', '你是', '哪个', '模型', '大模型', '对话', 'AI', '名字', '什么', '谁',
                   'who', 'name', 'what', 'your', 'are', 'you', 'hello', 'hi', 'identify', 'introduce'];
  return keywords.some(keyword => prompt.toLowerCase().includes(keyword));
}

function isAbstractPrompt(prompt, modelType) {
  if (modelType !== 'image' && modelType !== 'video') {
    return false;
  }
  
  const abstractKeywords = [
    '漂亮', '好看', '美丽', '帅气', '可爱', '酷', '优雅', '时尚',
    'beautiful', 'pretty', 'nice', 'cool', 'cute', 'elegant', 'fashion',
    '随便', '都行', '都可以', '差不多', '类似',
    'something', 'anything', 'whatever', 'similar'
  ];
  
  const concreteKeywords = [
    '颜色', '尺寸', '风格', '场景', '人物', '地点', '时间',
    '颜色', '大小', '形状', '材质', '背景', '表情', '动作',
    'color', 'size', 'style', 'scene', 'person', 'place', 'background'
  ];
  
  const lowerPrompt = prompt.toLowerCase().trim();
  const hasAbstract = abstractKeywords.some(k => lowerPrompt.includes(k));
  const hasConcrete = concreteKeywords.some(k => lowerPrompt.includes(k));
  
  return hasAbstract && !hasConcrete;
}

function detectModelType(prompt) {
  if (isModelQuestion(prompt)) {
    return 'system';
  }
  
  const lowerPrompt = prompt.toLowerCase().trim();
  
  const videoKeywords = ['生成视频', '制作视频', '视频', 'video', 'mp4'];
  const imageKeywords = ['生成图片', '制作图片', '画', '图片', 'image', 'photo', 'png', 'jpg'];
  
  const hasVideoKeyword = videoKeywords.some(keyword => lowerPrompt.includes(keyword));
  const hasImageKeyword = imageKeywords.some(keyword => lowerPrompt.includes(keyword));
  
  if (hasVideoKeyword) {
    return 'video';
  } else if (hasImageKeyword) {
    return 'image';
  } else {
    return 'text';
  }
}

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

function buildHistory() {
  const history = [];
  for (const msg of messages) {
    if (msg.sender === 'user') {
      history.push({ role: 'user', content: msg.content });
    } else if (msg.sender === 'bot' && msg.type === 'text') {
      history.push({ role: 'assistant', content: msg.content });
    }
  }
  return history;
}

async function contextualizePrompt(prompt, modelType) {
  const hasContext = messages.some(m => m.type === 'text');
  if (!hasContext) return prompt;

  const typeName = modelType === 'image' ? '图片' : '视频';
  const modelConfig = getModelConfig('text');
  const url = `${CONFIG.base_url}${modelConfig.endpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.api_key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelConfig.model_name,
      messages: [
        { role: 'system', content: `你是一个提示词优化器。根据对话历史，把用户的${typeName}生成请求扩展为详细、适合AI${typeName}模型的英文提示词。只返回提示词本身。` },
        ...buildHistory(),
        { role: 'user', content: `根据对话历史优化这个${typeName}提示词：${prompt}` }
      ],
      max_tokens: 500,
      temperature: 0.7,
      stream: false
    })
  });

  if (!response.ok) return prompt;
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || prompt;
}

function getModelConfig(modelType) {
  const models = CONFIG.models;
  if (!models[modelType]) {
    throw new Error(`未知的模型类型: ${modelType}`);
  }
  return models[modelType];
}

async function callApi(modelType, prompt, callback = null) {
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
      body = {
        model: modelConfig.model_name,
        messages: [
          ...buildHistory(),
          { role: 'user', content: prompt }
        ],
        max_tokens: 2048,
        temperature: 0.7,
        stream: callback !== null
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
        height: 768,
        width: 1152,
        num_frames: 121,
        frame_rate: 24
      };
      break;
    default:
      throw new Error(`不支持的模型类型: ${modelType}`);
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API请求失败: ${response.status} - ${errorText}`);
    }

    if (modelType === 'text' && callback !== null) {
      return await handleStreamResponse(response, callback);
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
    throw error;
  }
}

async function handleStreamResponse(response, callback) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  
  let fullContent = '';
  
  while (true) {
    const { done, value } = await reader.read();
    
    if (done) {
      break;
    }
    
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        
        if (data === '[DONE]') {
          return fullContent;
        }
        
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content;
          
          if (content) {
            fullContent += content;
            callback(content);
          }
        } catch (e) {
          console.log('解析流式数据失败:', e);
        }
      }
    }
  }
  
  return fullContent;
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

function downloadFromUrl(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function init() {
  setupEventListeners();
}

function setupEventListeners() {
  const userInput = document.getElementById('userInput');
  const sendBtn = document.getElementById('sendBtn');
  const clearBtn = document.getElementById('clearBtn');

  if (userInput) {
    userInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', clearMessages);
  }
}

async function sendMessage() {
  const userInput = document.getElementById('userInput');
  const sendBtn = document.getElementById('sendBtn');
  const message = userInput.value.trim();

  if (!message) return;

  const attachments = window.__attachments?.getAll() || [];
  const modelType = detectModelType(message);

  addMessage('user', message, attachments);
  userInput.value = '';
  sendBtn.disabled = true;
  window.__attachments?.clear();

  try {
    if (modelType === 'system') {
      addTextMessage('我是海外仙踪，新加坡免费大模型，可以放心用哟。');
      sendBtn.disabled = false;
      scrollToBottom();
      return;
    }

    if (isAbstractPrompt(message, modelType)) {
      const confirm = await confirmAbstractPrompt(message, modelType);
      if (!confirm) {
        sendBtn.disabled = false;
        return;
      }
    }

    addLoadingIndicator(modelType);

    let optimizedPrompt = null;
    if (window.__optimizer) {
      updateLoadingText('正在优化提示词...');
      optimizedPrompt = await window.__optimizer.optimize(message, modelType);
    }

    const basePrompt = optimizedPrompt || message;
    const attachPrefix = attachments.length > 0
      ? attachments.map(a => `[附件: ${a.name}]\n${a.content}`).join('\n\n') + '\n\n'
      : '';
    const usePrompt = attachPrefix + basePrompt;
    if (modelType === 'text') {
      await handleTextStream(usePrompt);
    } else {
      let finalPrompt = usePrompt;
      if (messages.some(m => m.type === 'text')) {
        updateLoadingText('正在理解上下文...');
        finalPrompt = await contextualizePrompt(usePrompt, modelType);
        updateLoadingText(modelType === 'image' ? '生成图片中...' : '生成视频中...');
      }
      const response = await callApi(modelType, finalPrompt);
      const result = parseResponse(modelType, response);
      
      removeLoadingIndicator();
      
      if (modelType === 'image') {
        if (result) {
          addImageMessage(result);
        } else {
          addMessage('bot', '未能生成图片');
        }
      } else if (modelType === 'video') {
        if (result) {
          addVideoMessage(result);
        } else {
          addMessage('bot', '未能生成视频');
        }
      }
    }
  } catch (error) {
    removeLoadingIndicator();
    showError(error.message);
  } finally {
    sendBtn.disabled = false;
    scrollToBottom();
  }
}

async function confirmAbstractPrompt(message, modelType) {
  return new Promise((resolve) => {
    const chatMessages = document.getElementById('chatMessages');
    
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
      welcomeMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot';
    messageDiv.id = 'abstractPromptMessage';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const typeText = modelType === 'image' ? '图片' : '视频';
    contentDiv.innerHTML = `
      <p>我注意到你的${typeText}生成请求比较抽象呢~ 为了更好地帮你生成，我想了解更多细节：</p>
      <p style="margin-top: 8px; font-size: 13px; color: var(--text-secondary);">
        你可以告诉我更多关于：<br>
        • 颜色偏好（比如：蓝色、温暖色调、复古风格）<br>
        • 场景描述（比如：森林、城市夜景、海边日落）<br>
        • 风格要求（比如：写实、卡通、油画、赛博朋克）
      </p>
      <div style="margin-top: 12px; display: flex; gap: 8px;">
        <button 
          onclick="handleAbstractConfirm(true)" 
          style="padding: 8px 16px; background: var(--primary-500); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 13px;"
        >
          补充说明
        </button>
        <button 
          onclick="handleAbstractConfirm(false)" 
          style="padding: 8px 16px; background: var(--bg-input); color: var(--text-secondary); border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; font-size: 13px;"
        >
          就这样生成
        </button>
      </div>
    `;

    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    scrollToBottom();

    window.handleAbstractConfirm = function(confirmed) {
      const msg = document.getElementById('abstractPromptMessage');
      if (msg) msg.remove();
      resolve(confirmed);
    };
  });
}

async function handleTextStream(prompt) {
  const chatMessages = document.getElementById('chatMessages');

  const messageDiv = document.createElement('div');
  messageDiv.className = 'message bot';
  messageDiv.id = 'streamingMessage';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';

  const textContainer = document.createElement('div');
  textContainer.className = 'streaming-text';

  contentDiv.appendChild(textContainer);
  messageDiv.appendChild(contentDiv);

  let fullContent = '';
  let displayedLen = 0;
  let charQueue = [];
  let isTyping = false;

  function typewrite() {
    if (charQueue.length === 0) {
      isTyping = false;
      return;
    }
    isTyping = true;
    const ch = charQueue.shift();
    displayedLen++;
    textContainer.innerHTML = MarkdownParser.parse(fullContent.slice(0, displayedLen));
    scrollToBottom();
    const delay = ch === '\n' ? 80 : 20;
    setTimeout(typewrite, delay);
  }

  const callback = (chunk) => {
    if (messageDiv.parentNode !== chatMessages) {
      removeLoadingIndicator();
      chatMessages.appendChild(messageDiv);
      scrollToBottom();
    }

    fullContent += chunk;
    for (const ch of chunk) {
      charQueue.push(ch);
    }
    if (!isTyping) {
      typewrite();
    }
  };

  try {
    await callApi('text', prompt, callback);
  } finally {
    if (messageDiv.parentNode !== chatMessages) {
      removeLoadingIndicator();
      chatMessages.appendChild(messageDiv);
    }
    textContainer.innerHTML = MarkdownParser.parse(fullContent);
    displayedLen = fullContent.length;
    charQueue = [];
    isTyping = false;

    const streamingMsg = document.getElementById('streamingMessage');
    if (streamingMsg) {
      streamingMsg.id = '';
    }

    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = getCurrentTime();
    contentDiv.appendChild(timeSpan);

    messages.push({ sender: 'bot', content: fullContent, type: 'text', time: new Date() });
  }
}

function addMessage(sender, content, attachments) {
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

  if (attachments && attachments.length > 0) {
    const attachDiv = document.createElement('div');
    attachDiv.className = 'message-attachments';
    for (const a of attachments) {
      const chip = document.createElement('span');
      chip.className = 'message-attach-chip';
      chip.textContent = a.name;
      attachDiv.appendChild(chip);
    }
    contentDiv.appendChild(attachDiv);
  }

  const timeSpan = document.createElement('span');
  timeSpan.className = 'message-time';
  timeSpan.textContent = getCurrentTime();

  contentDiv.appendChild(timeSpan);
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);

  messages.push({ sender, content, attachments, time: new Date() });
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
  img.src = url;
  img.alt = '生成的图片';
  img.style.cursor = 'pointer';
  img.onload = () => scrollToBottom();
  img.onclick = (e) => { e.stopPropagation(); openPreview('image', url); };

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
  video.style.cursor = 'pointer';
  video.onloadeddata = () => scrollToBottom();
  video.onclick = (e) => { e.stopPropagation(); openPreview('video', url); };

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

function addLoadingIndicator(modelType = 'text') {
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

  const loadingText = modelType === 'text' 
    ? '思考中...' 
    : (modelType === 'image' ? '生成中...' : '生成中...');
  
  contentDiv.innerHTML = `<div class="typing-indicator">
    <span></span>
    <span></span>
    <span></span>
  </div><div class="loading-text" style="margin-top: 8px; font-size: 13px; color: var(--text-muted);">${loadingText}</div>`;

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

function updateLoadingText(text) {
  const el = document.querySelector('#loadingMessage .loading-text');
  if (el) el.textContent = text;
}

function openPreview(type, src) {
  const overlay = document.getElementById('previewOverlay');
  const imgEl = document.getElementById('previewImage');
  const videoEl = document.getElementById('previewVideo');
  imgEl.style.display = 'none';
  videoEl.style.display = 'none';
  if (type === 'image') {
    imgEl.src = src;
    imgEl.style.display = 'block';
  } else {
    videoEl.src = src;
    videoEl.style.display = 'block';
  }
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closePreview() {
  const overlay = document.getElementById('previewOverlay');
  const videoEl = document.getElementById('previewVideo');
  overlay.classList.remove('active');
  videoEl.pause();
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePreview();
});

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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
          <path d="M2 17l10 5 10-5"></path>
          <path d="M2 12l10 5 10-5"></path>
        </svg>
      </div>
      <h2>Welcome to NEXUS</h2>
      <p>Your intelligent AI assistant is ready to help</p>
      <div class="welcome-hint">
        <span class="hint-chip">Text Generation</span>
        <span class="hint-chip">Image Creation</span>
        <span class="hint-chip">Video Synthesis</span>
      </div>
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

function clearInput() {
  document.getElementById('userInput').value = '';
}

document.addEventListener('DOMContentLoaded', init);