# 各模型流式输出完整示例

每个示例展示三层：原始 SSE/SDK 事件 → 代码处理逻辑 → 产出的 StreamChunk 序列。

---

## Anthropic（claude-sonnet-4-6）

### 场景 A：普通文本回复

**原始 SSE 事件流**
```
event: message_start
data: {"type":"message_start","message":{"id":"msg_01","type":"message","role":"assistant","content":[],"model":"claude-sonnet-4-6","stop_reason":null,...}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"你好"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"，有什么"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"可以帮你？"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},...}

event: message_stop
data: {"type":"message_stop","message":{"stop_reason":"end_turn",...}}
```

**产出 StreamChunk 序列**
```ts
{ type: "text", text: "你好" }
{ type: "text", text: "，有什么" }
{ type: "text", text: "可以帮你？" }
{ type: "done", stopReason: "end_turn" }
```

**注意**：`content_block_start`、`content_block_stop`、`message_delta` 被忽略，不产出 chunk。

---

### 场景 B：带 Extended Thinking 的回复

**原始 SSE 事件流**
```
event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"让我分析一下这道题..."}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"首先考虑边界条件"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: content_block_start
data: {"type":"content_block_start","index":1,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"答案是 42。"}}

event: content_block_stop
data: {"type":"content_block_stop","index":1}

event: message_stop
data: {"type":"message_stop","message":{"stop_reason":"end_turn"}}
```

**产出 StreamChunk 序列**
```ts
// thinking block 的 content_block_start 被忽略（空壳，内容在 delta 里）
{ type: "thinking", text: "让我分析一下这道题..." }
{ type: "thinking", text: "首先考虑边界条件" }
// text block 的 content_block_start 被忽略
{ type: "text", text: "答案是 42。" }
{ type: "done", stopReason: "end_turn" }
```

**最终 AssistantMessage.content**
```ts
[
  { type: "thinking", text: "让我分析一下这道题...首先考虑边界条件" },  // unshift 到开头，两次 thinking chunk 合并
  { type: "text",     text: "答案是 42。" },
]
```

---

## OpenAI（gpt-4o）

### 场景 A：普通文本回复

**原始 SSE 事件流**
```
data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"你好"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"，有什么"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"可以帮你？"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

**产出 StreamChunk 序列**
```ts
// 第一个 chunk：delta.content 为空字符串，if (delta.content) 为 false，跳过
{ type: "text", text: "你好" }
{ type: "text", text: "，有什么" }
{ type: "text", text: "可以帮你？" }
{ type: "done", stopReason: "stop" }
```

---

### 场景 B：o1/o3 带 reasoning_content（非标准扩展字段）

**原始 SSE 事件流**
```
data: {"choices":[{"delta":{"reasoning_content":"首先我需要理解题目..."},"finish_reason":null}]}

data: {"choices":[{"delta":{"reasoning_content":"然后推导公式"},"finish_reason":null}]}

data: {"choices":[{"delta":{"content":"结论：x = 5"},"finish_reason":null}]}

data: {"choices":[{"delta":{},"finish_reason":"stop"}]}
```

**产出 StreamChunk 序列**
```ts
{ type: "thinking", text: "首先我需要理解题目..." }
{ type: "thinking", text: "然后推导公式" }
{ type: "text",     text: "结论：x = 5" }
{ type: "done",     stopReason: "stop" }
```

**注意**：`reasoning_content` 是 o1/o3 的非标准字段，用类型断言读取：
```ts
const reasoning = (delta as { reasoning_content?: string }).reasoning_content;
```

---

### 场景 C：finish_reason 与 content 同帧出现

部分端点（如 Ollama）会在最后一帧同时带 content 和 finish_reason：

**原始 chunk**
```json
{"choices":[{"delta":{"content":"最后一段文字"},"finish_reason":"stop"}]}
```

**产出 StreamChunk 序列**
```ts
{ type: "text", text: "最后一段文字" }
{ type: "done", stopReason: "stop" }
// 同一个 chunk 先 yield text 再 yield done，顺序由代码保证
```

---

## Google（gemini-2.0-flash）

### 场景 A：普通文本回复

**SDK chunk 结构**（`GenerateContentResponse`）
```json
{
  "candidates": [{
    "content": {
      "role": "model",
      "parts": [{ "text": "你好" }]
    },
    "finishReason": null,
    "index": 0
  }]
}
```
```json
{
  "candidates": [{
    "content": { "role": "model", "parts": [{ "text": "，有什么可以帮你？" }] },
    "finishReason": null
  }]
}
```
```json
{
  "candidates": [{
    "content": { "role": "model", "parts": [] },
    "finishReason": "STOP"
  }]
}
```

**产出 StreamChunk 序列**
```ts
{ type: "text", text: "你好" }
{ type: "text", text: "，有什么可以帮你？" }
{ type: "done", stopReason: "STOP" }
```

---

### 场景 B：图片生成（Gemini 独有）

**SDK chunk 结构**
```json
{
  "candidates": [{
    "content": {
      "role": "model",
      "parts": [
        { "text": "这是生成的图片：" },
        {
          "inlineData": {
            "mimeType": "image/png",
            "data": "iVBORw0KGgoAAAANS..."
          }
        }
      ]
    },
    "finishReason": "STOP"
  }]
}
```

**产出 StreamChunk 序列**
```ts
{ type: "text",            text: "这是生成的图片：" }
{ type: "image_generated", url: "data:image/png;base64,iVBORw0KGgoAAAANS..." }
{ type: "done",            stopReason: "STOP" }
```

**最终 AssistantMessage.content**
```ts
[
  { type: "text",            text: "这是生成的图片：" },
  { type: "image_generated", url: "data:image/png;base64,…" },
]
```

---

### 场景 C：一个 chunk 含多个 candidate（极少见）

Gemini 支持 `candidateCount > 1`，当前代码会遍历所有 candidate：

**SDK chunk**
```json
{
  "candidates": [
    { "content": { "parts": [{ "text": "方案A" }] }, "finishReason": "STOP" },
    { "content": { "parts": [{ "text": "方案B" }] }, "finishReason": "STOP" }
  ]
}
```

**产出 StreamChunk 序列**
```ts
{ type: "text", text: "方案A" }
{ type: "done", stopReason: "STOP" }
{ type: "text", text: "方案B" }
{ type: "done", stopReason: "STOP" }
```

**注意**：当前 UI 只使用单个 candidate，多 candidate 的情况不会在实际配置中出现。

---

## 三者对比

| 维度 | Anthropic | OpenAI | Google |
|---|---|---|---|
| 协议 | SSE，Anthropic SDK 封装 | SSE，OpenAI SDK 封装 | SDK 封装（非原始 HTTP） |
| 文本 chunk 单位 | 单词级 delta | 单词级 delta | 句子级（SDK 可能合批） |
| thinking/reasoning | `thinking_delta` 事件 | `reasoning_content` 非标准字段 | 不支持 |
| 图片输出 | 不支持 | 不支持 | `inlineData` part |
| done 触发 | `message_stop` 事件 | `finish_reason` 字段出现 | `finishReason` 字段出现 |
| stop reason 典型值 | `"end_turn"` / `"max_tokens"` | `"stop"` / `"length"` | `"STOP"` / `"MAX_TOKENS"` |
