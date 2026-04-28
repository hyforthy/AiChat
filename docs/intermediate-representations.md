# 输入 / 输出中间表示详解

---

## 一、输入侧：`NormalizedMessage` / `NormalizedContent`

### 定义（`src/lib/buildMessages.ts`）

```ts
interface NormalizedMessage {
  role: "user" | "assistant";
  content: NormalizedContent[];
}

type NormalizedContent =
  | { type: "text";         text: string }
  | { type: "image_base64"; data: string; mediaType: string }
```

### 为什么需要这一层

`ContentBlock`（存储层）包含了展示专用的类型（`thinking`、`image_generated`），
这些类型不能发回给模型。`NormalizedContent` 把"可发送给模型的内容"单独抽出来，
各提供商适配器只需要处理这两种类型，不关心存储细节。

### 从 `ContentBlock` 到 `NormalizedContent` 的映射

**用户消息**（`blocksToNormalized`）

| ContentBlock | NormalizedContent | 说明 |
|---|---|---|
| `{ type: "text", text }` | `{ type: "text", text }` | 直通 |
| `{ type: "thinking", text }` | **丢弃** | 仅用于展示，不回传给模型 |
| `{ type: "image_url", url }` | `{ type: "image_base64", data, mediaType }` | 文件上传经 `FileReader.readAsDataURL()` 产生 data URL，拆分为 base64 |
| `{ type: "image_generated", url }` | `{ type: "text", text: "[image: url]" }` | 模型生成的图不能作为输入发回，降级为文字引用 |

**助手消息**（`assistantToNormalized`）

只保留 `text` 块，其余全部丢弃。
原因：thinking / 生成图片在历史上下文中没有意义，只是当轮的展示产物。

```ts
msg.content
  .filter((b) => b.type === "text")
  .map((b) => ({ type: "text", text: b.text }))
```

### `buildMessages` 的构建逻辑

```
for i = 0 → upToTurnIndex:
  push user turn i
  if i < upToTurnIndex:          ← 当前轮的助手回复还没生成，不放入
    if thread.responses[i] exists && no error:
      push assistant turn i
```

输出是完整的多轮对话数组，最后一条必然是当前用户消息（没有对应的助手回复）。
每个模型各自持有一个 `thread`，因此每个模型拿到的历史各不相同（各自只看到自己的回答）。

### 各提供商如何消费 `NormalizedContent`

#### Anthropic

```
text         → { type: "text", text }
image_base64 → { type: "image", source: { type: "base64", media_type, data } }
```

system prompt 作为顶层独立字段，不进入 messages 数组。

#### OpenAI / Custom

助手历史：`content` 简化为纯字符串（取第一个 text 块）。

用户消息：
- 无图 → `content: string`（纯文本）
- 有图 → `content: ChatCompletionContentPart[]`

```
text         → { type: "text", text }
image_base64 → { type: "image_url", image_url: { url: "data:{mediaType};base64,{data}" } }
```

system prompt 作为 `{ role: "system", content }` 插入 messages 数组开头。

#### Google

历史（`slice(0, -1)`）：
```
role: "user"      → role: "user"
role: "assistant" → role: "model"
```

内容：
```
text         → { text }
image_base64 → { inlineData: { mimeType, data } }
```

最后一条消息单独取出作为 `sendMessageStream(parts)` 的参数（不进 history）。
system prompt 作为 `systemInstruction` 传给 `getGenerativeModel`。

---

## 二、输出侧：`StreamChunk` → `ContentBlock`

### `StreamChunk` 定义（`src/types/index.ts`）

```ts
type StreamChunk =
  | { type: "text";            text: string }
  | { type: "thinking";        text: string }
  | { type: "image_generated"; url: string }
  | { type: "done";            stopReason: string }
```

### 各提供商如何产生 `StreamChunk`

#### Anthropic

| SDK 事件 | StreamChunk |
|---|---|
| `content_block_delta` → `text_delta` | `{ type: "text", text: delta.text }` |
| `content_block_delta` → `thinking_delta` | `{ type: "thinking", text: delta.thinking }` |
| `message_stop` | `{ type: "done", stopReason: message.stop_reason ?? "end_turn" }` |

`content_block_start`（thinking 块开始）只是预告，真正内容来自 delta，不产生 chunk。

#### OpenAI / Custom

| chunk 字段 | StreamChunk |
|---|---|
| `delta.reasoning_content`（o1/o3 非标准扩展） | `{ type: "thinking", text }` |
| `delta.content` | `{ type: "text", text }` |
| `choices[0].finish_reason` 非 null | `{ type: "done", stopReason }` |

同一个 chunk 可能同时有 `reasoning_content` 和 `content`，两者独立 yield。

#### Google

| chunk 字段 | StreamChunk |
|---|---|
| `candidate.content.parts[].text` | `{ type: "text", text }` |
| `candidate.content.parts[].inlineData` | `{ type: "image_generated", url: "data:{mimeType};base64,{data}" }` |
| `candidate.finishReason` 非 null | `{ type: "done", stopReason }` |

一个 chunk 可能含多个 candidate，每个 candidate 含多个 part，全部遍历产出。
`image_generated` 是 Google 独有，其他提供商不产生此类型。

### `StreamChunk` → store 写入（`useStream`）

```ts
if (chunk.type === "text")            appendChunk(convId, turnIndex, modelId, chunk.text)
if (chunk.type === "thinking")        appendThinking(convId, turnIndex, modelId, chunk.text)
if (chunk.type === "image_generated") appendGeneratedImage(convId, turnIndex, modelId, chunk.url)
// "done" 不写 store，流自然结束
```

### store 内如何拼接成 `AssistantMessage.content`（`ContentBlock[]`）

**`appendChunk`（text）**

```
responses[turnIndex] 不存在         → 新建 { content: [{ type: "text", text }] }
最后一个 block 是 text              → 在末尾追加字符串（避免碎片化存储）
最后一个 block 不是 text           → push 新的 text block
```

**`appendThinking`（thinking）**

```
content 中已有 thinking block       → 追加字符串到该 block
没有 thinking block                 → unshift 到 content 开头（thinking 始终在最前）
```

**`appendGeneratedImage`（image_generated）**

```
直接 push { type: "image_generated", url } 到 content 末尾
```

### 最终 `AssistantMessage.content` 结构示例

正常响应（带 thinking）：
```ts
[
  { type: "thinking", text: "…推理过程…" },   // 始终在开头
  { type: "text",     text: "…回答…" },
]
```

Gemini 图片生成：
```ts
[
  { type: "text",            text: "这是生成的图片：" },
  { type: "image_generated", url: "data:image/png;base64,…" },
]
```

错误情况（`setModelError`）：
```ts
{ id, content: [], timestamp, error: "错误信息" }
```
`content` 为空数组，`error` 字段非 null，渲染层据此显示错误 UI。

---

## 三、两侧对比

| | 输入（NormalizedContent） | 输出（StreamChunk → ContentBlock） |
|---|---|---|
| **设计目标** | 抹平存储类型差异，统一提供商入参 | 抹平提供商事件差异，统一写入 store |
| **text** | 直通 | 流式追加，同类型末尾合并 |
| **thinking** | 丢弃（不发给模型） | 追加，保证在 content[0] |
| **image（用户上传）** | 拆分 data URL → image_base64 | — |
| **image（模型生成）** | 降级为文字（不能发回） | 独立 block，push 到末尾 |
| **done** | 不存在 | 不写 store，仅标志流结束 |
