---
name: ollama
description: Local LLM inference with Ollama for running open-source models on your own hardware. Use when building offline AI features, local development without API keys, custom model fine-tuning, or privacy-sensitive inference. Triggers on Ollama, local LLM, llama, mistral, Modelfile, local inference, self-hosted AI.
version: 1.0.0
---

# Ollama

Ollama runs open-source LLMs locally. It manages model downloads, quantization, GPU acceleration, and serves a REST API compatible with the OpenAI format. Use it for local development, privacy-sensitive workloads, offline inference, and custom model experimentation.

## Installation

```bash
# Linux
curl -fsSL https://ollama.com/install.sh | sh

# macOS
brew install ollama

# Verify
ollama --version
```

Ollama runs as a background service. The API listens on `http://localhost:11434` by default.

## Model Management

```bash
# Pull a model
ollama pull llama3.1
ollama pull mistral
ollama pull codellama:13b
ollama pull nomic-embed-text    # Embedding model

# List downloaded models
ollama list

# Show model details (parameters, template, license)
ollama show llama3.1

# Remove a model
ollama rm mistral

# Copy/rename a model
ollama cp llama3.1 my-custom-llama
```

### Model Selection Guide

| Use Case | Recommended Model | Size | Notes |
|----------|------------------|------|-------|
| General chat/reasoning | `llama3.1` (8B) | ~4.7GB | Best general-purpose at this size |
| Code generation | `codellama:13b` | ~7.4GB | Or `deepseek-coder-v2` for newer option |
| Fast responses, low RAM | `phi3:mini` | ~2.3GB | Good quality-to-size ratio |
| Embeddings | `nomic-embed-text` | ~274MB | 768-dim vectors, good for RAG |
| Long context (128k) | `llama3.1` | ~4.7GB | Native 128k context window |
| Instruction following | `mistral` (7B) | ~4.1GB | Strong instruction adherence |
| Vision / multimodal | `llava` | ~4.7GB | Image + text understanding |

## REST API

Ollama serves an OpenAI-compatible API at `http://localhost:11434`.

### Generate (Completion)

```typescript
const response = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'llama3.1',
    prompt: 'Explain quicksort in one paragraph.',
    stream: false,
    options: {
      temperature: 0.7,
      top_p: 0.9,
      num_predict: 256,     // Max tokens to generate
    },
  }),
});

const data = await response.json();
console.log(data.response);
```

### Chat (Multi-Turn)

```typescript
const response = await fetch('http://localhost:11434/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'llama3.1',
    messages: [
      { role: 'system', content: 'You are a helpful coding assistant.' },
      { role: 'user', content: 'Write a TypeScript function to debounce.' },
    ],
    stream: false,
  }),
});

const data = await response.json();
console.log(data.message.content);
```

### Streaming

```typescript
const response = await fetch('http://localhost:11434/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'llama3.1',
    messages: [{ role: 'user', content: 'Tell me a story.' }],
    stream: true,
  }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = JSON.parse(decoder.decode(value));
  process.stdout.write(chunk.message.content);
}
```

### Embeddings

```typescript
const response = await fetch('http://localhost:11434/api/embed', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'nomic-embed-text',
    input: ['Document to embed', 'Another document'],
  }),
});

const data = await response.json();
// data.embeddings — array of float arrays
```

## Modelfile — Custom Models

Create custom models with system prompts, parameters, and adapters:

```dockerfile
# Modelfile
FROM llama3.1

# Set the system prompt
SYSTEM """
You are a senior TypeScript developer. You write clean, type-safe code.
You always use strict mode and prefer functional patterns.
"""

# Tune parameters
PARAMETER temperature 0.3
PARAMETER top_p 0.9
PARAMETER num_predict 1024
PARAMETER stop "<|eot_id|>"

# Set the template (Llama 3 format)
TEMPLATE """
{{- if .System }}<|start_header_id|>system<|end_header_id|>
{{ .System }}<|eot_id|>{{ end }}
<|start_header_id|>user<|end_header_id|>
{{ .Prompt }}<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
"""
```

```bash
# Build the custom model
ollama create ts-coder -f Modelfile

# Use it
ollama run ts-coder "Write a Zod schema for a user profile."
```

## GPU Configuration

Ollama uses GPU automatically when available. Check GPU status:

```bash
ollama ps  # Shows running models and GPU/CPU allocation
```

| Environment Variable | Purpose | Example |
|---------------------|---------|---------|
| `OLLAMA_NUM_GPU` | Number of GPU layers to offload | `35` (all layers) or `0` (CPU only) |
| `OLLAMA_GPU_MEMORY` | Max GPU memory to use | `8GiB` |
| `OLLAMA_HOST` | Bind address | `0.0.0.0:11434` (expose to network) |
| `OLLAMA_MODELS` | Custom model storage path | `/data/ollama/models` |
| `OLLAMA_MAX_LOADED_MODELS` | Max concurrent models in memory | `2` |
| `OLLAMA_KEEP_ALIVE` | How long to keep model loaded | `5m` (default), `0` (unload immediately) |

## Integration with Vercel AI SDK

```bash
pnpm add ai ollama-ai-provider
```

```typescript
import { generateText, streamText } from 'ai';
import { ollama } from 'ollama-ai-provider';

// Non-streaming
const { text } = await generateText({
  model: ollama('llama3.1'),
  prompt: 'Explain monads simply.',
});

// Streaming
const result = streamText({
  model: ollama('llama3.1'),
  messages: [
    { role: 'user', content: 'Write a haiku about TypeScript.' },
  ],
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

## Integration with LangChain

```bash
pnpm add @langchain/ollama
```

```typescript
import { ChatOllama } from '@langchain/ollama';
import { OllamaEmbeddings } from '@langchain/ollama';

// Chat
const llm = new ChatOllama({
  model: 'llama3.1',
  temperature: 0.7,
  baseUrl: 'http://localhost:11434',
});

const response = await llm.invoke('What is dependency injection?');
console.log(response.content);

// Embeddings
const embeddings = new OllamaEmbeddings({
  model: 'nomic-embed-text',
  baseUrl: 'http://localhost:11434',
});

const vectors = await embeddings.embedDocuments([
  'First document',
  'Second document',
]);
```

## Performance Tuning

| Setting | Impact | Recommendation |
|---------|--------|---------------|
| `num_ctx` (context length) | More context = more VRAM | Start at 4096, increase if needed |
| `num_batch` | Prompt processing batch size | Default 512 is usually fine |
| `num_gpu` | GPU layer offloading | Set to max layers your VRAM supports |
| `OLLAMA_KEEP_ALIVE` | Model load/unload frequency | `5m` for dev, `24h` for production |
| Quantization level | Quality vs speed vs VRAM | Q4_K_M for balanced, Q8_0 for quality |

### VRAM Requirements (Approximate)

| Model Size | Q4_K_M | Q8_0 | FP16 |
|-----------|--------|------|------|
| 7B | ~4GB | ~7GB | ~14GB |
| 13B | ~8GB | ~14GB | ~26GB |
| 70B | ~40GB | ~70GB | ~140GB |

## Deployment Patterns

### Docker

```bash
docker run -d --gpus all -v ollama-data:/root/.ollama \
  -p 11434:11434 --name ollama ollama/ollama

# Pull a model inside the container
docker exec ollama ollama pull llama3.1
```

### Behind a Reverse Proxy

```nginx
upstream ollama {
    server 127.0.0.1:11434;
}

server {
    listen 443 ssl;
    server_name ai.internal.example.com;

    location / {
        proxy_pass http://ollama;
        proxy_set_header Host $host;
        proxy_buffering off;           # Required for streaming
        proxy_read_timeout 300s;       # Long timeout for generation
    }
}
```

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|-------------|-------------|-----------------|
| Using Ollama in production without GPU | Slow inference, poor user experience | Ensure GPU is available or use a hosted API |
| Loading multiple large models simultaneously | VRAM exhaustion, OOM kills | Set `OLLAMA_MAX_LOADED_MODELS` to 1-2 |
| Not setting `stream: false` for batch jobs | Unnecessary chunked parsing overhead | Use `stream: false` when you need the full response |
| Hardcoding `localhost:11434` everywhere | Inflexible deployment | Use environment variable for base URL |
| Ignoring context window limits | Silent truncation, incoherent responses | Check `num_ctx` and summarize long inputs |
| Using FP16 when Q4_K_M suffices | 3x VRAM usage for marginal quality gain | Start with Q4_K_M, upgrade only if quality matters |
