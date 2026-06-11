# Prompt Engineer 集成设计文档

**版本**: v1.0.0
**日期**: 2026-06-11
**状态**: 设计中

---

## 1. 概述

### 1.1 目标

将 prompt-engineer 技能自动集成到 Ower AI 对话流程中，每次用户发送消息时自动调用 prompt-engineer 优化 prompt，再请求大模型生成响应。

### 1.2 核心流程

```
用户输入 + 附件
    │
    ▼
附件内容读取（docx/md/excel → 文本，png/jpg → Base64）
    │
    ▼
SkillLoader 动态加载 prompt-engineer/references/
    │
    ▼
PromptBuilder 根据任务类型构建优化 prompt
    │
    ▼
LLMOptimizer 调用 LLM 优化
    │
    ▼
LLMGenerate 使用优化后 prompt 生成响应
```

---

## 2. 架构设计

### 2.1 组件列表

| 组件 | 文件 | 职责 |
|------|------|------|
| AttachmentHandler | `js/attachment.js` | 读取各类附件内容 |
| SkillLoader | `js/skill-loader.js` | 动态加载 prompt-engineer references |
| PromptBuilder | `js/prompt-builder.js` | 构建优化 prompt |
| LLMOptimizer | 集成到 app.js | 调用 LLM 执行优化 |

### 2.2 组件依赖关系

```
AttachmentHandler
       │
       ▼
SkillLoader ──读取──► prompt-engineer/references/
       │
       ▼
PromptBuilder
       │
       ▼
LLMOptimizer ──调用──► CONFIG.api_key (LLM API)
       │
       ▼
LLMGenerate ──使用优化后 prompt──► 响应用户
```

---

## 3. 组件详细设计

### 3.1 AttachmentHandler

**文件**: `js/attachment.js`

**职责**: 读取用户上传的附件内容

**支持格式**:

| 格式 | 读取方式 | CDN 依赖 |
|------|----------|----------|
| docx | mammoth.js 提取文本 | https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js |
| md | 原始文本 | 无 |
| txt | 原始文本 | 无 |
| excel (xlsx) | xlsx.js 转 CSV | https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js |
| png/jpg | Base64 | 无（原生 FileReader API）|

**API 设计**:

```javascript
class AttachmentHandler {
  // 读取单个文件，返回 { type: 'text'|'image', content: string }
  async readFile(file: File): Promise<{type: string, content: string}>

  // 读取多个文件
  async readFiles(files: FileList): Promise<Array<{type: string, content: string}>>
}
```

**错误处理**:
- 读取失败时返回 `{ type: 'error', content: '' }`，并输出 console.error
- 不阻塞流程，降级为无附件处理

### 3.2 SkillLoader

**文件**: `js/skill-loader.js`

**职责**: 运行时读取 prompt-engineer/references/ 文档

**加载策略**:

| modelType | 加载 Reference | 用途 |
|-----------|---------------|------|
| text | prompt-patterns.md + prompt-optimization.md | 选择合适的 prompt pattern |
| image | prompt-patterns.md (few-shot 部分) | 扩展为英文详细描述 |
| video | prompt-patterns.md (few-shot 部分) | 扩展为英文详细描述 |

**API 设计**:

```javascript
class SkillLoader {
  // 加载对应 modelType 的 skill 文档
  async loadSkill(modelType: string): Promise<SkillDoc>

  // 根据输入判断任务类型，返回 pattern 建议
  async suggestPattern(input: string, context: any): Promise<string>
}
```

**错误处理**:
- 加载失败时使用内置的默认 skill 规则
- 缓存已加载的 skill，避免重复请求

### 3.3 PromptBuilder

**文件**: `js/prompt-builder.js`

**职责**: 根据 Skill 规则和用户输入构建优化 prompt

**构建策略**:

```javascript
class PromptBuilder {
  // 构建 LLM 优化 prompt
  buildOptimizationPrompt(
    userInput: string,
    attachments: Array<{type: string, content: string}>,
    skillDoc: SkillDoc,
    modelType: string
  ): string

  // 根据 skill 规则选择最佳 pattern
  selectPattern(taskType: string, skillDoc: SkillDoc): PatternConfig
}
```

**Prompt 模板结构**:

```
## 任务分析
原始用户输入: {userInput}
附件内容: {attachments}
模型类型: {modelType}

## Skill 规则
{skillRules}

## 优化要求
1. 根据 skill 规则优化输入
2. 保持原意不变
3. 输出优化后的 prompt 文本

## 优化后的 Prompt
```

### 3.4 LLMOptimizer

**集成到**: `js/app.js` (新增函数)

**职责**: 调用 LLM 执行 prompt 优化

**API 设计**:

```javascript
// 调用 LLM 优化 prompt
async function optimizePrompt(userInput, attachments, modelType) {
  const skillLoader = new SkillLoader();
  const promptBuilder = new PromptBuilder();

  // 1. 加载 skill
  const skillDoc = await skillLoader.loadSkill(modelType);

  // 2. 构建优化 prompt
  const optimizationPrompt = promptBuilder.buildOptimizationPrompt(
    userInput,
    attachments,
    skillDoc,
    modelType
  );

  // 3. 调用 LLM（使用现有 CONFIG）
  const response = await callApi('text', optimizationPrompt);

  // 4. 解析响应
  return parseResponse('text', response);
}
```

**错误处理**:
- 优化失败时直接返回原始 userInput，不阻塞主流程
- 设置 5 秒超时，避免长时间等待

---

## 4. 数据流设计

### 4.1 sendMessage 流程变更

**当前流程**:
```
用户输入 → detectModelType → callApi → 响应用户
```

**变更后流程**:
```
用户输入 → detectModelType → [OPTIMIZE] → callApi → 响应用户
                       ↑
                       │
                 attachmentHandler.readFiles()
                 skillLoader.loadSkill()
                 promptBuilder.build()
                 llmOptimizer.optimize()
```

### 4.2 消息结构变更

新增 `attachments` 字段存储附件信息:

```javascript
const message = {
  sender: 'user',
  content: '用户输入文本',
  attachments: [
    { type: 'docx', name: '文档.docx', content: '提取的文本...' },
    { type: 'image', name: '图片.png', content: 'data:image/png;base64,...' }
  ],
  optimizedPrompt: '优化后的 prompt',  // 新增
  time: new Date()
};
```

---

## 5. UI 变更

### 5.1 HTML 变更

**文件**: `index.html`

**新增元素**:
1. 文件上传按钮（input type="file"）
2. 附件显示区域（chips）

```html
<footer class="chat-input">
  <div class="attachment-area" id="attachmentArea">
    <!-- 动态生成的 chips -->
  </div>
  <div class="input-wrapper">
    <button id="attachBtn" class="attach-button">📎</button>
    <input type="file" id="fileInput" multiple accept=".docx,.md,.txt,.xlsx,.png,.jpg" style="display:none">
    <input type="text" id="userInput" placeholder="Type your message..." autocomplete="off">
  </div>
  <button id="sendBtn" class="send-button">Send</button>
</footer>
```

### 5.2 CSS 变更

**文件**: `css/style.css`

**新增样式**:
```css
/* 附件区域 */
.attachment-area {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 16px;
  min-height: 40px;
}

/* 附件 chip */
.attachment-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  font-size: 12px;
  color: var(--text-secondary);
}

.attachment-chip .remove {
  cursor: pointer;
  opacity: 0.6;
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
}
```

### 5.3 UI 交互

1. **上传**: 点击 📎 按钮选择文件，或拖拽文件到输入区域
2. **显示**: 文件以 chips 形式显示在输入框上方
3. **删除**: 点击 chip 上的 × 移除对应附件
4. **发送**: 发送时自动处理所有附件

---

## 6. CDN 依赖

**新增 CDN 引入** (`index.html`):

```html
<!-- mammoth.js for docx -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"></script>

<!-- xlsx.js for excel -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
```

---

## 7. 错误处理策略

| 场景 | 处理方式 | 影响 |
|------|----------|------|
| 文件读取失败 | 输出 console.error，返回空 content | 降级为无附件 |
| Skill 加载失败 | 使用内置默认规则 | 可能影响优化效果 |
| LLM 优化超时（5s） | 返回原始 prompt | 不阻塞生成 |
| LLM 优化失败 | 返回原始 prompt | 不阻塞生成 |

---

## 8. 实现任务清单

### Phase 1: 基础附件功能
- [ ] 新增 `js/attachment.js` - AttachmentHandler
- [ ] 修改 `index.html` - 添加上传按钮和 CDN
- [ ] 修改 `css/style.css` - 添加 chips 样式
- [ ] 修改 `js/app.js` - 集成 AttachmentHandler

### Phase 2: Skill 集成
- [ ] 新增 `js/skill-loader.js` - SkillLoader
- [ ] 新增 `js/prompt-builder.js` - PromptBuilder
- [ ] 修改 `js/app.js` - 集成 LLMOptimizer

### Phase 3: 测试与优化
- [ ] 测试各类文件读取
- [ ] 测试优化效果
- [ ] UI 细节调整

---

## 9. 风险与限制

1. **大文件处理**: Base64 编码会增加 prompt 长度，需限制图片大小（如 5MB）
2. **LLM 调用延迟**: 优化步骤会增加 1-3 秒延迟
3. **Token 成本**: 优化 prompt 会消耗额外 token
4. **跨域限制**: Skill 文件需同源或配置 CORS

---

## 10. 后续迭代方向

- 支持更多文件格式（PDF、CSV 等）
- 优化器缓存机制（避免相同输入重复优化）
- 用户可选择是否启用自动优化
- 优化过程可视化（显示"正在优化 prompt..."）
