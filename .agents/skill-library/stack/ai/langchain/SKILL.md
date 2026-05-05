---
name: langchain
description: |
  Build with LangChain JS/TS — chains, agents, RAG, tool calling, memory, and LCEL pipe syntax. Use when: building LLM-powered applications with chains or agents, implementing RAG (retrieval-augmented generation), creating custom tools, composing prompts with templates, managing conversation memory, parsing structured output, integrating vector stores, or tracing/evaluating with LangSmith.
version: 1.0.0
---

# LangChain (TypeScript)

**Status**: Production Ready
**Last Updated**: 2026-02-16
**Packages**: `langchain@0.3.x`, `@langchain/core@0.3.x`, `@langchain/openai`, `@langchain/anthropic`, `@langchain/community`

---

## Installation

```bash
# Core + OpenAI provider
pnpm add langchain @langchain/core @langchain/openai

# Additional providers as needed
pnpm add @langchain/anthropic    # Anthropic Claude
pnpm add @langchain/community    # Community integrations (Ollama, vector stores, etc.)
```

---

## Core Concepts

LangChain organizes LLM applications into composable primitives:

| Concept | Purpose |
|---|---|
| **Chat Models** | Interface to LLM providers (OpenAI, Anthropic, Ollama) |
| **Prompt Templates** | Reusable, parameterized prompt construction |
| **Output Parsers** | Transform raw LLM text into structured data |
| **Chains (LCEL)** | Compose components with pipe syntax |
| **Retrievers** | Fetch relevant documents for context |
| **Agents** | LLMs that decide which tools to call |
| **Tools** | Functions the LLM can invoke |
| **Memory** | Persist conversation history across calls |

---

## Chat Models

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";

// OpenAI
const gpt4o = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0.7,
  maxTokens: 1000,
  apiKey: process.env.OPENAI_API_KEY,
});

// Anthropic
const claude = new ChatAnthropic({
  model: "claude-sonnet-4-20250514",
  temperature: 0.7,
  maxTokens: 1000,
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Basic invocation
const response = await gpt4o.invoke("What is the capital of France?");
console.log(response.content); // "The capital of France is Paris."

// With message types
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";

const response = await gpt4o.invoke([
  new SystemMessage("You are a helpful assistant."),
  new HumanMessage("Explain quantum computing briefly."),
]);
```

---

## LangChain Expression Language (LCEL)

LCEL is the composition primitive. Components are piped together with `.pipe()`.

### Basic Chain

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful assistant that translates {input_language} to {output_language}."],
  ["human", "{input}"],
]);

const model = new ChatOpenAI({ model: "gpt-4o-mini" });
const parser = new StringOutputParser();

// Pipe: prompt -> model -> parser
const chain = prompt.pipe(model).pipe(parser);

const result = await chain.invoke({
  input_language: "English",
  output_language: "French",
  input: "Hello, how are you?",
});
// result: "Bonjour, comment allez-vous ?"
```

### RunnableSequence (Explicit)

```typescript
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";

const chain = RunnableSequence.from([
  {
    context: retriever, // Fetches relevant docs
    question: new RunnablePassthrough(), // Passes input through
  },
  prompt,
  model,
  parser,
]);
```

### Parallel Execution (RunnableParallel)

```typescript
import { RunnableParallel } from "@langchain/core/runnables";

const analysisChain = RunnableParallel.from({
  summary: summaryChain,
  sentiment: sentimentChain,
  keywords: keywordsChain,
});

const result = await analysisChain.invoke({ text: "Product review text..." });
// { summary: "...", sentiment: "positive", keywords: ["quality", "price"] }
```

### Branching (RunnableRouter)

```typescript
import { RunnableBranch } from "@langchain/core/runnables";

const routerChain = RunnableBranch.from([
  [(input) => input.topic === "technical", technicalChain],
  [(input) => input.topic === "billing", billingChain],
  generalChain, // Default
]);
```

---

## Prompt Templates

```typescript
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";

// Simple template
const simple = ChatPromptTemplate.fromMessages([
  ["system", "You are a {role} assistant."],
  ["human", "{question}"],
]);

// With conversation history
const withHistory = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful assistant."],
  new MessagesPlaceholder("chat_history"), // Injects previous messages
  ["human", "{input}"],
]);

// Usage
await withHistory.invoke({
  chat_history: [
    new HumanMessage("Hi"),
    new AIMessage("Hello! How can I help?"),
  ],
  input: "What did I just say?",
});
```

---

## Output Parsers

### String Parser

```typescript
import { StringOutputParser } from "@langchain/core/output_parsers";

const chain = prompt.pipe(model).pipe(new StringOutputParser());
```

### Structured Output with Zod

```typescript
import { z } from "zod";

const ReviewSchema = z.object({
  sentiment: z.enum(["positive", "negative", "neutral"]),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  key_points: z.array(z.string()),
});

// Method 1: withStructuredOutput (preferred — uses tool calling under the hood)
const structuredModel = model.withStructuredOutput(ReviewSchema);
const result = await structuredModel.invoke("Review: This product is amazing, great quality!");
// result: { sentiment: "positive", confidence: 0.95, summary: "...", key_points: [...] }

// Method 2: StructuredOutputParser (older approach, uses prompt instructions)
import { StructuredOutputParser } from "@langchain/core/output_parsers";

const parser = StructuredOutputParser.fromZodSchema(ReviewSchema);
const formatInstructions = parser.getFormatInstructions();
// Include formatInstructions in prompt, then parse response
```

### JSON Output Parser

```typescript
import { JsonOutputParser } from "@langchain/core/output_parsers";

const parser = new JsonOutputParser();
const chain = prompt.pipe(model).pipe(parser);
```

---

## Retrieval (RAG)

### Document Loading

```typescript
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { WebLoader } from "@langchain/community/document_loaders/web/cheerio";

// Load PDF
const pdfLoader = new PDFLoader("./docs/manual.pdf");
const pdfDocs = await pdfLoader.load();

// Split into chunks
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ["\n\n", "\n", ". ", " ", ""],
});
const chunks = await splitter.splitDocuments(pdfDocs);
```

### Vector Store

```typescript
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
// For production: use Pinecone, Supabase, Chroma, etc.

const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });

// Create store from documents
const vectorStore = await MemoryVectorStore.fromDocuments(chunks, embeddings);

// Create retriever
const retriever = vectorStore.asRetriever({
  k: 4, // Number of documents to retrieve
  searchType: "similarity", // or "mmr" for diversity
});

// Retrieve relevant docs
const relevantDocs = await retriever.invoke("How do I reset my password?");
```

### RAG Chain

```typescript
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { formatDocumentsAsString } from "langchain/util/document";

const ragPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `Answer the question based only on the following context. If the context
doesn't contain the answer, say "I don't have enough information to answer that."

Context: {context}`,
  ],
  ["human", "{question}"],
]);

const ragChain = RunnableSequence.from([
  {
    context: retriever.pipe(formatDocumentsAsString),
    question: new RunnablePassthrough(),
  },
  ragPrompt,
  model,
  new StringOutputParser(),
]);

const answer = await ragChain.invoke("How do I reset my password?");
```

---

## Agents

### Tool-Calling Agent (Recommended)

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { createToolCallingAgent, AgentExecutor } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// Define tools
const weatherTool = new DynamicStructuredTool({
  name: "get_weather",
  description: "Get current weather for a city",
  schema: z.object({
    city: z.string().describe("City name"),
    unit: z.enum(["celsius", "fahrenheit"]).default("celsius"),
  }),
  func: async ({ city, unit }) => {
    const data = await fetchWeather(city, unit);
    return JSON.stringify(data);
  },
});

const searchTool = new DynamicStructuredTool({
  name: "search_docs",
  description: "Search internal documentation",
  schema: z.object({
    query: z.string().describe("Search query"),
  }),
  func: async ({ query }) => {
    const results = await searchDocumentation(query);
    return JSON.stringify(results);
  },
});

// Create agent
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful assistant with access to tools."],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad"),
]);

const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0 });
const tools = [weatherTool, searchTool];

const agent = createToolCallingAgent({ llm: model, tools, prompt });
const executor = new AgentExecutor({ agent, tools, verbose: true });

const result = await executor.invoke({
  input: "What's the weather in Tokyo?",
  chat_history: [],
});
```

---

## Memory

```typescript
import { BufferMemory } from "langchain/memory";
import { ConversationChain } from "langchain/chains";

// Buffer memory — stores all messages
const memory = new BufferMemory({
  memoryKey: "chat_history",
  returnMessages: true, // Return as Message objects (not string)
});

// With LCEL — manage history manually (recommended)
const messages: BaseMessage[] = [];

async function chat(userInput: string) {
  messages.push(new HumanMessage(userInput));

  const response = await chain.invoke({
    chat_history: messages,
    input: userInput,
  });

  messages.push(new AIMessage(response));
  return response;
}
```

### Summary Memory (For Long Conversations)

```typescript
import { ConversationSummaryMemory } from "langchain/memory";

const memory = new ConversationSummaryMemory({
  llm: new ChatOpenAI({ model: "gpt-4o-mini" }),
  memoryKey: "chat_history",
  returnMessages: true,
});
// Summarizes older messages to stay within token limits
```

---

## Callbacks and Streaming

```typescript
// Streaming with LCEL
const stream = await chain.stream({ question: "Explain gravity" });

for await (const chunk of stream) {
  process.stdout.write(chunk); // Each chunk is a string token
}

// Callbacks for observability
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";

class LoggingHandler extends BaseCallbackHandler {
  name = "logging";

  async handleLLMStart(llm: any, prompts: string[]) {
    console.log("LLM started:", prompts.length, "prompts");
  }

  async handleLLMEnd(output: any) {
    console.log("LLM finished. Tokens:", output.llmOutput?.tokenUsage);
  }

  async handleToolStart(tool: any, input: string) {
    console.log(`Tool ${tool.name} called with:`, input);
  }
}

const result = await chain.invoke(input, {
  callbacks: [new LoggingHandler()],
});
```

---

## LangSmith Tracing

```bash
# Environment variables
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY="ls__..."
LANGCHAIN_PROJECT="my-project"
```

When env vars are set, all LangChain calls are automatically traced. No code changes needed.

```typescript
// Custom run metadata
const result = await chain.invoke(input, {
  runName: "customer-support-query",
  metadata: { userId: "123", sessionId: "abc" },
  tags: ["production", "support"],
});
```

---

## Common Patterns

### Conversational RAG

```typescript
// Rephrase question using chat history, then retrieve, then answer
const rephrasePrompt = ChatPromptTemplate.fromMessages([
  ["system", "Given the chat history, rephrase the follow-up question as a standalone question."],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
]);

const rephraseChain = rephrasePrompt.pipe(model).pipe(new StringOutputParser());

const conversationalRagChain = RunnableSequence.from([
  {
    context: rephraseChain.pipe(retriever).pipe(formatDocumentsAsString),
    question: rephraseChain,
    chat_history: (input: any) => input.chat_history,
  },
  ragPrompt,
  model,
  new StringOutputParser(),
]);
```

### Fallback Chains

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";

const primary = new ChatOpenAI({ model: "gpt-4o" });
const fallback = new ChatAnthropic({ model: "claude-sonnet-4-20250514" });

// If primary fails, automatically try fallback
const resilientModel = primary.withFallbacks({ fallbacks: [fallback] });
```

---

## Anti-Patterns

| Anti-Pattern | Why It Breaks | Correct Approach |
|---|---|---|
| Over-engineering with chains when a single prompt works | Added complexity, more failure points | Start simple, add chains only when needed |
| Ignoring token limits in RAG context | Exceeds context window, errors or truncation | Track token count, truncate context intelligently |
| Using BufferMemory for long conversations | Memory grows unbounded, exceeds context | Use ConversationSummaryMemory or sliding window |
| Not validating tool outputs | LLM hallucinates tool results | Validate with Zod, handle parse errors |
| Chaining without error handling | One failure cascades to entire chain | Add `.withFallbacks()` or try/catch at chain level |
| Storing API keys in chain config | Key leakage in serialized chains | Always use environment variables |
| Using synchronous document loading in request handlers | Blocks event loop, slow responses | Pre-index documents, load async at startup |
| Not setting temperature to 0 for agents | Non-deterministic tool selection | Use `temperature: 0` for agents and structured tasks |
| Embedding large documents without splitting | Poor retrieval quality, token waste | Use RecursiveCharacterTextSplitter with overlap |
| Building custom logic that LCEL handles natively | Reinventing the wheel | Check LCEL primitives (RunnableBranch, Parallel, etc.) |

---

**Last verified**: 2026-02-16 | **Skill version**: 1.0.0
