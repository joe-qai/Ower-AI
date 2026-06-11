# Prompt Engineer 集成实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 prompt-engineer 技能自动集成到 Ower AI 对话流程，每次对话自动优化 prompt

**Architecture:** 前端纯 JS 实现，新增 AttachmentHandler、SkillLoader、PromptBuilder 三个模块，集成到现有 app.js 流程中。文件读取使用 CDN 库（mammoth、xlsx），Skill 规则通过 fetch 动态加载。

**Tech Stack:** 原生 JavaScript、mammoth.js (docx)、xlsx.js (excel)、FileReader API

---

## 文件结构

```
js/
├── app.js              # 修改: 集成新模块
├── attachment.js       # 新增: 附件读取
├── skill-loader.js    # 新增: Skill 规则加载
└── prompt-builder.js   # 新增: Prompt 构建

index.html              # 修改: CDN 引入、上传按钮
css/style.css           # 修改: chips 样式
```

---

## Task 1: AttachmentHandler 实现

**Files:**
- Create: `js/attachment.js`

- [ ] **Step 1: 编写 AttachmentHandler 类**

```javascript
/**
 * AttachmentHandler - 处理各类附件读取
 * 支持: docx, md, txt, xlsx, png, jpg
 */
class AttachmentHandler {
  constructor() {
    this.supportedTypes = {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'text/plain': 'text',
      'text/markdown': 'md',
      'application/vnd.ms-excel': 'xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'image/png': 'image',
      'image/jpeg': 'image'
    };
  }

  // 读取单个文件
  async readFile(file) {
    const type = this.getFileType(file);
    if (!type) {
      return { type: 'unsupported', name: file.name, content: '' };
    }

    try {
      if (type === 'docx') {
        return await this.readDocx(file);
      } else if (type === 'xlsx') {
        return await this.readXlsx(file);
      } else if (type === 'image') {
        return await this.readImage(file);
      } else {
        return await this.readText(file);
      }
    } catch (e) {
      console.error(`Error reading ${file.name}:`, e);
      return { type: 'error', name: file.name, content: '' };
    }
  }

  // 读取多个文件
  async readFiles(files) {
    const results = [];
    for (const file of files) {
      const result = await this.readFile(file);
      results.push(result);
    }
    return results.filter(r => r.content); // 过滤空内容
  }

  getFileType(file) {
    if (file.type && this.supportedTypes[file.type]) {
      return this.supportedTypes[file.type];
    }
    // 通过扩展名判断
    const ext = file.name.split('.').pop().toLowerCase();
    const extMap = { docx: 'docx', md: 'md', txt: 'text', xlsx: 'xlsx', png: 'image', jpg: 'image', jpeg: 'image' };
    return extMap[ext] || null;
  }

  async readText(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve({ type: 'text', name: file.name, content: e.target.result });
      reader.onerror = () => resolve({ type: 'error', name: file.name, content: '' });
      reader.readAsText(file);
    });
  }

  async readDocx(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const result = await mammoth.extractRawText({ arrayBuffer: e.target.result });
          resolve({ type: 'docx', name: file.name, content: result.value });
        } catch (err) {
          console.error('mammoth error:', err);
          resolve({ type: 'error', name: file.name, content: '' });
        }
      };
      reader.onerror = () => resolve({ type: 'error', name: file.name, content: '' });
      reader.readAsArrayBuffer(file);
    });
  }

  async readXlsx(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          let content = '';
          for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            content += XLSX.utils.sheet_to_csv(sheet) + '\n';
          }
          resolve({ type: 'xlsx', name: file.name, content });
        } catch (err) {
          console.error('xlsx error:', err);
          resolve({ type: 'error', name: file.name, content: '' });
        }
      };
      reader.onerror = () => resolve({ type: 'error', name: file.name, content: '' });
      reader.readAsArrayBuffer(file);
    });
  }

  async readImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve({ type: 'image', name: file.name, content: e.target.result });
      reader.onerror = () => resolve({ type: 'error', name: file.name, content: '' });
      reader.readAsDataURL(file);
    });
  }
}
```

- [ ] **Step 2: 添加导出**

```javascript
// 在文件末尾添加
window.AttachmentHandler = AttachmentHandler;
```

- [ ] **Step 3: 提交**

```bash
git add js/attachment.js
git commit -m "feat: add AttachmentHandler for file reading"
```

---

## Task 2: SkillLoader 实现

**Files:**
- Create: `js/skill-loader.js`

- [ ] **Step 1: 编写 SkillLoader 类**

```javascript
/**
 * SkillLoader - 动态加载 prompt-engineer references
 */
class SkillLoader {
  constructor() {
    this.cache = {};
    this.basePath = 'prompt-engineer/references/';
  }

  // 加载对应 modelType 的 skill 文档
  async loadSkill(modelType) {
    if (this.cache[modelType]) {
      return this.cache[modelType];
    }

    const files = this.getSkillFiles(modelType);
    const docs = {};

    for (const file of files) {
      try {
        const response = await fetch(this.basePath + file);
        if (response.ok) {
          docs[file] = await response.text();
        }
      } catch (e) {
        console.error(`Error loading ${file}:`, e);
      }
    }

    this.cache[modelType] = docs;
    return docs;
  }

  // 根据 modelType 返回需要加载的文件
  getSkillFiles(modelType) {
    const common = ['prompt-patterns.md'];
    if (modelType === 'text') {
      return [...common, 'prompt-optimization.md', 'system-prompts.md'];
    }
    return common; // image/video 只需 prompt-patterns
  }

  // 获取默认规则（当加载失败时使用）
  getDefaultRules(modelType) {
    if (modelType === 'text') {
      return `你是 prompt 优化专家。根据以下规则优化用户输入：

1. 明确任务类型（分类、提取、生成、推理等）
2. 使用合适的 prompt pattern（zero-shot、few-shot、CoT）
3. 添加必要约束和输出格式要求
4. 保持简洁但完整

优化后的 prompt 应：
- 清晰描述任务目标
- 包含必要的上下文和约束
- 指定输出格式
- 添加 few-shot 示例（如适用）`;
    }
    // image/video 默认规则
    return `你是一个提示词优化器。根据对话历史，把用户的生成请求扩展为详细、适合AI模型的英文提示词。只返回优化后的提示词本身。`;
  }
}
```

- [ ] **Step 2: 添加导出**

```javascript
window.SkillLoader = SkillLoader;
```

- [ ] **Step 3: 提交**

```bash
git add js/skill-loader.js
git commit -m "feat: add SkillLoader for dynamic skill loading"
```

---

## Task 3: PromptBuilder 实现

**Files:**
- Create: `js/prompt-builder.js`

- [ ] **Step 1: 编写 PromptBuilder 类**

```javascript
/**
 * PromptBuilder - 根据 Skill 规则构建优化 prompt
 */
class PromptBuilder {
  constructor() {
    this.skillLoader = new SkillLoader();
  }

  // 构建 LLM 优化 prompt
  buildOptimizationPrompt(userInput, attachments, modelType) {
    const hasAttachments = attachments && attachments.length > 0;
    const attachmentContext = this.buildAttachmentContext(attachments);

    if (modelType === 'text') {
      return this.buildTextOptimizationPrompt(userInput, attachmentContext, hasAttachments);
    } else {
      return this.buildMediaOptimizationPrompt(userInput, attachmentContext, modelType);
    }
  }

  buildAttachmentContext(attachments) {
    if (!attachments || attachments.length === 0) return '';

    const parts = [];
    for (const att of attachments) {
      if (att.type === 'image') {
        parts.push(`[图片: ${att.name}]`);
      } else {
        parts.push(`[附件: ${att.name}]\n${att.content}`);
      }
    }
    return parts.join('\n\n');
  }

  buildTextOptimizationPrompt(userInput, attachmentContext, hasAttachments) {
    let prompt = `你是 prompt 优化专家。请优化以下用户输入，使其成为高质量的 prompt。

原始输入：
${userInput}`;

    if (hasAttachments) {
      prompt += `\n\n附件内容：\n${attachmentContext}`;
    }

    prompt += `\n\n优化要求：
1. 明确任务类型和目标
2. 添加必要的约束和格式要求
3. 如适用，使用 few-shot 或 CoT pattern
4. 保持简洁但信息完整
5. 只返回优化后的 prompt，不要解释`;

    return prompt;
  }

  buildMediaOptimizationPrompt(userInput, attachmentContext, modelType) {
    const typeName = modelType === 'image' ? '图片' : '视频';
    let prompt = `你是一个 ${typeName} 生成提示词优化器。请将用户的简短描述扩展为详细、适合 AI ${typeName} 模型的英文提示词。

原始描述：
${userInput}`;

    if (attachmentContext) {
      prompt += `\n\n上下文信息：\n${attachmentContext}`;
    }

    prompt += `\n\n优化要求：
1. 扩展为详细的环境、动作、表情、色彩等描述
2. 使用英文
3. 适合 ${typeName} 生成模型理解
4. 只返回优化后的英文提示词，不要解释`;

    return prompt;
  }
}
```

- [ ] **Step 2: 添加导出**

```javascript
window.PromptBuilder = PromptBuilder;
```

- [ ] **Step 3: 提交**

```bash
git add js/prompt-builder.js
git commit -m "feat: add PromptBuilder for prompt construction"
```

---

## Task 4: HTML 变更

**Files:**
- Modify: `index.html`

- [ ] **Step 1: 添加 CDN 引入**

在 `</body>` 前添加：

```html
<!-- mammoth.js for docx -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"></script>
<!-- xlsx.js for excel -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
```

- [ ] **Step 2: 添加 JS 模块引入**

```html
<script src="js/attachment.js"></script>
<script src="js/skill-loader.js"></script>
<script src="js/prompt-builder.js"></script>
```

- [ ] **Step 3: 修改 footer，添加上传按钮和附件区域**

找到 `<footer class="chat-input">`，替换为：

```html
<footer class="chat-input">
  <div class="attachment-area" id="attachmentArea"></div>
  <div class="input-wrapper">
    <button id="attachBtn" class="attach-button" type="button">📎</button>
    <input type="file" id="fileInput" multiple accept=".docx,.md,.txt,.xlsx,.png,.jpg" style="display:none">
    <input type="text" id="userInput" placeholder="Type your message..." autocomplete="off">
  </div>
  <button id="sendBtn" class="send-button" onclick="sendMessage()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22,4 12,14.01 9,11.01"></polyline>
    </svg>
    <span>Send</span>
  </button>
</footer>
```

- [ ] **Step 4: 提交**

```bash
git add index.html
git commit -m "feat: add file upload button and CDN dependencies"
```

---

## Task 5: CSS 变更

**Files:**
- Modify: `css/style.css`

- [ ] **Step 1: 添加附件相关样式**

在文件末尾添加：

```css
/* 附件区域 */
.attachment-area {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 16px;
  min-height: 36px;
  border-bottom: 1px solid var(--border-color);
}

.attachment-area:empty {
  display: none;
}

/* 附件 chip */
.attachment-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  font-size: 12px;
  color: var(--text-secondary);
  animation: chipIn 0.2s ease;
}

@keyframes chipIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.attachment-chip .chip-icon {
  font-size: 14px;
}

.attachment-chip .chip-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-chip .remove {
  cursor: pointer;
  opacity: 0.6;
  font-size: 14px;
  line-height: 1;
}

.attachment-chip .remove:hover {
  opacity: 1;
}

/* 上传按钮 */
.attach-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  font-size: 18px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.attach-button:hover {
  opacity: 1;
}
```

- [ ] **Step 2: 提交**

```bash
git add css/style.css
git commit -m "feat: add attachment chips styles"
```

---

## Task 6: app.js 集成 - 附件处理

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: 在文件开头（CONFIG 定义后）添加全局状态和 AttachmentHandler 实例**

```javascript
// 附件相关全局状态
let attachmentHandler = new AttachmentHandler();
let currentAttachments = [];
```

- [ ] **Step 2: 添加渲染 attachment chips 的函数**

在 `init()` 函数前添加：

```javascript
function renderAttachmentChips() {
  const area = document.getElementById('attachmentArea');
  if (!area) return;

  area.innerHTML = '';
  for (let i = 0; i < currentAttachments.length; i++) {
    const att = currentAttachments[i];
    const chip = document.createElement('div');
    chip.className = 'attachment-chip';

    const iconMap = { docx: '📄', text: '📝', md: '📝', xlsx: '📊', image: '🖼️', error: '❌' };
    const icon = iconMap[att.type] || '📎';

    chip.innerHTML = `
      <span class="chip-icon">${icon}</span>
      <span class="chip-name">${att.name}</span>
      <span class="remove" data-index="${i}">×</span>
    `;
    area.appendChild(chip);
  }

  // 绑定删除事件
  area.querySelectorAll('.remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      currentAttachments.splice(index, 1);
      renderAttachmentChips();
    });
  });
}
```

- [ ] **Step 3: 添加 setupAttachmentListeners 函数**

在 `setupEventListeners()` 函数后添加：

```javascript
function setupAttachmentListeners() {
  const attachBtn = document.getElementById('attachBtn');
  const fileInput = document.getElementById('fileInput');

  if (attachBtn && fileInput) {
    attachBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
      const files = e.target.files;
      if (files.length > 0) {
        const results = await attachmentHandler.readFiles(files);
        currentAttachments = [...currentAttachments, ...results];
        renderAttachmentChips();
        fileInput.value = ''; // 清空以便重复选择同一文件
      }
    });
  }
}
```

- [ ] **Step 4: 修改 init 函数，添加 setupAttachmentListeners 调用**

找到 `function init()`，修改为：

```javascript
function init() {
  setupEventListeners();
  setupAttachmentListeners();
}
```

- [ ] **Step 5: 修改 sendMessage 函数开头，传递 attachments**

找到 `async function sendMessage()`，在 `const modelType = detectModelType(message);` 后添加：

```javascript
// 收集当前附件并清空
const attachments = [...currentAttachments];
currentAttachments = [];
renderAttachmentChips();
```

- [ ] **Step 6: 提交**

```bash
git add js/app.js
git commit -m "feat: integrate AttachmentHandler into app.js"
```

---

## Task 7: app.js 集成 - Prompt 优化

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: 添加 optimizePrompt 函数**

在 `sendMessage` 函数前添加：

```javascript
async function optimizePrompt(userInput, attachments, modelType) {
  if (modelType === 'system') {
    return userInput; // 系统问题不需要优化
  }

  try {
    const skillLoader = new SkillLoader();
    const promptBuilder = new PromptBuilder();

    // 构建优化 prompt
    const optimizationPrompt = promptBuilder.buildOptimizationPrompt(
      userInput,
      attachments,
      modelType
    );

    // 调用 LLM 优化，设置超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${CONFIG.base_url}${CONFIG.models.text.endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: CONFIG.models.text.model_name,
        messages: [{ role: 'user', content: optimizationPrompt }],
        max_tokens: 500,
        temperature: 0.7,
        stream: false
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('Prompt optimization failed:', response.status);
      return userInput;
    }

    const data = await response.json();
    const optimized = data.choices?.[0]?.message?.content?.trim();

    if (optimized) {
      console.log('Prompt optimized:', optimized);
      return optimized;
    }

    return userInput;
  } catch (e) {
    if (e.name === 'AbortError') {
      console.warn('Prompt optimization timed out');
    } else {
      console.error('Prompt optimization error:', e);
    }
    return userInput; // 失败时返回原始输入
  }
}
```

- [ ] **Step 2: 修改 sendMessage 中的 LLM 调用逻辑**

找到文本处理部分，修改 `handleTextStream(message);` 为：

```javascript
// 先优化 prompt（仅文本模式）
const optimizedPrompt = await optimizePrompt(message, attachments, 'text');

// 更新消息内容
const actualPrompt = optimizedPrompt;

if (modelType === 'text') {
  await handleTextStream(actualPrompt);
}
```

- [ ] **Step 3: 修改图片/视频生成逻辑，传递优化后的 prompt**

找到图片/视频生成部分，在 `finalPrompt` 处理后添加：

```javascript
if (modelType === 'image' || modelType === 'video') {
  let finalPrompt = message;

  // 如果有上下文或附件，先优化
  if (attachments.length > 0 || messages.some(m => m.type === 'text')) {
    updateLoadingText('正在优化 prompt...');
    finalPrompt = await optimizePrompt(message, attachments, modelType);
    if (messages.some(m => m.type === 'text')) {
      finalPrompt = await contextualizePrompt(finalPrompt, modelType);
    }
  }

  updateLoadingText(modelType === 'image' ? '生成中...' : '生成中...');
  const response = await callApi(modelType, finalPrompt);
  // ... 后续代码不变
}
```

- [ ] **Step 4: 提交**

```bash
git add js/app.js
git commit -m "feat: integrate prompt optimization into sendMessage"
```

---

## Task 8: 完整测试

**Files:**
- 测试文件: `index.html`

- [ ] **Step 1: 启动本地服务器测试**

```bash
# 在项目目录启动简单 HTTP 服务器
npx serve . -p 3000
# 或使用 Python
python -m http.server 3000
```

- [ ] **Step 2: 测试场景**

1. **无附件文本对话**: 输入"你好"，验证正常响应
2. **上传 md 文件**: 上传 md 文件后输入"总结这个文档"，验证读取和优化
3. **上传 docx 文件**: 上传 docx 文件，验证 mammoth 解析
4. **上传图片**: 上传 png/jpg，验证 Base64 编码
5. **组合测试**: 上传附件+文本，验证完整流程

- [ ] **Step 3: 提交最终版本**

```bash
git add -A
git commit -m "feat: complete prompt-engineer integration"
```

---

## 自检清单

### Spec 覆盖检查
- [x] AttachmentHandler - Task 1
- [x] SkillLoader - Task 2
- [x] PromptBuilder - Task 3
- [x] HTML CDN 引入 - Task 4
- [x] CSS chips 样式 - Task 5
- [x] app.js 附件集成 - Task 6
- [x] app.js 优化集成 - Task 7
- [x] 完整测试 - Task 8

### 占位符扫描
- 无 TBD/TODO
- 无 "类似 Task N" 引用
- 所有代码块完整

### 类型一致性
- `AttachmentHandler.readFile()` 返回 `{ type, name, content }`
- `SkillLoader.loadSkill()` 返回 `{ filename: content }`
- `PromptBuilder.buildOptimizationPrompt()` 返回 `string`
- `optimizePrompt()` 返回 `string` 或原始输入

---

## 依赖关系图

```
Task 1 (attachment.js) ─┐
                        ├─► Task 6 (app.js 附件) ─┐
Task 2 (skill-loader.js)─┤                        │
                          │                        ├─► Task 7 (app.js 优化) ─► Task 8 (测试)
Task 3 (prompt-builder.js)┘                        │
                                                    
Task 4 (index.html) ────────► Task 5 (style.css) ──┘
```
