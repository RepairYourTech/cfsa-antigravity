---
name: openai-sdk
description: |
  Build with the OpenAI SDK — chat completions, streaming, function/tool calling, structured outputs, vision, embeddings, and moderation. Use when: integrating OpenAI models (GPT-4o, o1, o3-mini), implementing streaming chat, using function calling or tool use, generating structured JSON output, handling images with vision, creating embeddings, managing rate limits and retries, or selecting the right model for cost/quality tradeoffs.
version: 1.0.0
---

# OpenAI SDK

**Status**: Production Ready
**Last Updated**: 2026-02-16
**Package**: `openai@4.x`

---

## Setup and Configuration

```bash
pnpm add openai
```

```typescript
// src/lib/openai.ts
import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Required — never expose in client bundle
  organization: process.env.OPENAI_ORG_ID, // Optional
  // baseURL: "https://custom-proxy.example.com/v1", // For proxies/Azure
  timeout: 60_000, // 60s timeout
  maxRetries: 3, // Auto-retry on rate limits / server errors
});
```

**Environment variables — server-side only:**
```bash
OPENAI_API_KEY="sk-..."
OPENAI_ORG_ID="org-..."  # Optional
```

---

## Chat Completions

### Basic Request

```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Explain quantum computing in one paragraph." },
  ],
  temperature: 0.7, // 0 = deterministic, 2 = creative
  max_tokens: 500,
});

const answer = response.choices[0].message.content;
const usage = response.usage; // { prompt_tokens, completion_tokens, total_tokens }
```

### Message Roles

```typescript
type Message =
  | { role: "system"; content: string }    // Sets behavior, personality, constraints
  | { role: "user"; content: string }      // User input
  | { role: "assistant"; content: string } // Previous model responses (for context)
  | { role: "tool"; content: string; tool_call_id: string }; // Tool call results
```

---

## Streaming Responses

### Basic Streaming

```typescript
const stream = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Write a poem about coding." }],
  stream: true,
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    process.stdout.write(content); // Or send via SSE to client
  }
}
```

### SSE to Browser (Next.js API Route)

```typescript
// src/app/api/chat/route.ts
import { openai } from "@/lib/openai";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    stream: true,
  });

  // Convert to ReadableStream for Response
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
        }
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

---

## Function Calling / Tool Use

### Defining Tools

```typescript
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get the current weather for a location",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "City and state, e.g. 'San Francisco, CA'" },
          unit: { type: "string", enum: ["celsius", "fahrenheit"], description: "Temperature unit" },
        },
        required: ["location"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_database",
      description: "Search the product database by query",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          category: { type: "string", enum: ["electronics", "clothing", "food"] },
          max_results: { type: "number" },
        },
        required: ["query"],
      },
    },
  },
];
```

### Tool Call Loop

```typescript
async function chatWithTools(userMessage: string) {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: "You are a helpful assistant with access to tools." },
    { role: "user", content: userMessage },
  ];

  let response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    tools,
    tool_choice: "auto", // "auto" | "required" | "none" | { type: "function", function: { name: "..." } }
  });

  // Process tool calls in a loop until the model stops calling tools
  while (response.choices[0].finish_reason === "tool_calls") {
    const toolCalls = response.choices[0].message.tool_calls!;
    messages.push(response.choices[0].message); // Include assistant's tool call message

    for (const toolCall of toolCalls) {
      const args = JSON.parse(toolCall.function.arguments);
      let result: string;

      switch (toolCall.function.name) {
        case "get_weather":
          result = JSON.stringify(await getWeather(args.location, args.unit));
          break;
        case "search_database":
          result = JSON.stringify(await searchDatabase(args.query, args.category));
          break;
        default:
          result = JSON.stringify({ error: "Unknown function" });
      }

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }

    response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools,
    });
  }

  return response.choices[0].message.content;
}
```

---

## Structured Outputs

### JSON Mode

```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    {
      role: "system",
      content: "Extract the product details. Respond in JSON with fields: name, price, category.",
    },
    { role: "user", content: "The new iPhone 16 Pro costs $999 in the electronics category." },
  ],
  response_format: { type: "json_object" },
});

const product = JSON.parse(response.choices[0].message.content!);
```

### Structured Outputs with JSON Schema (Guaranteed Shape)

```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Extract: The iPhone 16 Pro is $999, electronics." }],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "product",
      strict: true,
      schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          price: { type: "number" },
          category: { type: "string", enum: ["electronics", "clothing", "food"] },
        },
        required: ["name", "price", "category"],
        additionalProperties: false,
      },
    },
  },
});
```

### Structured Outputs with Zod (SDK Helper)

```typescript
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const ProductSchema = z.object({
  name: z.string(),
  price: z.number(),
  category: z.enum(["electronics", "clothing", "food"]),
  features: z.array(z.string()),
});

const response = await openai.beta.chat.completions.parse({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Extract: iPhone 16 Pro, $999, electronics, A18 chip, titanium." }],
  response_format: zodResponseFormat(ProductSchema, "product"),
});

const product = response.choices[0].message.parsed; // Typed as z.infer<typeof ProductSchema>
```

---

## Vision (Image Inputs)

```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "What's in this image?" },
        {
          type: "image_url",
          image_url: {
            url: "https://example.com/photo.jpg",
            detail: "auto", // "low" (85 tokens) | "high" (detailed, more tokens) | "auto"
          },
        },
      ],
    },
  ],
  max_tokens: 300,
});

// Base64 image
{
  type: "image_url",
  image_url: {
    url: `data:image/jpeg;base64,${base64EncodedImage}`,
  },
}
```

---

## Embeddings

```typescript
const response = await openai.embeddings.create({
  model: "text-embedding-3-small", // or "text-embedding-3-large"
  input: "The quick brown fox jumps over the lazy dog",
  dimensions: 512, // Optional: reduce dimensions (only for v3 models)
});

const embedding = response.data[0].embedding; // number[] of length 512

// Batch embeddings
const batchResponse = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: ["First document", "Second document", "Third document"],
});

// Cosine similarity for search
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return dot / (magA * magB);
}
```

---

## Moderation API

```typescript
const moderation = await openai.moderations.create({
  input: userMessage,
  model: "omni-moderation-latest",
});

const result = moderation.results[0];
if (result.flagged) {
  console.log("Flagged categories:", result.categories);
  // { hate: false, sexual: true, violence: false, ... }
  throw new Error("Content violates usage policy");
}
```

---

## Error Handling

```typescript
import OpenAI from "openai";

try {
  const response = await openai.chat.completions.create({ /* ... */ });
} catch (error) {
  if (error instanceof OpenAI.APIError) {
    switch (error.status) {
      case 400:
        console.error("Bad request:", error.message);
        break;
      case 401:
        console.error("Invalid API key");
        break;
      case 429:
        // Rate limited — SDK retries automatically (maxRetries)
        console.error("Rate limited. Retry after:", error.headers?.["retry-after"]);
        break;
      case 500:
      case 503:
        console.error("OpenAI server error — retry");
        break;
    }
  } else if (error instanceof OpenAI.APIConnectionError) {
    console.error("Network error — cannot reach OpenAI");
  } else if (error instanceof OpenAI.RateLimitError) {
    console.error("Rate limit exceeded");
  }
  throw error;
}
```

---

## Model Selection Guide

| Model | Best For | Speed | Cost | Context |
|---|---|---|---|---|
| `gpt-4o` | General purpose, tool use, vision, quality | Fast | Medium | 128K |
| `gpt-4o-mini` | Cost-sensitive tasks, high volume | Fastest | Low | 128K |
| `o1` | Complex reasoning, math, code | Slow | High | 200K |
| `o3-mini` | Reasoning at lower cost | Medium | Medium | 200K |

**Decision framework:**
- Default to `gpt-4o-mini` for most tasks (cost-effective, fast)
- Use `gpt-4o` when quality matters (user-facing, complex tool use)
- Use `o1` / `o3-mini` for multi-step reasoning, math proofs, code generation
- Use `text-embedding-3-small` for embeddings (unless retrieval quality critical, then `large`)

---

## Token Counting (Pre-Request)

```typescript
// Use tiktoken for accurate pre-request token counting
import { encoding_for_model } from "tiktoken";

const enc = encoding_for_model("gpt-4o");
const tokens = enc.encode("Your message here");
console.log(`Token count: ${tokens.length}`);
enc.free(); // Clean up WASM memory

// Rough estimate without tiktoken: ~4 chars per token for English
const roughEstimate = Math.ceil(text.length / 4);
```

---

## Streaming with Function Calls

```typescript
const stream = await openai.chat.completions.create({
  model: "gpt-4o",
  messages,
  tools,
  stream: true,
});

let currentToolCall: { id: string; name: string; arguments: string } | null = null;

for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta;

  // Streaming content
  if (delta?.content) {
    process.stdout.write(delta.content);
  }

  // Streaming tool call (arguments arrive in chunks)
  if (delta?.tool_calls) {
    for (const tc of delta.tool_calls) {
      if (tc.id) {
        // New tool call started
        currentToolCall = { id: tc.id, name: tc.function!.name!, arguments: "" };
      }
      if (tc.function?.arguments) {
        currentToolCall!.arguments += tc.function.arguments;
      }
    }
  }

  // Finish reason indicates tool call complete
  if (chunk.choices[0]?.finish_reason === "tool_calls" && currentToolCall) {
    const args = JSON.parse(currentToolCall.arguments);
    // Execute the tool and continue the conversation
  }
}
```

---

## Prompt Engineering Patterns

### System Prompt Structure

```typescript
const systemPrompt = `You are a customer support agent for Acme Corp.

## Your Role
- Answer product questions accurately
- Escalate billing issues to human agents
- Never make up product features

## Constraints
- Respond in 2-3 sentences maximum
- If you don't know, say "I'll connect you with a specialist"
- Never share internal pricing or roadmap

## Output Format
Respond in plain text. No markdown unless the user asks for structured data.`;
```

### Few-Shot Examples

```typescript
const messages = [
  { role: "system", content: "Classify customer feedback as positive, negative, or neutral." },
  { role: "user", content: "The product is amazing, I love it!" },
  { role: "assistant", content: "positive" },
  { role: "user", content: "It broke after two days." },
  { role: "assistant", content: "negative" },
  { role: "user", content: "It arrived on time." },
  { role: "assistant", content: "neutral" },
  { role: "user", content: actualFeedback }, // Real input
];
```

---

## Anti-Patterns

| Anti-Pattern | Why It Breaks | Correct Approach |
|---|---|---|
| Exposing API key in client-side code | Key theft, billing abuse | Server-side only, proxy API calls |
| No timeout configuration | Hung requests, resource exhaustion | Set `timeout: 60_000` on client |
| Ignoring `finish_reason` | Missing truncated responses | Check for `"length"` and handle |
| Hardcoded model names everywhere | Painful model upgrades | Centralize model config |
| Not validating tool call arguments | JSON parse errors, wrong types | Parse with Zod, handle malformed args |
| Sending PII in prompts | Privacy violations | Strip PII before sending to API |
| No rate limit handling | 429 errors crash the app | Use SDK's built-in `maxRetries` |
| Using `max_tokens` too low | Truncated, useless responses | Set based on expected output length |
| Streaming without error handling | Silent failures, stuck UI | Catch errors in stream loop |
| Not tracking token usage | Surprise bills | Log `response.usage` per request |

---

**Last verified**: 2026-02-16 | **Skill version**: 1.0.0
