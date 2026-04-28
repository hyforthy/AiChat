# 流式请求接口总结

## 整体数据流

```
UserTurn.content (ContentBlock[])
        ↓  buildMessages()
NormalizedMessage[]          ← 中间表示，三种提供商共用
        ↓  callStream()
各 provider 的原生格式
        ↓  AsyncGenerator<StreamChunk>  ← 统一出口
useStream hook → store (appendChunk / appendThinking / appendGeneratedImage)
```

---

## 中间表示

### `NormalizedContent`（进入提供商之前）

```ts
| { type: "text";         text: string }
| { type: "image_base64"; data: string; mediaType: string }
```

**过滤规则（`blocksToNormalized`）**

| ContentBlock 类型 | 处理方式 |
|---|---|
| `text` | → `text` |
| `thinking` | 丢弃（仅展示用） |
| `image_url` | 拆 data URL → `image_base64`（上传图片始终是 data URL） |
| `image_generated` | → `text "[image: …]"`（模型生成的图不能发回） |

助手历史回退时只保留 `text` 块，thinking/图片均丢弃。

### `StreamChunk`（流出口）

```ts
| { type: "text";            text: string }
| { type: "thinking";        text: string }
| { type: "image_generated"; url: string }   // 仅 Google
| { type: "done";            stopReason: string }
```

---

## 各提供商接口

### Anthropic（`@anthropic-ai/sdk`）

**请求**
```
POST {baseUrl}/v1/messages
{
  model, max_tokens: 8096, temperature,
  system?,        // 单独字段，非 messages
  messages: [{ role, content: ContentBlock[] }]
}
```

**内容转换**

| NormalizedContent | Anthropic content block |
|---|---|
| `text` | `{ type: "text", text }` |
| `image_base64` | `{ type: "image", source: { type: "base64", media_type, data } }` |

**事件 → StreamChunk**

| SDK 事件 | yield |
|---|---|
| `content_block_delta` / `text_delta` | `{ type: "text" }` |
| `content_block_delta` / `thinking_delta` | `{ type: "thinking" }` |
| `message_stop` | `{ type: "done", stopReason: message.stop_reason }` |

---

### OpenAI / Custom（`openai` SDK，OpenAI-compatible）

**请求**
```
POST {baseUrl}/chat/completions
{
  model, temperature, stream: true,
  messages: [
    { role: "system", content: string }?,   // systemPrompt 拼进 messages 开头
    { role: "user"|"assistant", content }...
  ]
}
```

**内容转换**

- **assistant** 回历史：只取第一个 text，传纯字符串
- **user 无图**：纯字符串
- **user 有图**：`ChatCompletionContentPart[]`
  - `image_base64` → `{ type: "image_url", image_url: { url: "data:…;base64,…" } }`

**事件 → StreamChunk**

| chunk 字段 | yield |
|---|---|
| `delta.reasoning_content`（o1/o3 扩展字段） | `{ type: "thinking" }` |
| `delta.content` | `{ type: "text" }` |
| `choices[0].finish_reason` 出现 | `{ type: "done", stopReason }` |

---

### Google（`@google/generative-ai`）

**请求**（SDK 封装，非直接 HTTP）
```
client.getGenerativeModel({ model, systemInstruction? })
      .startChat({ history, generationConfig: { temperature } })
      .sendMessageStream(parts)
```

**history vs current**：`messages` 切片，`slice(0,-1)` 做 history，最后一条作为当前输入。

**内容转换**

| NormalizedContent | Gemini Part |
|---|---|
| `text` | `{ text }` |
| `image_base64` | `{ inlineData: { mimeType, data } }` |

role 映射：`"user"` → `"user"`，`"assistant"` → `"model"`

**事件 → StreamChunk**

| chunk 字段 | yield |
|---|---|
| `candidate.content.parts[].text` | `{ type: "text" }` |
| `candidate.content.parts[].inlineData` | `{ type: "image_generated", url: "data:…" }` |
| `candidate.finishReason` 出现 | `{ type: "done", stopReason }` |

---

## Tauri 代理（仅桌面端）

浏览器 SDK 的 `fetch` 被替换为 `tauriProxyFetch`，流程：

```
JS listen(sp_start / sp_chunk / sp_err / sp_done)
   ↓
invoke("stream_post", { eventId, url, headers, body })
   ↓  Rust 发 HTTP，逐 chunk emit
sp_start  → 构造 Response(ReadableStream)
sp_chunk  → enqueue(Uint8Array)
sp_done   → ctrl.close()
sp_err    → ctrl.error() + reject Promise
```

SDK 完全感知不到代理层，像普通 `fetch` 一样读取流。
