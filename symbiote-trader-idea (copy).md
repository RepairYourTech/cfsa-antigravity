# Trading & OMS Architecture — Authoritative Section (Phase 12)

This section consolidates and supersedes scattered Trading/OMS content below. It is the single source of truth for execution architecture. Detailed rationale and examples remain consistent with this summary.

## Goals

- Deterministic, idempotent OMS with recoverable state and auditability
- High‑fidelity Paper Trading Engine (LOB, latency/slippage/fees, deterministic mode)
- Pluggable exchange connectors (REST+WS) with capability matrix and normalization
- Pre‑trade risk guardrails and kill switch; paper‑first; live gated by double‑confirm
- Rich telemetry (metrics/traces/logs) with correlation IDs

## Components & Boundaries

- OMS Core: lifecycle, idempotency (client_order_id), reconciliation, audit
- Risk Service: pre‑trade checks (exposure, notional, leverage, allowlists)
- Portfolio: positions, PnL, allocations
- Paper Engine: LOB + fills + fee/slippage/latency models
- Exchange Connectors: Binance, Coinbase, Kraken, Alpaca, OANDA (phased)
- Orchestration (LangGraph): signal → risk → order → route → monitor
- Event Bus: Redis pub/sub; WS multiplexer for clients
- Secrets Vault: encrypted API keys with rotation and masked outputs

## Data Model (condensed)

- Order(id, client_order_id, user_id, strategy_id, venue/exchange_account_id, symbol, side, type, tif, qty, price, stop_price, status, timestamps)
- Execution/Fill(id, order_id, qty, price, fee, liquidity_flag, ts)
- Position(id, user_id, strategy_id, venue, symbol, qty, avg_price, realized/unrealized PnL, status)
- AuditEvent(id, type, payload, correlation_id, ts)
- APIKey(id, user_id, venue, enc_blob, scopes, rotated_at)

## Order Lifecycle & Idempotency

- States: Pending → Validating → Submitted → Open → PartiallyFilled → Filled → Cancelling → Cancelled → Rejected → Expired
- Rules: all mutations keyed by client_order_id; reconcile on reconnect; cancel/replace semantics
- Overfill protection: dedup late/duplicate fills; strict quantity accounting

## APIs (minimal JSON contracts)

- POST /api/v1/orders: { symbol, venue, side, type, tif, qty, price?, client_order_id }
- GET /api/v1/{orders,positions,executions,accounts}
- WS topics: orders, executions, positions, prices, health; include correlation_id and timestamps
- Secrets: POST/GET/DELETE /api/v1/secrets/keys (masked retrieval; rotation)

## Advanced Order Engine (Synthetic vs Native)

- Trigger types: stop, take_profit, trailing
- Linked orders: OCO groups and Bracket (parent + TP/SL children)
- Default policy: Use Synthetic across venues for cross-exchange consistency; enable Native per-venue behind feature flags once parity/error handling are validated.

Lifecycle (Synthetic)
- Client requests advanced order (e.g., limit+stop or bracket) → OMS persists with trigger_status="armed"
- SyntheticOrderEngine evaluates triggers vs live prices; on trigger, issues child order(s) and updates parent/children state
- OCO: when one child triggers, siblings are auto-cancelled with audit events
- Trailing: maintains local peak/trough, computes dynamic stop; triggers on configured drawdown

WebSocket events
- Topic: oms.orders → events {event: armed|triggered|cancelled|filled|replaced, order_id, parent_order_id?, group_id?}

Persistence fields (delta)
- Orders include: trigger_type, trigger_status, stop_price, take_profit_price, trailing_amount, trailing_percent, group_id, parent_order_id

## Advanced Orders: API extensions (excerpts)

OrderCreate (additional fields)

```json
{
  "trigger_type": "stop|take_profit|trailing|null",
  "stop_price": 2000.0,
  "take_profit_price": 2100.0,
  "trailing_amount": 25.0,
  "trailing_percent": 0.01,
  "group_id": "oco_grp_123",
  "parent_order_id": null
}
```

OrderResponse (additional fields)

```json
{
  "trigger_type": "stop",
  "trigger_status": "armed",
  "parent_order_id": null,
  "group_id": "oco_grp_123",
  "stop_price": 2000.0,
  "take_profit_price": null,
  "trailing_amount": null,
  "trailing_percent": null
}
```

## Exchange Capability Matrix (Native Advanced Orders)

| Venue    | Native Stop | Native Take-Profit | Native OCO | Native Trailing | Notes                                   |
|----------|-------------|--------------------|------------|-----------------|-----------------------------------------|
| Binance  | Yes         | Partial (via OCO/TP/SL) | Yes    | Futures only    | Symbol/market constraints apply         |
| Coinbase | Limited     | Limited            | No         | No              | Prefer Synthetic for consistency        |
| Kraken   | Yes         | Yes (conditional close) | Partial | Limited         | Normalize precision/lot rules           |

Policy
- Use Synthetic by default; progressively enable Native per-venue behind flags when parity verified.

## Operations Playbook (Week 5 features)

- Migrations: run `alembic upgrade head` inside Docker backend container (hostname `postgres` resolves via Compose)
- Synthetic Engine: starts on app lifespan; monitors armed orders and emits WS events
- Reconciliation: periodic polling batches DB writes for fills/updates; safe on restart (idempotent)
- Health & Metrics: track OMS latency, trigger evaluation rate, reconciliation CPU, DB query timings
- Rollback plan: disable Native flags and rely on Synthetic; pause engine via feature flag if necessary

## Deployment Readiness Gates (delta)

- ENV validation: reject default JWT secret; validate DB/Redis URLs; migrations current
- Observability: traces for trigger decisions and reconciliation batches; counters for trigger events by venue/type

## Paper Trading Engine

- Matching: price–time priority; partial fills; queue position estimation
- Latency: distribution‑based; calendars/halts; maker/taker probability
- Costs: maker/taker fee tiers; percentage/depth‑based slippage; deterministic test mode

## Exchange Integrations

- Capability matrix: order types, TIFs, precision/lot/minNotional, rate limits
- Normalization: balances/positions/orders/fills; snapshot+delta with backfill on resume
- Failover: primary→secondary routing where safe

## Risk & Guardrails

- Limits: max position, per‑order notional, leverage/margin, exposure caps
- Envelopes: venue/asset allowlists, daily loss caps, max trades/costs/day
- Circuit breakers & kill switch; flatten exposures; pause/resume

## Security Gates (pre‑live)

- JWT_SECRET_KEY must be strong and non‑default (reject on startup)
- Alembic migrations for schema; no ad‑hoc DDL
- Environment validation (DB/Redis/JWT/Encryption key) fail‑fast
- Encrypted API key vault with rotation; logs redact secrets
- Paper‑first defaults; live mode requires double confirm (+2FA per policy)

## Performance & Observability

- SLOs: signal→decision <60s; place <10s p95; OMS median <50ms
- Metrics (Prometheus): orders/fills/errors/latency; traces (OTel) with correlation IDs

## Testing Strategy

- Unit: OMS transitions, idempotency, risk checks, fee/slippage math
- Integration: paper fills (partial/late), cancel/replace, reconnect/reconcile, connector mocks
- E2E: signal → order → execution → position updates → analytics; WS streaming

Note: Venue priority for Phase 12 — Binance, Coinbase, Kraken (crypto), Alpaca (equities), OANDA (forex).
# SymbioteTrader - AI-Powered Algorithmic Trading Platform


## Table of Contents

- [Trading \& OMS Architecture — Authoritative Section (Phase 12)](#trading--oms-architecture--authoritative-section-phase-12)
  - [Goals](#goals)
  - [Components \& Boundaries](#components--boundaries)
  - [Data Model (condensed)](#data-model-condensed)
  - [Order Lifecycle \& Idempotency](#order-lifecycle--idempotency)
  - [APIs (minimal JSON contracts)](#apis-minimal-json-contracts)
  - [Advanced Order Engine (Synthetic vs Native)](#advanced-order-engine-synthetic-vs-native)
  - [Advanced Orders: API extensions (excerpts)](#advanced-orders-api-extensions-excerpts)
  - [Exchange Capability Matrix (Native Advanced Orders)](#exchange-capability-matrix-native-advanced-orders)
  - [Operations Playbook (Week 5 features)](#operations-playbook-week-5-features)
  - [Deployment Readiness Gates (delta)](#deployment-readiness-gates-delta)
  - [Paper Trading Engine](#paper-trading-engine)
  - [Exchange Integrations](#exchange-integrations)
  - [Risk \& Guardrails](#risk--guardrails)
  - [Security Gates (pre‑live)](#security-gates-prelive)
  - [Performance \& Observability](#performance--observability)
  - [Testing Strategy](#testing-strategy)
- [SymbioteTrader - AI-Powered Algorithmic Trading Platform](#symbiotetrader---ai-powered-algorithmic-trading-platform)
  - [Table of Contents](#table-of-contents)
  - [PART 1: VISION \& PHILOSOPHY](#part-1-vision--philosophy)
    - [1. Executive Summary](#1-executive-summary)
    - [Critical Design Principle](#critical-design-principle)
    - [Key Features at a Glance](#key-features-at-a-glance)
    - [2. Vision and Value](#2-vision-and-value)
    - [3. Target User and Market](#3-target-user-and-market)
    - [4. Core Design Philosophy: Progressive Mastery](#4-core-design-philosophy-progressive-mastery)
    - [The Pattern Across All Dimensions](#the-pattern-across-all-dimensions)
    - [Why This Matters](#why-this-matters)
    - [The Result](#the-result)
    - [5. Feature Ecosystem \& Cross-Feature Intelligence](#5-feature-ecosystem--cross-feature-intelligence)
    - [Core Concept: An Ecosystem, Not Separate Apps](#core-concept-an-ecosystem-not-separate-apps)
    - [Eight Ecosystem Principles](#eight-ecosystem-principles)
    - [Twelve Ecosystem Categories](#twelve-ecosystem-categories)
      - [1. Strategy Lifecycle Ecosystem](#1-strategy-lifecycle-ecosystem)
      - [2. Risk Intelligence Ecosystem](#2-risk-intelligence-ecosystem)
      - [3. Execution Intelligence Ecosystem](#3-execution-intelligence-ecosystem)
      - [4. Market Context Intelligence](#4-market-context-intelligence)
      - [5. Learning \& Adaptation Ecosystem](#5-learning--adaptation-ecosystem)
      - [6. Signal Intelligence Ecosystem](#6-signal-intelligence-ecosystem)
      - [7. Performance Optimization Ecosystem](#7-performance-optimization-ecosystem)
      - [8. AI Agent Ecosystem](#8-ai-agent-ecosystem)
      - [9. User Behavior Learning](#9-user-behavior-learning)
      - [10. Data Flow Intelligence](#10-data-flow-intelligence)
      - [11. Workflow Automation](#11-workflow-automation)
      - [12. Cross-Feature Feedback Loops](#12-cross-feature-feedback-loops)
    - [Visual: Major Data Flows](#visual-major-data-flows)
    - [Key Takeaway: The Ecosystem Effect](#key-takeaway-the-ecosystem-effect)
  - [PART 2: CORE CAPABILITIES](#part-2-core-capabilities)
    - [6. Core Capabilities](#6-core-capabilities)
    - [Trading Engine](#trading-engine)
      - [Multi-Exchange Support](#multi-exchange-support)
      - [Strategy Framework](#strategy-framework)
        - [Strategy SDK \& Three-Tier Creation System](#strategy-sdk--three-tier-creation-system)
          - [Tier 1: Visual Strategy Builder (Drag-and-Drop)](#tier-1-visual-strategy-builder-drag-and-drop)
          - [Tier 2: YAML Format (Declarative Low-Code)](#tier-2-yaml-format-declarative-low-code)
          - [Tier 3: Python SDK (Full Programmatic Control)](#tier-3-python-sdk-full-programmatic-control)
          - [Strategy Instrumentation \& Telemetry Architecture](#strategy-instrumentation--telemetry-architecture)
        - [Additional Strategy Families \& Semantics](#additional-strategy-families--semantics)
      - [Technical Indicators Coverage](#technical-indicators-coverage)
      - [Execution Management](#execution-management)
      - [Advanced Trading Features](#advanced-trading-features)
      - [Backtesting \& Paper Trading](#backtesting--paper-trading)
        - [Overfitting Detection \& Validation Suite](#overfitting-detection--validation-suite)
      - [Real-Time Market Data Pipeline](#real-time-market-data-pipeline)
      - [Multi-Asset Coverage](#multi-asset-coverage)
    - [Analytics \& Reporting](#analytics--reporting)
      - [Performance Dashboard](#performance-dashboard)
      - [Strategy Ranking \& Recommendation](#strategy-ranking--recommendation)
        - [Scoring formula sketch](#scoring-formula-sketch)
        - [Complete Formula Specifications](#complete-formula-specifications)
        - [Default feature sets (by asset class)](#default-feature-sets-by-asset-class)
        - [API and Events](#api-and-events)
        - [Regime Detector (microâ€‘spec)](#regime-detector-microâspec)
      - [Advanced Analytics](#advanced-analytics)
      - [Compliance Reporting](#compliance-reporting)
      - [Tax Reporting \& Accounting](#tax-reporting--accounting)
        - [Cost Basis Tracking Methods](#cost-basis-tracking-methods)
        - [Tax Forms Generation](#tax-forms-generation)
        - [Crypto-Specific Tax Events](#crypto-specific-tax-events)
        - [Accounting Methods](#accounting-methods)
        - [Multi-Jurisdiction Support](#multi-jurisdiction-support)
        - [Tax Software Integration](#tax-software-integration)
        - [Tax Reporting Dashboard](#tax-reporting-dashboard)
      - [Strategy Intelligence \& Execution Suite](#strategy-intelligence--execution-suite)
        - [1. Execution Cost Simulator](#1-execution-cost-simulator)
        - [2. Post-Trade Analysis \& Learning](#2-post-trade-analysis--learning)
        - [3. What-If Scenario Planning](#3-what-if-scenario-planning)
        - [4. Strategy Health Monitoring](#4-strategy-health-monitoring)
        - [5. Signal Hub \& Attribution](#5-signal-hub--attribution)
        - [6. Execution Quality Analysis](#6-execution-quality-analysis)
        - [7. Portfolio Correlation \& Risk Analysis](#7-portfolio-correlation--risk-analysis)
        - [8. Trade Journal \& Annotations](#8-trade-journal--annotations)
        - [9. Strategy Lifecycle \& Version Control](#9-strategy-lifecycle--version-control)
      - [Benchmarking \& Testing](#benchmarking--testing)
    - [Notifications \& Alerts System](#notifications--alerts-system)
      - [Alert Types](#alert-types)
      - [Alert Conditions](#alert-conditions)
      - [Alert Delivery Methods](#alert-delivery-methods)
      - [Alert Priority Levels](#alert-priority-levels)
      - [Alert Frequency Limits](#alert-frequency-limits)
      - [Alert Management UI](#alert-management-ui)
    - [Export \& Import Features](#export--import-features)
      - [Export Features](#export-features)
      - [Import Features](#import-features)
    - [Collaboration Features (Future)](#collaboration-features-future)
    - [7. AI Integration](#7-ai-integration)
    - [Intelligence Backbone: Self-Improving Platform](#intelligence-backbone-self-improving-platform)
    - [Agent Orchestration (Hybrid: PydanticAI + LangGraph)](#agent-orchestration-hybrid-pydanticai--langgraph)
        - [Complete Decision Criteria](#complete-decision-criteria)
      - [AI Orchestration Sequence Diagram](#ai-orchestration-sequence-diagram)
    - [AI Runtime Orchestration](#ai-runtime-orchestration)
      - [Provider Registry Schema (incl. context budgets)](#provider-registry-schema-incl-context-budgets)
      - [Tokenizer \& Chunking Policy](#tokenizer--chunking-policy)
      - [Context Manager Agent](#context-manager-agent)
      - [Event Triggers Matrix (routing defaults)](#event-triggers-matrix-routing-defaults)
      - [Fallback Trees \& SLA-aware Routing](#fallback-trees--sla-aware-routing)
    - [Ask-vs-Command Gate (AVC Gate)](#ask-vs-command-gate-avc-gate)
      - [Context Budget Policies (Appendix)](#context-budget-policies-appendix)
    - [Confirmation Card (UI micro-spec)](#confirmation-card-ui-micro-spec)
    - [Jobs API (handoff between PydanticAI and LangGraph)](#jobs-api-handoff-between-pydanticai-and-langgraph)
    - [Conversational Trading Assistant](#conversational-trading-assistant)
    - [AI Memory System](#ai-memory-system)
    - [Agentic Graph RAG (Hybrid Qdrant + Neo4j)](#agentic-graph-rag-hybrid-qdrant--neo4j)
    - [AI Functions](#ai-functions)
    - [AI Strategy Lab \& Autonomous Optimization](#ai-strategy-lab--autonomous-optimization)
      - [Core Concept: User-Initiated, AI-Executed](#core-concept-user-initiated-ai-executed)
      - [AI Strategy Lab Workflow](#ai-strategy-lab-workflow)
      - [Experiment Dashboard](#experiment-dashboard)
      - [Adaptive Strategies (Rule-Based)](#adaptive-strategies-rule-based)
      - [Regulatory Framing](#regulatory-framing)
    - [AI Provider Support](#ai-provider-support)
    - [AI Web Research Agent](#ai-web-research-agent)
    - [MCP Tooling Support (Model Context Protocol)](#mcp-tooling-support-model-context-protocol)
    - [Market Intelligence \& Sentiment](#market-intelligence--sentiment)
      - [Data Sources \& Processing](#data-sources--processing)
      - [Market Intelligence Hub](#market-intelligence-hub)
      - [Integration Throughout the App](#integration-throughout-the-app)
      - [Regulatory Framing](#regulatory-framing-1)
    - [Custom Signal Sources](#custom-signal-sources)
    - [AI Agents (Catalog \& Permissions)](#ai-agents-catalog--permissions)
      - [Direct Agent Views (UI)](#direct-agent-views-ui)
    - [Permissions Model](#permissions-model)
      - [Permission Modes Overview](#permission-modes-overview)
      - [Interactive Mode (Zero Trust - Default)](#interactive-mode-zero-trust---default)
      - [Supervised Mode (Least Privilege)](#supervised-mode-least-privilege)
      - [Graduated Approval System](#graduated-approval-system)
      - [Permissive Mode (User-Defined Boundaries)](#permissive-mode-user-defined-boundaries)
      - [AI Permission Center (Settings)](#ai-permission-center-settings)
      - [Active Permissions Dashboard](#active-permissions-dashboard)
      - [Safety Gates \& Progressive Trust](#safety-gates--progressive-trust)
      - [Regulatory Framing](#regulatory-framing-2)
      - [AI Operations \& Cost Controls (Technical)](#ai-operations--cost-controls-technical)
    - [AI Operations \& Cost Controls](#ai-operations--cost-controls)
    - [Model Evaluation \& Governance (MLOps)](#model-evaluation--governance-mlops)
      - [Evaluation Framework](#evaluation-framework)
      - [Model Versioning \& Reproducibility](#model-versioning--reproducibility)
      - [Performance Monitoring \& Drift Detection](#performance-monitoring--drift-detection)
      - [A/B Testing \& Experimentation](#ab-testing--experimentation)
      - [Model Retraining \& Fine-Tuning](#model-retraining--fine-tuning)
    - [8. Risk Management](#8-risk-management)
    - [Tiered Risk Governance](#tiered-risk-governance)
    - [Automation Modes \& Approval Profiles](#automation-modes--approval-profiles)
    - [Non-Custodial Trading Model](#non-custodial-trading-model)
    - [Guardrails \& Limits (Defaults; user-configurable)](#guardrails--limits-defaults-user-configurable)
    - [Intelligent Overfill Protection](#intelligent-overfill-protection)
      - [Complete State Machine Specification](#complete-state-machine-specification)
    - [Real-time Monitoring](#real-time-monitoring)
    - [Resilience \& Circuit Breakers](#resilience--circuit-breakers)
  - [PART 3: ARCHITECTURE \& DESIGN](#part-3-architecture--design)
    - [9. System Architecture](#9-system-architecture)
    - [Core Philosophy: A No-Compromise, Tiered Architecture](#core-philosophy-a-no-compromise-tiered-architecture)
    - [Architecture Principles](#architecture-principles)
      - [System Architecture Diagram (C4 Container Level)](#system-architecture-diagram-c4-container-level)
    - [Data Architecture \& Stores](#data-architecture--stores)
      - [High-Performance Multi-Database Architecture](#high-performance-multi-database-architecture)
        - [Data Flow Diagram (Hot vs Cold Paths)](#data-flow-diagram-hot-vs-cold-paths)
    - [Application Architecture](#application-architecture)
      - [Backend](#backend)
      - [Configuration \& Environments](#configuration--environments)
      - [Frontend](#frontend)
        - [Charting (Trading UI)](#charting-trading-ui)
        - [Slash Commands (Chat Ops)](#slash-commands-chat-ops)
      - [Infrastructure](#infrastructure)
      - [Deployment Profiles \& Configuration](#deployment-profiles--configuration)
        - [Profile Overview](#profile-overview)
        - [Hardware Requirements](#hardware-requirements)
        - [Installation \& Setup Process](#installation--setup-process)
        - [Cloud vs Self-Hosted Options](#cloud-vs-self-hosted-options)
        - [Performance \& Network Topology](#performance--network-topology)
        - [Feature Configuration](#feature-configuration)
        - [Migration \& Upgrade Paths](#migration--upgrade-paths)
    - [12. UI/UX Design](#12-uiux-design)
    - [Design Principles](#design-principles)
    - [Application Shell \& Navigation](#application-shell--navigation)
    - [Key Views](#key-views)
    - [Trading Terminal Layout](#trading-terminal-layout)
    - [Interactions \& Input](#interactions--input)
    - [Strategy Builder UX](#strategy-builder-ux)
    - [Strategy Settings: AI](#strategy-settings-ai)
    - [Jobs \& Approvals UX](#jobs--approvals-ux)
    - [Scheduler \& Budgets Dashboard](#scheduler--budgets-dashboard)
    - [Notifications \& Errors](#notifications--errors)
    - [Accessibility \& Internationalization](#accessibility--internationalization)
    - [Performance UX](#performance-ux)
    - [Persistence \& Personalization](#persistence--personalization)
    - [First Time User Experience (FTUE)](#first-time-user-experience-ftue)
      - [Onboarding Philosophy](#onboarding-philosophy)
      - [Preset Workspace (Immediate Success)](#preset-workspace-immediate-success)
      - [Interactive Guided Tour](#interactive-guided-tour)
      - [Getting Started Checklist](#getting-started-checklist)
    - [Settings \& Configuration System](#settings--configuration-system)
      - [Core Philosophy](#core-philosophy)
      - [Settings Hierarchy \& Inheritance](#settings-hierarchy--inheritance)
      - [Settings Profiles System](#settings-profiles-system)
      - [Easy/Advanced Mode (Progressive Disclosure)](#easyadvanced-mode-progressive-disclosure)
      - [Settings UI Patterns](#settings-ui-patterns)
      - [Settings Search \& Navigation](#settings-search--navigation)
      - [Import/Export \& Validation](#importexport--validation)
      - [Settings Sync \& History](#settings-sync--history)
      - [Settings Categories Reference](#settings-categories-reference)
      - [Asset Class Selection \& Configuration](#asset-class-selection--configuration)
      - [Data Management UI (User-Facing Data Control)](#data-management-ui-user-facing-data-control)
        - [Data Lifecycle Management Dashboard](#data-lifecycle-management-dashboard)
        - [User-Defined Retention Policies](#user-defined-retention-policies)
        - [Manual Data Pruning](#manual-data-pruning)
        - [Data Provenance \& Traceability](#data-provenance--traceability)
        - [Data Export \& External Analysis](#data-export--external-analysis)
    - [Theming \& Branding](#theming--branding)
    - [Multipane + Draw Tools (Micro-spec)](#multipane--draw-tools-micro-spec)
    - [Hotkeys Catalog](#hotkeys-catalog)
    - [Layout JSON schema (outline)](#layout-json-schema-outline)
    - [Strategy Control Board (Widget Spec)](#strategy-control-board-widget-spec)
    - [Strategy Chip (Visual Spec)](#strategy-chip-visual-spec)
    - [Reference Stack \& Dependencies](#reference-stack--dependencies)
    - [Accessibility (WCAG 2.1 AA Compliance)](#accessibility-wcag-21-aa-compliance)
    - [Internationalization (i18n)](#internationalization-i18n)
    - [Mobile \& Responsive (Future)](#mobile--responsive-future)
  - [PART 4: TECHNICAL IMPLEMENTATION](#part-4-technical-implementation)
    - [13. API Specifications](#13-api-specifications)
    - [REST API Specification](#rest-api-specification)
      - [API Design Principles](#api-design-principles)
      - [Base URL Structure](#base-url-structure)
      - [Authentication](#authentication)
      - [Standard Request Headers](#standard-request-headers)
      - [Standard Response Format](#standard-response-format)
      - [HTTP Status Codes](#http-status-codes)
      - [Pagination](#pagination)
      - [Filtering and Sorting](#filtering-and-sorting)
      - [Rate Limiting](#rate-limiting)
      - [API Endpoint Catalog](#api-endpoint-catalog)
      - [Error Code Catalog](#error-code-catalog)
    - [WebSocket API Specification](#websocket-api-specification)
      - [Connection Protocol](#connection-protocol)
      - [Message Format](#message-format)
      - [Connection Lifecycle](#connection-lifecycle)
      - [Subscription Model](#subscription-model)
      - [Event Catalog](#event-catalog)
      - [Rate Limiting \& Backpressure](#rate-limiting--backpressure)
      - [Reconnection Strategy](#reconnection-strategy)
    - [Added](#added)
    - [Changed](#changed)
    - [Deprecated](#deprecated)
    - [Removed](#removed)
    - [Fixed](#fixed)
      - [QuestDB Schema (Real-Time Market Data)](#questdb-schema-real-time-market-data)
      - [ClickHouse Schema (Historical Analytics \& Telemetry)](#clickhouse-schema-historical-analytics--telemetry)
      - [Neo4j Schema (Knowledge Graph)](#neo4j-schema-knowledge-graph)
      - [Qdrant Schema (Vector Embeddings)](#qdrant-schema-vector-embeddings)
      - [Market Data Quality (Consolidated)](#market-data-quality-consolidated)
    - [Market Data Quality \& Monitoring](#market-data-quality--monitoring)
      - [Data Quality Indicators](#data-quality-indicators)
    - [Market Data Quality \& Validation](#market-data-quality--validation)
      - [Data Quality Checks](#data-quality-checks)
      - [Data Normalization](#data-normalization)
      - [Data Failover \& Redundancy](#data-failover--redundancy)
      - [Historical Data Management](#historical-data-management)
    - [Data Import/Export Specifications](#data-importexport-specifications)
      - [Trade History Export (CSV)](#trade-history-export-csv)
      - [Strategy Export (JSON)](#strategy-export-json)
      - [Backtest Results Export (JSON)](#backtest-results-export-json)
      - [Portfolio Export (JSON)](#portfolio-export-json)
      - [Backup \& Restore Procedures](#backup--restore-procedures)
      - [Data Import from Other Platforms](#data-import-from-other-platforms)
    - [Regime Detection Algorithm Specification](#regime-detection-algorithm-specification)
      - [Regime Taxonomy](#regime-taxonomy)
      - [Feature Extraction](#feature-extraction)
      - [Hysteresis Mechanism](#hysteresis-mechanism)
      - [Confidence Calculation](#confidence-calculation)
      - [Update Cadence](#update-cadence)
      - [Storage Schema](#storage-schema)
      - [API Endpoints](#api-endpoints)
    - [15. Trading \& Execution Specifications](#15-trading--execution-specifications)
    - [Order Types \& Execution Specifications](#order-types--execution-specifications)
      - [Supported Order Types](#supported-order-types)
      - [Time-In-Force (TIF) Options](#time-in-force-tif-options)
      - [Order Type Detailed Specifications](#order-type-detailed-specifications)
      - [Order Validation Rules](#order-validation-rules)
    - [Position Management Features](#position-management-features)
      - [Position Operations](#position-operations)
      - [Position Monitoring](#position-monitoring)
      - [Position Lifecycle](#position-lifecycle)
      - [Position Risk Management](#position-risk-management)
    - [Margin \& Leverage Management](#margin--leverage-management)
      - [Margin Calculation Methods](#margin-calculation-methods)
      - [Liquidation Logic](#liquidation-logic)
      - [Funding Rates (Perpetual Futures)](#funding-rates-perpetual-futures)
      - [Margin Calls \& Alerts](#margin-calls--alerts)
    - [Commission \& Fee Structures](#commission--fee-structures)
      - [Exchange Fee Tiers](#exchange-fee-tiers)
      - [Slippage Modeling](#slippage-modeling)
      - [Total Cost Analysis (TCA)](#total-cost-analysis-tca)
    - [Advanced Order Types \& Execution Algorithms](#advanced-order-types--execution-algorithms)
      - [Algorithmic Order Types](#algorithmic-order-types)
      - [Conditional Orders](#conditional-orders)
      - [Multi-Leg Orders](#multi-leg-orders)
    - [Multi-Asset Portfolio Management](#multi-asset-portfolio-management)
      - [Portfolio Rebalancing](#portfolio-rebalancing)
      - [Risk Parity \& Allocation](#risk-parity--allocation)
      - [Multi-Currency Accounting](#multi-currency-accounting)
      - [Portfolio Analytics](#portfolio-analytics)
    - [16. Exchange Integration](#16-exchange-integration)
    - [Exchange Integration Details](#exchange-integration-details)
      - [1. Cryptocurrency Exchanges (CEX)](#1-cryptocurrency-exchanges-cex)
      - [2. Decentralized Perpetuals Exchanges (DEX)](#2-decentralized-perpetuals-exchanges-dex)
      - [3. Stock \& ETF Brokers](#3-stock--etf-brokers)
      - [4. Forex Brokers](#4-forex-brokers)
      - [5. Futures Brokers](#5-futures-brokers)
      - [6. Options Brokers](#6-options-brokers)
      - [Order Type Support by Exchange (Crypto CEX)](#order-type-support-by-exchange-crypto-cex)
      - [Time-In-Force Support by Exchange](#time-in-force-support-by-exchange)
      - [Market Data Support by Exchange](#market-data-support-by-exchange)
      - [WebSocket Feed Support by Exchange](#websocket-feed-support-by-exchange)
      - [API Rate Limits by Exchange](#api-rate-limits-by-exchange)
      - [Exchange-Specific Features](#exchange-specific-features)
      - [Exchange Connection Configuration](#exchange-connection-configuration)
      - [7. Integration Architecture \& Libraries](#7-integration-architecture--libraries)
      - [8. Trading Hours \& Session Calendars](#8-trading-hours--session-calendars)
      - [9. Regulatory Considerations by Asset Class](#9-regulatory-considerations-by-asset-class)
    - [17. Technical Implementation Details](#17-technical-implementation-details)
    - [Technical Implementation Details](#technical-implementation-details)
      - [Authentication \& Authorization](#authentication--authorization)
      - [Pagination](#pagination-1)
      - [Idempotency](#idempotency)
      - [Error Handling](#error-handling)
    - [User Workflows \& State Machines](#user-workflows--state-machines)
      - [Strategy Lifecycle State Machine](#strategy-lifecycle-state-machine)
      - [Order Lifecycle State Machine](#order-lifecycle-state-machine)
      - [Backtest Lifecycle State Machine](#backtest-lifecycle-state-machine)
      - [Trading Session Lifecycle State Machine](#trading-session-lifecycle-state-machine)
    - [18. UI Component Specifications](#18-ui-component-specifications)
    - [UI Component Specifications](#ui-component-specifications)
      - [Design System Tokens](#design-system-tokens)
      - [Component Library](#component-library)
      - [Accessibility Requirements (WCAG 2.1 AA)](#accessibility-requirements-wcag-21-aa)
      - [Responsive Design](#responsive-design)
    - [Chart \& Drawing Tools (Complete Specification)](#chart--drawing-tools-complete-specification)
      - [Drawing Tools](#drawing-tools)
    - [Hotkeys (Complete Specification)](#hotkeys-complete-specification)
      - [Global Hotkeys](#global-hotkeys)
      - [Chart Hotkeys](#chart-hotkeys)
      - [Order Entry Hotkeys](#order-entry-hotkeys)
      - [Strategy Management Hotkeys](#strategy-management-hotkeys)
  - [PART 5: PERFORMANCE \& OPTIMIZATION](#part-5-performance--optimization)
    - [19. Performance \& Optimization](#19-performance--optimization)
    - [Performance Optimization](#performance-optimization)
      - [Database Optimization](#database-optimization)
      - [Caching Strategy](#caching-strategy)
      - [Frontend Optimization](#frontend-optimization)
      - [Backend Optimization](#backend-optimization)
      - [Network Optimization](#network-optimization)
      - [Data Pipeline Optimization](#data-pipeline-optimization)
      - [AI/ML Optimization](#aiml-optimization)
      - [Memory \& Resource Optimization](#memory--resource-optimization)
    - [Performance SLOs (Service Level Objectives)](#performance-slos-service-level-objectives)
      - [Latency Targets](#latency-targets)
      - [Throughput Requirements](#throughput-requirements)
      - [Availability Targets](#availability-targets)
      - [Error Rate Budgets](#error-rate-budgets)
      - [Database Performance Targets](#database-performance-targets)
      - [Monitoring \& Alerting Thresholds](#monitoring--alerting-thresholds)
    - [Performance Metrics (Complete List)](#performance-metrics-complete-list)
      - [Risk-Adjusted Returns](#risk-adjusted-returns)
      - [Risk Metrics](#risk-metrics)
      - [Trade Statistics](#trade-statistics)
      - [Execution Quality](#execution-quality)
  - [PART 6: OPERATIONS \& DEPLOYMENT](#part-6-operations--deployment)
    - [20. Testing \& Quality Assurance](#20-testing--quality-assurance)
    - [Testing Strategy](#testing-strategy-1)
      - [Test Coverage Requirements](#test-coverage-requirements)
      - [Test Pyramid](#test-pyramid)
      - [Testing Tools \& Frameworks](#testing-tools--frameworks)
      - [Test Categories \& Examples](#test-categories--examples)
      - [Testing Best Practices](#testing-best-practices)
      - [Test Data Management](#test-data-management)
      - [Test Environment Setup](#test-environment-setup)
      - [Test Parallelization](#test-parallelization)
      - [Test Reporting](#test-reporting)
      - [Flakiness Monitoring](#flakiness-monitoring)
      - [Performance Testing](#performance-testing)
      - [Chaos Testing](#chaos-testing)
    - [21. Deployment \& Operations](#21-deployment--operations)
    - [Deployment \& Operations](#deployment--operations)
      - [CI/CD Pipeline](#cicd-pipeline)
      - [Deployment Strategies](#deployment-strategies)
      - [Deployment Procedures](#deployment-procedures)
      - [Rollback Procedures](#rollback-procedures)
      - [Environment Configuration](#environment-configuration)
    - [22. Observability \& Monitoring](#22-observability--monitoring)
    - [Detailed Observability Specifications](#detailed-observability-specifications)
      - [Distributed Tracing](#distributed-tracing)
      - [Logging Details](#logging-details)
      - [Alert Details](#alert-details)
      - [Health Check Details](#health-check-details)
      - [Backup \& Restore](#backup--restore)
      - [Deployment Details](#deployment-details)
      - [Security Scanning](#security-scanning)
    - [23. Security \& Compliance](#23-security--compliance)
    - [Security Model](#security-model)
      - [Single-User Security Model](#single-user-security-model)
      - [AI Agent RBAC (Policies \& Controls)](#ai-agent-rbac-policies--controls)
      - [Data Security \& Privacy](#data-security--privacy)
      - [System Security](#system-security)
    - [Regulatory \& Legal](#regulatory--legal)
      - [Non-Custodial Model (Regulatory Context)](#non-custodial-model-regulatory-context)
      - [Compliance Strategy](#compliance-strategy)
      - [Pattern Day Trader (PDT) Rules (US)](#pattern-day-trader-pdt-rules-us)
      - [Position Limits \& Reporting](#position-limits--reporting)
      - [Best Execution Requirements](#best-execution-requirements)
      - [Enhanced Audit Trail](#enhanced-audit-trail)
      - [Legal Documentation Requirements](#legal-documentation-requirements)
      - [Jurisdictional Compliance](#jurisdictional-compliance)
  - [PART 7: DOCUMENTATION \& SUPPORT](#part-7-documentation--support)
    - [24. Documentation](#24-documentation)
    - [Documentation](#documentation)
      - [User Documentation](#user-documentation)
      - [Developer Documentation](#developer-documentation)
      - [API Changelog](#api-changelog)
  - [v1.2.0 (2025-10-18)](#v120-2025-10-18)
    - [25. Support \& Community](#25-support--community)
    - [Support \& Community](#support--community)
  - [PART 8: BUSINESS \& LEGAL](#part-8-business--legal)
    - [26. Business Model](#26-business-model)
    - [Distribution Model](#distribution-model)
      - [Self-Hosted Application](#self-hosted-application)
    - [Revenue Model](#revenue-model)
      - [One-Time Software License](#one-time-software-license)
    - [Cost Structure for Users](#cost-structure-for-users)
      - [Infrastructure Costs](#infrastructure-costs)
      - [AI API Costs](#ai-api-costs)
      - [Exchange Fees](#exchange-fees)
    - [27. Risks \& Mitigations](#27-risks--mitigations)
    - [Technical Risks](#technical-risks)
    - [Business Risks](#business-risks)
    - [Operational Risks](#operational-risks)
    - [28. Open Questions \& Assumptions](#28-open-questions--assumptions)
  - [PART 9: REFERENCE MATERIAL](#part-9-reference-material)
    - [29. Appendices](#29-appendices)
    - [Technical Specification Appendices](#technical-specification-appendices)
      - [Appendix A: Regime Detection Algorithm](#appendix-a-regime-detection-algorithm)
      - [Appendix B: Strategy Ranking Algorithm](#appendix-b-strategy-ranking-algorithm)
      - [Appendix C: PydanticAI vs LangGraph Decision Tree](#appendix-c-pydanticai-vs-langgraph-decision-tree)
      - [Appendix D: Overfill Protection State Machine](#appendix-d-overfill-protection-state-machine)
      - [Appendix E: Complete Database DDL Scripts](#appendix-e-complete-database-ddl-scripts)
    - [Database Schemas \& DDL (Examples)](#database-schemas--ddl-examples)
    - [AI Memory Schemas (Qdrant \& Neo4j)](#ai-memory-schemas-qdrant--neo4j)
    - [Kubernetes Patterns (Ops)](#kubernetes-patterns-ops)
    - [Security \& Compliance (Extended)](#security--compliance-extended)
    - [Technical Catalogs (Indicators/Strategies/Algos)](#technical-catalogs-indicatorsstrategiesalgos)
    - [External Platform Integrations (Examples)](#external-platform-integrations-examples)
    - [30. Glossary](#30-glossary)
    - [31. Conclusion](#31-conclusion)

---

## PART 1: VISION & PHILOSOPHY

### 1. Executive Summary

SymbioteTrader is a selfâ€‘hosted, nonâ€‘custodial AI trading platform for retail and advanced traders. It connects to user exchange accounts via API (no custody), runs strategies across multiple venues, and uses AI for idea generation, riskâ€‘aware recommendations, and explanations. Deployable via Docker Compose or Kubernetes; designed for observability and guardrails.

**What Makes SymbioteTrader Different:** This isn't a collection of separate trading toolsâ€”it's a **unified ecosystem** where features interact, learn from each other, and create compound value. Every action (backtest, trade, setting change, journal entry) feeds an Intelligence Backbone that makes the entire platform smarter. Features don't just coexistâ€”they amplify each other. The result: a self-improving trading assistant that learns your style, prevents mistakes before they happen, and automates repetitive decisions while keeping you in control.

### Critical Design Principle

SymbioteTrader is strictly noncustodial: it places orders on the users existing exchange accounts via API and never holds funds or initiates transfers. This minimizes regulatory burden while preserving full algorithmic trading capability.

### Key Features at a Glance

**For the 30-Second Overview:**

- **ðŸ” Trade on Your Own Exchanges**
  Connects to your existing exchange accounts via API. Never holds your funds. You maintain complete custody and control.

- **ðŸ¤– AI-Powered Co-Pilot**
  Get strategy ideas, risk analysis, performance insights, and market intelligence. AI suggests, you decide. Automation, not advice.

- **ðŸŽ¨ Build Strategies Visually**
  Drag-and-drop strategy builder with 100+ technical indicators. Or import from Pine Script, Python, or external code.

- **ðŸš€ Deploy Anywhere**
  Runs on your local machine (16GB+ RAM recommended), a home server, VPS, or cloud. Full Docker Compose and Kubernetes support.

- **âš™ï¸ You Are in Control**
  Multi-layered permission system (Interactive/Supervised/Permissive modes). AI only does what you explicitly allow. Complete audit trail.

- **ðŸ’ª Power-User First**
  Absolute granular control over every parameter. 6-database architecture for maximum performance. Advanced mode for experts, Easy mode for beginners.

- **ðŸ“Š Comprehensive Analytics**
  Real-time performance tracking, strategy ranking, regime detection, backtesting, paper trading, and live tradingâ€”all in one platform.

- **ðŸ”’ Privacy & Security**
  Self-hosted means your data never leaves your infrastructure. End-to-end encryption for cloud sync. Open-source transparency.

- **ðŸŒ Multi-Exchange, Multi-Asset**
  Trade crypto, stocks, forex, futures across 100+ exchanges via CCXT. Smart order routing and unified portfolio view.

- **ðŸ“ˆ Market Intelligence**
  Sentiment analysis, on-chain metrics, funding rates, liquidation data. AI surfaces opportunities without crossing into advice.

- **ðŸš€ Deploy Anywhere, Your Way**
  A unique tiered architecture means you can start with a simple, fully cloud-hosted setup with zero maintenance, or run a high-performance, fully self-hosted stack for maximum control. The platform is designed to cater to everyone from beginners to expertsâ€”the technical complexity is abstracted through flexible deployment profiles.


### 2. Vision and Value

- AI-enhanced trading copilot with guardrails, approvals, and explanations
- Unified multi-exchange trading via CCXT with smart order routing
- Adapter-based strategy framework (Backtrader, vectorbt, etc.)
- Full observability and cost tracking (OTel, Prom/Grafana, Langfuse)
- Self-hosted, non-custodial with tiered risk governance


### 3. Target User and Market

- **Primary**: Retail traders using centralized exchanges who want strategy automation
- **Secondary**: Advanced retail/semipro traders needing adapters and custom strategies
- **Out of scope**: Institutional HFT/colocation; direct custody/brokerage

**Serving a Diverse User Base Through Flexible Architecture:**

To successfully serve this broad marketâ€”from beginners taking their first steps in algorithmic trading to experienced quants running complex multi-strategy portfoliosâ€”SymbioteTrader is built on a **flexible, tiered architecture**.

- **New users** can begin with a simple cloud-hosted setup that removes all maintenance responsibility. They can focus on learning strategy development without worrying about database administration, server configuration, or infrastructure management.

- **Power users** can leverage the full, self-hosted stack for ultimate performance, complete data ownership, and granular control over every component.

This ensures the platform is both **accessible for learning** and **powerful enough for mastery**. The same codebase serves both audiences through deployment profiles, not feature limitations.


### 4. Core Design Philosophy: Progressive Mastery

**SymbioteTrader is built on a philosophy of universal accessibility without compromise.**

Every aspect of the platformâ€”from deployment to AI permissions to strategy building to data managementâ€”follows the same deliberate pattern: **start simple, grow as you learn, unlock power as you need it.**

### The Pattern Across All Dimensions

This isn't just "flexibility" in one areaâ€”it's a **consistent design principle** applied to every major system:

**ðŸš€ Deployment & Infrastructure**
- Beginner: Fully cloud-hosted (PostgreSQL on RDS, Redis on ElastiCache, etc.) with zero maintenance
- Intermediate: Hybrid setup (local app + cloud databases, or vice versa)
- Expert: Fully self-hosted with Docker Compose or Kubernetes, complete control

**ðŸ¤– AI Permissions & Trust**
- Beginner: Interactive Mode (AI asks permission for every action, zero trust)
- Intermediate: Supervised Mode (graduated approvals, AI can make small changes automatically)
- Expert: Permissive Mode (user-defined boundaries, AI operates within your rules)

**âš™ï¸ Settings & Configuration**
- Beginner: Easy Mode (essential settings only, sensible defaults)
- Intermediate: Progressive disclosure (show more options as needed)
- Expert: Advanced Mode (absolute granular control over every parameter)

**ðŸ›¡ï¸ Risk Management**
- Beginner: Conservative profile (tight guardrails, small position sizes)
- Intermediate: Moderate/Aggressive profiles (pre-configured risk levels)
- Expert: Custom risk rules (define your own position limits, drawdown thresholds, etc.)

**ðŸŽ¨ Strategy Building**
- Beginner: Visual drag-and-drop builder (no coding required)
- Intermediate: Pine Script import (leverage existing TradingView strategies)
- Expert: Custom Python code (full API access, unlimited complexity)

**ðŸ“Š Data Management**
- Beginner: Automatic retention policies (set and forget)
- Intermediate: User-defined policies with preview impact
- Expert: Manual pruning with complete provenance tracing

**ðŸŽ“ Onboarding & Learning**
- Beginner: Preset workspace with demo strategy running in paper trading
- Intermediate: Guided tour with interactive tutorials
- Expert: Direct access to all features, no hand-holding

**ðŸ“ˆ Market Intelligence**
- Beginner: Proactive alerts with context ("BTC regime changed to High Volatility")
- Intermediate: Performance context service (see how your strategies performed in similar conditions)
- Expert: Raw data access for custom analysis and research

### Why This Matters

**For beginners:** You can start trading algorithmically in minutes, not weeks. No need to learn Docker, Kubernetes, database administration, or system architecture. Focus on learning strategy development, not infrastructure management.

**For intermediates:** As you grow, the platform grows with you. Want more control over AI? Upgrade to Supervised mode. Want to self-host your database? Switch that one component. Clear upgrade paths at every level.

**For experts:** Absolute granular control over every aspect of the platform. Full self-hosting, custom risk rules, advanced AI permissions, manual data management, raw API access. No artificial limitations, no "contact sales for enterprise features."

### The Result

**A platform that's approachable enough for learning yet powerful enough for mastery.**

The same codebase serves a first-time trader learning backtesting and an experienced quant running a multi-strategy portfolio with millions in AUM. No feature limitations, no separate "pro" versions, no paywallsâ€”just progressive disclosure of power.

**You don't need to be a system administrator, a Python expert, or an AI researcher to use SymbioteTraderâ€”but if you are, you have complete control.**

This philosophy is reflected in every design decision throughout this document. When you see the 6-database architecture, the three AI permission modes, the tiered deployment profiles, or the Easy/Advanced settingsâ€”understand that they're all part of the same coherent vision: **meet users where they are, and grow with them.**


### 5. Feature Ecosystem & Cross-Feature Intelligence

### Core Concept: An Ecosystem, Not Separate Apps

SymbioteTrader is designed as a **unified ecosystem** where features interact, learn from each other, and create compound value. This isn't a collection of separate tools bundled togetherâ€”it's an intelligent system where:

- **Data flows between features** - Every action generates data that enriches other features
- **Insights compound** - Multiple features analyzing the same data create richer insights
- **Learning cascades** - Improvements in one area improve many others
- **Workflows automate** - Common patterns become one-click, then fully automated
- **Context persists** - The system remembers everything; no repeated work
- **Personalization deepens** - The system learns your style and adapts

**Key Principle:** The whole is greater than the sum of its parts. Features don't just coexistâ€”they amplify each other.

### Eight Ecosystem Principles

1. **Data Flows Everywhere** - Every action (backtest, trade, setting change, journal entry) generates data that feeds other features
2. **Insights Compound** - Multiple features analyzing the same data create richer insights than any single feature could
3. **Learning Cascades** - When one feature improves (e.g., better regime detection), many others improve automatically
4. **Workflows Automate** - Common patterns become one-click approvals, then graduated approvals, then fully automated
5. **Context Persists** - The system maintains complete context across all features; you never repeat work
6. **Personalization Deepens** - The system learns your trading style, preferences, and decision patterns over time
7. **Failures Teach** - Every mistake, near-miss, and loss becomes a learning opportunity for the entire system
8. **Success Replicates** - Winning patterns become templates, automation rules, and proactive suggestions

### Twelve Ecosystem Categories

#### 1. Strategy Lifecycle Ecosystem

**Complete development pipeline where each stage validates and improves the next.**

**Key Interactions:**

**Strategy Builder â†’ Backtest â†’ Overfitting Detection â†’ Execution Simulator â†’ Paper Trading â†’ Live Trading**
- User creates mean reversion strategy
- Backtest shows 75% win rate, $12k profit
- Overfitting Detection warns: "HIGH RISK (score: 72) - Strategy has 6 parameters and fails out-of-sample test"
- User simplifies to 4 parameters, re-runs backtest
- Overfitting score drops to 45 (MEDIUM RISK)
- Execution Simulator shows: "TWAP execution reduces slippage by 40% vs market orders"
- Paper trading validates both strategy AND execution method
- Deploy to live with learned execution preferences

**Compound Benefit:** Failures caught early prevent losses; each stage improves the next; execution method optimized before live trading.

**Strategy Health â†’ Post-Trade Analysis â†’ AI Strategy Lab â†’ Version Control**
- Health score drops from 85 to 62 over 3 days
- Post-Trade Analysis identifies: "Last 5 losses all occurred during high volatility (>60)"
- AI Strategy Lab suggests: "Add volatility filter: Pause when volatility >60?"
- User approves, creates new version
- Version Control tracks change and performance
- New version: Health score 88, losses prevented
- Intelligence Backbone learns: "This user pauses mean reversion in high volatility"

**Compound Benefit:** Degradation detected early â†’ Root cause identified â†’ AI suggests fix â†’ Results tracked â†’ System learns user's strategy philosophy.

**What-If Scenarios â†’ AI Strategy Lab â†’ Backtest â†’ A/B Testing**
- User tests: "What if stop loss was 3% instead of 2%?"
- Shows: +8% improvement in Sharpe ratio
- AI Strategy Lab: "I can systematically optimize this. Want me to test 2%, 2.5%, 3%, 3.5%, 4%?"
- User approves
- AI runs 5 backtests in parallel
- Results: 3% is optimal
- A/B test in paper trading confirms
- Winner deployed to live

**Compound Benefit:** Quick exploration â†’ AI-powered systematic optimization â†’ Rigorous validation â†’ Data-driven decision.

#### 2. Risk Intelligence Ecosystem

**Adaptive risk management that responds to market conditions and user behavior.**

**Key Interactions:**

**Market Intelligence (Regime) â†’ Strategy Health â†’ Risk Management â†’ Position Sizing**
- Regime changes from "Low Volatility" to "High Volatility"
- Strategy Health shows: 3 mean reversion strategies degrading (scores dropping)
- Risk Management auto-suggests: "Reduce position limits by 30% for mean reversion strategies?"
- User approves once
- Overfill Protection enforces new limits immediately
- Circuit breakers tighten (consecutive loss limit: 5 â†’ 3)
- Intelligence Backbone learns: "User reduces risk when volatility spikes"
- Future: Auto-applies this adjustment when volatility spikes

**Compound Benefit:** Market changes trigger cascading risk adjustments across the entire platform; user's risk philosophy learned and automated.

**Overfill Protection â†’ Post-Trade Analysis â†’ Risk Management â†’ Intelligence Backbone**
- Overfill Protection prevents duplicate order (network retry detected)
- Logs: "Near miss: Would have created 2x position (2.0 BTC instead of 1.0 BTC)"
- Post-Trade Analysis flags: "This would have exceeded your position limit"
- Risk Management learns: User's typical position sizes and limits
- Intelligence Backbone updates risk models
- Future: Tighter deduplication window (100ms â†’ 50ms) for this strategy
- Future: Position limits adjusted based on learned patterns

**Compound Benefit:** Near-misses become learning opportunities; risk models improve over time; system prevents problems before they occur.

**Circuit Breakers â†’ Trade Journal â†’ Settings â†’ Automation**
- Circuit breaker triggers: 5 consecutive losses
- All strategies paused automatically
- User writes in journal: "Should have paused earlier when I saw regime change to trending. My mean reversion strategies don't work in trends."
- Intelligence Backbone analyzes journal entries
- Detects pattern: User mentions "regime change" 4 times in relation to pausing
- AI suggests: "You frequently pause mean reversion when regime changes to trending. Want to automate this?"
- User approves, defines rule
- Future: Auto-pauses mean reversion strategies when regime changes to trending
- Graduated approval: "This rule has worked 3 times. Make permanent?"

**Compound Benefit:** Manual interventions become automated rules; user's wisdom encoded into the system; cognitive load reduced.

#### 3. Execution Intelligence Ecosystem

**Learn optimal execution methods per strategy, asset, regime, and time.**

**Key Interactions:**

**Execution Simulator â†’ Paper Trading â†’ Live Trading â†’ Execution Quality Analysis â†’ Intelligence Backbone**
- Execution Simulator tests 4 methods for large BTC order ($50k)
- Results: TWAP reduces slippage by 35% vs market orders
- Paper trading validates over 10 trades
- Live trading confirms: Avg slippage 0.8% (TWAP) vs 2.4% (market)
- Execution Quality Analysis tracks over 100+ trades
- Intelligence Backbone learns: "For this user, BTC orders >$10k, TWAP is optimal"
- Future: Auto-suggests TWAP for similar orders
- Future: "You've approved TWAP 5 times for large orders. Auto-approve?"

**Compound Benefit:** Simulation â†’ Validation â†’ Execution â†’ Measurement â†’ Learning â†’ Improved recommendations â†’ Automation.

**Signal Attribution â†’ Execution Quality â†’ Market Intelligence â†’ Portfolio Optimization**
- Signal Attribution shows: TradingView webhook profitable (+$2,400 last month)
- Execution Quality shows: Best fills on Binance, 14:00-18:00 UTC
- Market Intelligence shows: This is high liquidity period for BTC
- Portfolio Optimization suggests: "Increase allocation to TradingView signal during 14:00-18:00 UTC"
- User approves
- Intelligence Backbone learns: Signal performance varies by time and venue
- Future: Auto-adjusts allocation based on time of day and liquidity

**Compound Benefit:** Multiple data sources combine to optimize signal allocation by time, venue, and market conditions.

#### 4. Market Context Intelligence

**Every feature becomes regime-aware through Market Intelligence integration.**

**Key Interactions:**

**Regime Detector â†’ Strategy Ranking â†’ Strategy Control Board â†’ Auto-Activation**
- Regime changes from "Ranging" to "Trending"
- Strategy Ranking re-ranks all strategies
- Trend-following strategies move to top (scores increase)
- Mean reversion strategies move to bottom (scores decrease)
- Strategy Control Board highlights: "3 strategies optimal for current regime" (green badges)
- User sees one-click activation for optimal strategies
- Intelligence Backbone tracks: Which strategies user activates per regime
- Future: "You typically activate these 3 strategies in trending markets. Activate now?"

**Compound Benefit:** Market changes automatically surface the right strategies; user's activation patterns learned and suggested.

**Regime Detector â†’ Overfitting Detection â†’ Backtest Validation**
- User backtests new mean reversion strategy
- Overfitting Detection runs regime stability test
- Results: "Strategy works in Low Volatility (85% win rate) but fails in High Volatility (45% win rate)"
- Current regime: High Volatility
- Warning: "âš ï¸ Not recommended for current conditions. Strategy is regime-dependent."
- Suggests: "Wait for regime change or add volatility filter"
- User adds filter, re-tests
- New results: "Strategy now stable across regimes (65-72% win rate)"

**Compound Benefit:** Overfitting detection becomes regime-aware; prevents deploying wrong strategy for current market; guides improvements.

**Regime Detector â†’ Risk Management â†’ Dynamic Position Sizing**
- Regime changes to "High Volatility"
- Risk Management suggests: "Reduce position size by 40%?"
- User approves once
- Intelligence Backbone learns
- Future: Auto-adjusts position sizing when volatility spikes
- Graduated approval: "This has worked 5 times. Make permanent?"

**Compound Benefit:** Risk adapts to market conditions; user's preferences learned and automated.

#### 5. Learning & Adaptation Ecosystem

**System gets smarter with every action; insights compound over time.**

**Key Interactions:**

**Trade Journal â†’ Intelligence Backbone â†’ AI Strategy Lab â†’ Automation**
- User writes 5 journal entries over 2 weeks
- Common theme: "Regime changed, should adjust strategies"
- Intelligence Backbone detects pattern
- AI Strategy Lab suggests: "You frequently adjust strategies when regime changes. Want me to help automate this?"
- User defines rules: "Pause mean reversion in trending markets, activate trend-following"
- System executes automatically on next regime change
- User reviews results: "This worked perfectly"
- Graduated approval: "Make this permanent?"

**Compound Benefit:** User's manual wisdom becomes automated intelligence; repetitive decisions eliminated; cognitive load reduced.

**Post-Trade Analysis â†’ Intelligence Backbone â†’ Strategy Health â†’ Predictive Warnings**
- Post-Trade Analysis identifies pattern: "Last 3 losses had these characteristics: [high volatility >60, low volume <$5M, weekend]"
- Intelligence Backbone learns failure pattern
- 2 weeks later: Strategy Health detects similar conditions forming
- Predictive warning: "âš ï¸ Conditions similar to your last 3 losses. Consider pausing?"
- User pauses strategy
- Market moves against strategy (would have lost $800)
- Loss prevented
- Intelligence Backbone reinforces: "This pattern is reliable"

**Compound Benefit:** Past losses prevent future losses; system learns user's failure patterns; proactive warnings before problems occur.

**Settings Changes â†’ Intelligence Backbone â†’ Proactive Suggestions**
- User frequently adjusts risk limits when volatility >50
- Intelligence Backbone learns
- Next time volatility >50: "You typically reduce position size by 30% in this situation. Apply now?"
- User approves
- Becomes graduated approval rule
- Eventually: Fully automated

**Compound Benefit:** Repetitive manual actions become one-click approvals, then fully automated; user's preferences encoded.

#### 6. Signal Intelligence Ecosystem

**Unified management and optimization of all signal sources.**

**Key Interactions:**

**Signal Hub â†’ Signal Attribution â†’ Strategy Health â†’ Portfolio Optimization**
- Signal Hub tracks 5 signal sources
- Signal Attribution shows: TradingView +$2,400, RSS -$300, Custom API +$1,200
- Strategy Health shows: RSS feed degrading (health score: 45)
- Portfolio Optimization suggests: "Reduce RSS allocation by 50%, increase TradingView by 30%"
- User approves
- Intelligence Backbone tracks signal performance over time
- Future: Auto-adjusts allocation based on recent performance

**Compound Benefit:** Multi-source performance tracking drives optimal allocation; underperforming signals identified and reduced automatically.

**Signal Hub â†’ Market Intelligence â†’ Regime-Aware Attribution**
- Signal Attribution shows: "TradingView webhook: +15% in trending markets, -5% in ranging markets"
- Current regime: Ranging
- Warning: "This signal underperforms in current regime"
- Suggests: Pause or reduce allocation
- User reduces allocation by 50%
- Intelligence Backbone learns: Signal performance is regime-dependent
- Future: Auto-adjusts signal allocation when regime changes

**Compound Benefit:** Signal performance becomes regime-aware; prevents using wrong signals for current market.

#### 7. Performance Optimization Ecosystem

**Analytics drive actionable improvements across the platform.**

**Key Interactions:**

**Performance Dashboard â†’ Correlation Analysis â†’ Portfolio Optimization â†’ Risk Reduction**
- Correlation Analysis shows: "Strategy A and Strategy B are 0.92 correlated"
- Portfolio Optimization suggests: "Reduce allocation to one; you're not getting diversification benefit"
- User reduces Strategy B allocation by 50%
- Risk concentration reduced
- Intelligence Backbone learns: User values diversification
- Future: Warns when adding correlated strategies

**Compound Benefit:** Hidden correlations revealed; portfolio risk reduced without sacrificing returns; user's risk philosophy learned.

**Execution Quality Analysis â†’ Settings â†’ Venue Preferences â†’ Cost Savings**
- Execution Quality shows: "You paid $1,200 in fees last month; 80% on Coinbase"
- Shows: "Binance fees would have been $400"
- User updates venue preferences in Settings
- Future orders auto-route to lowest-cost venue per asset
- Monthly savings: $800
- Intelligence Backbone learns venue preferences per asset

**Compound Benefit:** Cost analysis drives configuration changes; savings compound monthly; optimal routing learned.

**Post-Trade Analysis â†’ What-If Scenarios â†’ Strategy Optimization â†’ Version Control**
- Post-Trade Analysis: "Your last 10 losses had avg drawdown of 4.2%"
- What-If Scenarios: "What if stop loss was 3% instead of 5%?"
- Shows: "Would have prevented 7/10 losses"
- User creates new version with 3% stop loss
- A/B test in paper trading
- Winner deployed to live
- Version Control tracks improvement

**Compound Benefit:** Loss analysis drives hypothesis testing; improvements tracked and validated; data-driven optimization.

#### 8. AI Agent Ecosystem

**Multiple AI agents work together, sharing context and learning.**

**Key Interactions:**

**Conversational AI â†’ AI Strategy Lab â†’ LangGraph Orchestration â†’ Intelligence Backbone**
- User asks: "Why is Strategy A underperforming?"
- Conversational AI (PydanticAI) retrieves context from GraphRAG
- Identifies: "Regime changed 3 days ago"
- Suggests: "Want me to optimize for new regime?"
- User approves
- AI Strategy Lab (LangGraph) orchestrates multi-step optimization
- Results stored in Intelligence Backbone
- Future: Proactive optimization when regime changes

**Compound Benefit:** Question â†’ Analysis â†’ Suggestion â†’ Execution â†’ Learning (all AI-powered); user doesn't have to notice problems.

**Market Intelligence â†’ AI Strategy Lab â†’ Proactive Optimization**
- Market Intelligence detects regime change
- AI Strategy Lab: "3 of your strategies are optimized for the old regime. Want me to adapt them?"
- User approves
- AI runs optimization for all 3 strategies
- Presents results with performance projections
- User selects best versions
- Deployed automatically

**Compound Benefit:** Market changes trigger proactive AI optimization; strategies stay optimal without manual intervention.

**Strategy Health â†’ AI Strategy Lab â†’ Predictive Maintenance**
- Strategy Health detects early degradation (score drops from 85 to 78)
- AI Strategy Lab: "I detect early degradation. Want me to investigate?"
- User approves
- AI analyzes: "Win rate declining in high volatility"
- Suggests: "Add volatility filter?"
- User tests in What-If Scenarios
- Improvement confirmed
- New version deployed

**Compound Benefit:** AI detects problems before they become losses; suggests fixes proactively; continuous improvement automated.

#### 9. User Behavior Learning

**System learns user's preferences, habits, and decision patterns.**

**Key Interactions:**

**Trade Journal + Settings Changes + Strategy Adjustments â†’ Behavioral Profile**
- Intelligence Backbone tracks all user actions over time
- Learns: User always reduces position size when volatility >50
- Learns: User pauses mean reversion in trending markets
- Learns: User prefers TWAP for orders >$5k
- Learns: User typically trades 14:00-18:00 UTC
- Builds comprehensive behavioral profile
- Future: All suggestions aligned with user's trading philosophy

**Compound Benefit:** System learns user's trading philosophy; suggestions feel personalized and relevant; reduces cognitive dissonance.

**Approval Patterns â†’ Graduated Approvals â†’ Automation**
- User approves "reduce position size by 30%" 5 times when volatility spikes
- System suggests: "You always approve this. Want to auto-approve for next 7 days?"
- User approves (graduated approval)
- After 7 days: "This worked well. Make permanent?"
- User approves (full automation)
- Intelligence Backbone learns: User's risk management style

**Compound Benefit:** Repetitive approvals become graduated approvals, then automation; reduces cognitive load; user stays in control.

**Strategy Creation Patterns â†’ Template Suggestions**
- User creates 3 mean reversion strategies with similar structure
- Intelligence Backbone learns pattern
- Next time user creates strategy: "I notice you frequently use this pattern. Want to start from a template?"
- Template includes: RSI < 30, 2% stop loss, 4% take profit, volatility filter
- Saves 10 minutes per strategy
- User can customize from there

**Compound Benefit:** User's successful patterns become reusable templates; faster strategy creation; consistency improved.

#### 10. Data Flow Intelligence

**Smart data management that adapts to usage patterns.**

**Key Interactions:**

**Data Lifecycle â†’ Performance Analytics â†’ Retention Optimization**
- Data Management shows: "Tick data: 500GB, used in 2% of backtests"
- Performance Analytics shows: "Your strategies use 1-hour candles"
- Suggests: "Archive tick data older than 30 days? Would free 450GB"
- User approves
- Tick data archived to cold storage (S3 Glacier)
- Storage costs reduced by 80%
- Intelligence Backbone learns: User doesn't need tick data

**Compound Benefit:** Data usage patterns drive retention policies; storage optimized automatically; costs reduced.

**Data Provenance â†’ Backtest Validation â†’ Reproducibility**
- User runs backtest on 2024-01-15
- Data Provenance tracks: "Used BTC data from Binance, 2023-01-01 to 2024-01-01, version 1.2, hash: abc123"
- 6 months later (2024-07-15): User wants to re-run exact same backtest
- System: "Re-run with same data?"
- Exact reproduction with archived data
- Validates strategy still works
- Regulatory compliance: Complete audit trail

**Compound Benefit:** Complete reproducibility; can validate strategies years later with exact same data; regulatory compliance.

**Data Export â†’ External Analysis â†’ Import Insights**
- User exports trade data to CSV
- Analyzes in Python/R, discovers insight: "Trades on Mondays have 15% lower win rate"
- Creates custom indicator: "Avoid Mondays"
- Imports back into SymbioteTrader
- Uses in new strategy
- Intelligence Backbone learns from external research
- Insight becomes part of platform knowledge

**Compound Benefit:** External analysis enriches internal intelligence; user's research becomes platform knowledge; continuous improvement.

#### 11. Workflow Automation

**Common workflows become one-click or fully automated.**

**Key Interactions:**

**Regime Change â†’ Auto-Rebalance Workflow**
- Regime changes from "Low Volatility" to "High Volatility"
- Triggers automated workflow:
  1. Strategy Ranking updates
  2. Portfolio Optimization suggests rebalance
  3. Risk Management validates new allocation
  4. Overfill Protection checks position limits
  5. Presents complete rebalance plan
- User approves once
- Future: Auto-executes on regime changes (graduated approval)

**Compound Benefit:** Complex multi-step workflow becomes automated; user focuses on strategy, not execution; consistency improved.

**Strategy Degradation â†’ Investigation Workflow**
- Strategy Health drops below 70
- Auto-triggers investigation workflow:
  1. Post-Trade Analysis identifies root cause
  2. What-If Scenarios tests potential fixes
  3. AI Strategy Lab suggests optimization
  4. Presents findings: "Problem: High slippage in low liquidity. Solution: Switch to TWAP?"
- User approves
- Problem solved automatically
- Intelligence Backbone learns: This workflow works

**Compound Benefit:** Problem detection â†’ Root cause analysis â†’ Solution suggestion â†’ Execution (mostly automated); user validates, system executes.

**New Strategy â†’ Validation Workflow**
- User creates new strategy
- Auto-triggers validation workflow:
  1. Backtest with historical data
  2. Overfitting Detection runs 7 tests
  3. Execution Simulator tests 4 execution methods
  4. Paper Trading setup prepared
  5. Presents: "Strategy ready for paper trading with TWAP execution. Overfitting score: 35 (LOW RISK)"
- User approves
- Deployed to paper trading
- Intelligence Backbone tracks: Validation workflow success rate

**Compound Benefit:** Manual multi-step validation becomes one-click workflow; consistency improved; nothing forgotten.

#### 12. Cross-Feature Feedback Loops

**Insights from one feature improve multiple others.**

**Key Interactions:**

**Execution Quality â†’ Overfill Protection â†’ Risk Management â†’ Settings**
- Execution Quality detects: "Orders >$10k have 3x higher slippage"
- Overfill Protection learns: "Large orders are risky"
- Risk Management suggests: "Split large orders into smaller chunks?"
- User approves
- Settings updated: Auto-split orders >$10k into 3 chunks
- Future orders automatically split
- Slippage reduced by 60%
- Intelligence Backbone learns: Order size optimization

**Compound Benefit:** One insight cascades through multiple features; system-wide improvement from single observation.

**Post-Trade Analysis â†’ Overfitting Detection â†’ Strategy Builder â†’ Templates**
- Post-Trade Analysis identifies: "Strategies with >5 parameters frequently fail in live trading"
- Overfitting Detection adds stronger complexity penalty
- Strategy Builder warns: "6 parameters detected; consider simplifying"
- Templates updated to favor simpler strategies (3-4 parameters)
- Future strategies: Higher success rate
- Intelligence Backbone learns: Simplicity wins

**Compound Benefit:** Real-world failures improve validation tools and creation tools; platform gets smarter from user's mistakes.

**Market Intelligence â†’ All Features (Cascade Effect)**
- Regime detection algorithm improves (better accuracy)
- Cascading improvements:
  - Strategy Ranking: More accurate rankings
  - Overfitting Detection: More precise regime stability tests
  - Execution Simulator: More realistic regime-based simulations
  - Risk Management: Better adaptive risk adjustments
  - Signal Attribution: More accurate regime-aware performance
  - Portfolio Optimization: Better regime-aware allocation
- Every feature improves from single infrastructure improvement

**Compound Benefit:** Core infrastructure improvement lifts all features; compound effect across entire platform.

### Visual: Major Data Flows

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    INTELLIGENCE BACKBONE                         â”‚
â”‚         (Neo4j + Qdrant + ClickHouse + PostgreSQL)             â”‚
â”‚                                                                  â”‚
â”‚  Every action generates data â†’ Stored in knowledge graph â†’      â”‚
â”‚  AI processes â†’ Insights applied across ALL features            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
             â”‚                                    â”‚
    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”                  â”Œâ”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”
    â”‚  INPUT SOURCES  â”‚                  â”‚ OUTPUT TARGETS â”‚
    â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜                  â””â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜
             â”‚                                    â”‚
    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”
    â”‚                                                       â”‚
    â–¼                                                       â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Strategy        â”‚  â”‚ Market          â”‚  â”‚ User            â”‚
â”‚ Actions         â”‚  â”‚ Data            â”‚  â”‚ Behavior        â”‚
â”‚                 â”‚  â”‚                 â”‚  â”‚                 â”‚
â”‚ â€¢ Backtests     â”‚  â”‚ â€¢ Regime        â”‚  â”‚ â€¢ Journal       â”‚
â”‚ â€¢ Trades        â”‚  â”‚ â€¢ Sentiment     â”‚  â”‚ â€¢ Settings      â”‚
â”‚ â€¢ Adjustments   â”‚  â”‚ â€¢ Prices        â”‚  â”‚ â€¢ Approvals     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜
         â”‚                    â”‚                     â”‚
         â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                              â”‚
                              â–¼
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚  AI PROCESSING   â”‚
                    â”‚                  â”‚
                    â”‚ â€¢ PydanticAI     â”‚
                    â”‚ â€¢ LangGraph      â”‚
                    â”‚ â€¢ GraphRAG       â”‚
                    â”‚ â€¢ ML Models      â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                             â”‚
         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
         â”‚                   â”‚                   â”‚
         â–¼                   â–¼                   â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Personalized    â”‚ â”‚ Predictive      â”‚ â”‚ Automated       â”‚
â”‚ Insights        â”‚ â”‚ Warnings        â”‚ â”‚ Actions         â”‚
â”‚                 â”‚ â”‚                 â”‚ â”‚                 â”‚
â”‚ â€¢ Suggestions   â”‚ â”‚ â€¢ Degradation   â”‚ â”‚ â€¢ Rebalancing   â”‚
â”‚ â€¢ Optimization  â”‚ â”‚ â€¢ Risk alerts   â”‚ â”‚ â€¢ Risk adjust   â”‚
â”‚ â€¢ Learning      â”‚ â”‚ â€¢ Opportunities â”‚ â”‚ â€¢ Optimization  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Key Takeaway: The Ecosystem Effect

**Traditional Platform:** Features operate independently
- Backtest â†’ Results (end)
- Trade â†’ P&L (end)
- Setting change â†’ Applied (end)

**SymbioteTrader Ecosystem:** Features amplify each other
- Backtest â†’ Results â†’ Overfitting Detection â†’ Execution Simulator â†’ Paper Trading â†’ Live Trading â†’ Post-Trade Analysis â†’ Strategy Optimization â†’ Intelligence Backbone â†’ Future backtests improved
- Trade â†’ P&L â†’ Post-Trade Analysis â†’ Pattern Recognition â†’ Predictive Warnings â†’ Future losses prevented
- Setting change â†’ Applied â†’ Intelligence Backbone learns â†’ Future: Proactive suggestions â†’ Eventually: Automated

**The Difference:** In SymbioteTrader, nothing ends. Every action feeds the ecosystem, making the entire platform smarter.


---

## PART 2: CORE CAPABILITIES

### 6. Core Capabilities

### Trading Engine

#### Multi-Exchange Support

- CCXT unified interface; unified symbol mapping and time normalization
- Capability matrix per venue: order types, TIFs, tick-size/step-size, minNotional/lot sizes
- Per-exchange rate limits + global concurrency throttles; retries/backoff
- Idempotent orders via clientOrderId; dedup on reconnect; deterministic state
- Account sync: balances/positions; fee tiers (maker/taker), precision/rounding
- Routing: venue allowlist/denylist; primaryâ†’secondary failover
- Data: L2 order books, trades, OHLCV; snapshot+delta with backfill on resume
- Trigger price sources per venue: explicit control for last/mark/index; default per venue documented
- Post-only and reduce-only nuances: venue-specific enforcement and edge cases; fallback behavior
- Pre-trade margin and risk checks availability per venue; deterministic rejects handling
- Perp-specific: funding/index/mark specs; ADL/liquidation risk flags; trigger-by-mark/index behavior

- Region/KYC constraints respected; paper/live parity for supported venues

#### Strategy Framework

- Native Strategy API (first-class): deterministic backtests and paper/live parity
- Strategy Catalog: comprehensive presets (trend, momentum, mean-reversion, breakout, grid/DCA, regime filters, pairs/spread, ATR sizing)
- Strategy Builder (no-code/low-code): compose indicators, conditions, sizing, risk caps
- External signals: TradingView Pine alerts via signed webhooks (standard JSON)
- Strategy Advisor Agent: analyze external strategies (Pine/Freqtrade/Backtrader/Lean) and:
  - recommend closest catalog match with parameterization, or
  - generate a native strategy stub and run parity checks on canonical datasets
- Signal normalization: bar-close vs intrabar triggering; debounce/throttle; clock-skew correction; UTC timestamps

##### Strategy SDK & Three-Tier Creation System

**Core Philosophy:** SymbioteTrader provides three ways to create strategies, aligned with Progressive Mastery. All three methods compile to the same canonical Strategy Definition format, ensuring consistency, portability, and deep integration with the Intelligence Backbone.

**Three Tiers:**
1. **Visual Builder (No-Code)** - Drag-and-drop node-based editor for beginners
2. **YAML Format (Low-Code)** - Human-readable declarative format for intermediate users
3. **Python SDK (Full-Code)** - Complete programmatic control for advanced users

**Key Design Principles:**
- **Single Source of Truth**: All methods compile to canonical Strategy Definition (JSON)
- **Bidirectional Conversion**: Visual â†” YAML â†” Python (where semantically possible)
- **Deep Instrumentation**: Every strategy execution is fully instrumented for Intelligence Backbone
- **Deterministic Execution**: Identical behavior across backtest/paper/live
- **Git-Friendly**: YAML and JSON formats are version-controllable
- **AI-Native**: Structured formats enable AI generation, modification, and explanation

**Architecture Overview:**

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚           USER CREATES STRATEGY (3 Methods)                  â”‚
â”‚                                                              â”‚
â”‚  Visual Builder    YAML Format       Python SDK             â”‚
â”‚  (Drag & Drop)     (Declarative)     (Programmatic)         â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
           â”‚             â”‚                  â”‚
           â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                         â”‚
                         â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚         STRATEGY DEFINITION (Canonical JSON)                 â”‚
â”‚  â€¢ Metadata (name, version, author, family)                 â”‚
â”‚  â€¢ Parameters (tunable values with ranges)                  â”‚
â”‚  â€¢ Indicators (definitions and configurations)              â”‚
â”‚  â€¢ Conditions (entry/exit logic)                            â”‚
â”‚  â€¢ Risk Management (sizing, stops, limits)                  â”‚
â”‚  â€¢ Execution Hints (order types, timing)                    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                       â”‚
                       â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚      STRATEGY EXECUTION ENGINE (Instrumented)                â”‚
â”‚  â€¢ Wraps Backtrader/vectorbt with telemetry layer          â”‚
â”‚  â€¢ Intercepts all events (bars, signals, orders, fills)    â”‚
â”‚  â€¢ Captures internal state (indicators, positions, P&L)     â”‚
â”‚  â€¢ Emits structured events to Intelligence Backbone         â”‚
â”‚  â€¢ Enforces risk limits and guardrails                      â”‚
â”‚  â€¢ Provides correlation IDs for causality tracking          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                       â”‚
                       â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚              INTELLIGENCE BACKBONE                           â”‚
â”‚  â€¢ ClickHouse: Time-series events (ticks, signals, fills)  â”‚
â”‚  â€¢ PostgreSQL: Structured metadata (strategies, params)     â”‚
â”‚  â€¢ Neo4j: Relationships (strategy â†’ conditions â†’ outcomes)  â”‚
â”‚  â€¢ Qdrant: Embeddings (semantic search, pattern matching)  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Why Proprietary SDK:**

The SDK must be deeply integrated with the platform (not a generic framework like Backtrader alone) because:

1. **Full Instrumentation**: Captures every indicator calculation, signal generation, decision point, and state change
2. **Structured Telemetry**: Emits Pydantic-validated events to Intelligence Backbone in real-time
3. **Correlation Tracking**: Every event has correlation_id to trace causality ("this trade happened because RSI crossed 30")
4. **Bidirectional Control**: Platform can pause/resume/kill strategies; inject risk limits dynamically
5. **AI Integration**: Strategies are semantically understood by AI (not black boxes); AI can generate/modify/explain them
6. **Ecosystem Integration**: Strategies interact with Signal Hub, Risk Governance, Execution Quality, Overfitting Detection, etc.

Generic frameworks (Backtrader, Freqtrade) are supported via **Strategy Advisor Agent** which converts them to native format, but native strategies get full platform benefits.

###### Tier 1: Visual Strategy Builder (Drag-and-Drop)

**Target Audience:** Beginners, traders with no coding experience, rapid prototyping

**Interface:** Node-based DAG editor using React Flow

**Features:**
- Node-based editor (DAG): sources â†’ indicators/transforms â†’ conditions/logic â†’ sizing â†’ risk â†’ execution
- Block library: indicators (TA), math/filters, price action, session/time filters, stateful blocks (cooldowns/counters), MTF aggregator, multi-asset join/spread, custom Python node (Pydantic schema)
- Multi-timeframe & multi-asset: explicit alignment and warmup; lookback windows per node; bar-close vs intrabar semantics
- Parameters: sliders/inputs with ranges, presets, and tunable flags; global vs per-node; inheritance/overrides
- In-UI backtest: one-click run on chosen symbol/timeframe; overlay entries/exits on chart; equity curve, P&L, drawdown, hit rate, slippage/fees
- Parity & portability: compiles to Native Strategy API; deterministic JSON schema; import/export; git-friendly diffs; optional Python stub generation
- Validation & guardrails: type-safe wiring; minNotional/step-size/precision checks; required SL/TP for perps/futures; dry-run and static analysis
- Promotion workflow: submit DAG to paper/canary; approvals with diffs/comments; versioning and change history; revert/clone templates
- Testing aids: scenario runner, walk-forward splits, parameter sweeps, Monte Carlo (returns reshuffle) with result comparison
- Templates & recipes: common patterns (trend/momo/mean-reversion/breakout/grid/DCA, regime filters, pairs/spreads); searchable palette; share/import codes

**Export Capabilities:**
- Export to Strategy Definition JSON (canonical format)
- Export to YAML (human-readable, editable in text editor)
- Export to Python SDK stub (for advanced customization)
- Share via import code (community sharing)

**Example Visual Strategy:**

```
[Data Source: BTCUSDT 15m]
    â†“
[Indicator: RSI(14)]
    â†“
[Condition: RSI < 30] â”€â”€â†’ [Entry: Long]
    â†“                         â†“
[Indicator: SMA(Volume, 20)] [Position Size: 5% portfolio]
    â†“                         â†“
[Condition: Volume > SMA] â”€â”€â†’ [Stop Loss: 2%]
                              â†“
                         [Take Profit: 4%]
```

This visual strategy compiles to Strategy Definition JSON, which can then be exported to YAML or Python.

###### Tier 2: YAML Format (Declarative Low-Code)

**Target Audience:** Intermediate users, those comfortable with configuration files, version control enthusiasts

**Format:** Human-readable YAML with structured schema

**Benefits:**
- Human-readable and writable
- Git-friendly (easy to diff, merge, review)
- Can be edited in any text editor
- Supports comments and documentation inline
- Easy to share and collaborate
- AI can easily generate and modify
- Portable across systems

**YAML Strategy Schema:**

```yaml
# Strategy metadata
strategy:
  name: "Mean Reversion BTC"
  version: "1.0.0"
  description: "RSI-based mean reversion strategy for Bitcoin"
  author: "user_id"
  family: "mean_reversion"
  tags: ["crypto", "rsi", "mean_reversion", "short_term"]

  # Asset and timeframe configuration
  assets:
    - symbol: "BTCUSDT"
      asset_class: "crypto_cex"  # crypto_cex, crypto_dex, stock, etf, forex, futures, options
      venue: "binance"
      timeframe: "15m"

  # Tunable parameters (exposed in UI, optimizable)
  parameters:
    rsi_period:
      type: integer
      default: 14
      min: 7
      max: 28
      step: 1
      description: "RSI calculation period"

    rsi_oversold:
      type: float
      default: 30.0
      min: 20.0
      max: 40.0
      step: 1.0
      description: "RSI oversold threshold for long entry"

    rsi_overbought:
      type: float
      default: 70.0
      min: 60.0
      max: 80.0
      step: 1.0
      description: "RSI overbought threshold for short entry"

    stop_loss_pct:
      type: float
      default: 2.0
      min: 0.5
      max: 5.0
      step: 0.1
      description: "Stop loss percentage"

    take_profit_pct:
      type: float
      default: 4.0
      min: 1.0
      max: 10.0
      step: 0.5
      description: "Take profit percentage"

    volume_sma_period:
      type: integer
      default: 20
      min: 10
      max: 50
      step: 5
      description: "Volume SMA period for confirmation"

  # Indicator definitions
  indicators:
    - id: rsi_main
      type: RSI
      params:
        period: ${rsi_period}
        source: close
      output: rsi_value

    - id: volume_sma
      type: SMA
      params:
        period: ${volume_sma_period}
        source: volume
      output: volume_avg

    - id: ema_20
      type: EMA
      params:
        period: 20
        source: close
      output: ema_20_value

  # Entry conditions
  entry:
    long:
      conditions:
        - indicator: rsi_value
          operator: "<"
          value: ${rsi_oversold}
          description: "RSI below oversold threshold"

        - indicator: volume
          operator: ">"
          value: ${volume_avg}
          description: "Volume above average"

      logic: "AND"  # All conditions must be true

      # Optional: additional filters
      filters:
        - type: time_filter
          params:
            allowed_hours: [9, 10, 11, 12, 13, 14, 15, 16]  # Trading hours UTC

        - type: regime_filter
          params:
            allowed_regimes: ["trending", "volatile"]

    short:
      conditions:
        - indicator: rsi_value
          operator: ">"
          value: ${rsi_overbought}
          description: "RSI above overbought threshold"

      logic: "AND"
      enabled: false  # Short trading disabled by default

  # Exit conditions
  exit:
    stop_loss:
      type: percentage
      value: ${stop_loss_pct}
      trailing: false

    take_profit:
      type: percentage
      value: ${take_profit_pct}
      partial_exits:
        - at_pct: 2.0
          close_pct: 50  # Close 50% of position at 2% profit
        - at_pct: 4.0
          close_pct: 100  # Close remaining at 4% profit

    # Time-based exit
    max_hold_time:
      enabled: false
      hours: 24

    # Condition-based exit
    conditions:
      - indicator: rsi_value
        operator: ">"
        value: 50
        description: "Exit when RSI returns to neutral"
        enabled: false

  # Position sizing and risk management
  risk:
    position_sizing:
      method: "fixed_percentage"  # or "fixed_amount", "kelly", "volatility_adjusted"
      value: 5.0  # 5% of portfolio per trade

    max_positions: 3
    max_portfolio_risk: 10.0  # Max 10% of portfolio at risk

    # Per-trade limits
    max_position_size: 1000  # USD
    min_position_size: 10    # USD

    # Leverage (for margin/futures)
    leverage:
      enabled: false
      max: 1.0

  # Execution preferences
  execution:
    order_type: "limit"  # or "market"

    limit_order:
      offset_pct: 0.1  # Place limit 0.1% better than current price
      timeout_seconds: 60
      fallback_to_market: true

    maker_taker_preference: "maker"  # Prefer maker orders for lower fees

    # Execution algorithm for large orders
    algo:
      enabled: false
      type: "TWAP"  # or "VWAP", "POV"
      params:
        duration_minutes: 5
        num_slices: 10

  # Backtesting configuration
  backtest:
    initial_capital: 10000
    commission: 0.001  # 0.1% per trade
    slippage: 0.0005   # 0.05% slippage

    # Data requirements
    warmup_bars: 50  # Bars needed before first signal

    # Validation
    min_trades: 30  # Minimum trades for valid backtest
    min_duration_days: 90

  # Metadata for Intelligence Backbone
  metadata:
    strategy_family: "mean_reversion"
    complexity: "simple"  # simple, moderate, complex
    market_regime_preference: ["ranging", "low_volatility"]
    asset_classes: ["crypto"]
    timeframe_category: "intraday"
```

**YAML Validation:**
- Schema validation on import (Pydantic models)
- Parameter range validation
- Indicator compatibility checks
- Circular dependency detection
- Missing required fields warnings

**YAML to Other Formats:**
- Import YAML â†’ Compile to Strategy Definition JSON â†’ Load in Visual Builder
- Import YAML â†’ Generate Python SDK stub for advanced customization
- Export YAML â†’ Share with community (human-readable)

###### Tier 3: Python SDK (Full Programmatic Control)

**Target Audience:** Advanced users, quants, developers, those needing maximum flexibility

**Language:** Python 3.10+ with type hints

**Benefits:**
- Complete programmatic control
- Access to full Python ecosystem (numpy, pandas, scipy, etc.)
- Custom logic and complex algorithms
- Event-driven or vectorized execution
- Full IDE support (autocomplete, type checking, debugging)
- Unit testable
- Can use external libraries and APIs

**Python SDK Architecture:**

```python
from symbiotetrader import Strategy, Indicator, Event, RiskManager
from symbiotetrader.types import Bar, Position, Order
from typing import Optional

class MeanReversionBTC(Strategy):
    """
    RSI-based mean reversion strategy for Bitcoin.

    All strategies inherit from Strategy base class which provides:
    - Automatic instrumentation and telemetry
    - Integration with Intelligence Backbone
    - Risk management enforcement
    - Execution engine integration
    - Backtesting and live trading parity
    """

    # Strategy metadata (used by Intelligence Backbone)
    __strategy_name__ = "Mean Reversion BTC"
    __version__ = "1.0.0"
    __family__ = "mean_reversion"
    __tags__ = ["crypto", "rsi", "mean_reversion", "short_term"]

    # Tunable parameters (exposed in UI, optimizable)
    # These are automatically tracked and can be adjusted without code changes
    rsi_period: int = 14
    rsi_oversold: float = 30.0
    rsi_overbought: float = 70.0
    stop_loss_pct: float = 2.0
    take_profit_pct: float = 4.0
    volume_sma_period: int = 20

    def __init__(self):
        """
        Initialize strategy.
        Platform automatically injects:
        - self.telemetry: TelemetryEmitter for event tracking
        - self.risk_manager: RiskManager for position sizing and limits
        - self.portfolio: Portfolio state
        - self.logger: Structured logger with correlation_id
        """
        super().__init__()

        # Indicators (automatically instrumented)
        self.rsi: Optional[Indicator] = None
        self.volume_sma: Optional[Indicator] = None
        self.ema_20: Optional[Indicator] = None

    def setup(self):
        """
        Called once before strategy starts.
        Define indicators, load data, initialize state.
        """
        # Create indicators (automatically tracked by platform)
        self.rsi = Indicator.RSI(
            period=self.rsi_period,
            source='close',
            name='rsi_main'
        )

        self.volume_sma = Indicator.SMA(
            period=self.volume_sma_period,
            source='volume',
            name='volume_avg'
        )

        self.ema_20 = Indicator.EMA(
            period=20,
            source='close',
            name='ema_20'
        )

        # Platform knows: this strategy uses RSI, SMA, EMA
        # Intelligence Backbone can now correlate with other RSI strategies

        self.logger.info(f"Strategy initialized with RSI period {self.rsi_period}")

    def on_bar(self, bar: Bar):
        """
        Called on every new bar (candle).
        Main strategy logic goes here.

        Platform automatically:
        - Emits BAR_RECEIVED event
        - Captures bar data
        - Tracks execution time
        - Handles errors and emits ERROR events
        """
        # Calculate indicators (automatically captured)
        rsi_value = self.rsi.calculate(bar)
        volume_avg = self.volume_sma.calculate(bar)
        ema_value = self.ema_20.calculate(bar)

        # Platform emits INDICATOR_CALCULATED events for each

        # Get current position
        position = self.portfolio.get_position(bar.symbol)

        # Entry logic
        if position is None or position.size == 0:
            # Check long entry conditions
            if rsi_value < self.rsi_oversold and bar.volume > volume_avg:
                # Platform emits SIGNAL_GENERATED event
                self.telemetry.emit(Event.SIGNAL_GENERATED, {
                    "type": "entry_long",
                    "conditions": [
                        {"condition": "rsi < rsi_oversold", "result": True,
                         "values": {"rsi": rsi_value, "threshold": self.rsi_oversold}},
                        {"condition": "volume > volume_avg", "result": True,
                         "values": {"volume": bar.volume, "avg": volume_avg}}
                    ],
                    "confidence": self._calculate_confidence(rsi_value, bar.volume, volume_avg)
                })

                # Calculate position size (risk manager enforces limits)
                size = self.risk_manager.calculate_position_size(
                    symbol=bar.symbol,
                    price=bar.close,
                    risk_pct=5.0,  # 5% of portfolio
                    stop_loss_pct=self.stop_loss_pct
                )

                # Place order (automatically captured)
                self.enter_long(
                    symbol=bar.symbol,
                    size=size,
                    stop_loss_pct=self.stop_loss_pct,
                    take_profit_pct=self.take_profit_pct,
                    reason="RSI oversold + volume confirmation"
                )
                # Platform emits ORDER_PLACED event

        # Exit logic
        elif position.size > 0:
            # Check if RSI returned to neutral (optional exit)
            if rsi_value > 50:
                self.telemetry.emit(Event.SIGNAL_GENERATED, {
                    "type": "exit_long",
                    "reason": "rsi_neutral",
                    "conditions": [
                        {"condition": "rsi > 50", "result": True,
                         "values": {"rsi": rsi_value}}
                    ]
                })

                self.close_position(
                    symbol=bar.symbol,
                    reason="RSI returned to neutral"
                )

    def on_order_filled(self, order: Order):
        """
        Called when an order is filled.
        Optional: custom logic after fills.
        """
        self.logger.info(f"Order filled: {order.side} {order.filled_size} @ {order.fill_price}")

        # Platform automatically emits ORDER_FILLED event
        # Platform automatically updates position
        # Platform automatically calculates slippage and fees

    def on_trade_closed(self, trade):
        """
        Called when a trade is closed (position fully exited).
        Optional: custom logic after trade completion.
        """
        self.logger.info(f"Trade closed: PnL {trade.pnl_pct:.2f}%")

        # Platform automatically emits TRADE_CLOSED event
        # Intelligence Backbone analyzes trade outcome

    def _calculate_confidence(self, rsi: float, volume: float, volume_avg: float) -> float:
        """
        Custom helper method to calculate signal confidence.
        This is user-defined logic.
        """
        # More oversold = higher confidence
        rsi_confidence = (self.rsi_oversold - rsi) / self.rsi_oversold

        # More volume = higher confidence
        volume_confidence = min((volume / volume_avg - 1.0), 1.0)

        return (rsi_confidence + volume_confidence) / 2.0

    def get_risk_config(self) -> dict:
        """
        Define risk management configuration.
        Platform enforces these limits.
        """
        return {
            "max_positions": 3,
            "max_portfolio_risk": 10.0,  # Max 10% of portfolio at risk
            "max_position_size": 1000,   # USD
            "min_position_size": 10,     # USD
            "max_leverage": 1.0
        }
```

**SDK Core Classes:**

```python
# Base Strategy class (all strategies inherit from this)
class Strategy:
    """Base class for all strategies with automatic instrumentation."""

    def __init__(self):
        self.telemetry: TelemetryEmitter
        self.risk_manager: RiskManager
        self.portfolio: Portfolio
        self.logger: Logger
        self.id: str  # Unique strategy instance ID
        self.correlation_id: str  # Current execution correlation ID

    def setup(self):
        """Override: Initialize indicators and state."""
        pass

    def on_bar(self, bar: Bar):
        """Override: Called on every new bar."""
        pass

    def on_tick(self, tick: Tick):
        """Override: Called on every tick (high-frequency)."""
        pass

    def on_order_filled(self, order: Order):
        """Override: Called when order is filled."""
        pass

    def on_trade_closed(self, trade: Trade):
        """Override: Called when trade is closed."""
        pass

    def enter_long(self, symbol: str, size: float, stop_loss_pct: float = None,
                   take_profit_pct: float = None, reason: str = None):
        """Enter long position (automatically instrumented)."""
        pass

    def enter_short(self, symbol: str, size: float, stop_loss_pct: float = None,
                    take_profit_pct: float = None, reason: str = None):
        """Enter short position (automatically instrumented)."""
        pass

    def close_position(self, symbol: str, reason: str = None):
        """Close position (automatically instrumented)."""
        pass

    def get_risk_config(self) -> dict:
        """Override: Define risk management configuration."""
        return {}

# Indicator library (all indicators are instrumented)
class Indicator:
    """Base class for indicators with automatic telemetry."""

    @staticmethod
    def RSI(period: int, source: str = 'close', name: str = None) -> 'RSIIndicator':
        """Create RSI indicator."""
        pass

    @staticmethod
    def SMA(period: int, source: str = 'close', name: str = None) -> 'SMAIndicator':
        """Create SMA indicator."""
        pass

    @staticmethod
    def EMA(period: int, source: str = 'close', name: str = None) -> 'EMAIndicator':
        """Create EMA indicator."""
        pass

    # ... 100+ indicators available

# Data types
@dataclass
class Bar:
    """OHLCV bar data."""
    timestamp: datetime
    symbol: str
    open: float
    high: float
    low: float
    close: float
    volume: float

from enum import Enum

class AssetClass(str, Enum):
    """Asset class taxonomy for multi-asset trading."""
    CRYPTO_CEX = "crypto_cex"          # Cryptocurrency centralized exchange
    CRYPTO_DEX = "crypto_dex"          # Cryptocurrency decentralized exchange
    STOCK = "stock"                    # Individual stocks
    ETF = "etf"                        # Exchange-traded funds
    FOREX = "forex"                    # Foreign exchange (currency pairs)
    FUTURES = "futures"                # Futures contracts
    OPTIONS = "options"                # Options contracts

@dataclass
class Position:
    """Current position state."""
    symbol: str
    asset_class: AssetClass  # Asset class (crypto_cex, stock, forex, etc.)
    venue: str  # Exchange/broker name (binance, ibkr, oanda, etc.)
    size: float
    entry_price: float
    current_price: float
    unrealized_pnl: float
    unrealized_pnl_pct: float

@dataclass
class Order:
    """Order state."""
    id: str
    symbol: str
    asset_class: AssetClass  # Asset class (crypto_cex, stock, forex, etc.)
    venue: str  # Exchange/broker name (binance, ibkr, oanda, etc.)
    side: str  # 'buy' or 'sell'
    size: float
    price: float
    order_type: str
    status: str
    filled_size: float
    fill_price: float
```

**Advanced SDK Features:**

```python
# Vectorized execution (for backtesting performance)
class VectorizedStrategy(Strategy):
    """Base class for vectorized strategies (pandas/numpy)."""

    def calculate(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Override: Calculate signals on entire dataframe.
        Much faster for backtesting.
        """
        pass

# Multi-asset strategies
class MultiAssetStrategy(Strategy):
    """Base class for strategies trading multiple assets."""

    def setup(self):
        self.symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']

    def on_bar(self, bars: Dict[str, Bar]):
        """Receives bars for all symbols."""
        pass

# Custom indicators
class CustomIndicator(Indicator):
    """Create custom indicators."""

    def __init__(self, period: int):
        super().__init__()
        self.period = period

    def calculate(self, data: pd.Series) -> float:
        """Implement custom calculation."""
        return data.rolling(self.period).apply(lambda x: custom_logic(x))
```

###### Strategy Instrumentation & Telemetry Architecture

**Purpose:** Every strategy (regardless of creation method) is fully instrumented to capture all execution data for the Intelligence Backbone.

**Core Concept:** The Strategy Execution Engine wraps user strategies with an instrumentation layer that intercepts and captures every event, decision, and state change.

**Instrumentation Layers:**

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    USER STRATEGY                             â”‚
â”‚  (Visual Builder / YAML / Python SDK)                        â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                       â”‚
                       â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚           STRATEGY EXECUTION ENGINE                          â”‚
â”‚  (Instrumentation Wrapper)                                   â”‚
â”‚                                                              â”‚
â”‚  Intercepts:                                                 â”‚
â”‚  â€¢ on_bar() â†’ Emit BAR_RECEIVED event                       â”‚
â”‚  â€¢ indicator.calculate() â†’ Emit INDICATOR_CALCULATED event  â”‚
â”‚  â€¢ Signal generation â†’ Emit SIGNAL_GENERATED event          â”‚
â”‚  â€¢ enter_long/short() â†’ Emit ORDER_PLACED event             â”‚
â”‚  â€¢ Order fills â†’ Emit ORDER_FILLED event                    â”‚
â”‚  â€¢ Position updates â†’ Emit POSITION_UPDATED event           â”‚
â”‚  â€¢ Trade closes â†’ Emit TRADE_CLOSED event                   â”‚
â”‚  â€¢ Errors â†’ Emit ERROR event                                â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                       â”‚
                       â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚              TELEMETRY SINK (Event Bus)                      â”‚
â”‚  â€¢ Validates events (Pydantic schemas)                      â”‚
â”‚  â€¢ Adds correlation_id to all events                        â”‚
â”‚  â€¢ Routes events to appropriate storage                     â”‚
â”‚  â€¢ Triggers real-time analysis                              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                       â”‚
        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
        â”‚              â”‚              â”‚              â”‚
        â–¼              â–¼              â–¼              â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ ClickHouse  â”‚ â”‚ PostgreSQL  â”‚ â”‚  Neo4j  â”‚ â”‚   Qdrant    â”‚
â”‚ Time-series â”‚ â”‚ Structured  â”‚ â”‚  Graph  â”‚ â”‚  Vectors    â”‚
â”‚ events      â”‚ â”‚ metadata    â”‚ â”‚ relationsâ”‚ â”‚ embeddings  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Telemetry Event Schemas (Pydantic Models):**

```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, List, Any

# Base event (all events inherit from this)
class TelemetryEvent(BaseModel):
    event_type: str
    timestamp: datetime
    strategy_id: str
    correlation_id: str
    environment: str  # 'backtest', 'paper', 'live'

# Bar received event
class BarReceivedEvent(TelemetryEvent):
    event_type: str = "bar_received"
    symbol: str
    timeframe: str
    bar_data: Dict[str, float]  # open, high, low, close, volume

# Indicator calculated event
class IndicatorCalculatedEvent(TelemetryEvent):
    event_type: str = "indicator_calculated"
    indicator_name: str
    indicator_id: str
    indicator_params: Dict[str, Any]
    value: float
    source_bar_timestamp: datetime

# Signal generated event
class SignalGeneratedEvent(TelemetryEvent):
    event_type: str = "signal_generated"
    signal_type: str  # 'entry_long', 'entry_short', 'exit_long', 'exit_short'
    symbol: str
    conditions_met: List[Dict[str, Any]]  # List of conditions with values
    confidence: Optional[float] = None
    reason: Optional[str] = None

# Decision made event
class DecisionMadeEvent(TelemetryEvent):
    event_type: str = "decision_made"
    decision: str  # 'place_order', 'skip', 'wait'
    signal_id: str
    order_params: Optional[Dict[str, Any]] = None
    risk_checks_passed: bool
    skip_reason: Optional[str] = None

# Order placed event
class OrderPlacedEvent(TelemetryEvent):
    event_type: str = "order_placed"
    order_id: str
    venue: str
    symbol: str
    side: str  # 'buy', 'sell'
    size: float
    price: float
    order_type: str  # 'market', 'limit', 'stop'
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None

# Order filled event
class OrderFilledEvent(TelemetryEvent):
    event_type: str = "order_filled"
    order_id: str
    fill_price: float
    fill_size: float
    slippage: float  # Percentage
    fees: float
    execution_time_ms: int

# Position updated event
class PositionUpdatedEvent(TelemetryEvent):
    event_type: str = "position_updated"
    symbol: str
    position_size: float
    entry_price: float
    current_price: float
    unrealized_pnl: float
    unrealized_pnl_pct: float

# Trade closed event
class TradeClosedEvent(TelemetryEvent):
    event_type: str = "trade_closed"
    trade_id: str
    symbol: str
    entry_time: datetime
    exit_time: datetime
    duration_seconds: int
    entry_price: float
    exit_price: float
    size: float
    pnl: float
    pnl_pct: float
    outcome: str  # 'win', 'loss', 'breakeven'
    exit_reason: str  # 'take_profit', 'stop_loss', 'signal', 'manual'
    fees_total: float
    slippage_total: float

# State snapshot event (periodic)
class StateSnapshotEvent(TelemetryEvent):
    event_type: str = "state_snapshot"
    indicators: Dict[str, float]
    positions: Dict[str, Dict[str, Any]]
    portfolio: Dict[str, float]
    risk_metrics: Dict[str, float]

# Error event
class ErrorEvent(TelemetryEvent):
    event_type: str = "error"
    error_type: str
    error_message: str
    traceback: Optional[str] = None
    context: Dict[str, Any]
```

**Telemetry Emitter (Injected into Strategies):**

```python
class TelemetryEmitter:
    """
    Injected into every strategy instance.
    Provides methods to emit telemetry events.
    """

    def __init__(self, strategy_id: str, event_bus: EventBus):
        self.strategy_id = strategy_id
        self.event_bus = event_bus
        self.correlation_id = self._generate_correlation_id()

    def emit(self, event_type: str, data: Dict[str, Any]):
        """Emit a telemetry event."""
        event = self._create_event(event_type, data)
        self.event_bus.publish(event)

    def _create_event(self, event_type: str, data: Dict[str, Any]) -> TelemetryEvent:
        """Create and validate event using Pydantic model."""
        event_class = EVENT_TYPE_MAP[event_type]
        return event_class(
            strategy_id=self.strategy_id,
            correlation_id=self.correlation_id,
            timestamp=datetime.utcnow(),
            **data
        )
```

**Event Bus (Routes Events to Storage):**

```python
class EventBus:
    """
    Receives telemetry events and routes to appropriate storage.
    """

    def __init__(self):
        self.clickhouse_client = ClickHouseClient()
        self.postgres_client = PostgresClient()
        self.neo4j_client = Neo4jClient()
        self.qdrant_client = QdrantClient()

    def publish(self, event: TelemetryEvent):
        """Route event to appropriate storage."""

        # All events go to ClickHouse (time-series)
        self.clickhouse_client.insert(event)

        # Route specific events to other stores
        if isinstance(event, SignalGeneratedEvent):
            # Store in Neo4j for relationship tracking
            self._store_signal_relationship(event)

        if isinstance(event, TradeClosedEvent):
            # Store in PostgreSQL for structured queries
            self._store_trade_result(event)

            # Create embedding for Qdrant (semantic search)
            self._create_trade_embedding(event)

        # Trigger real-time analysis
        self._trigger_analysis(event)

    def _store_signal_relationship(self, event: SignalGeneratedEvent):
        """Store signal â†’ outcome relationship in Neo4j."""
        self.neo4j_client.execute("""
            MATCH (s:Strategy {id: $strategy_id})
            CREATE (sig:Signal {
                id: $signal_id,
                type: $signal_type,
                timestamp: $timestamp,
                conditions: $conditions
            })
            CREATE (s)-[:GENERATED]->(sig)
        """, {
            "strategy_id": event.strategy_id,
            "signal_id": event.correlation_id,
            "signal_type": event.signal_type,
            "timestamp": event.timestamp,
            "conditions": event.conditions_met
        })

    def _create_trade_embedding(self, event: TradeClosedEvent):
        """Create semantic embedding for trade."""
        # Get strategy metadata
        strategy = self.postgres_client.get_strategy(event.strategy_id)

        # Create embedding from trade characteristics
        embedding = embed({
            "strategy_family": strategy.family,
            "indicators": strategy.indicators,
            "outcome": event.outcome,
            "pnl_pct": event.pnl_pct,
            "duration_hours": event.duration_seconds / 3600,
            "exit_reason": event.exit_reason
        })

        # Store in Qdrant
        self.qdrant_client.upsert(
            collection_name="trades",
            points=[{
                "id": event.trade_id,
                "vector": embedding,
                "payload": event.dict()
            }]
        )
```

**Intelligence Backbone Integration:**

```python
class IntelligenceBackbone:
    """
    Analyzes telemetry data to provide insights.
    """

    def analyze_strategy_health(self, strategy_id: str) -> Dict[str, Any]:
        """Real-time strategy health analysis."""

        # Query ClickHouse for recent trades
        trades = self.clickhouse.query("""
            SELECT *
            FROM trade_closed_events
            WHERE strategy_id = {strategy_id}
              AND timestamp > NOW() - INTERVAL 30 DAY
            ORDER BY timestamp DESC
        """, {"strategy_id": strategy_id})

        # Calculate metrics
        win_rate = sum(1 for t in trades if t.outcome == 'win') / len(trades)
        avg_return = sum(t.pnl_pct for t in trades) / len(trades)
        sharpe = self._calculate_sharpe(trades)

        # Query Neo4j for pattern analysis
        patterns = self.neo4j.query("""
            MATCH (s:Strategy {id: $strategy_id})-[:GENERATED]->(sig:Signal)
            MATCH (sig)-[:RESULTED_IN]->(outcome:Outcome)
            RETURN sig.type, outcome.result, COUNT(*) as count
        """, {"strategy_id": strategy_id})

        # Query Qdrant for similar strategies
        similar = self.qdrant.search(
            collection_name="strategies",
            query_vector=self._get_strategy_embedding(strategy_id),
            limit=5
        )

        return {
            "health_score": self._calculate_health_score(win_rate, sharpe),
            "win_rate": win_rate,
            "avg_return": avg_return,
            "sharpe": sharpe,
            "patterns": patterns,
            "similar_strategies": similar,
            "insights": self._generate_insights(trades, patterns, similar)
        }

    def detect_overfitting(self, strategy_id: str) -> Dict[str, Any]:
        """Compare backtest vs live performance."""

        # Get backtest results
        backtest = self.postgres.get_backtest_results(strategy_id)

        # Get live results
        live_trades = self.clickhouse.query("""
            SELECT *
            FROM trade_closed_events
            WHERE strategy_id = {strategy_id}
              AND environment = 'live'
        """, {"strategy_id": strategy_id})

        # Compare metrics
        backtest_sharpe = backtest.sharpe
        live_sharpe = self._calculate_sharpe(live_trades)
        degradation = (backtest_sharpe - live_sharpe) / backtest_sharpe

        # Calculate overfitting risk score
        risk_score = self._calculate_overfitting_risk(
            degradation=degradation,
            num_parameters=len(backtest.parameters),
            num_trades=len(live_trades)
        )

        return {
            "risk_score": risk_score,
            "risk_level": "HIGH" if risk_score > 60 else "MEDIUM" if risk_score > 30 else "LOW",
            "backtest_sharpe": backtest_sharpe,
            "live_sharpe": live_sharpe,
            "degradation_pct": degradation * 100,
            "recommendation": self._get_overfitting_recommendation(risk_score)
        }
```

**Data Flow Example (Complete Lifecycle):**

```
1. User creates strategy in Visual Builder
   â†“
2. Strategy compiled to Strategy Definition JSON
   â†“
3. User runs backtest
   â†“
4. Strategy Execution Engine wraps strategy with instrumentation
   â†“
5. For each bar:
   - Engine calls strategy.on_bar(bar)
   - Engine emits BAR_RECEIVED event â†’ ClickHouse
   - Strategy calculates RSI
   - Engine emits INDICATOR_CALCULATED event â†’ ClickHouse
   - Strategy generates signal (RSI < 30)
   - Engine emits SIGNAL_GENERATED event â†’ ClickHouse + Neo4j
   - Strategy places order
   - Engine emits ORDER_PLACED event â†’ ClickHouse
   â†“
6. Order fills
   - Engine emits ORDER_FILLED event â†’ ClickHouse
   - Engine emits POSITION_UPDATED event â†’ ClickHouse
   â†“
7. Trade closes
   - Engine emits TRADE_CLOSED event â†’ ClickHouse + PostgreSQL + Qdrant
   - Neo4j creates relationship: Signal â†’ Trade â†’ Outcome
   â†“
8. Intelligence Backbone analyzes:
   - Queries ClickHouse for performance metrics
   - Queries Neo4j for pattern analysis
   - Queries Qdrant for similar strategies
   - Generates insights and recommendations
   â†“
9. User sees in UI:
   - Strategy Health Dashboard (real-time metrics)
   - AI Insights ("Your strategy performs 40% better in high volatility")
   - Overfitting Warning ("Risk score: 72 - HIGH RISK")
   - Similar Strategies ("5 similar strategies found")
```

**Key Benefits of This Architecture:**

1. **Complete Observability**: Every decision, signal, and outcome is captured
2. **Causality Tracking**: correlation_id links signals â†’ orders â†’ fills â†’ outcomes
3. **Real-Time Analysis**: Intelligence Backbone analyzes data as it's generated
4. **Pattern Recognition**: Neo4j finds relationships between conditions and outcomes
5. **Semantic Search**: Qdrant finds similar strategies and patterns
6. **AI-Enhanced Insights**: LLMs analyze structured data to generate insights
7. **Overfitting Detection**: Compare backtest vs live performance automatically
8. **Strategy Ranking**: Rank strategies based on multi-dimensional performance
9. **Personalized Learning**: System learns from user's specific strategies and outcomes
10. **Ecosystem Integration**: All features access same telemetry data

##### Additional Strategy Families & Semantics
- Statistical arbitrage: pairs/triples cointegration tests, meanâ€‘reverting spread definitions, hedge ratio estimation, rebalancing/stop logic
- Funding/basis carry: funding rate ingestion, basis screens, hedged construction, rollover, borrow/funding cost accounting
- Triangular/crossâ€‘venue arbitrage: opportunity detection, execution sequencing, slippage ceilings, synthetic quoteâ€‘thenâ€‘commit
- Eventâ€‘driven playbooks: event windows, quiet periods, sizing rules for listings/maintenance/macro releases
- Crossâ€‘sectional overlays: momentum/rotation and cluster/sector tilts
- Signal semantics: entry, scaleâ€‘in/out, partial TP ladders, exit, stop tighten/loosen; priority rules and debounce when multiple signals coincide

- Execution hints: maker/taker bias, post-only/reduce-only, TIF preferences, tranche sizing and pacing; child-order algo selection (TWAP/VWAP/POV)
- Observability: correlation_id propagation; inline debug taps/log nodes; simulated latency and exchange quirks toggles
- AI assist: Strategy Advisor Agent suggests blocks/params, flags risk issues, and can convert textual descriptions to a starter DAG

- Safety envelopes: position/leverage caps, venue/asset allowlists, daily loss limits
- Promotion flow: backtest â†’ paper/canary â†’ live with approvals and gates

#### Technical Indicators Coverage

- Comprehensive catalog: trend (SMA/EMA/WMA/HMA, Ichimoku, SuperTrend), momentum (RSI, Stochastic/StochRSI, MACD, CCI, ROC), volatility (ATR, Bollinger, Keltner, Donchian), volume (OBV, CMF, VWAP, Acc/Dist), S/R (Pivot Points, Fibonacci), breadth/regime (ADX, MFI, TRIN), custom plugin indicators
- Normalization & parity: consistent definitions, precision/rounding, timeframe alignment, warmup/NaN handling; identical behavior across backtest/paper/live
- Extensibility: user-defined indicators via Python plugins with Pydantic schemas; vectorized or event-driven modes
- Additional studies: Anchored VWAP and bands; session VWAP (RTH/pre/post); Volume Profile/Market Profile (POC/VAH/VAL)
- Order book features: CVD, bid/ask imbalance, pressure/absorption indices; top-of-book fade pressure
- Oscillators/trend: Williams %R, TRIX, Aroon, Ultimate Oscillator, KAMA, DEMA/TEMA, Connors RSI, Elder Ray/Force Index, TTM Squeeze, Efficiency Ratio
- Alternative bars: Heikinâ€‘Ashi, Renko, Kagi (for visualization/backtests)
- Derivatives metrics: realized/impl. vol, term structure slope, fundingâ€‘rate momentum; open interest, long/short ratio

#### Execution Management

- Advanced order types (market, limit, stop/stop-limit, trailing, iceberg)
- Time-in-force & flags: GTC/IOC/FOK; post-only; reduce-only; margin-safe checks
- Idempotent orders via clientOrderId; dedup/reconcile on reconnect; deterministic OMS state (persisted)
- Partial fills and child-order management; amend/cancel/replace semantics
- Precision/lot/minNotional compliance per venue; correct rounding
- Retry/backoff with rate-limit-aware pacing; sequenced retries; dead-letter on repeated failures
  - Market-impact adjustment examples: adjust expected fills using venue liquidity curves; include in TCA benchmarking
- Circuit breakers & kill switch: per-venue/asset; flatten exposures; auto pause/resume
- Clock sync and audit: server/exchange timestamps; correlation IDs; full order/trade audit log
- Recovery on restart: reload open orders/positions; reconcile to consistent snapshot
- Real-time order book analysis; slippage prediction and minimization
- Execution quality analytics:
  - Fill rate, avg fill time, price improvement
  - Slippage tracking: real vs expected fill, per-venue/pair stats
  - Best execution policy with venue analysis and order splitting
  - Implementation shortfall and market impact estimation (TCA)

- Synthetic brackets: stop-loss + take-profit linkage with partial fill handling; per-venue emulation when not native
- OCO/OTO/OTOCO (synthetic where needed) with robust state handling and idempotency
- Trigger source selection per order type: last/mark/index; venue-specific defaults and overrides
- Pegged-to-mid/primary where supported; maker bias and queue positioning controls
- Pre-trade checks: expected slippage bounds, venue health gates, order flood controls

#### Advanced Trading Features

- Smart Order Routing (SOR): capability-aware (order types/TIFs, fees/latency, liquidity/depth); order splitting across venues/pairs with failover
- Child-order algorithms: TWAP, VWAP, POV, iceberg, time-slicing; maker/taker bias; post-only/reduce-only where supported; discretionary ranges
- Pacing & tranching: per-venue/global rate limits; minNotional/step-size aware; tranche sizing/cooldowns; queue-position awareness where available
- TCA-integrated execution: real-time implementation shortfall, slippage heatmaps, price improvement; adaptive algo tuning
- OMS integration: partial fills; amend/cancel/replace; deterministic recovery/audit
- Advanced Position Sizing methodologies (Kelly, ATR-based, Equal Risk, Optimal f)
- Performance profiles:
  - Retail default: signal-to-decision <60 s; order placement <10 s p95; end-to-end <120 s; ingest 5Kâ€“10K ticks/sec
  - Experimental HFT mode (best-effort, venue/API-limited): <100 ms signal-to-decision for native strategies (<1 s AI-in-loop), p95 order placement <500 ms, low-latency WS + local processing; no colocation/broker DMA

#### Backtesting & Paper Trading

- Backtrader-based backtesting engine; optional vectorbt for fast parameter sweeps
- Walk-forward optimization with out-of-sample validation
- Monte Carlo stress testing for robustness under varying regimes
- Slippage and fee modeling parity with live settings
- Exchange-accurate paper engine with local order book and realistic fills
- Configurable fee models (maker/taker tiers) and slippage simulation
- External-signal backtests: simulate from historical alerts (CSV/JSON) when provided; otherwise require canary/paper before live

- Latency simulation and shadow-mode mirroring of live strategies
- Promotion flow: paper â†’ live with performance gates and guardrails

- LOB/queue simulation: queue position estimation, partial fills, maker/taker mix; calibrate from venue data
- Fee/funding/borrow schedules by tier and over time; dynamic modeling across venues
- Data versioning & reproducibility: dataset IDs, seeds, config hash, warmup specs
- Reports: standardized pack (parameter stability plots, equity DD duration, capacity analysis) for apples-to-apples comparisons

##### Overfitting Detection & Validation Suite

**Purpose:** Validate strategies before deployment to prevent curve-fitting to historical data. Automatically runs after every backtest to assess overfitting risk.

**The Validation Pipeline:**
```
Strategy Design â†’ Backtest â†’ Overfitting Detection â†’ Paper Trading â†’ Live Trading
```

**Seven Validation Tests:**

1. **Walk-Forward Analysis**
   - Splits data into sequential train/test periods
   - Tests strategy on out-of-sample data
   - Measures performance degradation
   - Pass criteria: <20% degradation from in-sample to out-of-sample

2. **Parameter Sensitivity Analysis**
   - Tests strategy with slightly different parameters
   - Measures performance variation
   - Identifies over-optimized parameters
   - Pass criteria: <30% max Sharpe variation across parameter ranges

3. **Monte Carlo Simulation**
   - Randomizes trade order and timing (1,000 runs)
   - Tests robustness to sequence effects
   - Generates confidence intervals
   - Pass criteria: Base results within 95% confidence interval

4. **Regime Stability Testing**
   - Tests strategy across different market regimes
   - Identifies regime-specific overfitting
   - Validates multi-regime performance
   - Pass criteria: Profitable in at least 3 of 5 regimes

5. **Out-of-Sample Testing**
   - Reserves 20-30% of data never used in optimization
   - Tests generalization to unseen data
   - Measures performance gap
   - Pass criteria: Out-of-sample performance >70% of in-sample

6. **Statistical Significance Testing**
   - Tests if results are statistically significant vs random
   - Calculates t-statistic and p-value
   - Validates genuine edge
   - Pass criteria: p-value <0.05 (95% confidence)

7. **Complexity Penalty (Occam's Razor)**
   - Penalizes overly complex strategies
   - Adjusts performance for number of parameters
   - Favors simpler, more robust strategies
   - Pass criteria: Complexity score <50/100

**Overfitting Risk Score:**

After running all tests, generates unified risk score (0-100):
- 0-30: LOW RISK (green) - Safe to deploy
- 31-60: MEDIUM RISK (yellow) - Proceed with caution
- 61-100: HIGH RISK (red) - Likely overfit, not recommended

**AI-Enhanced Overfitting Detection (via Intelligence Backbone):**

The Intelligence Backbone enhances overfitting detection with pattern recognition:
- Analyzes historical overfit strategies from knowledge graph
- Identifies common characteristics of overfit strategies
- Provides personalized insights: "Strategies like yours with >4 parameters had 73% overfitting rate"
- Learns from user's past strategies and outcomes
- Suggests simplifications based on successful patterns

**UI Integration:**

- New tab in Backtesting Results: "Overfitting Analysis"
- Shows unified risk score with traffic light indicator
- Displays detailed results for all 7 tests
- Provides actionable recommendations
- Blocks live trading deployment if HIGH RISK (can override with warning)

**Progressive Mastery:**
- Easy Mode: Simple risk score with pass/fail indicator
- Advanced Mode: Detailed metrics for all 7 tests with drill-down

**Regulatory Framing:**

All overfitting detection is pure statistical analysis of the user's own strategy and data. No investment advice or recommendations are providedâ€”only factual assessment of strategy robustness.

#### Real-Time Market Data Pipeline

- Preflight checks: code integrity scan + risk sanity + local simulator before canary/paper
- Parameter Stability Analyzer: track parameter drift (CV thresholds, trend detection); alert on instability
- Best-practices checklist: avoid look-ahead/survivorship bias; realistic cost/impact modeling; leakage safeguards

- Hybrid ingestion: REST snapshot + WebSocket deltas with state recovery
- Missing tick detection, outlier filtering, and latency tracking
- Auto-reconnect with backfill on resume; load-balanced multi-exchange sockets
- Separate hot tick vs OHLCV paths; unified normalized schema
- Custom data integration wizard (REST/Sheets/RSS) with JMESPath mapping; validates schema and schedules backfills
- Timestamp/source-of-truth normalization: exchange vs server timestamps; latency/skew measurement; deterministic re-ordering; all times UTC

- Derivatives data: funding rates, open interest, liquidation prints, basis/term structure
- On-chain fundamentals: MVRV, NVT/NVTS, active addresses, exchange inflows/outflows, realized cap, staking flows (advisory)
- Order book history for research/backtests: LOB snapshots/deltas for realistic execution and TCA
- News/event calendars: exchange status pages, listing calendars, maintenance windows, crypto-relevant macro releases

#### Multi-Asset Coverage

- Crypto spot and perpetuals (via CCXT-supported exchanges)
- US ETFs via broker APIs (IBKR, Alpaca). Example tickers: SPY, QQQ, IWM, DIA, sector ETFs (XLK, XLF, XLE), TLT, GLD, BTC/ETH ETFs (IBIT, FBTC)
- US equities universe (e.g., S&P 500 and top-ADV names). Brokers: IBKR/Alpaca. Data: Polygon/IEX Cloud for live; Tiingo/yfinance for backtests
- Forex via OANDA/IBKR (majors: EURUSD, GBPUSD, USDJPY, AUDUSD)
- Futures (CME micros: MES, MNQ, M2K, MGC) via IBKR; options (covered calls/puts) with stricter guardrails
- Optional on-chain DEX (e.g., Uniswap v3/GMX) for strategy-specific needs
- Session calendars & holidays: per venue/asset; RTH/pre/post handling
- Default guardrails per asset: max leverage, position/venue caps, exposure limits
- Data source precedence/fallbacks: crypto via exchange WS/REST; equities/ETFs via Polygon/IEX (live), Tiingo/yfinance (backtest); FX via OANDA; futures via IBKR; connectors: CCXT (crypto), IBKR/Alpaca SDKs (equities/ETFs/futures), OANDA (FX)
- AI ROI: Profit / (Fees + AI spend); dedicated cost-benefit dashboards

### Analytics & Reporting

#### Performance Dashboard

- Real-time P&L tracking with attribution analysis
- Risk-adjusted metrics (Sharpe, Sortino, Calmar ratios)
- Win rate and profit factor analysis
- AI cost tracking with ROI calculations

- Promotion gates & guardrails: surface threshold breaches; link to approval/promotion status
- Correlation IDs: drill-down from P&L to orders/fills/traces
- Exports: CSV/Parquet (timeseries), PDF (snapshots); scheduled exports to S3 with lifecycle

#### Strategy Ranking & Recommendation

- Objective: identify top strategies for a given market/asset at any moment, and rank historical performance per user over time
- Components
  - Regime detector: per-asset regime classification (trend strength, volatility state, liquidity/spread, funding/basis, OI/flow, time-of-day)
  - Feature extraction: rolling features window for asset/venue (returns/vol/skew, volume/ADV, spread/impact, LOB imbalance/CVD, funding/OI; optional onâ€‘chain flows)
  - Strategy fingerprints: metadata of each strategyâ€™s historical performance by regime, symbol, horizon; compatibility tags and constraints
  - **📘 Regime Detection Details:** See **Appendix A: Regime Detection Algorithm** for complete feature extraction formulas (ADX, Linear Regression, Parkinson Volatility), classification thresholds, hysteresis mechanism, confidence calculation, and storage schemas.
- Live scoring (currentâ€‘fit)
  - Compute S(asset, strategy) using recent features vs strategy fingerprints; calibrate with rolling windows; penalize for capacity/turnover
  - Filters: risk class, venue availability, paper/live eligibility, user constraints
- Historical ranking (perâ€‘user)
  - Rank by ROI over time and riskâ€‘adjusted metrics (Sharpe/Sortino/Calmar), after costs (fees, slippage, AI spend); show drawdown stats
  - Personalization: weights for risk appetite, asset preferences, allowed venues; exclude undesired categories
- Confidence & explainability
  - Confidence bands based on data coverage and stability; show top contributing features and evidence windows; deepâ€‘link to reports/backtests
- Storage & cadence
  - Scores timeâ€‘series in ClickHouse; metadata in Postgres; recompute cadence configurable (e.g., every 5â€“15 minutes per asset)
- Surfaces & APIs
  - UI: Strategy Control Board columns/filters for Rank and Topâ€‘N; Strategy Builder hints; Home recommendations; alerts when topâ€‘rank changes
  - API: GET /strategyâ€‘ranking?asset=â€¦&regime=â€¦; webhook: strategy_ranking.updated
- Guardrails
  - Recommend only strategies passing promotion gates and guardrails; respect user risk limits and budgets

##### Scoring formula sketch

- S(a, s) = w1Â·Fit(features_a, fingerprint_s) + w2Â·RiskAdjROI_s_recent âˆ’ w3Â·CapacityPenalty(a, s) âˆ’ w4Â·TurnoverPenalty(s) âˆ’ w5Â·ConstraintPenalty(a, s)
- Fit(...) computed via cosine similarity between normalized feature vector and strategy fingerprint centroids per regime, aggregated by p(regime|a)
- RiskAdjROI_s_recent = EWMA of ROI normalized by realized vol and drawdown; multiâ€‘horizon blend (7/30/90d) with decay
- Penalties
  - CapacityPenalty: function of ADV, spread/impact, depth; higher for capacityâ€‘sensitive strats on thin books
  - TurnoverPenalty: function of expected holding time/turnover; higher for highâ€‘churn in highâ€‘cost venues
  - ConstraintPenalty: hard/soft penalties for user constraints (assets/venues, leverage caps, budgets)
- Normalize S to [0, 100]; Confidence from data coverage, stability, and regime certainty
- Default weights (tunable per user): w1=0.45, w2=0.30, w3=0.10, w4=0.05, w5=0.10
- Weight governance: defaults apply globally (w1=0.45, w2=0.30, w3=0.10, w4=0.05, w5=0.10) but are adjustable perâ€‘user in Settings â†’ Strategy Ranking; global fallback used if user settings absent

**📘 Complete Implementation Details:** See **Appendix B: Strategy Ranking Algorithm** for complete mathematical formulas, pseudocode implementations, worked examples with real numbers, and unit test cases.


##### Complete Formula Specifications

**Master Formula:**
```
S(a, s) = w1·Fit(a, s) + w2·RiskAdjROI(s) - w3·CapacityPenalty(a, s) - w4·TurnoverPenalty(s) - w5·ConstraintPenalty(a, s)
```

**Default Weights:** `[0.45, 0.30, 0.10, 0.05, 0.10]`

---

**1. Fit(a, s) - Regime Matching Score**

Measures how well the strategy's historical performance profile matches the current market regime.

```python
def calculate_fit(asset_features, strategy_fingerprint, regime_probs):
    """
    Calculate fit score using cosine similarity between current features and strategy fingerprint.

    Args:
        asset_features: Current normalized feature vector for asset (12-dim)
        strategy_fingerprint: Dict of regime -> optimal feature vector
        regime_probs: Dict of regime -> probability (from regime detector)

    Returns:
        Fit score in [0, 1]
    """
    # Extract current feature vector (normalized to [-1, 1] or [0, 1])
    current_vector = extract_feature_vector(asset_features)

    # Calculate fit for each regime
    regime_fits = {}
    for regime, prob in regime_probs.items():
        if regime in strategy_fingerprint:
            optimal_vector = strategy_fingerprint[regime]
            # Cosine similarity: dot(A, B) / (||A|| * ||B||)
            similarity = cosine_similarity(current_vector, optimal_vector)
            regime_fits[regime] = similarity
        else:
            regime_fits[regime] = 0.0  # Strategy has no fingerprint for this regime

    # Weighted average by regime probability
    fit_score = sum(regime_fits[r] * regime_probs[r] for r in regime_probs)

    return fit_score  # Range: [0, 1]
```

**Feature Vector (12 dimensions, normalized):**
1. Returns (7d): z-score normalized
2. Volatility (30d): percentile [0, 1]
3. Trend strength (ADX): normalized to [0, 1]
4. Volume ratio (current/30d avg): log-normalized
5. Spread (bps): percentile [0, 1]
6. Depth ratio: normalized to [0, 1]
7. LOB imbalance: [-1, 1]
8. Funding rate (crypto): z-score normalized
9. Time-of-day: one-hot encoded [0, 1]
10. Market stress: [0, 1]
11. Skewness: z-score normalized
12. Kurtosis: z-score normalized

---

**2. RiskAdjROI(s) - Risk-Adjusted Return**

Measures strategy's recent performance adjusted for volatility and drawdown.

```python
def calculate_risk_adj_roi(strategy_id, horizons=[7, 30, 90]):
    """
    Calculate risk-adjusted ROI using EWMA across multiple horizons.

    Args:
        strategy_id: Strategy identifier
        horizons: List of lookback periods in days

    Returns:
        Risk-adjusted ROI score in [0, 1]
    """
    horizon_scores = []

    for horizon in horizons:
        # Get strategy performance over horizon
        roi = get_roi(strategy_id, days=horizon)
        realized_vol = get_realized_volatility(strategy_id, days=horizon)
        max_drawdown = get_max_drawdown(strategy_id, days=horizon)

        # Risk-adjusted score (Sharpe-like)
        if realized_vol > 0:
            sharpe = roi / realized_vol
        else:
            sharpe = 0

        # Drawdown penalty
        dd_penalty = 1.0 - min(abs(max_drawdown), 0.5)  # Cap at 50% penalty

        # Horizon score
        horizon_score = sharpe * dd_penalty
        horizon_scores.append(horizon_score)

    # EWMA blend (more weight on recent)
    weights = [0.5, 0.3, 0.2]  # 7d, 30d, 90d
    ewma_score = sum(s * w for s, w in zip(horizon_scores, weights))

    # Normalize to [0, 1] (assume Sharpe range [-2, 2])
    normalized_score = (ewma_score + 2) / 4
    normalized_score = max(0, min(1, normalized_score))  # Clamp

    return normalized_score
```

---

**3. CapacityPenalty(a, s) - Liquidity Constraint Penalty**

Penalizes strategies that are capacity-sensitive when applied to illiquid assets.

```python
def calculate_capacity_penalty(asset, strategy):
    """
    Calculate penalty based on strategy's capacity requirements vs asset's liquidity.

    Args:
        asset: Asset identifier
        strategy: Strategy metadata

    Returns:
        Penalty score in [0, 1]
    """
    # Get asset liquidity metrics
    adv = get_average_daily_volume(asset, days=30)  # USD
    spread_bps = get_average_spread(asset, days=30)
    depth_1pct = get_average_depth(asset, bps=100, days=30)  # USD within 1%

    # Get strategy capacity requirements
    typical_order_size = strategy['typical_order_size_usd']
    turnover_per_day = strategy['avg_trades_per_day']

    # Calculate penalties

    # 1. ADV penalty (sigmoid function)
    daily_volume_needed = typical_order_size * turnover_per_day
    adv_ratio = daily_volume_needed / adv
    adv_penalty = 1 / (1 + exp(-10 * (adv_ratio - 0.05)))  # Sigmoid centered at 5%

    # 2. Spread penalty
    spread_threshold = strategy['max_acceptable_spread_bps']
    if spread_bps > spread_threshold:
        spread_penalty = min((spread_bps - spread_threshold) / spread_threshold, 1.0)
    else:
        spread_penalty = 0.0

    # 3. Depth penalty
    depth_ratio = typical_order_size / depth_1pct
    depth_penalty = 1 / (1 + exp(-10 * (depth_ratio - 0.1)))  # Sigmoid centered at 10%

    # Combined penalty (weighted average)
    total_penalty = (
        adv_penalty * 0.5 +
        spread_penalty * 0.3 +
        depth_penalty * 0.2
    )

    return total_penalty  # Range: [0, 1]
```

---

**4. TurnoverPenalty(s) - Transaction Cost Penalty**

Penalizes high-turnover strategies based on expected transaction costs.

```python
def calculate_turnover_penalty(strategy, asset, venue):
    """
    Calculate penalty based on strategy's turnover and transaction costs.

    Args:
        strategy: Strategy metadata
        asset: Asset identifier
        venue: Exchange identifier

    Returns:
        Penalty score in [0, 1]
    """
    # Get strategy turnover
    avg_holding_time_hours = strategy['avg_holding_time_hours']
    trades_per_day = 24 / avg_holding_time_hours if avg_holding_time_hours > 0 else 0

    # Get transaction costs
    fee_rate = get_fee_rate(venue, asset)  # e.g., 0.0004 (0.04%)
    avg_slippage_bps = get_avg_slippage(asset, venue)  # e.g., 2 bps

    # Total cost per round-trip
    cost_per_rt = (fee_rate * 2) + (avg_slippage_bps / 10000)

    # Annual cost drag
    annual_trades = trades_per_day * 252  # Trading days
    annual_cost_drag = cost_per_rt * annual_trades

    # Penalty (linear up to 50% annual drag, then capped)
    penalty = min(annual_cost_drag / 0.5, 1.0)

    return penalty  # Range: [0, 1]
```

---

**5. ConstraintPenalty(a, s) - User Constraint Violations**

Penalizes strategies that violate user-defined constraints.

```python
def calculate_constraint_penalty(asset, strategy, user_constraints):
    """
    Calculate penalty for constraint violations.

    Args:
        asset: Asset identifier
        strategy: Strategy metadata
        user_constraints: User-defined constraints

    Returns:
        Penalty score (can be infinity for hard constraints)
    """
    penalty = 0.0

    # Hard constraints (return infinity if violated)
    if asset not in user_constraints['allowed_assets']:
        return float('inf')

    if strategy['venue'] not in user_constraints['allowed_venues']:
        return float('inf')

    if strategy['max_leverage'] > user_constraints['max_leverage']:
        return float('inf')

    if strategy['risk_class'] not in user_constraints['allowed_risk_classes']:
        return float('inf')

    # Soft constraints (graduated penalties)

    # Capital allocation constraint
    required_capital = strategy['min_capital_required']
    available_capital = user_constraints['available_capital']
    if required_capital > available_capital:
        capital_ratio = required_capital / available_capital
        penalty += min((capital_ratio - 1.0) * 0.5, 0.5)  # Up to 0.5 penalty

    # Daily budget constraint
    estimated_daily_cost = strategy['estimated_daily_ai_cost']
    daily_budget = user_constraints['daily_ai_budget']
    if estimated_daily_cost > daily_budget:
        budget_ratio = estimated_daily_cost / daily_budget
        penalty += min((budget_ratio - 1.0) * 0.3, 0.3)  # Up to 0.3 penalty

    return penalty  # Range: [0, inf]
```

---

**Final Score Normalization:**

```python
def calculate_final_score(fit, risk_adj_roi, capacity_penalty, turnover_penalty, constraint_penalty, weights):
    """
    Calculate final ranking score and normalize to [0, 100].

    Args:
        fit: Fit score [0, 1]
        risk_adj_roi: Risk-adjusted ROI [0, 1]
        capacity_penalty: Capacity penalty [0, 1]
        turnover_penalty: Turnover penalty [0, 1]
        constraint_penalty: Constraint penalty [0, inf]
        weights: [w1, w2, w3, w4, w5]

    Returns:
        Final score [0, 100] or -1 if hard constraint violated
    """
    # Check for hard constraint violations
    if constraint_penalty == float('inf'):
        return -1  # Exclude from ranking

    # Calculate raw score
    raw_score = (
        weights[0] * fit +
        weights[1] * risk_adj_roi -
        weights[2] * capacity_penalty -
        weights[3] * turnover_penalty -
        weights[4] * constraint_penalty
    )

    # Normalize to [0, 100]
    # Theoretical range: [-1.0, 1.0] (if all components are [0, 1])
    # Map to [0, 100]
    normalized_score = (raw_score + 1.0) * 50
    normalized_score = max(0, min(100, normalized_score))  # Clamp

    return normalized_score
```



##### Default feature sets (by asset class)

- Crypto Perpetuals: returns, realized vol, skew/kurtosis, volume/ADV, spread, depth@Nbp, LOB imbalance, CVD, funding rate, OI Î”, liquidation prints, basis/term structure, timeâ€‘ofâ€‘day
- Crypto Spot: returns, vol, volume/ADV, spread, depth, LOB imbalance, CVD, onâ€‘chain exchange flows, active addresses (advisory), timeâ€‘ofâ€‘day
- US Equities/ETFs: returns, vol, volume/ADV, bidâ€‘ask spread, impact proxy, sector beta (SPY/QQQ), news intensity, timeâ€‘ofâ€‘day, calendar events
- FX: returns, vol, session liquidity, spread, macro calendar heat, timeâ€‘ofâ€‘day
- Futures: returns, vol, volume/ADV, spread, termâ€‘structure slope/roll yield, timeâ€‘ofâ€‘day

##### API and Events

- REST: GET /strategyâ€‘ranking?asset=BTCUSDT&venue=BINANCE&limit=50&regime=current
  - Response: { version, asOf, asset, regime, items: [ { strategyId, rank, score, confidence, reasonCodes, metrics: { roi7d, roi30d, sharpe30d, dd }, constraints, links } ] }
  - Pagination: cursorâ€‘based (nextCursor)
- WebSocket: /ws/strategyâ€‘ranking
  - Events: strategy_ranking.snapshot, strategy_ranking.updated
  - Payload: { asset, regime, topN, changes: [ { strategyId, rankOld, rankNew, scoreOld, scoreNew, confidence } ] }
- Webhook: strategy_ranking.updated (userâ€‘configurable filters)
- Minimal JSON schema examples

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://symbiote/local/schemas/strategy-ranking-response.json",
  "type": "object",
  "required": ["version", "asOf", "asset", "items"],
  "properties": {
    "version": {"type": "string"},
    "asOf": {"type": "string", "format": "date-time"},
    "asset": {"type": "string"},
    "regime": {"type": ["string", "null"]},
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["strategyId", "rank", "score", "confidence"],
        "properties": {
          "strategyId": {"type": "string"},
          "rank": {"type": "integer", "minimum": 1},
          "score": {"type": "number", "minimum": 0, "maximum": 100},
          "confidence": {"type": "number", "minimum": 0, "maximum": 1},
          "reasonCodes": {"type": "array", "items": {"type": "string"}},
          "metrics": {
            "type": "object",
            "properties": {
              "roi7d": {"type": ["number", "null"]},
              "roi30d": {"type": ["number", "null"]},
              "sharpe30d": {"type": ["number", "null"]},
              "dd": {"type": ["number", "null"]}
            }
          },
          "constraints": {"type": ["object", "null"]},
          "links": {
            "type": "object",
            "properties": {
              "report": {"type": ["string", "null" ]},
              "backtest": {"type": ["string", "null" ]}
            }
          }
        }
      }
    },
    "nextCursor": {"type": ["string", "null"]}
  }
}
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://symbiote/local/schemas/strategy-ranking-updated-event.json",
  "type": "object",
  "required": ["asset", "regime", "topN", "changes"],
  "properties": {
    "asset": {"type": "string"},
    "regime": {"type": ["string", "null"]},
    "topN": {"type": "integer", "minimum": 1},
    "changes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["strategyId", "rankOld", "rankNew", "scoreOld", "scoreNew", "confidence"],
        "properties": {
          "strategyId": {"type": "string"},
          "rankOld": {"type": "integer", "minimum": 1},
          "rankNew": {"type": "integer", "minimum": 1},
          "scoreOld": {"type": "number", "minimum": 0, "maximum": 100},
          "scoreNew": {"type": "number", "minimum": 0, "maximum": 100},
          "confidence": {"type": "number", "minimum": 0, "maximum": 1}
        }
      }
    }
  }
}
```

##### Regime Detector (microâ€‘spec)

- Inputs: rolling windows per asset (1h/4h/1d): returns, vol, volume/ADV, spread, depth/LOB imbalance, CVD, funding, OI, basis; optional news/onâ€‘chain features
- Labels: Trend (up/side/down), Volatility (low/med/high), Liquidity (tight/normal/wide), Derivatives (pos/neg funding, OI rising/falling), Timeâ€‘ofâ€‘day buckets
- Method: rules + clustering (e.g., kâ€‘means on normalized features) with hysteresis to reduce churn; calibrated per asset class
- Cadence: recompute every 5â€“15 minutes; smooth with EWMA; require persistence to flip labels
- Storage: regime timeâ€‘series in ClickHouse; latest label in Redis; metadata in Postgres
- Evaluation: stability (% time in label), predictive utility vs nextâ€‘period returns/vol, drift monitors for feature distributions
- Governance: thresholds versioned; changes require approval; attach backtest references

#### Advanced Analytics

- Walk-forward optimization for strategy robustness
- Monte Carlo simulation for risk assessment
- Regime-aware backtesting
- Market correlation analysis
- Additional metrics: Omega ratio, Ulcer index, Pain index, CVaR/Expected Shortfall, skew/kurtosis, drawdown duration
- Trade-level analytics: MFE/MAE, expectancy, holding time distributions, turnover, capacity analysis
- TCA deep-dive: maker/taker ratio, cancel rate, depth consumed, queueâ€‘jump estimates, venue scorecards; rolling/heatmap dashboards (Sharpe/DD by symbol/venue/timeâ€‘ofâ€‘day)

#### Compliance Reporting

- Trade execution logs with audit trails
- Tax reporting with cost basis calculations
- Regulatory compliance documentation
- Data retention policies (7-year for financial data)
- Exports: CSV/JSON/PDF; stored in S3 with versioning and lifecycle per Data Architecture
- Correlation/audit: include correlation IDs and immutable audit trail references

#### Tax Reporting & Accounting

Comprehensive tax reporting system supporting multiple jurisdictions, cost basis tracking methods, and automated tax form generation.

##### Cost Basis Tracking Methods

**Supported Methods:**

| Method | Description | Use Case | Jurisdictions |
|--------|-------------|----------|---------------|
| **FIFO** | First In, First Out | Default method | US, UK, EU, most countries |
| **LIFO** | Last In, First Out | Alternative method | US (limited use) |
| **Specific Identification** | Manual lot selection | Tax optimization | US, UK, most countries |
| **Average Cost** | Average of all purchases | Simplified tracking | Some crypto jurisdictions |
| **HIFO** | Highest In, First Out | Tax loss harvesting | US (with specific ID) |

**Implementation Details:**

```python
# Cost Basis Calculation Example
class CostBasisCalculator:
    def calculate_basis(self, sale: Trade, method: str) -> CostBasisResult:
        """
        Calculate cost basis for a sale using specified method.

        Args:
            sale: Trade object representing the sale
            method: 'FIFO', 'LIFO', 'SPECIFIC_ID', 'AVERAGE', 'HIFO'

        Returns:
            CostBasisResult with basis, gain/loss, holding period
        """
        # Get all acquisition lots for this asset
        lots = self.get_acquisition_lots(sale.symbol, sale.exchange)

        if method == 'FIFO':
            selected_lots = self._select_fifo(lots, sale.quantity)
        elif method == 'LIFO':
            selected_lots = self._select_lifo(lots, sale.quantity)
        elif method == 'SPECIFIC_ID':
            selected_lots = self._select_specific(lots, sale.lot_ids)
        elif method == 'AVERAGE':
            selected_lots = self._select_average(lots, sale.quantity)
        elif method == 'HIFO':
            selected_lots = self._select_hifo(lots, sale.quantity)

        # Calculate basis and gain/loss
        total_basis = sum(lot.cost_basis for lot in selected_lots)
        proceeds = sale.quantity * sale.price - sale.fees
        gain_loss = proceeds - total_basis

        # Determine holding period (short-term < 1 year, long-term >= 1 year)
        holding_period = self._calculate_holding_period(selected_lots, sale.date)

        # Check for wash sales
        wash_sale_adjustment = self._check_wash_sale(sale, selected_lots)

        return CostBasisResult(
            basis=total_basis,
            proceeds=proceeds,
            gain_loss=gain_loss,
            holding_period=holding_period,
            wash_sale_adjustment=wash_sale_adjustment,
            lots_used=selected_lots
        )
```

**Partial Position Handling:**
- Track remaining quantity per lot
- Allocate fees proportionally across lots
- Maintain lot history for audit trail
- Support lot splitting for partial sales

**Wash Sale Detection:**
- Monitor 30-day window (30 days before and after sale)
- Detect substantially identical securities
- Calculate disallowed loss
- Adjust cost basis of replacement shares
- Track wash sale chains across multiple trades

##### Tax Forms Generation

**US Tax Forms:**

| Form | Purpose | Data Required |
|------|---------|---------------|
| **Form 8949** | Capital gains/losses detail | All trades with basis, proceeds, dates |
| **Schedule D** | Capital gains summary | Aggregated short/long-term totals |
| **Form 1099-B** | Broker reporting | Trades from connected exchanges |
| **Schedule C** | Business income (traders) | Trading expenses, home office |
| **Form 4797** | Section 1256 contracts | Futures/options (60/40 rule) |

**Form 8949 Generation Example:**

```csv
Description,Date Acquired,Date Sold,Proceeds,Cost Basis,Adjustment Code,Adjustment Amount,Gain/Loss
"0.05 BTC (Binance)",01/15/2024,10/18/2024,3410.00,3375.00,,0.00,35.00
"0.10 ETH (Coinbase)",03/22/2024,10/19/2024,245.50,280.00,W,35.00,-70.00
```

**International Tax Forms:**

| Country | Form/Report | Key Requirements |
|---------|-------------|------------------|
| **UK** | Capital Gains Tax calculation | Annual exemption (Â£6,000), 10%/20% rates |
| **Canada** | Schedule 3 | 50% inclusion rate for capital gains |
| **Australia** | CGT Schedule | 50% discount for >12 month holdings |
| **Germany** | Anlage SO | 1-year holding exemption for crypto |
| **France** | Form 2086 | Flat 30% tax on crypto gains |

##### Crypto-Specific Tax Events

**Taxable Events:**

| Event Type | Tax Treatment | Basis Calculation | Timing |
|------------|---------------|-------------------|--------|
| **Crypto-to-Crypto** | Taxable disposal | FMV at trade time | Trade date |
| **Crypto-to-Fiat** | Taxable disposal | Sale proceeds | Trade date |
| **Staking Rewards** | Ordinary income | FMV at receipt | Receipt date |
| **Airdrops** | Ordinary income | FMV at receipt | Receipt date |
| **Hard Forks** | Ordinary income (US) | FMV at control | Control date |
| **Mining Income** | Ordinary income | FMV at receipt | Receipt date |
| **DeFi Yield** | Ordinary income | FMV at receipt | Receipt date |
| **NFT Sales** | Capital gain/loss | Sale proceeds - basis | Sale date |

**Non-Taxable Events:**
- Wallet-to-wallet transfers (same owner)
- Crypto purchases (establishes basis)
- Gifting crypto (recipient takes donor's basis)
- Crypto donations to charity (deduction at FMV)

**Staking & Yield Tracking:**

```python
class StakingIncomeTracker:
    def record_staking_reward(self, reward: StakingReward):
        """
        Record staking reward as ordinary income.

        Creates two entries:
        1. Income event at FMV
        2. Acquisition lot with basis = FMV
        """
        # Calculate FMV at receipt
        fmv = self.get_market_price(reward.asset, reward.timestamp)
        income_amount = reward.quantity * fmv

        # Record as ordinary income
        self.record_income(
            type='staking_reward',
            asset=reward.asset,
            quantity=reward.quantity,
            fmv=fmv,
            income_amount=income_amount,
            date=reward.timestamp
        )

        # Create acquisition lot with basis = FMV
        self.create_lot(
            asset=reward.asset,
            quantity=reward.quantity,
            cost_basis=income_amount,
            acquisition_date=reward.timestamp,
            source='staking_reward'
        )
```

##### Accounting Methods

**Trader vs Investor Classification (US):**

| Aspect | Investor | Trader (Mark-to-Market) |
|--------|----------|-------------------------|
| **Tax Treatment** | Capital gains | Ordinary income/loss |
| **Loss Limits** | $3,000/year | No limit |
| **Wash Sales** | Apply | Don't apply |
| **Expenses** | Limited deduction | Full deduction |
| **Election** | Default | Section 475(f) election |
| **Deadline** | N/A | By April 15 (prior year) |

**Mark-to-Market Election:**
- Must elect by April 15 of year before effective
- Treats all positions as sold at year-end (FMV)
- Recognizes unrealized gains/losses
- Cannot be revoked for 5 years without IRS approval
- Beneficial for active traders with losses

**Business Expense Deductions:**
- Trading software subscriptions
- Market data fees
- Exchange fees and commissions
- Home office (if exclusive use)
- Computer equipment
- Internet and phone (business portion)
- Education and research materials

##### Multi-Jurisdiction Support

**Jurisdiction-Specific Settings:**

```typescript
interface TaxJurisdiction {
  country: string;
  cost_basis_method: 'FIFO' | 'LIFO' | 'AVERAGE' | 'SPECIFIC_ID';
  capital_gains_rates: {
    short_term: number;  // < 1 year
    long_term: number;   // >= 1 year
  };
  annual_exemption?: number;  // Tax-free allowance
  wash_sale_rules: boolean;
  crypto_to_crypto_taxable: boolean;
  staking_taxable_on_receipt: boolean;
  holding_period_for_discount: number;  // Days
  reporting_currency: string;
}

// Example: UK Configuration
const UK_TAX_CONFIG: TaxJurisdiction = {
  country: 'UK',
  cost_basis_method: 'SPECIFIC_ID',
  capital_gains_rates: {
    short_term: 0.20,  // 20% for higher rate
    long_term: 0.20
  },
  annual_exemption: 6000,  // Â£6,000 for 2024/25
  wash_sale_rules: false,
  crypto_to_crypto_taxable: true,
  staking_taxable_on_receipt: true,
  holding_period_for_discount: 0,
  reporting_currency: 'GBP'
};
```

##### Tax Software Integration

**Supported Integrations:**

| Software | Format | Features |
|----------|--------|----------|
| **TurboTax** | TXF, CSV | Direct import, Form 8949 |
| **TaxAct** | CSV | Capital gains import |
| **H&R Block** | CSV | Trade history import |
| **CoinTracker** | API, CSV | Crypto-specific tracking |
| **Koinly** | API, CSV | Multi-exchange sync |
| **CryptoTaxCalculator** | CSV | International support |
| **TaxBit** | API | Enterprise-grade |

**Export Format Example (TurboTax TXF):**

```
V042
ASymbioteTrader
D 10/18/2024
^
TD
N713
C1
L1
P0.05 BTC (Binance)
D01/15/2024
D10/18/2024
$3375.00
$3410.00
^
```

##### Tax Reporting Dashboard

**Key Metrics Display:**
- Realized gains/losses (YTD, by year)
- Unrealized gains/losses (current positions)
- Short-term vs long-term breakdown
- Wash sale adjustments
- Staking/mining income
- Tax liability estimate
- Effective tax rate

**Tax Loss Harvesting Opportunities:**
- Identify positions with unrealized losses
- Calculate potential tax savings
- Suggest harvest timing (avoid wash sales)
- Track harvested losses for carryforward

**Audit Trail:**
- Complete transaction history
- Cost basis calculations with methodology
- Wash sale detection logs
- Form generation history
- Export history with timestamps

#### Strategy Intelligence & Execution Suite

**Purpose:** A unified suite of AI-enhanced analytics features that provide deep insights into strategy performance, execution quality, and portfolio dynamics. These features are contextually integrated throughout the platform rather than being standalone tools.

**Core Philosophy:** Present factual information and analysis from the user's own data to enable better decision-making. Never provide investment advice or recommendations.

**Nine Integrated Features:**

##### 1. Execution Cost Simulator

**Location:** Backtesting & Results View â†’ New Tab: "Execution Analysis"

**Purpose:** Simulate different execution methods to quantify slippage and fee impacts before deploying to live trading.

**Features:**
- Simulates 4+ execution models: Aggressive (Market), Passive (Limit), TWAP, POV, Iceberg
- Uses historical tick-level order book data for realistic simulation
- Compares net P&L, slippage, fees, and unfilled orders across methods
- Shows which execution method is optimal for the strategy's characteristics

**AI-Enhanced (via Intelligence Backbone):**
- Analyzes user's historical execution quality (127+ trades)
- Learns which execution methods work best for user's order sizes
- Provides personalized recommendations: "Based on your 127 trades, TWAP reduces your slippage by 38%"
- Correlates execution quality with market conditions (liquidity, time of day)

##### 2. Post-Trade Analysis & Learning

**Location:** Backtesting & Results View â†’ New Tab: "Trade Analysis"

**Purpose:** Understand WHY each trade won or lost to learn and improve strategies.

**Features:**
- Detailed breakdown of market conditions during trade
- Strategy behavior analysis (did it behave as expected?)
- Historical context (how does this compare to similar trades?)
- Execution quality assessment
- Key observations and learning opportunities

**AI-Enhanced (via Intelligence Backbone):**
- Identifies patterns: "Trades matching this profile have 87% win rate vs 68% overall"
- Learns user's strategy sweet spots
- Suggests filters based on losing trade patterns: "Your last 3 losses occurred during high volatility"
- Provides actionable insights from user's own historical data

##### 3. What-If Scenario Planning

**Location:** Backtesting & Results View â†’ New Tab: "What-If Scenarios"

**Purpose:** Test scenarios without running full backtests.

**Features:**
- Quick scenario testing: "What if volatility doubles?" "What if position size was 2x?"
- Parameter sensitivity analysis
- Risk/reward tradeoff visualization
- Comparison of multiple scenarios

**AI-Enhanced (via Intelligence Backbone):**
- Suggests relevant scenarios based on current market conditions
- Learns which scenarios user frequently tests
- Provides historical context for scenario outcomes

##### 4. Strategy Health Monitoring

**Location:** Strategy Control Board â†’ New Columns: "Health Score", enhanced "State"

**Purpose:** Early warning system for strategy degradation before losses occur.

**Features:**
- Overall health score (0-100)
- Performance metrics trending (win rate, Sharpe, avg win/loss)
- Execution metrics (time to entry, slippage, fill rate)
- Market fit score (current regime vs strategy's optimal regime)
- Detected changes and anomalies

**AI-Enhanced (via Intelligence Backbone):**
- Pattern recognition: "This degradation pattern occurred 2 times before when regime shifted"
- Learns user's typical responses: "You typically pause after 2.8 days in this situation"
- Predicts outcomes: "If pattern continues, expected additional loss: $320"
- Suggests actions based on historical behavior

##### 5. Signal Hub & Attribution

**Location:**
- Strategy Control Board â†’ New Columns: "Signal Source", "Latency"
- Performance Dashboard â†’ New "Group By" filter: "Signal Source"

**Purpose:** Central management and performance attribution for all signal sources (internal strategies, webhooks, custom APIs, RSS feeds).

**Features:**
- Unified view of all signal sources
- Performance attribution (P&L by signal source)
- Signal health metrics (latency, error rates)
- Signal-to-trade latency tracking
- Cross-signal performance comparison

**AI-Enhanced (via Intelligence Backbone):**
- Correlates signal performance with market conditions
- Identifies which signals work in which regimes
- Provides regime-aware recommendations: "TradingView webhook performs poorly in high volatility (current regime)"
- Learns optimal signal allocation based on conditions

##### 6. Execution Quality Analysis

**Location:** Performance Dashboard â†’ New Tab: "Execution Quality"

**Purpose:** Understand execution costs and identify optimization opportunities.

**Features:**
- Total cost breakdown (exchange fees, slippage, AI costs)
- Execution quality by exchange (fill rate, avg slippage, avg fee)
- Execution quality by time of day
- Cost as percentage of P&L
- Venue scorecards

**AI-Enhanced (via Intelligence Backbone):**
- Learns user's execution patterns
- Identifies cost optimization opportunities
- Provides actionable insights: "Avoid trading 00:00-08:00 UTC (2x higher slippage)"
- Tracks improvement over time

##### 7. Portfolio Correlation & Risk Analysis

**Location:** Performance Dashboard â†’ New Tab: "Portfolio Analysis"

**Purpose:** Understand how strategies interact at the portfolio level.

**Features:**
- Strategy correlation matrix
- Portfolio-level metrics (combined Sharpe, max DD, diversification benefit)
- Risk concentration analysis (BTC exposure, ETH exposure, etc.)
- Correlation changes across regimes

**AI-Enhanced (via Intelligence Backbone):**
- Regime-aware correlation analysis
- Portfolio optimization suggestions based on current regime
- Learns user's allocation patterns
- Identifies natural hedges and concentration risks

##### 8. Trade Journal & Annotations

**Location:** Strategy Detail View â†’ New Tab: "Journal" + Global Journal View

**Purpose:** Personal documentation and learning from experience.

**Journal Entry Types:**

1. **Pre-Trade Plan**
   - Entry rationale and thesis
   - Expected entry/exit levels
   - Risk/reward analysis
   - Market conditions
   - Confidence level (1-5)
   - Tags (e.g., "breakout", "mean-reversion", "high-conviction")

2. **Post-Trade Review**
   - What went right/wrong
   - Execution quality
   - Emotional state during trade
   - Lessons learned
   - What would you do differently
   - Rating (1-5 stars)

3. **Lessons Learned**
   - General trading insights
   - Mistakes to avoid
   - Successful patterns
   - Market observations
   - Personal growth notes

4. **Daily/Weekly Summary**
   - Overall performance reflection
   - Market conditions summary
   - Emotional state
   - Goals for next period
   - Wins and losses

**Journal Templates:**

Users can create and save templates for common entry types:

```yaml
# Example: Pre-Trade Plan Template
template_name: "Breakout Trade Plan"
fields:
  - name: "Setup Type"
    type: "select"
    options: ["Bull Flag", "Triangle", "Channel Breakout", "Other"]
  - name: "Confirmation Signals"
    type: "checklist"
    options: ["Volume Spike", "RSI >50", "Above 20 EMA", "Higher Timeframe Aligned"]
  - name: "Entry Price"
    type: "number"
  - name: "Stop Loss"
    type: "number"
  - name: "Target 1"
    type: "number"
  - name: "Target 2"
    type: "number"
  - name: "Risk/Reward Ratio"
    type: "calculated"
    formula: "(target1 - entry) / (entry - stop_loss)"
  - name: "Position Size"
    type: "number"
  - name: "Notes"
    type: "textarea"
```

**Journal UI Components:**

1. **Journal Entry Form:**
   - Entry type selector (pre-trade, post-trade, lesson, summary)
   - Template selector (optional)
   - Rich text editor with markdown support
   - Attach to: strategy, symbol, trade, position
   - Tags (autocomplete from existing tags)
   - Mood/emotion selector (optional)
   - Confidence/rating slider
   - Screenshot/chart attachment
   - Voice-to-text input

2. **Journal List View:**
   - Chronological timeline
   - Filter by: type, strategy, symbol, tags, date range, rating
   - Search: full-text search across all entries
   - Sort by: date, rating, type
   - Group by: day, week, month, strategy, symbol
   - Quick actions: edit, delete, duplicate, export

3. **Journal Detail View:**
   - Full entry with all fields
   - Linked trades/positions/strategies
   - Related entries (same strategy/symbol)
   - AI insights (patterns detected)
   - Edit/delete buttons

4. **Journal Analytics Dashboard:**
   - Entry count by type
   - Most common tags
   - Average rating over time
   - Common mistakes (AI-detected patterns)
   - Improvement trends
   - Emotional state correlation with performance
   - Best/worst performing setups

**Journal Search & Filter:**

- Full-text search across all entries
- Filter by:
  - Entry type (pre-trade, post-trade, lesson, summary)
  - Strategy
  - Symbol
  - Tags
  - Date range
  - Rating (1-5 stars)
  - Confidence level (1-5)
  - Mood/emotion
  - Has attachments
- Advanced search:
  - Regex search
  - Boolean operators (AND, OR, NOT)
  - Field-specific search (e.g., "tags:breakout AND rating:>=4")

**Journal Export:**

- Export formats: PDF, CSV, Markdown, JSON
- Export options:
  - Date range
  - Entry types
  - Strategies/symbols
  - Include attachments
  - Include AI insights
- PDF template customization:
  - Header/footer
  - Logo
  - Color scheme
  - Font selection

**Journal Analytics (AI-Enhanced):**

1. **Pattern Recognition:**
   - "You've mentioned 'regime change' 4 times in losing trades"
   - "Your breakout trades have 75% win rate"
   - "You tend to exit winners too early (avg hold: 2 hours vs 8 hours for losers)"

2. **Common Mistakes:**
   - "You've noted 'FOMO entry' 8 times in the last month"
   - "You frequently ignore your stop loss (mentioned 6 times)"
   - "You trade more when stressed (correlation: 0.7)"

3. **Improvement Trends:**
   - "Your win rate improved from 45% to 62% over 3 months"
   - "You're taking fewer revenge trades (down 80%)"
   - "Your average R:R improved from 1.2 to 2.1"

4. **Automation Suggestions:**
   - "You always pause mean-reversion strategies when regime changes. Want to automate this?"
   - "You frequently reduce position size when VIX >30. Create a rule?"

**AI-Enhanced (via Intelligence Backbone):**
- Analyzes notes for patterns: "You've mentioned 'regime' 4 times"
- Identifies repeated behaviors and lessons
- Suggests automation for repeatable patterns
- Learns user's decision-making patterns
- Correlates journal entries with performance
- Detects emotional patterns (stress, FOMO, revenge trading)
- Suggests improvements based on successful patterns

##### 9. Strategy Lifecycle & Version Control

**Location:** Strategy Detail View â†’ New Tab: "Version History"

**Purpose:** Track strategy evolution and A/B test results.

**Features:**
- Complete version history with performance comparison
- A/B test results (statistical significance)
- Rollback capability
- Parameter change tracking
- Performance before/after each change

**AI-Enhanced (via Intelligence Backbone):**
- Identifies which changes improved performance
- Learns optimal parameter ranges
- Suggests rollback when new version underperforms
- Tracks iteration patterns

**Integration Architecture:**

All features share the Intelligence Backbone for:
- Unified data collection (every trade, every condition, every outcome)
- Shared knowledge graph (Neo4j + Qdrant + ClickHouse)
- Consistent AI processing (PydanticAI + LangGraph + GraphRAG)
- Cross-feature learning (insights from one feature inform others)

**Progressive Mastery:**

- Easy Mode: Simple metrics and pass/fail indicators
- Advanced Mode: Detailed analytics with drill-down capabilities
- All features respect user's expertise level

**Regulatory Framing:**

All features present factual analysis of the user's own data. No investment advice, no recommendations about what to trade. Only information to enable better decision-making.

#### Benchmarking & Testing

- Performance SLOs: first-token/latency targets, order placement p95 thresholds
- Benchmark suite: backtest throughput, order throughput, data pipeline load
- Regression and degradation alerts on >10% performance drop
- Testing: unit/integration (engine, AI), WebSocket stability, strategy robustness
- Promotion enforcement: block promotion on SLO/guardrail violations; store results in ClickHouse; attach run IDs/correlation IDs


### Notifications & Alerts System

Comprehensive notification and alert system with multiple delivery methods and priority levels.

#### Alert Types

**1. Price Alerts**
- Above/below specific price
- Crosses moving average
- Breaks support/resistance
- Percentage change (e.g., +5% in 1 hour)

**2. Indicator Alerts**
- RSI overbought/oversold
- MACD crossover
- Bollinger Band squeeze
- Custom indicator conditions

**3. Strategy Alerts**
- Strategy started/stopped
- Strategy signal generated
- Strategy performance milestone (e.g., +10% profit)
- Strategy drawdown threshold

**4. Risk Alerts**
- Risk limit approached (80% of limit)
- Risk limit breached
- Margin call warning
- Liquidation risk
- Correlation spike

**5. System Alerts**
- Exchange API down
- Data feed disconnected
- Order placement failed
- Database connection lost
- High latency detected

#### Alert Conditions

**Comparison Operators:**
- Above (>)
- Below (<)
- Crosses above
- Crosses below
- Equals (=)
- Not equals (!=)
- Between range
- Outside range

**Divergence Detection:**
- Price vs RSI divergence
- Price vs volume divergence
- Custom divergence conditions

**Time-Based Conditions:**
- Condition met for X minutes
- Condition met X times in Y minutes
- Condition met during specific hours

#### Alert Delivery Methods

**1. In-App Notifications**
- Toast notifications (non-blocking)
- Banner notifications (sticky)
- Modal notifications (critical only)
- Notification center (history)
- Badge count on icon

**2. Email Notifications**
- Configurable email address
- HTML template
- Include chart screenshot (optional)
- Grouped notifications (digest mode)

**3. Webhook Notifications**
- POST to custom URL
- Configurable payload format (JSON)
- Authentication headers
- Retry on failure (3 attempts)
- Use case: Integration with Slack, Discord, Telegram

**4. SMS Notifications** (Optional)
- Via Twilio integration
- Critical alerts only
- Rate limited (max 10/day)
- Opt-in required

**5. Push Notifications** (Mobile/PWA)
- Browser push notifications
- Mobile app push notifications
- Configurable per alert type

#### Alert Priority Levels

**CRITICAL:**
- Liquidation risk
- System failure
- Security breach
- Delivery: All enabled methods

**HIGH:**
- Risk limit breached
- Strategy stopped unexpectedly
- Order placement failed
- Delivery: In-app + Email + Webhook

**MEDIUM:**
- Price alert triggered
- Strategy signal generated
- Risk limit approached
- Delivery: In-app + Email

**LOW:**
- Informational updates
- Performance milestones
- Delivery: In-app only

#### Alert Frequency Limits

**Rate Limiting:**
- Same alert: Max 1 per 5 minutes
- Same symbol: Max 5 alerts per hour
- Total alerts: Max 50 per hour
- Critical alerts: No limit

**Quiet Hours:**
- Configure quiet hours (e.g., 10 PM - 7 AM)
- Critical alerts only during quiet hours
- Snooze all alerts temporarily

**Alert Grouping:**
- Group similar alerts (e.g., multiple price alerts)
- Single notification with summary
- Expandable to see details

#### Alert Management UI

**Alert List View:**
- Active alerts
- Triggered alerts (history)
- Filter by: type, priority, symbol, strategy
- Sort by: time, priority
- Bulk actions: delete, disable, test

**Alert Creation Form:**
- Alert type selector
- Condition builder (visual)
- Delivery method checkboxes
- Priority selector
- Test alert button

**Alert History:**
- All triggered alerts
- Filter by date range, type, symbol
- Export to CSV
- Analytics: Most triggered alerts, false positive rate



### Export & Import Features

Comprehensive data export and import capabilities for strategies, reports, and historical data.

#### Export Features

**1. Strategy Performance Reports**
- Export format: PDF, CSV, JSON, Excel
- Include: Metrics, equity curve, trade list, drawdown chart
- Customizable template
- Scheduled exports (daily, weekly, monthly)

**2. Risk Reports**
- Export format: PDF, CSV
- Include: Risk metrics, exposure breakdown, limit utilization
- Compliance-ready format
- Scheduled exports

**3. Tax Reports**
- Export format: CSV, PDF (IRS Form 8949 compatible)
- Include: All trades with cost basis, proceeds, gain/loss
- Filter by: Date range, asset class, venue
- Support for: FIFO, LIFO, HIFO, Specific ID
- Integration with: TurboTax, TaxAct, CoinTracker

**4. AI Interaction History**
- Export format: JSON, CSV, Markdown
- Include: All AI conversations, suggestions, approvals
- Filter by: Date range, agent, action type
- Use case: Audit trail, compliance, learning

**5. Trade Journal Export**
- Export format: PDF, Markdown, CSV
- Include: All journal entries with attachments
- Customizable PDF template
- Filter by: Date range, strategy, tags

**6. Backtest Results Export**
- Export format: JSON, CSV, PDF
- Include: Full backtest results, trades, metrics
- Shareable link (optional)
- Import into other platforms

#### Import Features

**1. Import Strategies from Other Platforms**

**TradingView Pine Script:**
- Parse Pine Script code
- Convert to native strategy format
- Strategy Advisor Agent assists with conversion
- Parity check on historical data

**QuantConnect Lean:**
- Import Lean algorithm (C#/Python)
- Convert to native strategy format
- Maintain logic equivalence
- Backtest comparison

**Freqtrade:**
- Import Freqtrade strategy (Python)
- Convert to native format
- Preserve indicators and logic
- Performance comparison

**Backtrader:**
- Import Backtrader strategy (Python)
- Convert to native format
- Maintain strategy logic
- Validation backtest

**2. Import Historical Trades from Exchanges**

- Connect to exchange API
- Fetch historical trades (up to 3 months)
- Import into trade history
- Reconcile with existing trades
- Calculate historical P&L
- Generate tax reports

**3. Import Market Data**

- Import CSV files (OHLCV format)
- Import from data providers (Polygon, Alpha Vantage, etc.)
- Validate data integrity
- Store in QuestDB/ClickHouse
- Use for backtesting

**4. Import Watchlists**

- Import from CSV
- Import from TradingView
- Import from other platforms
- Bulk add to watchlist

**5. Import Risk Rules**

- Import from JSON/YAML
- Predefined rule templates
- Bulk import for multiple strategies
- Validation before import


### Collaboration Features (Future)

**Strategy Sharing:**
- Share strategies with other users (read-only or editable)
- Strategy marketplace (buy/sell strategies)
- Strategy ratings and reviews
- Strategy performance leaderboard

**Team/Organization Features:**
- Multi-user accounts
- Role-based access control (RBAC)
  - Admin: Full access
  - Trader: Trading access
  - Analyst: Read-only access
  - Viewer: Dashboard access only
- Shared strategies and backtests
- Team chat and collaboration
- Audit logs for team actions

**Community Features:**
- Public strategy library
- Discussion forums
- Strategy ideas and tips
- User profiles and reputation
- Follow other traders (anonymized performance)


### 7. AI Integration


### Intelligence Backbone: Self-Improving Platform

**Core Concept:**

SymbioteTrader features a unified **Intelligence Backbone** that transforms the platform from a collection of tools into a self-improving intelligent trading assistant. Every action generates data that feeds into a knowledge graph, powering AI-enhanced insights across all features.

**The Feedback Loop:**

```
User Actions & Outcomes
â”œâ”€ Backtests, trades, strategy changes, market conditions
â”œâ”€ Performance data (wins, losses, why)
â”œâ”€ Market regime data (trending, ranging, volatility)
â”œâ”€ Sentiment data (news, social, on-chain)
â”œâ”€ User behavior patterns (what they create, adjust)
â”œâ”€ Execution quality (slippage, fills, costs)
â””â”€ Risk events (circuit breakers, overfill prevention)
         â†“
Knowledge Graph Storage
â”œâ”€ Neo4j: Relationships (strategy â†’ regime â†’ outcome)
â”œâ”€ Qdrant: Vector embeddings (semantic similarity)
â”œâ”€ ClickHouse: Time-series analytics
â””â”€ PostgreSQL: Structured data
         â†“
AI Processing Layer
â”œâ”€ PydanticAI: Conversational queries
â”œâ”€ LangGraph: Multi-step analysis workflows
â”œâ”€ GraphRAG: Retrieval from knowledge graph
â””â”€ Pattern Recognition: ML models detect patterns
         â†“
AI-Enhanced Insights (Applied Across All Features)
â”œâ”€ Overfitting Detection: "Strategies like yours..."
â”œâ”€ Strategy Optimization: "Best parameters for regime..."
â”œâ”€ Execution Quality: "TWAP reduces your slippage by..."
â”œâ”€ Risk Management: "Your risk tolerance suggests..."
â”œâ”€ Market Intelligence: "Current regime favors..."
â””â”€ Behavioral Insights: "You typically pause when..."
         â†“
User Sees Insights â†’ Takes Action â†’ Loop Continues (Gets Smarter)
```

**Success Maps:**

The Intelligence Backbone builds multidimensional **Success Maps** that map strategy characteristics to market conditions to outcomes:

```
Example Success Map: Mean Reversion Strategy
â”œâ”€ Parameters: RSI < 30, 2% stop loss, 4 parameters
â”‚
â”œâ”€ Success Conditions (High Win Rate):
â”‚   â”œâ”€ Market Regime: Range-bound âœ…
â”‚   â”œâ”€ Volatility: Low to Medium âœ…
â”‚   â”œâ”€ Sentiment: Neutral (40-60) âœ…
â”‚   â”œâ”€ Liquidity: High âœ…
â”‚   â””â”€ Time of Day: 08:00-16:00 UTC âœ…
â”‚   â””â”€ Historical Win Rate: 87%
â”‚
â”œâ”€ Failure Conditions (Low Win Rate):
â”‚   â”œâ”€ Market Regime: Trending âŒ
â”‚   â”œâ”€ Volatility: High âŒ
â”‚   â”œâ”€ Sentiment: Extreme (<20 or >80) âŒ
â”‚   â””â”€ Time of Day: 00:00-08:00 UTC âŒ
â”‚   â””â”€ Historical Win Rate: 42%
â”‚
â””â”€ Learned Patterns:
    â”œâ”€ User typically pauses in failure conditions (after 2.8 days avg)
    â”œâ”€ Automation opportunity: Auto-pause in failure conditions
    â””â”€ Expected savings: $340 per regime change
```

**Key Characteristics:**

- **Personalized:** Success Maps are unique to each user's strategies and outcomes
- **Dynamic:** Updated with every trade and market condition change
- **Predictive:** Used to forecast strategy performance in current conditions
- **Actionable:** Drive AI-enhanced insights across all features
- **Regulatory-Safe:** All insights are factual observations from user's own data, never advice

**How It Enhances Features:**

The Intelligence Backbone powers AI-enhanced insights in:
- Overfitting Detection (pattern recognition from historical overfit strategies)
- Execution Cost Simulator (personalized execution recommendations)
- Post-Trade Analysis (learning from wins/losses)
- Strategy Health Monitoring (predictive degradation detection)
- Signal Attribution (regime-aware performance analysis)
- Trade Journal (behavioral pattern recognition and automation suggestions)
- Correlation Analysis (regime-aware portfolio optimization)
- Risk Management (personalized risk tolerance learning)

All insights maintain regulatory compliance by presenting factual observations from the user's own data, never providing investment advice or recommendations.

### Agent Orchestration (Hybrid: PydanticAI + LangGraph)

- Decision: Hybrid architecture for all AI functionality
  - PydanticAI: conversational â€œfront doorâ€ (type-safe inputs/outputs, fast parallel lookups, short-running actions)
  - LangGraph: durable orchestration for long/branching workflows (backtests, paper trading, promotions, incident runbooks)
- Responsibilities
  - PydanticAI layer
    - Intent parsing and argument validation (symbols, horizons, budgets, risk mode) using Pydantic models
    - Guardrails at the edge (position/leverage caps, venue allowlists, daily budgets)
    - Starts/monitors/cancels jobs via a narrow Jobs API; streams progress and approval prompts into chat
    - Memory access (Redis/Qdrant/Neo4j) for context-aware answers; provider routing via LiteLLM with budgets and failover
    - Budgets/quotas: per-call, per-session, and global caps via LiteLLM; fallback chain; hard cutoffs and caching
    - Context budgets & handoffs: consults Context Manager to trim/summarize tool traces, memory, and artifacts to fit target model context_window/max_output without losing required signal; structured summaries preserve provenance and links

    - Event streaming: progress/approvals to UI via SSE/WebSockets; include correlation_id for deep links

  - LangGraph layer
    - Checkpoints, retries, timers, and pause/resume with human approvals
    - Pipelines: sentiment â†’ candidate generation â†’ backtest/optimize â†’ canary/paper â†’ (approval) â†’ promote/rollback
    - Incident runbooks: circuit breakers â†’ flatten exposures â†’ health checks â†’ resume
    - Observability via Langfuse; emit status events for UI
- Decision rules
  - Single-step or quick parallel calls â†’ PydanticAI
  - Multi-step with approvals/resume/branching/timers â†’ LangGraph

**📘 Complete Implementation Details:** See **Appendix C: PydanticAI vs LangGraph Decision Tree** for detailed decision criteria with 7 decision points, 30-second runtime threshold, 37 concrete examples across all features, escalation patterns, hybrid workflows, and anti-patterns.


##### Complete Decision Criteria

**Quick Reference Decision Tree:**

```
START
  ↓
Does it need human approval mid-workflow? → YES → LangGraph
  ↓ NO
Must it survive restarts/crashes? → YES → LangGraph
  ↓ NO
Expected runtime > 30 seconds? → YES → LangGraph
  ↓ NO
Does it have branching logic (if/else workflows)? → YES → LangGraph
  ↓ NO
Does it need retry logic with backoff? → YES → LangGraph
  ↓ NO
Is it scheduled/recurring execution? → YES → LangGraph
  ↓ NO
Is it a single LLM call or simple parallel calls? → YES → PydanticAI
  ↓ NO
DEFAULT → PydanticAI (with option to escalate)
```

---

**Detailed Criteria:**

**Use PydanticAI when:**
- ✅ Single LLM call with structured output
- ✅ Quick operations (< 30 seconds expected runtime)
- ✅ Stateless or ephemeral state
- ✅ No human approval needed
- ✅ Simple parallel calls (e.g., analyze 5 assets simultaneously)
- ✅ Conversational UI interactions
- ✅ Real-time analysis and recommendations
- ✅ No retry logic needed (or simple retry is sufficient)

**Use LangGraph when:**
- ✅ Multi-step workflows with dependencies
- ✅ Long-running operations (> 30 seconds)
- ✅ Requires checkpointing (survive restarts)
- ✅ Human approval gates mid-workflow
- ✅ Complex branching logic (if/else/switch)
- ✅ Retry logic with exponential backoff
- ✅ Scheduled/recurring execution
- ✅ Incident response runbooks
- ✅ Strategy lifecycle management (backtest → paper → live)

---

**30-Second Threshold Rationale:**

- **< 30s**: User expects immediate response, can wait in UI, no need for background job
- **> 30s**: User expects background job, needs progress updates, should be able to close UI and come back

**Examples:**

| Feature | Expected Runtime | Tool | Rationale |
|---------|------------------|------|-----------|
| Parse user command | < 1s | PydanticAI | Single LLM call, immediate |
| Analyze single asset | 2-5s | PydanticAI | Quick analysis, no state |
| Generate strategy ideas | 10-20s | PydanticAI | Parallel LLM calls, no approval |
| Backtest single strategy | 30-60s | LangGraph | Long-running, needs checkpointing |
| Optimize strategy parameters | 5-30 min | LangGraph | Very long, needs progress updates |
| Deploy strategy to paper trading | 10-20s | LangGraph | Needs approval gate |
| Promote paper → live | 5-10s | LangGraph | Needs approval gate |
| Incident response (flatten positions) | 20-40s | LangGraph | Multi-step, needs retry logic |
| Daily strategy rebalance | 2-10 min | LangGraph | Scheduled, long-running |
| Chat: "What's my P&L?" | < 1s | PydanticAI | Simple query, immediate |
| Chat: "Why did strategy X lose money?" | 5-15s | PydanticAI | Analysis, no approval needed |
| Chat: "Create and backtest a new strategy" | 1-5 min | LangGraph | Multi-step, approval before deploy |

---

**Escalation Pattern:**

Start with PydanticAI for validation, escalate to LangGraph if needed:

```python
async def handle_user_command(command: str):
    # Step 1: Parse and validate with PydanticAI (fast)
    parsed = await pydantic_agent.parse_command(command)

    # Step 2: Estimate runtime
    estimated_runtime = estimate_runtime(parsed)

    # Step 3: Decide execution path
    if estimated_runtime < 30:
        # Execute directly with PydanticAI
        result = await pydantic_agent.execute(parsed)
        return result
    else:
        # Create background job with LangGraph
        job_id = await jobs_api.create_job(parsed)
        await langgraph.start_workflow(job_id, parsed)
        return {"job_id": job_id, "status": "started", "message": "Long-running job created"}
```

---

**Hybrid Workflow Example:**

**Feature:** "Backtest and deploy strategy"

1. **PydanticAI**: Parse user request, validate parameters (< 1s)
2. **LangGraph**: Execute backtest workflow (30-60s)
   - Node 1: Run backtest
   - Node 2: Analyze results
   - Node 3: **Human approval gate** (wait for user)
   - Node 4: Deploy to paper trading
   - Node 5: Monitor for 24 hours
   - Node 6: **Human approval gate** (wait for user)
   - Node 7: Promote to live trading
3. **PydanticAI**: Generate summary report for user (5-10s)

---

**Anti-Patterns (What NOT to do):**

❌ **Using LangGraph for simple queries**
```python
# BAD: Overkill for simple query
workflow = langgraph.create_workflow()
workflow.add_node("get_pnl", get_pnl_node)
result = await workflow.run()

# GOOD: Use PydanticAI
result = await pydantic_agent.get_pnl(user_id)
```

❌ **Using PydanticAI for long-running operations**
```python
# BAD: User waits 5 minutes, connection times out
result = await pydantic_agent.backtest_strategy(strategy_id)

# GOOD: Use LangGraph with background job
job_id = await langgraph.start_backtest_workflow(strategy_id)
return {"job_id": job_id}
```

❌ **Using PydanticAI for operations that need approval**
```python
# BAD: No approval gate, strategy deployed immediately
await pydantic_agent.deploy_strategy(strategy_id)

# GOOD: Use LangGraph with approval node
workflow = langgraph.create_deployment_workflow(strategy_id)
workflow.add_approval_gate("user_approval")
await workflow.run()
```

---

**Implementation Checklist:**

- [ ] All conversational UI interactions use PydanticAI
- [ ] All operations > 30s use LangGraph with background jobs
- [ ] All approval gates use LangGraph
- [ ] All scheduled tasks use LangGraph
- [ ] All incident response runbooks use LangGraph
- [ ] Escalation pattern implemented (PydanticAI → LangGraph)
- [ ] Runtime estimation function implemented
- [ ] Job status tracking implemented
- [ ] Progress updates via WebSocket for LangGraph jobs



#### AI Orchestration Sequence Diagram

**Diagram Description:**

A sequence diagram should be created showing the complete AI request flow from user prompt to response. This diagram illustrates the hybrid PydanticAI + LangGraph architecture in action.

**Actors/Components:**
1. User (Frontend)
2. Backend API
3. AVC Gate (Ask vs Command classifier)
4. PydanticAI Layer
5. Jobs API
6. LangGraph Orchestrator
7. Celery Worker
8. AI Provider (OpenAI/Anthropic/etc.)
9. Data Stores (PostgreSQL, Qdrant, Neo4j)

**Flow for "Ask" Request (Simple Query):**
- User â†’ Frontend: "What's the current market regime for BTC?"
- Frontend â†’ Backend API: POST /ai/chat
- Backend API â†’ AVC Gate: Classify intent
- AVC Gate â†’ AI Provider: Classify (gpt-4o-mini)
- AI Provider â†’ AVC Gate: Classification = "ask" (confidence: 0.95)
- AVC Gate â†’ PydanticAI: Route to conversational handler
- PydanticAI â†’ Qdrant: Retrieve relevant context (RAG)
- PydanticAI â†’ Neo4j: Retrieve user memory/preferences
- PydanticAI â†’ AI Provider: Generate response (claude-3-5-sonnet)
- AI Provider â†’ PydanticAI: Response text
- PydanticAI â†’ Backend API: Formatted response
- Backend API â†’ Frontend: SSE stream
- Frontend â†’ User: Display response

**Flow for "Command" Request (Long-Running Job):**
- User â†’ Frontend: "Optimize my Mean Reversion strategy"
- Frontend â†’ Backend API: POST /ai/chat
- Backend API â†’ AVC Gate: Classify intent
- AVC Gate â†’ AI Provider: Classify (gpt-4o-mini)
- AI Provider â†’ AVC Gate: Classification = "command" (confidence: 0.92)
- AVC Gate â†’ PydanticAI: Route to command handler
- PydanticAI â†’ Backend API: Validate permissions (Supervised mode)
- Backend API â†’ Frontend: Request user approval
- Frontend â†’ User: Show approval card
- User â†’ Frontend: Approve
- Frontend â†’ Backend API: POST /ai/approve
- Backend API â†’ PydanticAI: Approval granted
- PydanticAI â†’ Jobs API: Create optimization job
- Jobs API â†’ PostgreSQL: Store job metadata
- Jobs API â†’ LangGraph: Start workflow
- LangGraph â†’ Celery: Queue backtest tasks
- Celery â†’ Worker: Execute backtests
- Worker â†’ ClickHouse: Query historical data
- Worker â†’ PostgreSQL: Store results
- Worker â†’ LangGraph: Report progress
- LangGraph â†’ Jobs API: Update job status
- Jobs API â†’ Backend API: SSE progress update
- Backend API â†’ Frontend: Stream progress
- Frontend â†’ User: Show progress (50% complete)
- ... (repeat until complete)
- Worker â†’ LangGraph: All backtests complete
- LangGraph â†’ AI Provider: Analyze results
- AI Provider â†’ LangGraph: Recommendations
- LangGraph â†’ Jobs API: Job complete
- Jobs API â†’ Backend API: SSE completion
- Backend API â†’ Frontend: Show results
- Frontend â†’ User: Display optimization results

**Key Decision Points to Highlight:**
1. **AVC Gate Classification**: Where "ask" vs "command" routing happens (critical for safety)
2. **Permission Check**: Where user approval is requested (Supervised/Interactive modes)
3. **Jobs API Handoff**: Where PydanticAI hands off to LangGraph for long-running work
4. **Progress Streaming**: How progress updates flow back to user via SSE
5. **Data Store Interactions**: When RAG (Qdrant), Memory (Neo4j), and Results (PostgreSQL) are accessed

- Interaction model: Orchestrator + Specialist Agents
  - Single chat entrypoint: Orchestrator (PydanticAI) routes requests to tools/agents
  - Specialists as tools: Strategy Advisor, Web Research, Risk Governance, Execution Quality, Data Ingestion, Portfolio Analytics, Compliance; invoked via Jobs API â†’ LangGraph/Celery
  - Deterministic orchestration: avoid freeform agent-to-agent chatter; use LangGraph pipelines for multi-step work; post results back to chat with provenance and costs
  - Memory policy: conversation state (Redis), working set/context, and long-term memory (Qdrant/Neo4j) with retrieval rules; correlation_id across calls
  - Approvals & safety: orchestrator collects approvals; guardrails enforced at tool boundary; budgets/quotas via LiteLLM; full audit trail
  - UI: agent-labeled outputs in chat, slash-commands for direct tool runs, agent palette; open job details/progress from chat

### AI Runtime Orchestration

- Providers & Budgets
  - Provider registry with model catalog (capabilities, cost hints); user-set rpm/tpm and spend caps per minute/hour/5h/day/week/month
  - Concurrency per provider/model; fallback order; enable/disable per provider
- Model Routing
  - Agentâ†’Model map (defaults): Orchestrator, Risk, Strategy Advisor, Web Research, Execution Quality, Regime Detection
  - Per-strategy overrides and fallback chains (e.g., Opus â†’ Sonnet â†’ Flash) with quality thresholds and cache usage
- Rate Limiter & Scheduler
  - Token buckets per provider/model and time window; global cap; priority queues: High (risk/alerts), Medium (proposals), Low (research)
  - Backpressure: space out, defer with ETA, route to cheaper fallback, or shed non-critical tasks with rationale
  - Deadlines/SLAs per task class; expiry of stale queued tasks
- Event Triggers
  - Strategy events: drawdown breach, drift, slippage spike, missed fills, error/anomaly, data regime shift
  - Market/sentiment events: relevance spikes, macro events; de-duplication and cooldowns to avoid cascades
  - Routing rules select Agent, model, and output type (analysis/brief/proposal) with desired budget/latency profile
- AI Twin (Paper Shadow)
  - When ai_enabled, run synchronized paper twin for safe experimentation and backtests; live remains deterministic
  - Proposals include diffs/metrics; promotion path: Paper â†’ Canary â†’ Live via Jobs/Approvals and guardrails
- Modes per Strategy
  - Off (default), Analyze-only, Propose, Autopilot (scoped whitelist); twin enabled by default when ai_enabled
- Safety Integration
  - Askâ€‘vsâ€‘Command Gate + Jobs API + Risk caps + OTP for live-impacting actions; idempotency keys to prevent duplicates
- Observability
  - Metrics: rpm/tpm usage, queue sizes/age, drops/defer counts, spend vs caps, cache hit rate; OTel tracing with correlation_id
- Config surfaces
  - Providers page (keys, caps, fallback order), Agent Model Map, per-strategy AI settings
- Defaults
  - AI disabled per strategy; no live changes without explicit approval unless user opts into specific autopilot actions

  - Long compute without orchestration needs (sims/ingest) â†’ Celery workers

- Type safety & governance
  - All Jobs API payloads and responses are Pydantic models

  - Risk constraints enforced both at PydanticAI tool boundary and again inside LangGraph tool nodes
  - Correlation IDs and audit logs on every handoff; OTel traces + Langfuse runs

#### Provider Registry Schema (incl. context budgets)

- Purpose: single source of truth for routing, limits, costs, and context capabilities
- Key fields per model: type (chat|embedding), context_window_tokens (input), max_output_tokens, rpm/tpm/concurrent, budgets, costs, capabilities, tokenizer {name, library, version}, embedding_dim (if type=embedding)

````json
{ "provider":"openai","model":"gpt-4o","context_window_tokens":200000,"max_output_tokens":16384,
  "limits":{"rpm":60,"tpm":180000,"concurrent":4,"budget_day_usd":5},
  "cost_usd_per_1k":{"input":0.005,"output":0.015},"capabilities":["tools","json","vision"] }
- Example (embedding model)
````json
{ "provider":"openai","model":"text-embedding-3-large","type":"embedding",
  "embedding_dim":3072,
  "tokenizer":{"name":"o3","library":"tiktoken","version":"latest"},
  "limits":{"rpm":2000,"tpm":2000000,"concurrent":8},
  "cost_usd_per_1k":{"input":0.00013} }
````

#### Tokenizer & Chunking Policy

- Token counting
  - Prefer provider-native tokenizer; fallback to compatible local tokenizer when unavailable; apply 1.1 safety factor for prompts/tool schemas
  - Cache token counts per artifact/segment with TTL; store tokenizer fingerprint to invalidate when provider changes
- Embedding chunking defaults
  - Default chunk_size_tokens: 768; overlap: 128; minimum chunk: 256; merge fragments below minimum
  - Provider overrides by tokenizer family (e.g., {o-series: 768/128, claude: 1024/160}); registry stores per-tokenizer defaults
  - Domain hints: news/docs 768/128; code 512/96; logs 512/96; research PDFs 1024/160
- Chat handoff packaging
  - Segment classes with caps: critical (3k), recent (3k), reference (4k), logs (2k) â†’ trimmed/summarized to fit target_in
  - Structured summaries: JSON with citations (source_id, ts, url, span) to preserve provenance; small extractive snippets over abstractive when possible
- Normalization
  - Canonical token estimate computed with target modelâ€™s tokenizer; if unknown at plan-time, use orchestratorâ€™s tokenizer Ã— safety factor
- Config (policy overrides)

````json
{ "chunking_policy": {
  "defaults": {"chunk": 768, "overlap": 128, "min": 256},
  "tokenizer_overrides": {
    "o-series": {"chunk": 768, "overlap": 128},
    "claude": {"chunk": 1024, "overlap": 160}
  },
  "domains": {"news": {"chunk": 768}, "code": {"chunk": 512, "overlap": 96}}
}}
````

#### Context Manager Agent

- Role: enforce context budgets across agents/models and chat; prevent overfilling smaller windows; preserve signal and provenance
- Inputs: target context_window_tokens/max_output_tokens; task scenario; ranked context segments with token estimates (tool traces, memory, artifacts, market slices)
- Actions: select â†’ compress/summarize â†’ drop low-signal; normalize formats; emit manifest with sources, token counts, and links; write back summaries with TTL for reuse
- Policies: critical-first (risk alerts, active positions, twin state) â†’ recency bias â†’ symbol/strategy filter â†’ dedup; JIT fetch; streaming truncation when needed
- Orchestrator: PydanticAI convers. orchestrator always routes chat/tool handoffs through Context Manager

````python
def trim_context(segments, target_in, target_out):
    ranked = rank_by_relevance(segments)
    out, used = [], 0
    for s in ranked:
        if used + s.tokens > target_in: break
        out.append(s.minified or s.summary)
        used += s.tokens
    return out, min(target_out, policy_max_out())
````

#### Event Triggers Matrix (routing defaults)

- Drawdown breach (>= X% in Y):
  - Agent: Risk Governance; Model: fast/medium; SLA: 5s; Priority: High; Budget: small
  - Input budget: ~8k tokens (twin P&L, recent fills/orders, caps); Handoff: CM select+summarize
  - Output: Proposal (reduce exposure N%, tighten stops); Path: Paper Twin â†’ Job â†’ Confirm
- Slippage spike (venue or symbol):
  - Agent: Execution Quality; Model: fast; SLA: 3s; Priority: High
  - Input: ~6k tokens (fills vs quotes, book stats, latency); Handoff: CM select+summarize
  - Output: Brief or Proposal (switch venue/route algo, pacing)
- Regime shift (vol/trend filter flip):
  - Agent: Regime Detection; Model: medium; SLA: 10s; Priority: Medium
  - Input: ~10k tokens (features snapshot, recent returns); Handoff: CM aggregate+summarize
  - Output: Brief (state change) Â± Proposal (parameter tweak bounds)

#### Fallback Trees & SLA-aware Routing

- Tiers
  - Large-window (L): highest context/cost; used for complex proposals/research when budgets allow
  - Medium (M): balanced context/cost; default for most proposals and regime analyses
  - Small/Fast (S): low latency/cost; default for risk alerts and execution diagnostics
- Task-class preferences (defaults)
  - Risk Governance: S â†’ M (L only if target_in > M window and SLA allows)
  - Strategy Proposals: L â†’ M (otherwise defer)
  - Research/News: M â†’ L â†’ S (S allowed for quick headlines; upgrade to M/L when deeper brief requested)
  - Execution Quality: S â†’ M
  - Chat Orchestrator: S â†’ M (L when user explicitly opts into deep analysis and budget permits)
- Routing algorithm (scheduler integrates rate/budget + SLA)

````python
def route_task(task):
    for tier in preferred_tiers(task.class):
        if within_limits(tier) and meets_sla(task, tier):
            return tier
    if can_defer(task):
        return defer_with_eta(task)
    return shed_with_reason(task)
````

- Selection signals
  - Limits: rpm/tpm/concurrency; spend caps (day/month); predicted tokens via Context Manager manifest
  - SLA: required latency; queue age; ETA at current throughput
  - Quality gates: minimum context requirement; if tier S cannot fit target_in even after summarization, escalate to M
- Observability
  - Log chosen tier, alternatives considered, reasons (limits/SLA/quality), predicted tokens/cost; correlate to job/chat via correlation_id

- Sentiment/news spike (relevant to watchlist):

  - Agents: Web Research â†’ Strategy Advisor; Models: Flash â†’ Opus fallback chain; SLA: 20â€“60s; Priority: Medium
  - Input: ~12k tokens (news clusters summary, correlations); Handoff: CM summarize to brief
  - Output: Opportunity Brief â†’ optional Canary template Proposal
- Data anomaly/error (gap/latency):
  - Agent: Data Ingestion; Model: fast; SLA: 2s; Priority: High
  - Input: ~2k tokens (feed metrics, gap spans); Handoff: CM minimal trace
  - Output: Incident note; may throttle research/autopilot until resolved

### Ask-vs-Command Gate (AVC Gate)

Goal: Never act on a user message unless itâ€™s truly a command. When in doubt, treat as a question and require explicit confirmation, with stronger interlocks for stateful trading.

- Pipeline (deterministic, safety-biased)
  - Pre-parse: split multi-sentence inputs; normalize punctuation/case; detect explicit Slash Commands first (`/...`).
  - Lexical heuristics:
    - Question signals: `?`, wh-words (who/what/when/where/why/how), modal questions (should/could/would), meta-requests (explain/compare/pros-cons), â€œwhy donâ€™t weâ€¦â€.
    - Command signals: leading imperatives (buy/sell/start/cancel/flatten/execute/place), â€œplease [verb]â€¦â€, explicit slash commands.
    - Ambiguity: mixed verbs, suggestions (â€œletâ€™s â€¦â€, â€œcan you â€¦â€) â†’ default to question.
  - LLM classification (PydanticAI validator with abstain): classify â†’ QUESTION | COMMAND | INFO | SMALL_TALK | AMBIGUOUS; extract candidate action + params; emit confidence + rationale.
  - Risk scoring: map candidate action â†’ READ_ONLY | STATEFUL_LOW | STATEFUL_MED | STATEFUL_HIGH.
  - Policy enforcement:
    - QUESTION/INFO/SMALL_TALK â†’ answer only; never execute.
    - COMMAND + READ_ONLY + high confidence â†’ may auto-run; show result card.
    - COMMAND + any stateful risk OR confidence below threshold â†’ show Confirmation Card; require explicit approval.
    - AMBIGUOUS â†’ disambiguate (â€œDo you want me to execute â€¦ or were you asking?â€). Default no-execute.

#### Context Budget Policies (Appendix)

- Purpose: default per-task-class budgets so Context Manager can right-size handoffs across models with different windows
- Conventions
  - target_in: maximum input tokens the Context Manager should assemble for the task (before provider tokenizer padding/system prompts)
  - target_out: maximum output tokens requested; bounded by model max_output_tokens
  - Safety margin: by default, cap target_in at 80% of model context_window_tokens to leave room for system/tool schemas
- Defaults (can be overridden per strategy/agent)
  - Risk Governance alerts: target_in â‰ˆ 8k, target_out â‰ˆ 1k
  - Strategy Proposals (twin-only): target_in â‰ˆ 16k, target_out â‰ˆ 2k
  - Research/News Briefs: target_in â‰ˆ 24k, target_out â‰ˆ 2k
  - Execution Quality: target_in â‰ˆ 6k, target_out â‰ˆ 0.8k
  - Regime Detection: target_in â‰ˆ 10â€“12k, target_out â‰ˆ 1k
  - Chat Q&A (orchestrator): target_in â‰ˆ 4k, target_out â‰ˆ 0.8k
- Overflow rules
  - Trim by priority (critical â†’ recent â†’ relevant symbol/strategy â†’ dedup) then summarize; if still over, route to fallback model with larger window if allowed
  - Always preserve provenance (links, run IDs, timestamps) in summaries; log dropped segments with rationale

- Execution interlocks
  - Only two execution paths:
    1) Slash Command: parse â†’ validate â†’ preview/diff â†’ confirm per risk policy.
    2) Natural language: never executes without an on-screen Confirmation Card approval.
  - Live trading (STATEFUL_HIGH): always preview + Confirm + optional OTP/2FA; show venue/symbol/side/qty/notional/fees/risk flags; dry-run by default.
  - Paper trading (STATEFUL_MED): at minimum, explicit confirmation.

- Disambiguation & confirmations (UX)
  - Ambiguity prompt: â€œI read this as a question. Do you want me to take action?â€ [Explain] [Take Action]
  - Confirmation Card: action summary, params, risk, costs; buttons Approve/Cancel (default focus = Cancel); OTP for HIGH risk.
  - Read-only tools: no confirm required, but display â€œWhat Iâ€™m doingâ€ badge.

- Language handling (safety defaults)
  - Treat why/what/how/should/could/would as questions even without `?`.
  - â€œCan you â€¦â€ â†’ question unless explicit `/command` or user clicks Take Action.
  - â€œLetâ€™s â€¦ / why donâ€™t we â€¦â€ â†’ suggestion/question (no execution).
  - â€œDo X now / buy/sell â€¦â€ â†’ command candidate â†’ still requires confirmation.

- Slash Commands (privileged but checked)
  - Slash Commands are explicit â€œdo somethingâ€ text, but still follow risk policy; live trading adds OTP.
  - Natural language never directly executes without visual confirmation.

- Safety controls
  - Safety bias: on ambiguity classify as QUESTION.
  - Idempotency keys: dedupe repeated approvals in short windows.
  - Rate limiting: throttle sequential HIGH-risk approvals.
  - Caps: enforce user/strategy/venue limits (notional, leverage, drawdown, daily loss).

- Observability & guardrails
  - Log: classification (intent, confidence, risk), confirmations, declines, overrides.
  - Metrics: false-positive command executions (<0.5%), ambiguity rate, overrides, time-to-confirm, aborted actions.
  - Tracing: correlation_id across classify â†’ preview â†’ approval â†’ execution.

- Integration in our stack
  - Orchestrator (PydanticAI) runs AVC Gate first; routes to answer path or command path â†’ Jobs API with state PendingUserConfirm.
  - LangGraph workflows only start after confirmation; Jobs UI surfaces confirmation and OTP.

- Minimal data structures & policy

```python
from enum import Enum
from pydantic import BaseModel

class Intent(str, Enum):
    QUESTION = "QUESTION"; COMMAND = "COMMAND"; INFO = "INFO"; SMALL_TALK = "SMALL_TALK"; AMBIGUOUS = "AMBIGUOUS"
class Risk(str, Enum):
    READ_ONLY = "READ_ONLY"; STATEFUL_LOW = "STATEFUL_LOW"; STATEFUL_MED = "STATEFUL_MED"; STATEFUL_HIGH = "STATEFUL_HIGH"

class AvcResult(BaseModel):
    intent: Intent
    confidence: float
    action: str | None = None
    params: dict | None = None
    risk: Risk = Risk.READ_ONLY
    rationale: str

def should_execute(avc: AvcResult, is_slash: bool) -> str:  # NO, ASK, CONFIRM, RUN
    if avc.intent in {Intent.QUESTION, Intent.INFO, Intent.SMALL_TALK}:
        return "NO"
    if avc.intent == Intent.AMBIGUOUS or avc.confidence < 0.7:
        return "ASK"
    if avc.risk in {Risk.STATEFUL_MED, Risk.STATEFUL_HIGH}:
        return "CONFIRM"
    return "CONFIRM" if not is_slash else "RUN"
```

- Examples
  - â€œWhy would we do xyz to abc instead of hij?â€ â†’ QUESTION â†’ answer; no action.
  - â€œStart paper trading on STRAT_Aâ€ â†’ COMMAND + STATEFUL_MED â†’ Confirmation Card.
  - â€œ/order buy BTCUSDT qty=0.1 type=limit price=45000 tif=GTCâ€ â†’ COMMAND + STATEFUL_HIGH â†’ Preview + Confirm + OTP.
  - â€œCan you add RSI to the chart?â€ â†’ QUESTION â†’ offer params + Apply button; no auto-apply.
  - â€œLetâ€™s flattenâ€ â†’ AMBIGUOUS â†’ disambiguation; default no-execute.

### Confirmation Card (UI micro-spec)

- Triggers
  - Any COMMAND with stateful risk (LOW/MED/HIGH), any COMMAND with low classifier confidence, any natural-language COMMAND (non-slash) even if high confidence.
- Content
  - Header: action verb and target (e.g., "Place LIMIT Buy BTCUSDT")
  - Summary: venue, account/mode (paper/live), symbol, side, qty, est. notional, leverage (if any), order type, TIF, slippage/price bounds
  - Risk: risk tier (LOW/MED/HIGH), caps check results (position/notional/leverage/drawdown), budget usage (AI/trade), compliance flags
  - Preview: parsed parameters/diff; dryâ€‘run estimate for impact/fees; for batch actions show count and worstâ€‘case exposure
  - Meta: correlation_id, idempotency window, who will execute (strategy/agent), expected time to complete
- Controls
  - Approve (primary), Cancel (default focus), For HIGH: OTP/2FA field; optional "Run as Dryâ€‘Run/Paper" toggle when applicable
  - Expand details (chevron) to show full payload; link to logs/health for dependencies
  - Acknowledge checkbox for HIGH risk: "I understand this may affect live funds"
- Defaults & rules
  - Approve disabled until validations pass (caps/OTP/acknowledge)
  - Never autoâ€‘dismiss; ESC closes; Enter activates focused button
  - Remember choices: never allow "always trust" for HIGH; optional shortâ€‘lived remember (<=5 min) for LOW in the same session
- Accessibility
  - Keyboardâ€‘first, ARIA roles for alerts/warnings, screenâ€‘reader friendly field labels

### Jobs API (handoff between PydanticAI and LangGraph)

- Purpose: Clean boundary between chat layer and durable workflows
- Endpoints (conceptual)
  - POST /jobs/create { type, payload, idempotency_key?, correlation_id? } â†’ { job_id }
- Policy integration (AVC Gate)
  - AVC Gate decides execution path before job creation; stateful commands create jobs with state=waiting_approval (PendingUserConfirm) until user approval.
  - Risk tiers map to requirements: READ_ONLY â†’ may auto-run (no approval); STATEFUL_LOW/MED â†’ Confirmation Card; STATEFUL_HIGH â†’ Confirmation + OTP/2FA.
  - Idempotency: enforce idempotency_key within a short window to prevent duplicate executions when users click Approve more than once.
  - Correlation: every job carries correlation_id from chat message classification for full auditability and deep links.

  - GET /jobs/{job_id}/status â†’ { state: queued|running|waiting_approval|completed|failed|cancelled, progress%, pending_approval?, summary }
  - POST /jobs/{job_id}/approve { approved_by, data } â†’ 202
  - POST /jobs/{job_id}/cancel { reason } â†’ 202
- Contracts & reliability
  - Payloads/outputs validated with Pydantic; idempotent create; durable checkpoints in LangGraph
  - States drive UI badges and notifications; progress and approval prompts surfaced via chat
- Execution plane: Celery workers execute LangGraph jobs; retries/backoff and schedules via celery-beat

  - Automation modes respected (Manual/Hybrid/Full Auto) with per-action guardrails
  - Full audit trail: inputs, decisions, model/cost metrics, approvals

### Conversational Trading Assistant

- Natural language interface for trading queries and commands
- Streaming responses with real-time market data integration
- Context-aware recommendations based on user history
- Human-in-the-loop approval for critical trading decisions
- Streaming endpoints: SSE contracts (/chat/stream), session listing/stats (/chat/sessions), trade approval endpoint
- Session storage: Redis Streams for chat history; RedisJSON for session state; semantic cache warming for frequent queries
- Latency/cost SLOs: targets for chat responses; budget-aware routing via LiteLLM

### AI Memory System

- Three-tier memory architecture:
  - Short-term (Redis): Current session context
  - Semantic (Qdrant): Historical trade patterns and outcomes
  - Structural (Neo4j): Market relationships and causal events
- Retrieval Augmented Generation (RAG) for contextually relevant responses

### Agentic Graph RAG (Hybrid Qdrant + Neo4j)

- Purpose: reliably taskâ€‘aware agents without fineâ€‘tuning by grounding on KB + SOPs using both semantic vectors and graph relations
- Role/Task profiles
  - Define goals, tools, constraints, SOP links per agent; constrain query formulation, filtering, and graph traversals
- Retrieval pipeline (hybrid lexical + vector + graph)
  - Stage 1: BM25 lexical recall
  - Stage 2: Semantic vector recall (Qdrant) with metadata filters (role, tool, topic, version)
  - Stage 3: Graph expansion (Neo4j) over relevant nodes (Tools, SOPs, Strategies, Terms, Versions) via edges (uses, depends_on, belongs_to, prerequisite_of, supersedes, version_of)
  - Stage 4: Reâ€‘rank + dedupe; score/threshold gates; join citations across sources
- Graph schema (Neo4j)
  - Nodes: Document, Section, Term, Tool, SOP, Strategy, AgentRole, Version
  - Edges: uses, depends_on, belongs_to, prerequisite_of, supersedes, version_of
- Context assembly
  - Budgeted packs: Role card, Tool cards, SOP/Playbook snippets, policy guardrails, recent telemetry; include short graph path summaries; token budgets enforced
- Askâ€‘vsâ€‘Command integration
  - Gate proceeds only with sufficient grounded context; otherwise ask targeted clarifying questions
- Cost & quality controls
  - Cacheâ€‘first; distance/score thresholds; max chunks per pack; graph hop limits; disallow ungrounded answers; perâ€‘agent budgets
- Evaluation hooks
  - Attribute contributions from vector vs graph; log retrieval quality/outcomes; ablation tests; maintain gold set; periodic regressions

### AI Functions

- Strategy optimization and parameter tuning
- Market sentiment analysis from news and social media
- Risk assessment with tiered recommendations
- Performance analysis with improvement suggestions

### AI Strategy Lab & Autonomous Optimization

The AI Strategy Lab is a dedicated workspace where AI continuously experiments, optimizes, and battle-tests strategies **at user direction**. It provides the full power of AI optimization while maintaining clear user control and staying within regulatory boundaries.

#### Core Concept: User-Initiated, AI-Executed

**The Key Distinction:**
- âœ… **User initiates** optimization experiments
- âœ… **User defines** optimization criteria and constraints
- âœ… **AI executes** backtesting, paper trading, and optimization
- âœ… **User approves** changes before going live (or sets auto-approval rules)
- âœ… **User controls** the entire process

**This is automation, not advice:**
- Similar to algorithmic trading: User defines strategy rules, system executes automatically
- Similar to conditional orders: User sets conditions, system executes when met
- AI is a **tool** the user controls, not an **advisor** making decisions

#### AI Strategy Lab Workflow

**Step 1: User Initiates Experiment**

User creates a new optimization experiment:
- Select strategy to optimize
- Define optimization objective (maximize Sharpe, minimize drawdown, etc.)
- Set constraints (max drawdown, min win rate, risk level)
- Configure experiment settings (backtest variations, paper trade duration)
- Choose approval mode (require approval or auto-apply after paper trading)

**Step 2: AI Backtests & Optimizes**

AI automatically:
- Backtests 100+ parameter variations
- Ranks by user-defined objective
- Filters by user-defined constraints
- Selects top candidates for paper trading

**Step 3: AI Paper Trades**

AI automatically:
- Paper trades top 5 candidates in parallel
- Runs for user-defined duration (e.g., 7 days)
- Tracks performance vs original strategy
- Validates against constraints

**Step 4: AI Presents Results**

AI presents:
- Performance comparison (original vs optimized)
- Specific parameter changes
- Backtest and paper trading results
- Clear disclaimer about user responsibility

**Step 5: User Decides**

User reviews and:
- Approves and applies changes
- Rejects and keeps original
- Runs more tests
- Modifies constraints and re-runs

#### Experiment Dashboard

```
AI Strategy Lab
â”œâ”€ Active Experiments (3)
â”‚   â”œâ”€ Mean Reversion Optimization (Day 5/7 paper trading)
â”‚   â”œâ”€ Grid Bot Parameter Sweep (Backtesting 50 variations)
â”‚   â””â”€ Trend Following Regime Adaptation (Day 3/7 paper trading)
â”œâ”€ Completed Experiments (12)
â”‚   â”œâ”€ Mean Reversion v2 (+8.2% vs +5.1% original) [Pending Approval]
â”‚   â””â”€ Grid Bot v3 (+6.1% vs +4.8% original) [Approved, Live]
â””â”€ Experiment Queue (3)
```

**Features:**
- See all active and completed experiments
- Track progress of paper trading
- Review results and approve/reject
- View detailed performance metrics
- Revert any applied changes

#### Adaptive Strategies (Rule-Based)

Strategies can automatically adjust parameters based on market conditions using **user-defined rules**:

```
Adaptive Mean Reversion Strategy:
â”œâ”€ Base Parameters (user-defined)
â”œâ”€ Adaptation Rules (user-defined)
â”‚   â”œâ”€ If volatility >80%: Widen stop-loss by 20%
â”‚   â”œâ”€ If regime changes to trending: Reduce position size by 50%
â”‚   â””â”€ If drawdown >3%: Pause for 24 hours
â””â”€ Adaptation History (audit trail)
```

**Key Points:**
- User defines adaptation rules
- System executes rules automatically
- User can disable adaptation anytime
- Clear audit trail of all adaptations
- Similar to conditional orders (user sets rule, system executes)

#### Regulatory Framing

**Why This is Safe:**

1. **User Initiates**: User enables optimization, not AI deciding to optimize
2. **User Defines Criteria**: User sets objectives, constraints, risk limits
3. **User Approves Changes**: User must approve before parameters go live (or explicitly enables auto-approval)
4. **User Controls**: User can pause, stop, or disable at any time
5. **Proper Framing**: "Optimization tool" not "investment advisor"
6. **Clear Disclaimers**: User is responsible for strategy performance

**The AI CAN:**
- âœ… Backtest thousands of parameter variations
- âœ… Paper trade top candidates in parallel
- âœ… Analyze performance and rank results
- âœ… Continuously experiment and optimize
- âœ… Adapt strategies based on market conditions (if user defines rules)
- âœ… Present optimized parameters for user approval
- âœ… Auto-apply optimizations if user explicitly enables with constraints

**The AI CANNOT:**
- âŒ Autonomously decide to optimize without user initiation
- âŒ Change live strategies without user approval (unless user explicitly enables auto-approval)
- âŒ Recommend specific securities to buy/sell
- âŒ Provide personalized investment advice
- âŒ Make investment decisions without user-defined rules

**Legal Principle: User-Defined Automation**

The user is not receiving advice from the AI. The user is defining rules, and the AI is executing those rules automatically. This is automation, not advice.

**Examples:**
- âœ… Stop-loss order: User defines "sell if price drops 5%", system executes
- âœ… Conditional order: User defines "buy if RSI <30", system executes
- âœ… AI optimization: User defines "optimize if Sharpe improves >15% and DD <5%", AI executes
- âŒ Investment advice: AI says "you should buy Bitcoin"

The first three are automation based on user-defined rules. The last one is advice. SymbioteTrader is firmly in the "automation" category.

### AI Provider Support

- Comprehensive multi-provider integration with unified API:
  - **Provider APIs**: OpenAI, Anthropic, Google Gemini, Cohere, xAI (Grok), Mistral, Qwen, DeepSeek, Zhipu AI (GLM)
  - **Aggregators/Routers**: OpenRouter (access to 200+ models), Requesty
  - **Inference Platforms/Accelerators**: Groq
  - **Local Runtimes (self-hosted)**: Ollama, LM Studio (load Mistral/Qwen/Llama/DeepSeek locally)
  - **Extensible Architecture**: Plugin system for adding new providers
- BYOK (Bring Your Own Key) model for direct provider billing
- Intelligent provider selection based on quality/latency/cost
- Failover architecture for continuous operation during provider outages
- Optional prompt/semantic caching and budget controls

### AI Web Research Agent

- Purpose: Retrieve up-to-date market/news/sentiment data on demand and produce structured, cited summaries for strategies, dashboards, and RAG
- Tool chain: search â†’ fetch â†’ sanitize/normalize â†’ deduplicate â†’ credibility score â†’ JSON output with citations
- Search providers: user-selectable (e.g., Tavily/Serper/Brave/Bing HTTP APIs) or MCP search tools (see MCP section)
- Behaviors: timeboxed queries, domain allow/deny lists, caching TTL, transparent citations in UI
- Governance: respects Manual/Hybrid/Full Auto; in Hybrid defaults to analysis-only unless allowed to influence trades within guardrails

### MCP Tooling Support (Model Context Protocol)

- What: First-class integration with MCP tools to standardize external capabilities (search, browsing, automation, data access)
- Examples: Web Search MCP (e.g., GLM/Zhipu Search), Context docs MCP, Playwright (browser automation), Heroku, Sequential thinking; users can add any MCP server
- Agent use: Web Research Agent prefers MCP search/fetch when available; all MCP calls logged with citations and costs
- Security/governance: per-server allowlist, env-secret isolation, time/IO limits, rate limiting; aligned with automation modes and guardrails
- Caching & cost: per-tool budgets, result caching, cost/latency metrics in Observability
- UI: MCP Manager
  - Add server: Name, Command (e.g., npx -y &lt;package&gt;@latest), Environment Variables
  - Controls: enable/disable, health check, test run, view logs, edit, remove
  - Import/export: JSON import; add remote MCP by URL; curated presets (search, docs, browser)
  - Status: online/offline, last heartbeat, version, tool list
  - Persistence (conceptual): { id, name, command, env, enabled, status, tools[], limits{time, tokens, rpm} }

### Market Intelligence & Sentiment

#### Data Sources & Processing

- Core sources (enable per user keys): LunarCrush, Santiment, Twitter/X API, Reddit API, NewsAPI/GNews, GDELT, Google Trends, Alternative.me Fear & Greed, RSS (generic), Telegram (bot/API)
- Normalization: deduplicate, language detect/translate (optional), entity/asset linking
- Scoring: lexicon (e.g., VADER), domain models (FinBERT/TweetEval), LLM rubric scoring; ensemble + calibration
- Storage: hot signals in QuestDB; embeddings in Qdrant for retrieval; long-term in ClickHouse (if enabled)
- Usage: strategy factors, dashboard overlays, alerts, AI assistant context (RAG)

#### Market Intelligence Hub

The Market Intelligence Hub is a proactive information system that surfaces opportunities and insights **without crossing into advisory territory**. It presents market data, conditions, and anomalies as factual observations, never providing investment advice or recommendations.

**Core Components:**

1. **Market Intelligence Engine**
   - Regime detection (trending/range-bound, volatility levels, correlation shifts)
   - Anomaly detection (funding rates, spreads, liquidations, volume spikes)
   - Pattern matching (find similar historical periods based on market conditions)
   - Condition scoring (quantify current market state across multiple dimensions)

2. **Performance Context Service**
   - Cross-references current market conditions with user's historical strategy performance
   - Queries: "How did my strategies perform in similar conditions?"
   - Returns: Historical performance metrics, win rates, drawdowns in comparable regimes
   - **Key distinction**: Shows user's own historical data, not predictions or recommendations

3. **Opportunity Scanner**
   - Surfaces unusual market conditions for user consideration
   - Examples:
     - "Funding rate at 95th percentile (0.08% vs 0.02% avg)" (FACT)
     - "BTC/ETH correlation at 3-month low (0.45 vs 0.82 avg)" (FACT)
     - "Liquidation cascade detected: $120M in last hour" (FACT)
   - **Never says**: "You should trade this" or "We recommend opening a position"

4. **Regime Detector**
   - Classifies current market regime (bull/bear/sideways/volatile)
   - Shows historical regime transitions and durations
   - Displays user's strategy performance by regime
   - **Framing**: "Your Mean Reversion strategy historically averages +8.2% in range-bound regimes" (USER'S DATA)

5. **Strategy Fitness Monitor**
   - Compares current conditions to each strategy's historical "sweet spot"
   - Shows in-season vs out-of-season strategies
   - Displays fitness score (0-100) based on condition similarity
   - **Framing**: "Current conditions match 73% of periods when this strategy performed well" (HISTORICAL PATTERN)

#### Integration Throughout the App

Market Intelligence is not a standalone featureâ€”it's a **foundational contextual layer** that enriches every part of the app:

**Strategy Control Board:**
- In-season/out-of-season badges on Strategy Chips
- Fitness score displayed per strategy
- Regime indicator showing current market state
- Color coding: ðŸŸ¢ In-season (high fitness), ðŸŸ¡ Neutral, ðŸ”´ Out-of-season (low fitness)

**Strategy Detail View:**
- "Performance in Current Conditions" section
- Historical performance chart filtered to similar regimes
- Comparison: Current regime vs all-time vs similar conditions
- Example: "This strategy averaged +12.3% in similar trending/high-vol conditions (18 historical periods)"

**Backtesting:**
- "Test in Similar Conditions" filter
- Backtest only on periods matching current market regime
- Compare: All-time performance vs similar-conditions performance
- Helps answer: "Would this strategy work in today's market?"

**Paper Trading:**
- Real-time context vs historical expectations
- Alert if paper trading performance deviates from historical norms in similar conditions
- Example: "Paper trading return: +3.2%. Historical avg in similar conditions: +8.1%. Underperforming by 60%."

**Live Trading:**
- Performance alerts when strategy underperforms historical expectations
- Regime change warnings: "Market regime shifted from trending to range-bound. Your Trend Following strategy historically underperforms in range-bound regimes."
- Automatic pause suggestions (user must approve): "This strategy is down 8% in a regime where it historically averages +5%. Consider pausing?"

**Portfolio View:**
- Overall portfolio fitness score for current conditions
- Breakdown: % of capital in in-season vs out-of-season strategies
- Regime exposure: How portfolio performs across different regimes
- Diversification score: Are strategies correlated or complementary?

**AI Chat:**
- Conversational access to Market Intelligence
- User: "How are my strategies doing in this market?"
- AI: "Current regime: Range-bound, moderate volatility. Your Mean Reversion strategy is in-season (fitness: 87/100, historically +8.2% in similar conditions). Your Trend Following strategy is out-of-season (fitness: 23/100, historically -2.1% in similar conditions)."
- **Key**: AI presents user's own historical data, never recommends actions

#### Regulatory Framing

**The Critical Distinction: Information vs Advice**

âœ… **ALLOWED (Information & Education):**
- Present market data, conditions, and anomalies as factual observations
- Show historical patterns and correlations
- Display user's own strategy performance in context
- Highlight regime changes and market shifts
- Surface unusual conditions for user consideration

âŒ **NOT ALLOWED (Investment Advice):**
- Recommend specific securities to buy/sell
- Provide personalized investment advice
- Tell users what actions to take
- Suggest portfolio allocations
- Make predictions about future performance

**Safe Language Patterns:**
- âœ… "Funding rate at 95th percentile" (FACT)
- âœ… "Your strategy averaged +8.2% in similar conditions" (USER'S OWN DATA)
- âœ… "Current conditions match 73% of periods when this strategy performed well" (HISTORICAL PATTERN)
- âŒ "You should activate this strategy" (ADVICE)
- âŒ "We recommend opening a position" (RECOMMENDATION)
- âŒ "This is a good opportunity to buy" (ADVICE)

**The Line:**
- **Information** â†’ User â†’ **Decision** â†’ User â†’ **Action**
- System provides information, user makes all decisions and initiates all actions

**Why This is Safe:**
- System presents factual market data (not advice)
- System shows user's own historical performance (not predictions)
- System highlights conditions and patterns (not recommendations)
- User makes all decisions and initiates all actions
- System is a tool for information, not an investment advisor

This approach is **safe from a regulatory perspective** while still being **valuable and proactive** for users.

### Custom Signal Sources

- User-defined sources: specific X accounts, subreddits, RSS feeds, Telegram channels
- Config fields: auth (keys/tokens), polling interval, parsing selector/JMESPath, schema mapping â†’ {timestamp, asset, sentiment, confidence, source_id}
- Controls: per-source weighting, cooldowns, min-signal thresholds, cost/health monitoring
- Governance: advisory by default; in Hybrid require approval to affect orders unless whitelisted; per-source max impact caps

### AI Agents (Catalog & Permissions)

- Sentiment Intelligence Agent: Aggregates and normalizes sentiment (LunarCrush, Santiment, X/Reddit, RSS/Telegram); outputs scored signals with confidence and citations
- Market Intelligence & Web Research Agent: Live web search + fetch via MCP/HTTP; structured, cited briefs for strategies and RAG
- Strategy Engineering Agent: Generates/adjusts strategies, runs backtests (Backtrader/vectorbt), returns diffs and parameter proposals
- Execution Quality & Routing Agent: TCA metrics (fill rate, slippage, price improvement), venue scoring, SOR suggestions
- Risk Governance Agent: Guardrail checks (position/asset/leverage limits), scenario stress, escalation rules
- Portfolio Analytics Agent: Performance attribution, rebalancing proposals, diversification/heat limits
- Portfolio Optimization Agent: Suggests optimal position sizing, rebalancing, and diversification strategies based on risk tolerance and market conditions
- Market Data Ingestion Agent: Source health, latency/quality checks, reconnect/backfill orchestration
- Compliance & Audit Agent: Disclaimer/enforcement hooks, action logging, 7-year audit integrity checks
- Memory & RAG Orchestrator: Summaries, embeddings, Qdrant/Neo4j linkage, retrieval policies
- Regime Detection Agent: Classifies regimes (bull/bear/sideways/volatile) for downstream selection
- Market Regime Agent: Analyzes market conditions and recommends regime-specific strategy adjustments
- Correlation Analysis Agent: Identifies correlations between strategies, assets, and market conditions; suggests diversification opportunities
- Tax Optimization Agent: Analyzes trades for tax efficiency (tax-loss harvesting, long-term vs short-term gains); generates tax reports

#### Direct Agent Views (UI)

- Dedicated panels for specialist agents (Strategy Advisor, Web Research, Risk, Execution Quality, etc.)
- Still orchestrated by single chat entrypoint; identical guardrails/approvals, budgets, and audit trail
- Launch from agent palette or deep-link from chat; show correlation_id, costs, and provenance

### Permissions Model

SymbioteTrader implements a **permission-based AI automation system** with **least-privilege, zero-trust principles**. Users progressively grant AI permissions based on trust and experience, with complete control and transparency at every step.

#### Permission Modes Overview

The system provides three permission modes that align with different levels of user trust and automation:

1. **Interactive Mode (Zero Trust - Default)**: AI asks for approval for every action. Maximum control, minimum automation.
2. **Supervised Mode (Least Privilege)**: AI can make small changes automatically, large changes require approval. Balanced control and automation.
3. **Permissive Mode (User-Defined Boundaries)**: AI can optimize within user-defined boundaries. Maximum automation within constraints.

**Key Principles:**
- User must manually upgrade from Interactive â†’ Supervised â†’ Permissive
- No accidental permission escalation
- User can revoke permissions anytime
- Complete audit trail of all AI actions
- Clear regulatory framing (automation, not advice)

**Legacy Terminology Mapping:**
- Manual (legacy) = Interactive Mode (new)
- Hybrid (legacy) = Supervised Mode (new)
- Full Auto (legacy) = Permissive Mode (new)

#### Interactive Mode (Zero Trust - Default)

**Philosophy:** AI has no automatic permissions. User must approve every action.

**Characteristics:**
- AI asks: "Should I run an optimization experiment?"
- User: "Yes"
- AI runs experiment
- AI asks: "Should I apply these optimized parameters?"
- User: "Yes"
- AI applies parameters

**Approval Options:**
- Only "Approve Once" available
- No graduated approval options (prevents accidental escalation)
- User must manually change to Supervised mode to unlock graduated approvals

**Best For:**
- New users learning the platform
- High-stakes trading requiring maximum control
- Users who want to review every decision

**UI Indicator:** ðŸ”µ Interactive Mode

#### Supervised Mode (Least Privilege)

**Philosophy:** AI can make small changes automatically, large changes require approval.

**Characteristics:**
- Small changes (<20% parameter change): Auto-applied with notification
- Large changes (>20% parameter change): Require approval
- User defines thresholds for "small" vs "large"
- Graduated approval options available

**Small Change Example (Auto-Applied):**
- AI optimizes: Position size 5% â†’ 5.5% (10% change)
- AI validates: Change <20% threshold âœ“
- AI notifies: "I adjusted position size from 5% to 5.5%"
- AI applies: Change goes live automatically
- User can review and revert if desired

**Large Change Example (Requires Approval):**
- AI optimizes: Entry threshold 2.0Ïƒ â†’ 1.2Ïƒ (40% change)
- AI validates: Change >20% threshold âœ—
- AI requests: "I found an optimization with 40% parameter change. Review?"
- User reviews and approves/rejects
- AI applies only if approved

**Best For:**
- Most users (balanced control and automation)
- Users who trust AI for minor optimizations
- Users who want to review major changes

**UI Indicator:** ðŸŸ¡ Supervised Mode

#### Graduated Approval System

In Supervised Mode, when AI requests approval, user can choose how to approve:

**1. Approve Once (Safest)**
- Apply this change now, ask again next time
- No future permissions granted
- Maximum control

**2. Approve for Duration (Time-Limited)**
- Auto-apply similar changes for: 7/14/30 days
- Applies to: All strategies or specific strategy
- Action type: Parameter updates <20%, position size adjustments <10%, etc.
- Expires automatically
- User can revoke anytime

**3. Approve for This Strategy (Strategy-Scoped)**
- Auto-apply optimizations for specific strategy only
- Action types: Parameter updates, position size adjustments
- Must meet user-defined criteria
- User can revoke anytime

**4. Approve for Action Type (Action-Scoped)**
- Auto-apply all actions of this type across all strategies
- Examples: "Parameter updates <20%", "Position size adjustments <10%"
- Must meet user-defined criteria
- User can revoke anytime

**Safety Features:**
- Graduated approvals only available in Supervised mode
- Not available in Interactive mode (prevents accidental escalation)
- User must manually change to Supervised first
- Each approval can be revoked individually
- Complete audit trail

**Approval Request UI Example:**

```
AI Optimization Request

Strategy: Mean Reversion BTC
Action: Update parameters

Proposed Changes:
â”œâ”€ Entry Threshold: 2.0Ïƒ â†’ 1.8Ïƒ (10% change)
â”œâ”€ Exit Threshold: 0.5Ïƒ â†’ 0.3Ïƒ (40% change)
â””â”€ Stop Loss: 3% â†’ 2.5% (17% change)

Performance (7-day paper trading):
â”œâ”€ Return: +8.2% vs +5.1% original (+60.8%)
â”œâ”€ Sharpe: 2.1 vs 1.2 original (+75.0%)
â””â”€ Max DD: -3.1% vs -4.2% original (-26.2%)

How would you like to approve this?

â—‹ Approve Once
  Apply this change now, ask me again next time

â—‹ Approve for Duration
  Auto-apply similar changes for: [7 days â–¼]

â—‹ Approve for This Strategy
  Auto-apply optimizations for "Mean Reversion BTC"

â—‹ Approve for Action Type
  Auto-apply all "parameter updates <20%" across all strategies

[Approve] [Reject] [View Details]
```

#### Permissive Mode (User-Defined Boundaries)

**Philosophy:** AI can optimize strategies within user-defined boundaries. Maximum automation within constraints.

**Characteristics:**
- User grants AI broad permissions to optimize
- User defines strict boundaries and constraints
- AI operates within those boundaries automatically
- User receives notifications before changes apply
- User can cancel or revert any change

**Permission Grant Flow:**

When enabling Permissive mode, user must:
1. Review and understand what permissions they're granting
2. Define optimization constraints (max parameter change, max drawdown, min improvement, etc.)
3. Define safeguards (max changes per day, notification delays, pause conditions)
4. Check multiple boxes confirming understanding
5. Explicitly grant permissions

**Constraints Example:**

```
Optimization Constraints:
â”œâ”€ Max parameter change: 20%
â”œâ”€ Max position size change: 10%
â”œâ”€ Min backtest period: 90 days
â”œâ”€ Min paper trade period: 7 days
â”œâ”€ Min improvement required: 15% Sharpe ratio
â”œâ”€ Max drawdown allowed: 5%
â””â”€ Min win rate required: 60%
```

**Safeguards Example:**

```
Safeguards:
â”œâ”€ Notify me before applying changes (1 hour delay to cancel)
â”œâ”€ Max 3 auto-changes per day
â”œâ”€ Max 1 change per strategy per week
â”œâ”€ Pause AI if portfolio drawdown >10%
â”œâ”€ Require manual approval for changes >50%
â””â”€ Auto-disable AI on anomalies or errors
```

**How It Works:**

Day 1:
- AI detects: Mean Reversion underperforming in current regime
- AI checks permissions: âœ“ Allowed to optimize
- AI initiates: Backtest 100 parameter variations
- AI finds: Variation #47 improves Sharpe by 18% (meets 15% threshold âœ“)
- AI starts: 7-day paper trading

Day 8:
- AI completes: Paper trading shows +8.2% vs +5.1% original
- AI validates constraints:
  - âœ“ Sharpe improvement: 18% (>15% required)
  - âœ“ Max drawdown: 3.1% (<5% allowed)
  - âœ“ Paper trade duration: 7 days (meets requirement)
  - âœ“ Parameter changes: <20% (within limits)
- AI notifies: "I optimized your Mean Reversion strategy. Results: +8.2% vs +5.1%. Applying in 1 hour unless you cancel."
- User can review and cancel, or let it apply automatically
- AI applies: New parameters go live

**Best For:**
- Experienced users who trust the system
- Users who want maximum automation
- Users with well-defined optimization criteria

**UI Indicator:** ðŸŸ¢ Permissive Mode

#### AI Permission Center (Settings)

Dedicated settings page for configuring AI permissions:

**Mode Selection:**
- Current Mode: ðŸŸ¢ Permissive
- [Change Mode] button

**Allowed Actions:**
- â˜‘ Optimize strategy parameters
- â˜‘ Run backtests
- â˜‘ Run paper trades
- â˜‘ Adjust position sizes (within limits)
- â˜‘ Pause underperforming strategies
- â˜ Activate new strategies (requires approval)
- â˜ Modify risk limits (requires approval)

**Optimization Constraints:**
- Max parameter change: [20%] slider
- Max position size change: [10%] slider
- Min backtest period: [90] days
- Min paper trade period: [7] days
- Min improvement required: [15%] Sharpe ratio
- Max drawdown allowed: [5%]
- Min win rate required: [60%]

**Safeguards:**
- â˜‘ Notify me before applying changes
  - Notification delay: [1 hour] (time to cancel)
- â˜‘ Max auto-changes per day: [3]
- â˜‘ Max changes per strategy per week: [1]
- â˜‘ Pause AI if portfolio drawdown exceeds: [10%]
- â˜‘ Require manual approval for changes exceeding: [50%]
- â˜‘ Auto-disable AI on anomalies or errors

**Per-Strategy Permissions:**
- Mean Reversion BTC: [ðŸŸ¢ Permissive]
- Trend Following: [ðŸŸ¡ Supervised]
- Grid Bot ETH: [ðŸ”µ Interactive]
- Funding Arb: [ðŸŸ¢ Permissive]

**Actions:**
- [Save Settings] [Reset to Defaults] [Revoke All Permissions]

#### Active Permissions Dashboard

Central place to view and manage all granted permissions:

**Duration-Based Permissions:**
- â±ï¸ Parameter updates <20%
  - Expires: 2024-10-22 (4 days remaining)
  - Scope: All strategies
  - Used: 3 times
  - [Revoke] [Extend] [View Activity]

**Strategy-Based Permissions:**
- ðŸ“Š Mean Reversion BTC - All optimizations
  - Granted: 2024-10-12
  - Used: 5 times (last: 2 days ago)
  - [Revoke] [Modify Scope] [View Activity]

**Action-Based Permissions:**
- âš™ï¸ Position size adjustments <10%
  - Granted: 2024-10-10
  - Used: 8 times (last: 1 day ago)
  - [Revoke] [Modify Threshold] [View Activity]

**Actions:**
- [Revoke All Permissions] [Export Audit Log]

#### Safety Gates & Progressive Trust

**Progressive Trust Flow:**

```
Interactive Mode (Zero Trust - Default)
    â†“ [Manual Mode Change Required]
Supervised Mode (Least Privilege)
    â†“ [User Grants Permissions Through Approvals]
Supervised + Duration/Strategy/Action Permissions
    â†“ [Manual Mode Change Required]
Permissive Mode (User-Defined Boundaries)
```

**Safety Gates:**
1. **Interactive â†’ Supervised**: Requires manual mode change with confirmation
2. **Supervised â†’ Permissive**: Requires manual mode change with confirmation
3. **Permission Grants**: Each approval can be scoped (once, duration, strategy, action)
4. **Permission Revocation**: User can revoke any permission anytime

**Key Safety Features:**
- No accidental escalation (two manual gates)
- Progressive trust (user builds up permissions gradually)
- Easy revocation (user can revoke anytime)
- Complete transparency (clear visibility of all active permissions)
- Audit trail (every AI action logged with permission context)

#### Regulatory Framing

**Why This is Safe:**

1. **User Grants Permission Explicitly**
   - User must explicitly enable Supervised/Permissive mode
   - User defines all boundaries and constraints
   - User can revoke permission anytime
   - Similar to: OAuth permissions, file system permissions, smart contracts

2. **User Defines the Rules**
   - User sets optimization criteria
   - User sets constraints (max DD, min improvement, etc.)
   - User sets safeguards (max changes per day, etc.)
   - AI operates within user-defined rules
   - Similar to: Conditional orders, algorithmic trading strategies

3. **User Remains in Control**
   - User can disable AI permissions anytime
   - User receives notifications before changes apply
   - User can cancel or revert any change
   - User can review complete audit trail
   - Similar to: Stop-loss orders (user sets rule, system executes)

4. **Proper Framing**
   - âœ… "Permission-based automation" (not "autonomous AI")
   - âœ… "User-defined boundaries" (not "AI decides")
   - âœ… "Optimization tool" (not "investment advisor")
   - âŒ NOT "AI manages your portfolio"
   - âŒ NOT "AI provides investment advice"

5. **Legal Principle: User-Defined Automation**

The user is not receiving advice from the AI. The user is defining rules, and the AI is executing those rules automatically. This is automation, not advice.

**Examples:**
- âœ… Stop-loss order: User defines "sell if price drops 5%", system executes (AUTOMATION)
- âœ… Conditional order: User defines "buy if RSI <30", system executes (AUTOMATION)
- âœ… Algorithmic trading: User defines strategy rules, system executes (AUTOMATION)
- âœ… AI optimization: User defines "optimize if Sharpe improves >15% and DD <5%", AI executes (AUTOMATION)
- âŒ Investment advice: AI says "you should buy Bitcoin" (ADVICE)

SymbioteTrader is firmly in the "automation" category, not "advice" category.

#### AI Operations & Cost Controls (Technical)

- ROI tracking: AI ROI = Profit / (Fees + AI spend); dashboards in Analytics
- Prompt/semantic cache thresholds: hydrate on repeated tools; target >40% hit-rate; route misses to cheaper fallbacks

### AI Operations & Cost Controls

- Structured outputs (JSON schemas) for deterministic downstream handling
- Prompt caching + semantic caching for speed and cost reductions
- Model/budget guardrails with per-session/day limits and graceful degradation
- Multi-provider failover with circuit breakers and health metrics

### Model Evaluation & Governance (MLOps)

AI models are not staticâ€”they evolve, degrade, and require continuous monitoring to ensure reliable performance. SymbioteTrader implements a comprehensive MLOps framework to evaluate, version, monitor, and maintain AI model performance over time.

#### Evaluation Framework

**Purpose:** Benchmark AI outputs to ensure quality, accuracy, and reliability.

**Evaluation Strategies by Agent:**

1. **Strategy Advisor Agent (Code Generation)**
   - **Golden Set**: Maintain a curated set of external strategy code (Pine Script, Python) with known-good native strategy translations
   - **Metrics**: Code correctness (syntax, logic), performance parity (backtest results within 5% of original), execution time
   - **Evaluation Frequency**: On every model version change, weekly regression tests
   - **Pass Criteria**: >95% syntax correctness, >90% performance parity

2. **Market Analysis Agent (Insights & Recommendations)**
   - **Golden Set**: Historical market conditions with expert-labeled regime classifications
   - **Metrics**: Regime classification accuracy, insight relevance (user feedback), prediction calibration
   - **Evaluation Frequency**: Daily on recent market data
   - **Pass Criteria**: >80% regime classification accuracy, >70% positive user feedback

3. **Risk Analysis Agent (Risk Assessment)**
   - **Golden Set**: Historical trades with known risk outcomes (drawdowns, liquidations, stop-outs)
   - **Metrics**: Risk prediction accuracy, false positive/negative rates, calibration of confidence scores
   - **Evaluation Frequency**: Weekly on recent trades
   - **Pass Criteria**: >85% risk prediction accuracy, <10% false positive rate

4. **AVC Gate (Ask vs Command Classification)**
   - **Golden Set**: Labeled user prompts (ask vs command)
   - **Metrics**: Classification accuracy, precision, recall, F1 score
   - **Evaluation Frequency**: Daily on recent prompts
   - **Pass Criteria**: >95% classification accuracy, <2% false command rate (safety-critical)

5. **RAG Retrieval (Context Relevance)**
   - **Golden Set**: Queries with known-relevant documents
   - **Metrics**: Retrieval precision@k, recall@k, MRR (Mean Reciprocal Rank), NDCG (Normalized Discounted Cumulative Gain)
   - **Evaluation Frequency**: Weekly on recent queries
   - **Pass Criteria**: >80% precision@5, >90% recall@10

**Evaluation Dashboard:**

```
AI Model Evaluation Dashboard

Strategy Advisor Agent:
â”œâ”€ Model: gpt-4o-2024-05-13
â”œâ”€ Last Evaluation: 2 hours ago
â”œâ”€ Syntax Correctness: 97.2% âœ“ (target: >95%)
â”œâ”€ Performance Parity: 92.1% âœ“ (target: >90%)
â””â”€ Status: ðŸŸ¢ Passing

Market Analysis Agent:
â”œâ”€ Model: claude-3-5-sonnet-20241022
â”œâ”€ Last Evaluation: 1 day ago
â”œâ”€ Regime Classification: 83.5% âœ“ (target: >80%)
â”œâ”€ User Feedback: 74.2% âœ“ (target: >70%)
â””â”€ Status: ðŸŸ¢ Passing

AVC Gate:
â”œâ”€ Model: gpt-4o-mini-2024-07-18
â”œâ”€ Last Evaluation: 3 hours ago
â”œâ”€ Classification Accuracy: 96.8% âœ“ (target: >95%)
â”œâ”€ False Command Rate: 1.2% âœ“ (target: <2%)
â””â”€ Status: ðŸŸ¢ Passing

[View Detailed Metrics] [Run Manual Evaluation] [Configure Thresholds]
```

#### Model Versioning & Reproducibility

**Version Tagging:**

Every AI-generated artifact is tagged with the model version that created it:

```json
{
  "artifact_id": "strategy_12345",
  "artifact_type": "native_strategy",
  "created_at": "2024-10-18T14:30:00Z",
  "created_by": "strategy_advisor_agent",
  "model_version": "gpt-4o-2024-05-13",
  "prompt_version": "v2.3.1",
  "input_hash": "sha256:abc123...",
  "output": { ... }
}
```

**Why This Matters:**

1. **Debugging**: If a strategy fails, trace back to the exact model version that generated it
2. **Reproducibility**: Re-run the same prompt with the same model version to reproduce results
3. **A/B Testing**: Compare outputs from different model versions on the same inputs
4. **Rollback**: If a new model version degrades performance, rollback to previous version
5. **Audit Trail**: Complete history of which models generated which artifacts

**Model Version Registry:**

```
Model Version Registry

Strategy Advisor Agent:
â”œâ”€ Current: gpt-4o-2024-05-13 (deployed 2024-10-15)
â”œâ”€ Previous: gpt-4o-2024-08-06 (deprecated 2024-10-15)
â”œâ”€ Rollback Available: Yes
â””â”€ Performance: +5.2% syntax correctness vs previous

Market Analysis Agent:
â”œâ”€ Current: claude-3-5-sonnet-20241022 (deployed 2024-10-22)
â”œâ”€ Previous: claude-3-5-sonnet-20240620 (deprecated 2024-10-22)
â”œâ”€ Rollback Available: Yes
â””â”€ Performance: +3.1% regime accuracy vs previous

[View Full History] [Rollback to Previous] [Deploy New Version]
```

#### Performance Monitoring & Drift Detection

**Real-Time Monitoring:**

Track AI-specific metrics in production to detect performance degradation:

**Metrics Tracked:**

1. **AVC Gate Confidence Scores**
   - Track distribution of confidence scores over time
   - Alert if confidence drops below threshold (e.g., <0.8 for commands)
   - Indicates model uncertainty or input distribution shift

2. **RAG Retrieval Relevance**
   - Track user feedback on retrieved documents (thumbs up/down)
   - Alert if relevance score drops below threshold (e.g., <70%)
   - Indicates embedding model drift or corpus staleness

3. **AI Optimization ROI**
   - Track Sharpe improvement from AI-suggested optimizations
   - Alert if ROI drops below threshold (e.g., <10% improvement)
   - Indicates optimization strategy degradation

4. **Strategy Generation Success Rate**
   - Track % of generated strategies that pass validation
   - Alert if success rate drops below threshold (e.g., <90%)
   - Indicates code generation quality degradation

5. **User Approval Rate**
   - Track % of AI suggestions that users approve
   - Alert if approval rate drops below threshold (e.g., <60%)
   - Indicates misalignment with user preferences

**Drift Detection:**

```
AI Performance Monitoring

AVC Gate Confidence:
â”œâ”€ Current (7-day avg): 0.92
â”œâ”€ Baseline (30-day avg): 0.94
â”œâ”€ Trend: âš ï¸ Declining (-2.1%)
â””â”€ Action: Monitor closely, consider retraining

RAG Retrieval Relevance:
â”œâ”€ Current (7-day avg): 68.2%
â”œâ”€ Baseline (30-day avg): 74.5%
â”œâ”€ Trend: ðŸ”´ Declining (-6.3%)
â””â”€ Action: âš ï¸ Alert triggered, investigate corpus staleness

AI Optimization ROI:
â”œâ”€ Current (7-day avg): +12.3%
â”œâ”€ Baseline (30-day avg): +15.1%
â”œâ”€ Trend: âš ï¸ Declining (-2.8%)
â””â”€ Action: Monitor closely, review optimization strategy

[View Detailed Metrics] [Configure Alerts] [Investigate Drift]
```

**Automated Alerts:**

- **Warning**: Metric declines >5% from baseline â†’ Notify admin
- **Critical**: Metric declines >10% from baseline â†’ Pause AI feature, notify admin
- **Recovery**: Metric returns to baseline â†’ Resume AI feature, log recovery

#### A/B Testing & Experimentation

**Purpose:** Compare different models, prompts, or configurations to optimize AI performance.

**A/B Test Framework:**

```
A/B Test: Strategy Advisor Agent Model Comparison

Variant A (Control):
â”œâ”€ Model: gpt-4o-2024-05-13
â”œâ”€ Traffic: 50%
â”œâ”€ Syntax Correctness: 97.2%
â”œâ”€ Performance Parity: 92.1%
â””â”€ Avg Latency: 3.2s

Variant B (Experiment):
â”œâ”€ Model: gpt-4o-2024-08-06
â”œâ”€ Traffic: 50%
â”œâ”€ Syntax Correctness: 98.1% (+0.9%)
â”œâ”€ Performance Parity: 93.5% (+1.4%)
â””â”€ Avg Latency: 2.8s (-12.5%)

Test Duration: 7 days
Sample Size: 1,247 generations
Statistical Significance: p < 0.01 âœ“

Recommendation: ðŸŸ¢ Deploy Variant B (statistically significant improvement)

[Deploy Variant B] [Extend Test] [Abort Test]
```

**A/B Test Types:**

1. **Model Comparison**: Compare different model versions (e.g., GPT-4o vs Claude 3.5 Sonnet)
2. **Prompt Engineering**: Compare different prompt templates
3. **Configuration**: Compare different temperature, top_p, max_tokens settings
4. **RAG Strategy**: Compare different retrieval strategies (semantic vs hybrid vs keyword)

#### Model Retraining & Fine-Tuning

**When to Retrain:**

1. **Performance Degradation**: Metrics drop below thresholds
2. **Distribution Shift**: Input patterns change significantly (e.g., new asset classes, new strategy types)
3. **User Feedback**: Consistent negative feedback on AI outputs
4. **Scheduled**: Quarterly retraining on accumulated data

**Fine-Tuning Strategy:**

- **AVC Gate**: Fine-tune on user-corrected classifications (ask vs command)
- **Strategy Advisor**: Fine-tune on user-approved strategies with performance data
- **Market Analysis**: Fine-tune on expert-labeled market regimes
- **Risk Analysis**: Fine-tune on actual risk outcomes (drawdowns, stop-outs)

**Fine-Tuning Workflow:**

```
Fine-Tuning Workflow

1. Data Collection:
   â”œâ”€ Collect user feedback (approvals, rejections, corrections)
   â”œâ”€ Collect performance data (backtest results, live trading outcomes)
   â””â”€ Label data with expert annotations (if needed)

2. Data Preparation:
   â”œâ”€ Clean and deduplicate data
   â”œâ”€ Split into train/validation/test sets (70/15/15)
   â””â”€ Format for fine-tuning API (JSONL)

3. Fine-Tuning:
   â”œâ”€ Submit fine-tuning job to provider (OpenAI, Anthropic, etc.)
   â”œâ”€ Monitor training progress
   â””â”€ Evaluate on validation set

4. Evaluation:
   â”œâ”€ Run evaluation framework on test set
   â”œâ”€ Compare to baseline model
   â””â”€ A/B test in production (if passing)

5. Deployment:
   â”œâ”€ Deploy fine-tuned model to production
   â”œâ”€ Monitor performance closely (first 7 days)
   â””â”€ Rollback if performance degrades

[Start Fine-Tuning Job] [View Training Data] [Configure Parameters]
```


### 8. Risk Management

### Tiered Risk Governance

- Low Risk: Automatic approval (small position sizes, established strategies)
- Medium Risk: User approval required (new strategies, moderate allocations)
- High Risk: Manual execution only (large positions, experimental strategies)

### Automation Modes & Approval Profiles

- Manual: Human-in-the-loop for ALL actions (signals, orders, cancels, edits)
- Hybrid: User-selectable auto-actions (e.g., auto place stops/TP, auto size within limits, auto-roll DCA); approvals required for others
- Full Auto: End-to-end automation within guardrails (position limits, leverage, asset lists, max daily trades/costs)
- Custom Profiles: Start from any mode and fine-tune granular permissions per action type (AI suggestions, algo signals, order types, assets, sizes, risk tier); per-strategy overrides and templates

### Non-Custodial Trading Model

- Platform executes trades automatically on user's exchange accounts through API integration
- No direct handling of user funds or wallet transfers
- API keys used for both market data analysis and order placement
- All trades occur within the user's existing exchange account
- User retains full control over funds while benefiting from automated trading
- This approach minimizes regulatory requirements while maintaining full trading automation

### Guardrails & Limits (Defaults; user-configurable)

- Daily loss cap: percentage-of-equity or absolute $; auto-pause + flatten on breach; configurable cooldown
- Max position sizing: per-asset and portfolio heat caps; per-asset-class defaults:
  - Equities: â‰¤10% per asset; portfolio heat limits; margin off by default
  - ETFs: â‰¤15% per asset; leverage disabled by default
  - FX: â‰¤2x notional leverage; majors-only by default
  - Futures: micros-only toggle; per-instrument daily loss cap; margin checks
  - Crypto perps: â‰¤2x leverage; mandatory stop-loss; asset allowlist
- Preset guardrail profiles: Conservative / Moderate / Aggressive; granular overrides per action; all changes audited
- Trade budgets: max daily notional and max daily trades; per-venue and global
- Per-venue hard limits: minNotional/step-size/precision compliance; rate-limit-aware pacing
- Mandatory protections: stop-loss for perps/futures; optional TP; trailing stops supported
- Asset lists: allow/deny per strategy; respect session calendars and venue hours
- Kill switch: manual hotkey and automated trigger on critical breaches
- Promotion gates: stricter defaults for paperâ†’live; overrides require explicit approval

- Correlation/cluster heat caps: beta-adjusted exposure to BTC/ETH or sectors; cross-strategy heat limits
- Time-based controls: max trades per hour, cool-downs after losses, quiet hours
- Pre-trade risk checks: expected slippage bounds, venue/latency health gates; order flood controls

### Intelligent Overfill Protection

**Purpose:** Prevent unintended position accumulation due to network latency, race conditions, or multiple strategies trading the same asset.

**The Overfill Problem:**

Overfill occurs when you end up with a larger position than intended due to:
- Multiple strategies triggering simultaneously on the same asset
- Network latency causing order retries (original order actually went through)
- Partial fills causing strategy to place additional orders
- Exchange API delays (strategy thinks position is still 0 during fill confirmation)
- AI agent edge cases causing order spam

**📘 Complete Implementation Details:** See **Appendix D: Overfill Protection State Machine** for the complete 7-state state machine (NORMAL → WARNING → OVERFILL → CRITICAL → PAUSED → RECOVERING → RESOLVED), 6 edge cases with handling (late fills, duplicate fills, partial fills, multi-leg orders, exchange cancellations, network partitions), recovery procedures, monitoring, and testing scenarios.


#### Complete State Machine Specification

**Configuration:**
- **Warning Threshold**: 10% over target (e.g., target 1.0 BTC, warning at 1.1 BTC)
- **Overfill Threshold**: 25% over target (e.g., target 1.0 BTC, overfill at 1.25 BTC)
- **Critical Threshold**: 50% over target (e.g., target 1.0 BTC, critical at 1.5 BTC)
- **Duplicate Order Window**: 5 seconds
- **Late Fill Window**: 5 minutes (fills arriving after order assumed canceled)

**State Machine (7 States):**

```
NORMAL → WARNING → OVERFILL → CRITICAL → PAUSED → RECOVERING → RESOLVED
   ↑                                                      ↓
   └──────────────────────────────────────────────────────┘
```

**State Definitions:**

1. **NORMAL**: Position within target ±5%
2. **WARNING**: Position 5-10% over target (alert user, continue trading)
3. **OVERFILL**: Position 10-25% over target (halt new orders, allow closes)
4. **CRITICAL**: Position >25% over target (emergency flatten, alert user)
5. **PAUSED**: Trading paused, awaiting manual intervention
6. **RECOVERING**: Actively reducing position back to target
7. **RESOLVED**: Position back within limits, resume normal trading

**State Transitions:**

```python
class OverfillState(Enum):
    NORMAL = "NORMAL"
    WARNING = "WARNING"
    OVERFILL = "OVERFILL"
    CRITICAL = "CRITICAL"
    PAUSED = "PAUSED"
    RECOVERING = "RECOVERING"
    RESOLVED = "RESOLVED"

class OverfillProtection:
    def __init__(self, asset, target_position, config):
        self.asset = asset
        self.target_position = target_position
        self.config = config
        self.state = OverfillState.NORMAL
        self.current_position = 0.0
        self.pending_orders = []

    def update(self, current_position, pending_orders):
        """Update state based on current position and pending orders."""
        self.current_position = current_position
        self.pending_orders = pending_orders

        # Calculate overfill percentage
        overfill_pct = self._calculate_overfill_pct()

        old_state = self.state

        # State transitions
        if self.state == OverfillState.NORMAL:
            if overfill_pct >= 5.0:
                self.state = OverfillState.WARNING
                self._on_warning()

        elif self.state == OverfillState.WARNING:
            if overfill_pct < 5.0:
                self.state = OverfillState.NORMAL
            elif overfill_pct >= 10.0:
                self.state = OverfillState.OVERFILL
                self._on_overfill()

        elif self.state == OverfillState.OVERFILL:
            if overfill_pct < 10.0:
                self.state = OverfillState.WARNING
            elif overfill_pct >= 25.0:
                self.state = OverfillState.CRITICAL
                self._on_critical()

        elif self.state == OverfillState.CRITICAL:
            # Automatically transition to PAUSED
            self.state = OverfillState.PAUSED
            self._on_paused()

        elif self.state == OverfillState.PAUSED:
            # Manual intervention required
            # User must call resume() or start_recovery()
            pass

        elif self.state == OverfillState.RECOVERING:
            if overfill_pct < 5.0:
                self.state = OverfillState.RESOLVED
                self._on_resolved()

        elif self.state == OverfillState.RESOLVED:
            # Automatically transition back to NORMAL
            self.state = OverfillState.NORMAL

        if old_state != self.state:
            self._log_transition(old_state, self.state, overfill_pct)

    def _calculate_overfill_pct(self):
        """Calculate overfill percentage."""
        if self.target_position == 0:
            return 0.0

        # Include pending orders
        pending_qty = sum(order['quantity'] for order in self.pending_orders)
        total_exposure = self.current_position + pending_qty

        overfill = total_exposure - self.target_position
        overfill_pct = (overfill / abs(self.target_position)) * 100

        return max(0, overfill_pct)

    def _on_warning(self):
        """Handle WARNING state entry."""
        alert = {
            "level": "WARNING",
            "asset": self.asset,
            "message": f"Position approaching limit: {self.current_position:.4f} (target: {self.target_position:.4f})",
            "overfill_pct": self._calculate_overfill_pct()
        }
        self._send_alert(alert)

    def _on_overfill(self):
        """Handle OVERFILL state entry."""
        # Cancel all pending orders
        self._cancel_all_pending_orders()

        # Block new orders (except closes)
        self._block_new_orders()

        alert = {
            "level": "OVERFILL",
            "asset": self.asset,
            "message": f"OVERFILL DETECTED: {self.current_position:.4f} (target: {self.target_position:.4f})",
            "overfill_pct": self._calculate_overfill_pct(),
            "action": "New orders blocked, pending orders canceled"
        }
        self._send_alert(alert)

    def _on_critical(self):
        """Handle CRITICAL state entry."""
        # Emergency flatten
        self._emergency_flatten()

        alert = {
            "level": "CRITICAL",
            "asset": self.asset,
            "message": f"CRITICAL OVERFILL: {self.current_position:.4f} (target: {self.target_position:.4f})",
            "overfill_pct": self._calculate_overfill_pct(),
            "action": "EMERGENCY FLATTEN INITIATED"
        }
        self._send_alert(alert)
        self._send_email_alert(alert)
        self._send_webhook_alert(alert)

    def _on_paused(self):
        """Handle PAUSED state entry."""
        alert = {
            "level": "PAUSED",
            "asset": self.asset,
            "message": "Trading paused, manual intervention required",
            "action": "Call resume() or start_recovery() to continue"
        }
        self._send_alert(alert)

    def _on_resolved(self):
        """Handle RESOLVED state entry."""
        alert = {
            "level": "RESOLVED",
            "asset": self.asset,
            "message": "Position back within limits, resuming normal trading",
            "current_position": self.current_position,
            "target_position": self.target_position
        }
        self._send_alert(alert)
```

**Edge Case Handling:**

**1. Late Fills (Fill arrives after order assumed canceled)**
```python
def handle_late_fill(self, order_id, fill_qty):
    """Handle fill that arrives after order was assumed canceled."""
    # Check if fill is within late fill window (5 minutes)
    order = self._get_order(order_id)
    if order and (now() - order['cancel_time']) < timedelta(minutes=5):
        # Accept the fill
        self.current_position += fill_qty
        self.update(self.current_position, self.pending_orders)

        # Log late fill
        log.warning(f"Late fill detected: {order_id}, qty: {fill_qty}")
    else:
        # Reject the fill (too late)
        log.error(f"Fill rejected (too late): {order_id}, qty: {fill_qty}")
        self._reconcile_position()
```

**2. Duplicate Fills (Same fill reported twice)**
```python
def handle_fill(self, fill_id, order_id, fill_qty):
    """Handle fill with duplicate detection."""
    # Check if fill already processed
    if fill_id in self.processed_fills:
        log.warning(f"Duplicate fill detected: {fill_id}")
        return

    # Process fill
    self.processed_fills.add(fill_id)
    self.current_position += fill_qty
    self.update(self.current_position, self.pending_orders)
```

**3. Partial Fills (Order partially filled, remainder pending)**
```python
def handle_partial_fill(self, order_id, filled_qty, remaining_qty):
    """Handle partial fill correctly."""
    # Update position with filled quantity
    self.current_position += filled_qty

    # Update pending orders (reduce quantity)
    for order in self.pending_orders:
        if order['id'] == order_id:
            order['quantity'] = remaining_qty
            break

    self.update(self.current_position, self.pending_orders)
```

**4. Multi-Leg Orders (Spread trades, pairs)**
```python
def handle_multi_leg_order(self, legs):
    """Handle multi-leg orders (e.g., spread trades)."""
    # Calculate net exposure across all legs
    net_exposure = sum(leg['quantity'] * leg['side'] for leg in legs)

    # Check overfill for net exposure
    temp_position = self.current_position + net_exposure
    overfill_pct = ((temp_position - self.target_position) / abs(self.target_position)) * 100

    if overfill_pct > 10.0:
        raise OverfillException(f"Multi-leg order would cause overfill: {overfill_pct:.2f}%")

    # Allow order
    return True
```

**5. Exchange Cancellations (Exchange cancels order, but fill arrives)**
```python
def handle_exchange_cancel(self, order_id):
    """Handle exchange-initiated cancellation."""
    # Remove from pending orders
    self.pending_orders = [o for o in self.pending_orders if o['id'] != order_id]

    # Mark order as canceled
    self._mark_order_canceled(order_id)

    # Keep monitoring for late fills (5-minute window)
    self._schedule_late_fill_check(order_id, delay=timedelta(minutes=5))
```

**6. Network Partitions (Connection lost, orders in unknown state)**
```python
def handle_network_partition(self):
    """Handle network partition (connection lost)."""
    # Assume all pending orders are filled (worst case)
    worst_case_position = self.current_position + sum(o['quantity'] for o in self.pending_orders)

    # Check if worst case exceeds critical threshold
    overfill_pct = ((worst_case_position - self.target_position) / abs(self.target_position)) * 100

    if overfill_pct > 25.0:
        # Transition to CRITICAL
        self.state = OverfillState.CRITICAL
        self._on_critical()
    else:
        # Transition to PAUSED (wait for reconnection)
        self.state = OverfillState.PAUSED
        self._on_paused()

    # When reconnected, reconcile position
    self._schedule_reconciliation()
```



**Six Protection Layers:**

1. **Pre-Trade Risk Engine**
   - Runs comprehensive checks BEFORE any order is sent
   - Validates against position limits (per-asset, per-strategy, portfolio-level)
   - Counts in-flight orders toward limits immediately
   - Checks cross-strategy position aggregation
   - Validates daily loss caps and margin availability
   - Rejects orders that would exceed limits

2. **Order State Manager (In-Flight Tracking)**
   - Tracks every order from submission to final state
   - Maintains real-time view of pending orders
   - Reserves position capacity for in-flight orders
   - Prevents new orders while fills are pending
   - Handles partial fills correctly
   - Timeout detection for stuck orders

3. **Position Aggregator (Cross-Strategy View)**
   - Real-time aggregation of positions across all strategies
   - Includes filled positions + in-flight orders
   - Per-asset and portfolio-level tracking
   - Respects user-defined position limits
   - Warns when approaching limits

4. **Order Deduplication**
   - Detects duplicate orders within configurable time window (default: 100ms)
   - Matches on asset, side, quantity, price, strategy
   - Prevents retry logic from creating duplicates
   - Logs rejected duplicates for analysis

5. **Circuit Breakers**
   - Order rate limits (default: 100 orders/minute)
   - Consecutive loss limits (default: 5 trades)
   - Daily loss limits (user-configurable)
   - Position concentration limits (default: 80% of portfolio)
   - Automatic strategy pause on breach
   - Manual kill switch (hotkey + automated trigger)

6. **Reconciliation Engine**
   - Periodic sync with exchange (default: every 30 seconds)
   - Detects discrepancies between internal and exchange positions
   - Auto-pauses all strategies on discrepancy
   - Alerts user to resolve mismatch
   - Tracks manual trades outside SymbioteTrader

**AI-Enhanced Overfill Protection (via Intelligence Backbone):**

The Intelligence Backbone enhances overfill protection with learning:
- Learns user's typical order sizes and patterns
- Detects anomalous order behavior
- Predicts overfill risk based on historical patterns
- Suggests position limit adjustments based on user's risk tolerance
- Identifies strategies that frequently approach limits

**User Configuration (Progressive Mastery):**

Easy Mode (Beginners):
- Conservative defaults automatically applied
- Per-asset limits: 1.0 BTC, 10.0 ETH, etc.
- All protection layers enabled
- Cannot be disabled

Advanced Mode (Experts):
- Granular control over all limits
- Per-asset, per-strategy, portfolio-level configuration
- Adjustable deduplication window
- Custom circuit breaker thresholds
- Emergency override capability (requires manual approval per trade)

**UI Integration:**

- Real-time position aggregation in Strategy Control Board
- In-flight orders dashboard
- Circuit breaker status indicators
- Reconciliation status and alerts
- Position limit warnings before order placement

**Regulatory Framing:**

Overfill protection is pure risk management and position control. No investment advice or recommendations are providedâ€”only factual enforcement of user-defined limits and detection of unintended position accumulation.

### Real-time Monitoring

- Portfolio drawdown alerts with threshold actions (pause/flatten)
- Strategy KPIs vs. benchmarks; degradation detection and auto-demotion to paper
- Unusual trading pattern detection: burst trades, slippage spikes, error storms; auto circuit-breaker triggers
- Automated rebalancing within guardrails; hedge/flatten on kill switch
- Budget consumption monitors: AI spend and trade fee burn-rate

### Resilience & Circuit Breakers

- Per-venue trip conditions: reject/error rate, latency spikes, fill-failure streaks; half-open probes with staged resume
- Graceful degradation: cached data fallback; suspend trading on severe errors; safe-unwind when required
- Exchange failover: primaryâ†’secondary venue routing where safe; re-evaluate precision/limits on switch
- Order/state recovery: orphaned order cleanup and position synchronization on reconnect
- Chaos testing and failure drills for data feeds and order pathways; paper fallback when live disabled


---

## PART 3: ARCHITECTURE & DESIGN

### 9. System Architecture

### Core Philosophy: A No-Compromise, Tiered Architecture

SymbioteTrader's architecture is built on a philosophy of **choice**. It is intentionally designed to cater to a diverse user base, from retail traders seeking maximum convenience to advanced quants demanding maximum performance and control.

**The technical complexity of the stack is abstracted from the user through tiered deployment profiles.** A user can choose to offload all infrastructure management to cloud providers (PostgreSQL on AWS RDS, Redis on ElastiCache, etc.), run a hybrid setup (local app + cloud databases), or self-host the entire high-performance stack with Docker Compose or Kubernetes.

This ensures that the platform's power is accessible to everyone, regardless of their technical expertise, without compromising on capability. **You don't need to be a system administrator to use SymbioteTraderâ€”but if you are one, you have complete control.**

### Architecture Principles

- Self-hosted, non-custodial; BYOK for exchanges and AI providers
- Modular adapters for exchanges, data, and AI; add/replace providers without core changes
- Hot vs. cold paths: QuestDB for ticks, ClickHouse for history, PostgreSQL for ops, Redis for cache; Qdrant/Neo4j for AI memory
- Async, resilient, observable by default: retries/backoff, circuit breakers, OpenTelemetry metrics/traces
- Deterministic OMS with idempotent order ops and recoverable state
- Performance SLOs: signal-to-decision <60s; order placement <10s p95; end-to-end <120s; ingest target 5Kâ€“10K ticks/sec
- Single source of truth per domain (no duplicated spec sections)
- Deployment-agnostic: same app/services with Docker Compose or Kubernetes

#### System Architecture Diagram (C4 Container Level)

**Diagram Description:**

A C4-style container diagram should be created showing the high-level system architecture with the following components:

**Containers:**
- **Frontend (React + TypeScript)**: User interface, TradingView charts, strategy builder
- **Backend API (FastAPI)**: REST API, WebSocket server, authentication
- **Trading Engine**: Strategy execution, order management, risk checks
- **AI Orchestration Layer**: PydanticAI + LangGraph, AVC Gate, AI agents
- **Worker Pool (Celery)**: Background jobs, backtesting, optimization, data ingestion
- **Message Queue (Redis)**: Job queue, pub/sub, real-time events

**Data Stores:**
- **PostgreSQL**: Operations DB (users, configs, jobs, orders, audit)
- **QuestDB**: Hot tick time-series (real-time ingest/queries)
- **ClickHouse**: Historical market data + analytics (OLAP)
- **Redis**: Cache, queues, session state
- **Qdrant**: Vector store for AI (embeddings, RAG)
- **Neo4j**: Graph memory for AI (relationships, context)
- **MinIO/S3**: Object storage (backtest artifacts, exports)

**External Systems:**
- **Exchanges (via CCXT)**: Binance, Coinbase, Kraken, etc.
- **AI Providers (via LiteLLM)**: OpenAI, Anthropic, local models
- **Market Data Providers**: LunarCrush, Santiment, Twitter/X, Reddit
- **Observability**: Prometheus, Grafana, Langfuse, OpenTelemetry

**Interactions:**
- User â†’ Frontend â†’ Backend API â†’ Trading Engine â†’ Exchanges
- User â†’ Frontend â†’ Backend API â†’ AI Orchestration â†’ AI Providers
- Trading Engine â†’ Worker Pool â†’ Data Stores
- AI Orchestration â†’ Qdrant/Neo4j (RAG + Memory)
- All components â†’ Observability (metrics, traces, logs)

**Key Flows to Highlight:**
1. **Trading Flow**: User creates strategy â†’ Backend validates â†’ Trading Engine executes â†’ Order placed on exchange
2. **AI Flow**: User asks question â†’ AVC Gate classifies â†’ PydanticAI/LangGraph orchestrates â†’ AI Provider responds
3. **Data Flow**: Exchange WebSocket â†’ Worker ingests â†’ QuestDB (hot) â†’ ClickHouse (cold)
4. **Backtest Flow**: User requests backtest â†’ Job queued â†’ Worker executes â†’ Results stored â†’ User notified

### Data Architecture & Stores

#### High-Performance Multi-Database Architecture

- PostgreSQL: operations DB (users, configs, jobs, orders, audit)
- QuestDB: hot tick time-series (realtime ingest/queries)
- ClickHouse: historical market data + analytics (OLAP)
- Redis: cache, queues, shortâ€‘term session/memory
- Qdrant: vector store (semantic/embedding memory)
- Neo4j: graph memory (relations: markets, strategies, events)
- S3-compatible object storage (AWS S3; MinIO if self-hosted): artifacts (backtests, paper runs, datasets, uploads)

##### Data Flow Diagram (Hot vs Cold Paths)

**Diagram Description:**

A data flow diagram should be created showing how data moves through the system, emphasizing the "hot" (real-time) vs "cold" (historical/analytical) data paths.

**Hot Path (Real-Time Trading Data):**
```
Exchange WebSocket â†’ Celery Worker (Ingest) â†’ QuestDB (Hot Storage)
                                            â†“
                                    Redis (Cache recent ticks)
                                            â†“
                                    Trading Engine (Strategy evaluation)
                                            â†“
                                    Order Placement â†’ Exchange API
```

**Cold Path (Historical/Analytical Data):**
```
QuestDB (Hot Storage, 7-30 days) â†’ Batch Job (Daily) â†’ ClickHouse (Cold Storage, long-term)
                                                      â†“
                                              Analytics Queries
                                                      â†“
                                              Performance Dashboard
```

**AI Data Path:**
```
User Query â†’ PydanticAI â†’ Qdrant (RAG: Retrieve relevant docs)
                       â†’ Neo4j (Memory: Retrieve user context)
                       â†’ AI Provider (Generate response)
                       â†’ User
```

**Backtest Data Path:**
```
User Request â†’ Jobs API â†’ LangGraph â†’ Celery Worker
                                    â†“
                            ClickHouse (Query historical data)
                                    â†“
                            Backtest Engine (Execute strategy)
                                    â†“
                            PostgreSQL (Store results)
                                    â†“
                            MinIO/S3 (Store artifacts: equity curve, trades)
                                    â†“
                            User (View results)
```

**Key Characteristics to Highlight:**
1. **Hot Path Latency**: QuestDB optimized for <100ms writes, <10ms reads
2. **Cold Path Throughput**: ClickHouse optimized for bulk queries (millions of rows/sec)
3. **Data Aging**: Automatic migration from hot (QuestDB) to cold (ClickHouse) after 7-30 days
4. **Cache Layer**: Redis caches recent ticks for sub-millisecond access by Trading Engine
5. **AI Data Isolation**: Qdrant/Neo4j separate from trading data for performance isolation
6. **Artifact Storage**: Large files (backtest results, exports) stored in object storage (MinIO/S3)

Operational policies (concise)

- Retention: QuestDB (hot) 7â€“30 days; ClickHouse (history) long-term; Redis TTLs; S3 lifecycle for large artifacts
- Backups/DR: PostgreSQL daily snapshots + PITR; ClickHouse snapshots; S3 versioning; restore playbooks
- Encryption/secrets: TLS in transit; at-rest encryption; secrets via env/secret manager (no plaintext in DB)
- Layout: ClickHouse partition-by-day (or month), order by (symbol, ts); QuestDB designated timestamp + daily partition
- Migrations: Alembic for PostgreSQL; versioned schema changes and migration scripts for others as needed
- HA (optional): Postgres replication; ClickHouse replicas; Redis/Qdrant/Neo4j clustering (single-node default)

- Data catalog & lineage: dataset/source registry, provenance fields, retention policies by data class (market, logs, embeddings)
- Backup SLOs: RPO/RTO targets per store; periodic restore drill validation
- Time sync policy: NTP and monotonic timestamps across services for consistent audits

### Application Architecture

#### Backend

- FastAPI, Pydantic, SQLAlchemy/Alembic
- CCXT, httpx/websockets
- Backtrader, vectorbt, TA-Lib, pandas-ta, numpy, pandas
- AI orchestration: Hybrid (PydanticAI + LangGraph); LiteLLM; OpenTelemetry; Jobs API
- Task queue: Celery (Redis broker/result); retries/backoff; scheduled tasks via celery-beat
- Object storage: S3-compatible (AWS S3; MinIO if self-hosted)
- Auth: single-user token/JWT; API keys encrypted at rest
- Health endpoints: /healthz, /readyz
- Rate limiting: per-exchange throttles + retry/backoff

- Public App API: REST + WebSocket with versioning, rate limits, idempotency keys; OpenAPI documentation; webhook subscriptions (fills, guardrail breaches, approvals)

#### Configuration & Environments

- Layered config: defaults â†’ environment â†’ user/strategy overlays; schema validation with Pydantic; config diff/audit logs
- Environment profiles: dev/stage/prod with feature flags and safe dryâ€‘run modes
- Secrets via env/secret manager; automatic redaction in logs and traces

#### Frontend

- React + TypeScript, Vite
- UI: shadcn/ui
- Realtime: SSE/WebSockets; Charts: lightweight-charts
- Visual Strategy Builder: React Flow (node-based DAG editor)

- Auth client: token storage; attach bearer to API/WebSocket
- Observability: show correlation IDs for support/debug
- Slash-commands in chat: /backtest, /optimize, /promote, /flatten, /sor, /help; autocompletion and inline parameter forms
- Voice input: push-to-talk toggle; Web Speech API primary; server fallback (faster-whisper) with streaming partials; language selection; noise suppression; mic permission prompts

##### Charting (Trading UI)

- Library: TradingView Lightweight Charts (OSS) as core OHLCV renderer
- Multi-pane layout: internal layout engine; synced time scale and crosshair; draggable splitter; per-pane y-scale
- Indicators: overlay and separate-pane studies (RSI, MACD, EMA, VWAP, etc.); custom series API; parameter UI
- Drawing/annotations: trendlines, rays, horizontal/vertical lines, fib retracements, rectangles; snap-to OHLC/crosshair; templates; lock/hide
- Events/markers: orders, fills, alerts, entry/exit markers; tooltips with TCA stats
- Performance: virtualized viewport; 200k+ bars; 20+ updates/sec; incremental updates; throttled reflow
- Persistence: save/load layouts per strategy/user; chart templates; indicator presets
- Extensibility: plugin interface for custom indicators/tools; theming; dark/light; i18n

##### Slash Commands (Chat Ops)

- Policy (AVC Gate)
  - All slash commands are governed by the Askâ€‘vsâ€‘Command Gate; see AI Integration â†’ [AVC Gate](#ask-vs-command-gate-avc-gate).
  - READ_ONLY: executes after validation; shows Result Card.
  - STATEFUL_LOW/MED/HIGH: always show Confirmation Card; HIGH adds OTP/2FA. Jobs created in PendingUserConfirm state until approved.
  - Parsed parameters are previewed (diff) before approval; idempotency prevents double execution.

- Strategy & Backtesting
  - /strategy new NAME [template=ID] [asset_class=...] [notes=...] â€” create a strategy from template
  - /strategy load NAME_OR_ID â€” load details and latest version
  - /strategy clone NAME_OR_ID [as=NEW_NAME] â€” duplicate a strategy
  - /strategy diff VERSION_A VERSION_B â€” show config/code/DAG diffs
  - /strategy export NAME_OR_ID [format=json|py] â€” download deterministic spec/stub
  - /backtest STRATEGY [symbol=...] [tf=...] [from=...] [to=...] [fees=...] [slip=...] [mode=bar|intrabar]
  - /optimize STRATEGY [params=p1=a..b,p2=...] [method=grid|bayes] [budget=RUNS] [cv=FOLDS] [target=sharpe|pnl|dd]
  - /walkforward STRATEGY [splits=...] [window=...] [step=...] [target=...]
  - /sweep STRATEGY [params=...] [cv=...] [target=...]
  - /mc STRATEGY [runs=...] [seed=...] [slip=...] â€” Monte Carlo equity perturbation
  - /promote STRATEGY [to=paper|canary|live] [notes=...] â€” submit with approvals

- Execution & Trading
  - /start [strategy=NAME] [mode=paper|live] â€” enable trading
  - /pause [strategy=NAME|all] â€” pause trading
  - /resume [strategy=NAME|all] â€” resume trading
  - /flatten [scope=all|strategy|symbol] [strategy=...] [symbol=...] â€” close positions
  - /sor [symbol=...] [side=buy|sell] [qty=...] [type=market|limit] [limit=...] [tif=GTC|IOC|FOK] [post_only] [reduce_only]
  - /cancel [order_id=...] [strategy=...] [symbol=...] [all] â€” cancel orders
  - /positions [filter=strategy|symbol] â€” list positions
  - /orders [status=open|all] [strategy=...] â€” list orders
  - /fills [range=today|1d|7d|custom] [strategy=...] â€” trade fills

- Risk & Governance
  - /limits show â€” view current guardrails
  - /limits set KEY=VALUE [...] â€” set guardrails (e.g., daily_loss_cap=2%, max_leverage=2x)
  - /killswitch arm|disarm|trigger [scope=all|strategy|venue] [reason=...] â€” emergency controls
  - /risk review STRATEGY [range=...] â€” run risk checks and scenarios

- Data & Ingestion
  - /ingest status â€” source/latency/health
  - /ingest restart [source=...] â€” restart connector
  - /backfill [symbol=...] [venue=...] [from=...] [to=...] [tf=...] â€” historical backfill
  - /calendars show [venue=...] â€” trading sessions/holidays

- Portfolio & Analytics
  - /pnl [range=today|1d|7d|mtd|ytd|custom] [strategy=...] â€” realized/unrealized
  - /tca [strategy=...] [range=...] â€” slippage/fill rate/price improvement
  - /kpis [strategy=...] [range=...] â€” sharpe, sortino, dd, hit rate
  - /health [component=trading|data|ai|db|all] â€” health summary

- Agents
  - /advisor strategy DESCRIPTION â€” Strategy Advisor proposes native starter
  - /websearch QUERY â€” cited research brief

- Watchlist & Alerts
  - /watchlist add SYMBOL [asset_class=...] [venue=...] [notes=...] â€” add symbol to watchlist
  - /watchlist remove SYMBOL â€” remove symbol from watchlist
  - /watchlist show [asset_class=...] â€” show watchlist
  - /watchlist clear â€” clear watchlist
  - /alert create SYMBOL [condition=above|below|crosses] [price=...] [indicator=...] [notes=...] â€” create price/indicator alert
  - /alert list [symbol=...] [active=true|false] â€” list alerts
  - /alert cancel ALERT_ID â€” cancel alert
  - /alert test ALERT_ID â€” test alert (dry run)

- Trade Journal
  - /journal add [strategy=...] [symbol=...] [type=pre_trade|post_trade|lesson] [notes=...] â€” add journal entry
  - /journal show [strategy=...] [symbol=...] [type=...] [range=...] â€” show journal entries
  - /journal export [format=pdf|csv|md] [range=...] â€” export journal
  - /journal search QUERY â€” search journal entries
  - /journal stats [range=...] â€” journal analytics (common mistakes, improvement trends)

- Snapshots & Comparison
  - /snapshot [name=...] [include=charts|positions|orders|strategies] â€” save current state/screenshot
  - /snapshot list â€” list saved snapshots
  - /snapshot load SNAPSHOT_ID â€” load snapshot
  - /compare strategies STRATEGY_A STRATEGY_B [metric=sharpe|pnl|dd|win_rate] â€” compare two strategies side-by-side
  - /compare symbols SYMBOL_A SYMBOL_B [range=...] â€” compare two symbols
  - /correlate strategies [strategy_ids=...] [range=...] â€” show correlation matrix between strategies
  - /correlate assets [symbols=...] [range=...] â€” show correlation matrix between assets
  - /risk agent STRATEGY â€” Risk Governance Agent analysis
  - /exec agent STRATEGY â€” Execution Quality/SOR review
  - /memory summarize [range=chat|last|custom] â€” conversation summary

- Jobs & Approvals
  - /jobs list [state=running|queued|failed|all]
  - /jobs show ID â€” details and outputs
  - /jobs logs ID â€” streaming logs
  - /jobs cancel ID
  - /approvals list â€” pending items
  - /approve ID [notes=...] | /reject ID [reason=...]

- System & Admin
  - /config get KEY | /config set KEY=VALUE
  - /secrets add NAME â€” guided form; /secrets list; /secrets rotate NAME
  - /budget show [ai|trading] â€” quotas and spend; /budget set SCOPE=VALUE
  - /export WHAT [id=...] â€” WHAT âˆˆ {strategy|runs|logs}; artifact export
  - /import strategy FILE â€” import deterministic JSON/DAG
  - /alerts list|clear â€” user notifications
  - /notify route EMAIL_OR_WEBHOOK â€” set alert routing
  - /voice on [lang=en-US] [partials=true|false] [vad=auto|off] â€” enable voice input
  - /voice off â€” disable voice input

  - /help [command] â€” command help and examples

Notes

- Parameters are parsed by PydanticAI; missing details trigger inline forms.
- All commands attach correlation_id and are executed via Jobs API â†’ LangGraph/Celery where applicable.
- Paper/live parity is enforced; promotions require approvals based on policy.

#### Infrastructure

- Deployment options: Docker Compose (single-host) or Kubernetes (cluster)
- Nginx (reverse proxy / Ingress) for TLS termination and WebSocket/SSE proxy
- TLS automation: cert-manager or equivalent ACME client
- See Appendix â†’ Kubernetes Patterns (Ops) for cluster-specific guidance (StatefulSets, PDBs, ingress/SSE, autoscaling, DR)
- OpenTelemetry Collector; Prometheus/Grafana
- Langfuse (LangGraph runs)
- Workers: Celery worker pool (N replicas)
- Scheduler: celery-beat (optional)
- Secrets management: environment/secret manager; keys encrypted at rest
- Edge protections: rate limits and circuit breakers for upstream APIs

#### Deployment Profiles & Configuration

SymbioteTrader offers flexible deployment profiles optimized for different hardware capabilities and user preferences. The platform is designed for power users with modern hardware (16GB+ RAM, 1TB+ SSD, optional GPU) but provides fallback options for resource-constrained environments.

**Important:** Profiles are starting points, not constraints. Users can freely mix and match self-hosted and cloud databases on a per-database basis, regardless of where the application itself runs (local machine, VPS, or cloud cluster). The setup wizard provides dynamic performance warnings when network topology may impact trading performance.

##### Profile Overview

**Full-Featured Power User (Recommended Default)**

- Target: 16GB+ RAM, 1TB+ SSD, i7+ CPU
- All databases: PostgreSQL, QuestDB, ClickHouse, Redis, Qdrant, Neo4j, MinIO
- All features enabled: trading, backtesting, full AI assistant, advanced AI memory, deep analytics
- Resource usage: ~10-12GB RAM, ~100GB storage
- Performance: Optimized for signal-to-decision <30s, order placement <5s p95, 10K-20K ticks/sec ingest
- Best for: Users with modern hardware who want all features and best performance

**GPU-Accelerated Power User (Experimental)**

- Target: 16GB+ RAM, RTX 3090/4090 with 24GB+ VRAM
- Everything in Full-Featured PLUS local AI inference (Ollama/vLLM)
- Local LLM inference (Llama 3.1 70B, Qwen 2.5 72B) and embeddings (sentence-transformers)
- Zero AI API costs; complete privacy; lower latency
- Resource usage: ~12GB RAM, ~24GB VRAM, ~150GB storage (includes model weights)
- Best for: Users with high-end GPUs who want to eliminate AI API costs and maximize privacy

**Cloud-Hybrid Power User (Example Configuration)**

- Target: 16GB+ RAM, prefer managed services for convenience
- Example mix: QuestDB self-hosted (low latency), other databases in cloud
- Cloud services: PostgreSQL (Supabase), Redis (Upstash), ClickHouse Cloud, Qdrant Cloud, Neo4j AuraDB, S3/R2/B2
- All features enabled with reduced operational burden
- Cost: ~$0-225/month depending on usage and free tier limits
- Best for: Users who prefer managed databases over self-hosting despite having capable hardware
- Note: Any mix of self-hosted and cloud is supported; this is just one example

**Resource-Constrained (Fallback)**

- Target: <16GB RAM, VPS, cloud VMs, older hardware
- Minimal self-hosted: PostgreSQL, Redis, QuestDB, MinIO
- Optional cloud: Qdrant Cloud (1GB free), Neo4j AuraDB Free
- Reduced features: core trading, backtesting, basic AI (if Qdrant added), limited analytics
- Resource usage: ~4-6GB RAM, ~50GB storage
- Best for: Edge cases with hardware limitations; not the primary target audience

##### Hardware Requirements

| Profile | RAM | Storage | CPU | GPU | Containers | Est. Performance |
|---------|-----|---------|-----|-----|------------|------------------|
| Full-Featured (16GB) | 16GB | 100GB SSD | i7/Ryzen 7 | Optional | ~12 | Good (target SLOs) |
| Full-Featured (32GB) | 32GB | 150GB SSD | i7/Ryzen 7 | Optional | ~12 | Excellent (2x target) |
| Full-Featured (64GB) | 64GB | 200GB SSD | i9/Ryzen 9 | Optional | ~12 | Outstanding (3x target) |
| GPU-Accelerated | 16GB+ | 150GB SSD | i7+ | RTX 3090/4090 (24GB+) | ~13 | Excellent + zero AI costs |
| Cloud-Hybrid | 16GB+ | 50GB SSD | i7+ | Optional | ~3-5 | Good (depends on cloud) |
| Resource-Constrained | 8-16GB | 50GB SSD | i5+ | None | ~4-6 | Basic (reduced features) |

Resource allocation presets:

- **16GB RAM systems:** Conservative (10-12GB allocated, 4-6GB free for OS)
- **32GB RAM systems:** Balanced (16-20GB allocated, 12-16GB free)
- **64GB+ RAM systems:** Aggressive (24-32GB allocated, larger caches/buffer pools, more workers)

##### Installation & Setup Process

**Interactive Setup Wizard**

SymbioteTrader includes a CLI-based setup wizard that guides users through deployment configuration:

```bash
python setup.py init
```

**Wizard Flow:**

1. **System Detection**
   - Auto-detect RAM, storage, CPU, GPU
   - Detect network location (local machine, VPS, cloud region)
   - Recommend optimal profile based on hardware
   - Display estimated resource usage per profile

2. **Profile Selection**
   - Present profiles with descriptions and requirements
   - Highlight recommended profile for detected hardware
   - Allow custom profile configuration
   - Note: Profiles are starting points; per-database customization in next steps

3. **Feature Configuration** (during install)
   - Core features (always enabled): trading, backtesting, paper trading
   - Optional features:
     - AI enabled (requires Qdrant)
     - Advanced AI memory (requires Neo4j)
     - Historical analytics (requires ClickHouse)
     - GPU inference (requires compatible GPU)

4. **Database Deployment Mode** (per database, fully customizable)
   - For each database, choose: Self-hosted (Docker) OR Cloud-hosted (managed service)
   - Show free tier availability for cloud options
   - Show latency sensitivity (Critical/High/Moderate/Low/Minimal)
   - Allow any mix of self-hosted and cloud

5. **Network Topology Analysis** (automatic)
   - Test latency to each configured database
   - Analyze topology: app location vs database locations
   - Show dynamic performance warnings:
     - ðŸ”´ Critical: QuestDB/Redis remote with high latency
     - ðŸŸ¡ Moderate: PostgreSQL remote with moderate latency
     - ðŸŸ¢ Low: ClickHouse/Neo4j/Qdrant remote (acceptable)
     - âšª Minimal: Object Storage remote (expected)
   - Provide recommendations for optimal configuration
   - Allow user to adjust configuration based on warnings

6. **Resource Allocation**
   - Select preset: Conservative (16GB), Balanced (32GB), Aggressive (64GB+), Custom
   - Preview memory/storage allocation per service
   - Adjust based on number of self-hosted databases

7. **API Keys & Secrets** (during install)
   - Exchange API keys (required for trading)
   - AI provider API keys (optional if using GPU inference or cloud AI)
   - Cloud database connection strings (if using cloud mode)

8. **Generation & Validation**
   - Generate `docker-compose.yml` with only required services
   - Generate `.env` file with configuration
   - Generate `config/deployment.yaml` with feature flags
   - Download AI models if GPU inference enabled
   - Final latency validation and performance assessment

**What's Configured During Install:**

- Deployment profile and resource allocation
- Database deployment modes (self-hosted vs cloud)
- Core feature enablement (AI, analytics, GPU inference)
- Exchange API keys and cloud database credentials
- Docker Compose service definitions

**What Can Be Enabled After Install:**

- Individual AI features (if Qdrant already configured)
- Advanced AI memory (requires adding Neo4j)
- Historical analytics (requires adding ClickHouse)
- Additional exchanges and data sources
- Strategy-specific AI settings and budgets
- Observability and monitoring preferences
- UI themes and personalization

**Post-Install Configuration UI:**

Settings â†’ Deployment section allows users to:

- View current profile and resource usage
- Enable/disable optional features (may require database additions)
- Switch databases between self-hosted and cloud
- Adjust resource allocations (requires restart)
- Upgrade to higher profile (migration wizard)

##### Cloud vs Self-Hosted Options

Each database can be deployed self-hosted or in the cloud. Cloud options are useful for resource-constrained users or those preferring managed services.

**Cloud Provider Options & Free Tiers:**

| Database | Cloud Provider | Free Tier | Paid Tier | Notes |
|----------|---------------|-----------|-----------|-------|
| PostgreSQL | Supabase | 500MB, 50K MAU | $25/mo (8GB) | Includes auth, storage, realtime |
| PostgreSQL | Neon | 512MB, 3GB storage | $19/mo (compute) | Serverless, instant branching |
| Redis | Upstash | 256MB | $10/mo (1GB) | Serverless, per-request pricing |
| Redis | Redis Cloud | 30MB | $5/mo (250MB) | Managed Redis by Redis Ltd |
| QuestDB | N/A | N/A | Self-hosted only | No cloud offering; lightweight |
| ClickHouse | ClickHouse Cloud | 30-day trial | ~$50-100/mo | Pay-as-you-go, scales with usage |
| Qdrant | Qdrant Cloud | 1GB forever | $25/mo (4GB) | No credit card for free tier |
| Neo4j | AuraDB Free | Perpetual free | $65/mo (1GB Pro) | No credit card for free tier |
| Object Storage | Cloudflare R2 | 10GB | $0.015/GB/mo | S3-compatible, zero egress fees |
| Object Storage | Backblaze B2 | 10GB | $0.005/GB/mo | S3-compatible, low cost |

**Deployment Mode Configuration:**

```yaml
# config/deployment.yaml
databases:
  postgresql:
    mode: self-hosted  # or: cloud
    cloud_provider: supabase  # if mode=cloud
    connection_string: ${POSTGRES_URL}  # if mode=cloud

  redis:
    mode: self-hosted

  questdb:
    mode: self-hosted  # always self-hosted (no cloud option)

  clickhouse:
    enabled: true  # based on features.historical_analytics
    mode: cloud
    cloud_provider: clickhouse-cloud
    connection_string: ${CLICKHOUSE_URL}

  qdrant:
    enabled: true  # based on features.ai_enabled
    mode: cloud
    cloud_provider: qdrant-cloud
    connection_string: ${QDRANT_URL}
    api_key: ${QDRANT_API_KEY}

  neo4j:
    enabled: true  # based on features.ai_advanced_memory
    mode: cloud
    cloud_provider: auradb
    connection_string: ${NEO4J_URL}

  object_storage:
    mode: cloud
    provider: r2  # minio | s3 | r2 | b2
    connection_string: ${S3_URL}
```

**Switching Between Self-Hosted and Cloud:**

Users can migrate databases between self-hosted and cloud via Settings â†’ Deployment:

1. Select database to migrate
2. Choose target mode (self-hosted â†’ cloud or cloud â†’ self-hosted)
3. Provide connection details if migrating to cloud
4. Run migration wizard (exports data, updates config, restarts services)
5. Validate connectivity and data integrity

##### Performance & Network Topology

**Critical Principle:** Database location matters based on latency sensitivity, not just "cloud vs local." A cloud database in the same region as your app may outperform a self-hosted one on slow storage. The system dynamically analyzes your topology and warns about performance implications.

**Latency Sensitivity Matrix:**

| Database | Role | Latency Sensitivity | Co-location Importance | Acceptable Latency |
|----------|------|---------------------|------------------------|-------------------|
| QuestDB | Hot tick data ingestion | **CRITICAL** | **Required** | <10ms target, <50ms max |
| Redis | Cache, queues, session state | **HIGH** | **Strongly recommended** | <20ms target, <100ms max |
| PostgreSQL | Operations, orders, configs | **MODERATE** | Recommended | <50ms target, <200ms acceptable |
| Qdrant | Vector store for AI queries | **LOW** | Optional | <200ms target, <500ms acceptable |
| ClickHouse | Historical analytics (batch) | **LOW** | Optional | <500ms acceptable |
| Neo4j | Graph memory (AI) | **LOW** | Optional | <500ms acceptable |
| Object Storage | Artifacts, backtests, uploads | **MINIMAL** | Not required | >1s acceptable |

**Dynamic Performance Warnings:**

The setup wizard and Settings â†’ Deployment UI provide real-time warnings based on your configuration:

ðŸ”´ **CRITICAL IMPACT** (blocks trading performance):
- QuestDB remote from app (>50ms latency)
- Redis remote from app (>100ms latency)
- Warning: "QuestDB is in us-east-1 but your app is running locally. Expected latency: ~80ms. This will severely impact tick data ingestion. Recommendation: Deploy QuestDB locally or move app to same region."

ðŸŸ¡ **MODERATE IMPACT** (may affect order execution):
- PostgreSQL remote from app (>200ms latency)
- Warning: "PostgreSQL is in eu-west-1 but your app is in us-east-1. Expected latency: ~120ms. Order placement may be slower. Recommendation: Use PostgreSQL in same region or accept 2-3x slower order writes."

ðŸŸ¢ **LOW IMPACT** (acceptable for most use cases):
- ClickHouse, Neo4j, Qdrant remote from app
- Info: "ClickHouse is in cloud (us-west-2) while app is local. Analytics queries will have network latency but this is acceptable for batch workloads."

âšª **MINIMAL IMPACT**:
- Object Storage remote from app
- Info: "Using Cloudflare R2 for object storage. Backtest artifacts will have network latency but this is expected."

**Common Deployment Scenarios:**

**Scenario 1: App on Local Machine (Home Laptop/Desktop)**

Optimal configuration:
- âœ… QuestDB: Local (Docker)
- âœ… Redis: Local (Docker)
- âœ… PostgreSQL: Local (Docker) OR Supabase (same region as nearest edge)
- âœ… ClickHouse: Cloud (ClickHouse Cloud) - less ops burden
- âœ… Qdrant: Cloud (Qdrant Cloud 1GB free) - less ops burden
- âœ… Neo4j: Cloud (AuraDB Free) - less ops burden
- âœ… Object Storage: Cloud (Cloudflare R2 / Backblaze B2) - less ops burden

Performance: Excellent for trading; analytics have network latency but acceptable.

**Scenario 2: App on VPS/Cloud VM**

Optimal configuration:
- âœ… QuestDB: Same VM OR managed service in same region/VPC
- âœ… Redis: Same VM OR Upstash in same region
- âœ… PostgreSQL: Same VM OR Supabase in same region
- âœ… ClickHouse: Managed cloud in same region
- âœ… Qdrant: Managed cloud in same region
- âœ… Neo4j: Managed cloud in same region
- âœ… Object Storage: S3/R2 in same region

Performance: Excellent if all in same region; degraded if cross-region.

**Scenario 3: App on Kubernetes Cluster**

Optimal configuration:
- âœ… QuestDB: StatefulSet in same cluster
- âœ… Redis: StatefulSet in same cluster OR managed service in same VPC
- âœ… PostgreSQL: StatefulSet in same cluster OR managed service in same VPC
- âœ… ClickHouse: Managed cloud in same region (easier than StatefulSet)
- âœ… Qdrant: Managed cloud in same region OR StatefulSet
- âœ… Neo4j: Managed cloud in same region (easier than StatefulSet)
- âœ… Object Storage: S3 in same region

Performance: Excellent for in-cluster; good for same-VPC managed services.

**Network Topology Best Practices:**

1. **Measure, Don't Assume:** Setup wizard includes latency testing to each configured database
2. **Same Region > Same Cloud > Cross-Region:** Prioritize geographic proximity over self-hosted vs cloud
3. **VPC Peering:** If using cloud VMs + managed databases, use VPC peering for private, low-latency connections
4. **Monitor Continuously:** Observability dashboard shows per-database latency; alerts on degradation
5. **Graceful Degradation:** System automatically throttles tick ingestion if QuestDB latency exceeds thresholds

**Latency Testing During Setup:**

```bash
python setup.py init

# After database configuration, wizard runs latency tests:

Testing database connectivity and latency...
âœ“ QuestDB (local): 2ms avg, 5ms p95 - EXCELLENT
âœ“ Redis (local): 1ms avg, 3ms p95 - EXCELLENT
âš  PostgreSQL (Supabase us-east-1): 45ms avg, 78ms p95 - ACCEPTABLE
âš  ClickHouse (Cloud us-west-2): 120ms avg, 180ms p95 - ACCEPTABLE (analytics only)
âœ“ Qdrant (Cloud us-east-1): 65ms avg, 95ms p95 - GOOD
âœ“ Neo4j (AuraDB us-east-1): 70ms avg, 110ms p95 - GOOD
âœ“ S3 (Cloudflare R2): 150ms avg, 250ms p95 - ACCEPTABLE (artifacts only)

Performance Assessment: GOOD
- Trading performance: Excellent (QuestDB + Redis local)
- Order execution: Good (PostgreSQL <100ms)
- Analytics: Acceptable (ClickHouse remote but batch workload)

Proceed with this configuration? [Y/n]
```

**Monitoring Mixed Deployments:**

Grafana dashboards include per-database latency panels:
- QuestDB: Ingest latency, write latency, query latency (p50/p95/p99)
- Redis: Command latency, network round-trip time
- PostgreSQL: Query latency, connection pool wait time
- ClickHouse: Query latency (acceptable for batch)
- Qdrant: Search latency, insert latency
- Neo4j: Query latency, traversal time

Alerts trigger when:
- QuestDB latency >50ms p95 (critical)
- Redis latency >100ms p95 (critical)
- PostgreSQL latency >200ms p95 (warning)
- Any database latency increases >50% from baseline (warning)

##### Feature Configuration

**Feature Flags & Dependencies:**

```yaml
# config/deployment.yaml
features:
  # Core (always enabled)
  trading: true
  backtesting: true
  paper_trading: true
  realtime_data: true

  # Optional (configurable)
  ai_enabled: false                    # Requires: Qdrant
  ai_advanced_memory: false            # Requires: Neo4j (implies ai_enabled)
  ai_gpu_inference: false              # Requires: GPU with 24GB+ VRAM
  historical_analytics: false          # Requires: ClickHouse

  # Strategy-specific (enabled per strategy)
  ai_strategy_advisor: false           # Requires: ai_enabled
  ai_risk_governance: false            # Requires: ai_enabled
  ai_market_intelligence: false        # Requires: ai_enabled
```

**Feature Enablement Matrix:**

| Feature | During Install | After Install | Requires Database | Requires Restart |
|---------|---------------|---------------|-------------------|------------------|
| Core trading | âœ… Always | N/A | PostgreSQL, Redis, QuestDB | N/A |
| AI assistant | âœ… Yes | âœ… Yes | Qdrant | âœ… Yes (if adding Qdrant) |
| Advanced AI memory | âœ… Yes | âœ… Yes | Neo4j | âœ… Yes (if adding Neo4j) |
| GPU inference | âœ… Yes | âœ… Yes | GPU, Ollama | âœ… Yes |
| Historical analytics | âœ… Yes | âœ… Yes | ClickHouse | âœ… Yes (if adding ClickHouse) |
| Additional exchanges | âŒ No | âœ… Yes | None | âŒ No |
| Strategy-specific AI | âŒ No | âœ… Yes | Depends on ai_enabled | âŒ No |

**Graceful Degradation:**

If optional databases are unavailable, the application degrades gracefully:

- **Qdrant unavailable:** AI features disabled; fallback to Redis for simple memory
- **Neo4j unavailable:** Advanced AI memory disabled; use Redis/Qdrant for basic memory
- **ClickHouse unavailable:** Historical analytics use PostgreSQL (slower for large datasets)

Warnings are logged and displayed in UI when features are degraded.

##### Migration & Upgrade Paths

**Upgrading Between Profiles:**

Users can upgrade their deployment profile as needs grow:

```bash
python setup.py upgrade --profile gpu-accelerated
```

**Upgrade Wizard Flow:**

1. Detect current profile and configuration
2. Show differences between current and target profile
3. List new databases/services to be added
4. Estimate additional resource requirements
5. Backup current configuration and data
6. Add new services to docker-compose.yml
7. Run database migrations
8. Update feature flags
9. Restart services
10. Validate health and connectivity

**Common Upgrade Paths:**

- **Resource-Constrained â†’ Full-Featured:** Add ClickHouse, Qdrant, Neo4j; enable all features
- **Full-Featured â†’ GPU-Accelerated:** Add Ollama service with GPU passthrough; download models
- **Self-Hosted â†’ Cloud-Hybrid:** Migrate selected databases to cloud; update connection strings
- **Cloud-Hybrid â†’ Full-Featured:** Migrate cloud databases back to self-hosted; export/import data

**Downgrade Support:**

Users can also downgrade profiles to reduce resource usage:

```bash
python setup.py downgrade --profile resource-constrained
```

Downgrade wizard:

1. Warn about feature loss and data export requirements
2. Export data from databases being removed
3. Update configuration to disable dependent features
4. Remove services from docker-compose.yml
5. Restart with reduced profile

**Profile Switching Without Data Loss:**

All profile changes preserve user data:

- Databases are backed up before migration
- Data export/import scripts handle schema compatibility
- Rollback option available if migration fails
- Validation checks ensure data integrity post-migration


### 12. UI/UX Design

### Design Principles

- Trader-first: zero-friction, minimal clicks, information-dense but readable
- Speed as a feature: sub-100 ms UI response for interactions; smooth 60 fps animations
- Focus, not flash: no blocking modals for routine actions; inline edits and non-intrusive confirmations
- Safety with clarity: destructive actions require explicit confirmation; clear preview/diff for risky actions
- Consistency: shared patterns across terminal, builder, jobs, and settings

### Application Shell & Navigation

- Global shell: left nav (primary sections), top bar (search/command palette, status, profile), main workspace
- Workspaces/tabs: multiple tabs per section (e.g., multiple charts or strategies) with quick switcher (Ctrl/Cmd+`)
- Strategy workspaces: run multiple strategies in parallel; each workspace can host several strategy terminals/tabs; quick switcher; save/restore sets

- Docking/panels: resizable left/right sidebars; detachable drawers for logs/jobs; persistent per-user layout
- Command palette: universal (Ctrl/Cmd+K) with slash command integration and contextual suggestions
- Status indicators: latency to exchange, ingest health, job activity, account connection state (hover for details)

### Key Views

- Trading Terminal: charts, order entry, positions/orders/fills, watchlist, order book/depth, trade tape
- Strategy Builder (Visual): DAG canvas (see Strategy Framework â†’ Visual Strategy Builder); inspector, block library, params
- Backtesting & Results: run config form, progress, results (KPIs, equity curve, drawdowns), scenario compare/diff
- Jobs & Approvals: list/detail, logs, artifacts; approve/reject with notes inline; correlation_id and costs
- Data Health: feed status, latency, gaps/backfill controls, calendars/sessions
- Settings: connections (exchanges, data, AI), limits/guardrails, preferences (theme, locale, hotkeys), secrets
- AI Chat & Agent Palette: chat on the side or full-screen; open agent panels; deep-link to jobs/results
- Strategy Control Board: overview grid of all strategies with status (paper/live/running/paused), P&L, risk state, budgets; one-click start/pause/flatten; drill-down

### Trading Terminal Layout

- Chart area: multi-pane (see Frontend â†’ Charting); synced time scale/crosshair; indicator presets
- Order entry: price/qty/tif/flags; keyboard-first; validation and venue constraints; quick buttons (market/limit)
- Positions/Orders/Fills: sortable tables; inline amend/cancel; drill-down to order/fill traces; CSV export
- Watchlist: favorites with mini-sparkline; quick switch; per-symbol settings
- Depth & Tape: L2 order book (aggregated), recent trades; optional heatmap; toggleable pane
- Annotations: entries/exits, orders, alerts on chart with hover tooltips (TCA: slippage, fill quality)
- Layout presets: 1/2/3-column templates; save/load per user; per-strategy layout binding
- Multi-strategy view: side-by-side terminals; link/unlink crosshair/timeframe across symbols/strategies; independent order entry per strategy
- Aggregated header: per-strategy chips with mode (paper/live), state, P&L, drawdown, budget; global controls for selected strategies

### Interactions & Input

- Keyboard shortcuts: global and context-specific (e.g., toggle crosshair, place limit at cursor, switch timeframe)
- Drag & drop: rearrange panes, split/merge, reorder indicators and watchlist
- Slash commands: inline param forms, autocompletion; quick actions from palette and chat
- Strategy management shortcuts: quick switch (Ctrl/Cmd+1..9), focus next/prev strategy, batch actions on selected strategies (/pause, /resume, /flatten)

- Voice input: push-to-talk/mic toggle with VAD indicator; partial transcript preview; retry/cancel controls
- Tool affordances: hover tooltips, ghost/previews for drawings; snapping (OHLC/crosshair)

### Strategy Builder UX

- Canvas: pan/zoom; marquee select; align/snap; minimap; keyboard palette for node search/insert
- Block editing: inspector with typed forms, range sliders; validation with inline errors and fix suggestions
- Diffs & versions: side-by-side DAG diff; change history; comments and approvals inline
- Backtest-in-place: run and overlay results on chart; link out to full report

### Strategy Settings: AI

- Toggle & Modes
  - ai_enabled (off by default), ai_mode: Off | Analyze-only | Propose | Autopilot (scoped whitelist)
  - Twin control: Run Paper Twin (on by default when ai_enabled); Promotion policy: Manual | Canary | Live (live always requires AVC + Confirm; OTP for HIGH)
- Provider/Model Selection
  - Per-strategy overrides for Agentâ†’Model map; choose provider+model from dropdowns with capability tags and cost hints
  - Fallback chain editor (drag to reorder); enable/disable providers per strategy
- Rate Limits & Budgets
  - Presets: 1/2/5/10/100/1000/custom Ã— window (minute/hour/5h/day/week/month)
  - Per-provider/model rpm/tpm; per-day/month spend caps; task-class budgets (risk, proposals, research)
- Autopilot Scope & Guardrails
  - Whitelist actions (e.g., tune param within Â±X%, cut exposure â‰¤Y%, open canary only); thresholds (drawdown/regime/event)
  - Time windows (e.g., cooldown after change), max changes per day, require backtest on twin before propose
- Notifications & Deferrals
  - Show deferrals due to rate/budget with ETA; allow "+retry when available" toggle per task class
- Safety & Audit
  - All live-impacting actions flow through Confirmation Card; OTP when required; correlation_id on every change
- Persistence
  - Save as per-strategy profile; reset to organization defaults; export/import JSON

### Jobs & Approvals UX

- Jobs list: filters (state/range/agent), search; live progress; link to originating command/chat
- Strategy context: filter/group by strategy; correlate jobs to originating strategy; bulk approvals for identical changes across strategies

### Scheduler & Budgets Dashboard

- Meters
  - Per provider/model: rpm/tpm usage (live vs cap), concurrency, error rate; spend today/this month vs caps
- Queues
  - High/Med/Low backlog size, oldest age, ETA to clear at current rate; deferrals by reason (rate/budget)
- Events
  - Active cooldowns, upcoming unblocks (by time window), drops (and rationale), cache hit ratio trends
- Controls
  - Pause/resume provider/model; adjust limits (temporary/perm); reorder fallback chains; retry dropped tasks; nudge priority
- Logs & Tracing
  - Recent routing decisions, fallbacks selected, cost summaries; deep links by correlation_id to jobs and chat
- Alerts
  - Nearing caps, excessive deferrals, SLA misses; notify via in-app/Slash Commands (/notify)

- Job detail: logs stream, artifacts (CSV/JSON), costs; re-run/resume buttons respecting policies
- Approvals: compact list; detail view with diff/impact; approve/reject with notes; audit trail

### Notifications & Errors

- Non-blocking toasts for success/info; sticky banners for warnings; modal only for destructive/critical
- Alert routing: in-app, email/webhook (see Slash Commands â†’ /notify)
- Error ergonomics: plain-language errors with action hints; deep links to logs/health

### Accessibility & Internationalization

- Keyboard navigable: focus states, skip links, mnemonic hints; ARIA roles on complex widgets (charts, tables)
- High-contrast mode and font scaling; dark theme default
- Screen reader labels for chart annotations and order events
- i18n: locale/number/date formatting; right-to-left layout readiness

### Performance UX

- Virtualized lists/tables; incremental chart updates; debounce/throttle noisy UI streams
- Progressive loading states; skeletons for charts/tables; optimistic UI for safe actions (e.g., table filters)
- Keep UI responsive under backtests/ingest surges; background jobs with visible progress
- Multi-strategy performance: subscription multiplexing (shared data streams), batched renders, and throttled updates to keep charts/table FPS stable

### Persistence & Personalization

- Save per-user layouts, hotkeys, indicator/drawing presets, theme
- Per-strategy default layouts and parameter views
- Save multi-strategy workspaces (named sets); pin favorite strategies; default workspace on login; role-based layout presets

- Export/import UI layouts (JSON) for sharing

### First Time User Experience (FTUE)

SymbioteTrader is a powerful, feature-rich platform designed for power users. However, even experienced traders face a learning curve when encountering a new system. The First Time User Experience (FTUE) is designed to guide new users from installation to their first successful strategy execution, building confidence and competence progressively.

#### Onboarding Philosophy

**Progressive Competence Building:**
- Start with immediate success (preset workspace with working example)
- Guide through core workflows step-by-step
- Provide contextual help exactly when needed
- Allow users to skip ahead or revisit at any time
- Never block access to advanced features

**Learn by Doing:**
- Interactive tutorials that guide users through real actions
- Pre-configured examples users can modify and experiment with
- Immediate feedback on actions taken
- Safe sandbox environment (paper trading by default)

#### Preset Workspace (Immediate Success)

**On First Launch:**

When a user opens SymbioteTrader for the first time (after completing the installation wizard), they are greeted with a **pre-configured workspace** that demonstrates the platform's capabilities:

```
Welcome to SymbioteTrader! ðŸŽ‰

We've set up a demo workspace to help you get started:

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Demo Strategy: BTC/USD Mean Reversion (Paper Trading)      â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ Status: ðŸŸ¢ Running (Paper Trading Mode)                     â”‚
â”‚ Performance (Last 7 Days): +2.3% (simulated)               â”‚
â”‚ Current Position: None                                      â”‚
â”‚                                                             â”‚
â”‚ This is a live example strategy running in paper trading   â”‚
â”‚ mode. It's safe to experimentâ€”no real money is at risk.    â”‚
â”‚                                                             â”‚
â”‚ [View Strategy Details] [Modify Parameters] [Start Tour]   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

Getting Started Checklist:
â˜‘ Installation complete
â˜‘ Demo workspace loaded
â˜ Connect your first exchange
â˜ Run your first backtest
â˜ Configure risk guardrails
â˜ Explore AI Strategy Lab

[Start Guided Tour] [Skip Tour, Let Me Explore]
```

**Demo Strategy Details:**

- **Strategy Type**: Mean Reversion (BTC/USD on Binance)
- **Mode**: Paper Trading (no real money)
- **Data**: Uses historical data to simulate live trading
- **Purpose**: Demonstrates strategy execution, performance tracking, and UI features
- **User Actions**: Users can modify parameters, pause/resume, view charts, and see how changes affect performance

#### Interactive Guided Tour

**Tour Structure:**

The guided tour is a step-by-step walkthrough that highlights key features and guides users through essential workflows. Users can pause, skip, or restart the tour at any time.

**Tour Steps:**

**Step 1: Welcome & Overview (30 seconds)**
```
ðŸ‘‹ Welcome to SymbioteTrader!

This tour will guide you through:
â”œâ”€ Connecting your first exchange
â”œâ”€ Understanding the Strategy Control Board
â”œâ”€ Running a backtest
â”œâ”€ Configuring risk guardrails
â””â”€ Exploring AI features

Estimated time: 5 minutes

[Start Tour] [Skip Tour]
```

**Step 2: Strategy Control Board (1 minute)**
```
ðŸ“Š Strategy Control Board

This is your command center. Here you can:
â”œâ”€ View all active strategies
â”œâ”€ Monitor performance in real-time
â”œâ”€ Start/stop strategies
â””â”€ Access strategy settings

[Highlight: Strategy Chip]
Each strategy card shows:
â”œâ”€ Current status (Running/Paused/Stopped)
â”œâ”€ Performance metrics (P&L, Sharpe, Win Rate)
â”œâ”€ Risk indicators (Drawdown, Position Size)
â””â”€ Quick actions (Pause, Settings, Details)

[Next: Connect Exchange] [Skip Tour]
```

**Step 3: Select Asset Classes & Trading Hours (1 minute)**
```
ðŸ“Š Select Asset Classes & Trading Hours

SymbioteTrader supports multiple asset classes. Let's configure which ones you want to trade:

Asset Classes:
â˜‘ Cryptocurrency (CEX) - 24/7 trading
â˜ Stocks & ETFs - Market hours only
â˜ Forex - 24/5 trading
â˜ Futures - Extended hours
â˜ Options - Market hours only

Trading Hours Preference:
â—‰ Regular Trading Hours (RTH) only
â—‹ Include Pre-Market & After-Hours
â—‹ 24/7 (Crypto only)

Note: You can enable more asset classes later in Settings.

[Save Preferences] [Skip This Step] [Exit Tour]
```

**Step 4: Connect Your First Exchange/Broker (2 minutes)**
```
ðŸ”— Connect Your First Exchange/Broker

SymbioteTrader connects to your existing accounts via API.
You maintain complete custodyâ€”we never hold your funds.

For Crypto:
1. Click "Add Exchange" in the top-right
2. Select your exchange (e.g., Binance, Coinbase, Bybit)
3. Enter your API key and secret (read-only recommended for first connection)
4. Test connection
5. Select which markets to track

For Stocks/ETFs:
1. Click "Add Broker"
2. Select your broker (e.g., Alpaca, Interactive Brokers)
3. Enter API credentials
4. Test connection

[Open Exchange Settings] [Skip This Step] [Exit Tour]
```

**Step 5: Paper Trading vs Live Trading (1 minute)**
```
ðŸ§ª Paper Trading vs Live Trading

SymbioteTrader has two trading modes:

Paper Trading (Simulated):
â”œâ”€ Uses real market data
â”œâ”€ Simulates order execution
â”œâ”€ No real money at risk
â””â”€ Perfect for testing strategies

Live Trading (Real Money):
â”œâ”€ Executes real orders on exchanges
â”œâ”€ Requires exchange connection
â”œâ”€ Subject to risk guardrails
â””â”€ Requires explicit approval

Recommendation: Start with paper trading until you're confident.

[Continue with Paper Trading] [Skip This Step] [Exit Tour]
```

**Step 6: Run Your First Backtest (1 minute)**
```
ðŸ“ˆ Run Your First Backtest

Backtesting lets you test strategies on historical data before risking real money.

Let's backtest the demo Mean Reversion strategy:
1. Click "Backtest" on the demo strategy card
2. Select date range (default: last 90 days)
3. Click "Run Backtest"
4. View results (P&L, Sharpe, drawdown, trade history)

[Highlight: Backtest Button]
[Run Demo Backtest] [Skip This Step] [Exit Tour]
```

**Step 7: Configure Risk Guardrails (1 minute)**
```
ðŸ›¡ï¸ Configure Risk Guardrails

Risk management is critical. SymbioteTrader provides multiple layers of protection:

Global Risk Settings:
â”œâ”€ Max Position Size: 5% of portfolio (default)
â”œâ”€ Stop Loss: 3% (default)
â”œâ”€ Max Drawdown: 10% (circuit breaker)
â””â”€ Max Open Positions: 3 (default)

You can override these per-strategy for granular control.

[Open Risk Settings] [Skip This Step] [Exit Tour]
```

**Step 8: Explore AI Features (1 minute)**
```
ðŸ¤– Explore AI Features

SymbioteTrader's AI can help you:
â”œâ”€ Generate strategy ideas
â”œâ”€ Analyze market conditions
â”œâ”€ Optimize strategy parameters
â””â”€ Provide performance insights

Try asking the AI:
"What's the current market regime for BTC?"
"How is my Mean Reversion strategy performing?"
"Suggest optimizations for my strategy"

[Open AI Chat] [Skip This Step] [Finish Tour]
```

**Tour Completion:**
```
ðŸŽ‰ Tour Complete!

You've learned the basics of SymbioteTrader:
âœ“ Strategy Control Board
âœ“ Connecting exchanges
âœ“ Running backtests
âœ“ Configuring risk guardrails
âœ“ Using AI features

Next Steps:
â”œâ”€ Connect your real exchange account
â”œâ”€ Create your first custom strategy
â”œâ”€ Explore the AI Strategy Lab
â””â”€ Join the community (Discord/Forum)

[View Getting Started Checklist] [Explore on My Own]
```

#### Getting Started Checklist

**In-App Progress Tracker:**

The Getting Started Checklist is always accessible from the main navigation and tracks user progress through essential onboarding tasks:

```
Getting Started Checklist (5/13 Complete)

Essential Setup:
âœ“ Installation complete
âœ“ Demo workspace loaded
âœ“ Completed guided tour
âœ“ Selected asset classes & trading hours
âœ“ Connected first exchange/broker
â˜ Set up first paper trading strategy
â˜ Run first backtest
â˜ Review first backtest results
â˜ Configure risk guardrails
â˜ Create custom strategy

Advanced Features:
â˜ Explore AI Strategy Lab
â˜ Set up Market Intelligence alerts
â˜ Configure AI permissions

[View Next Step] [Mark All Complete] [Reset Checklist]
```

**Checklist Features:**

1. **Persistent**: Progress saved across sessions
2. **Contextual**: Clicking a task navigates to the relevant section
3. **Optional**: Users can dismiss or hide the checklist
4. **Expandable**: Each task has a "Learn More" link with detailed instructions
5. **Celebratory**: Completion triggers a congratulatory message and unlocks "Advanced User" badge

### Settings & Configuration System

SymbioteTrader implements a comprehensive, tiered settings system that provides power users with absolute granular control while remaining accessible to new users through progressive disclosure. This system is the fourth pillar of the "tiered everything" philosophy (alongside tiered deployment profiles, tiered permission modes, and tiered risk governance).

#### Core Philosophy

**Power-User First:**
- Granular control over every parameter as a rule, not an exception
- Never hide options to make things "easier" - provide progressive disclosure instead
- Settings are features, not afterthoughts
- Users should be able to configure anything, anywhere, at any level

**Tiered Hierarchy:**
- Global Settings (app-wide defaults)
- Feature Settings (per-feature/strategy-type defaults)
- Element Settings (per-element/strategy-instance overrides)
- Clear inheritance: Element > Feature > Global (most specific wins)

**Context Switching:**
- Modular settings profiles for rapid context switching
- Mix and match profile types (AI Profile + Risk Profile + UI Profile)
- One-click switch from "conservative live trading" to "aggressive backtesting"

#### Settings Hierarchy & Inheritance

**Three-Tier Architecture:**

```
Global Settings (App-Wide)
â”œâ”€ Theme, notifications, API keys, database connections
â”œâ”€ Default AI mode, default risk limits
â”œâ”€ Global feature toggles
â””â”€ System-wide behavior

Feature Settings (Per-Feature/Strategy-Type)
â”œâ”€ Strategy-type defaults (Mean Reversion, Trend Following, etc.)
â”œâ”€ AI mode for this feature
â”œâ”€ Risk limits for this strategy type
â”œâ”€ Feature-specific behavior
â””â”€ Overrides global defaults

Element Settings (Per-Element/Strategy-Instance)
â”œâ”€ This specific strategy's parameters
â”œâ”€ This specific alert's conditions
â”œâ”€ This specific widget's display options
â””â”€ Overrides feature and global defaults
```

**Inheritance Rules:**

1. **Precedence**: Element > Feature > Global (most specific wins)
2. **Explicit Overrides**: User must explicitly override (not automatic)
3. **Visual Indicators**: Clear badges showing override status
4. **Inheritance Chain**: Hover to see full inheritance path

**Example Inheritance:**

```
Strategy: Mean Reversion BTC (Element)
â”œâ”€ AI Mode: ðŸŸ¢ Permissive (Element override)
â”‚   â””â”€ Overrides: Feature default (ðŸŸ¡ Supervised)
â”‚   â””â”€ Overrides: Global default (ðŸ”µ Interactive)
â”œâ”€ Max Position Size: 5% (Feature default)
â”‚   â””â”€ Using: Mean Reversion strategy type default
â”‚   â””â”€ Not overridden at element level
â”œâ”€ Stop Loss: 3% (Global default)
    â””â”€ Using: App-wide default
    â””â”€ Not overridden at feature or element level
```

**Visual Indicators:**

- **Normal text**: Using default (no override)
- **Blue badge "Feature Override"**: Overridden at feature level
- **Orange badge "Custom"**: Overridden at element level
- **Hover tooltip**: Shows full inheritance chain and values at each level

#### Settings Profiles System

**Modular Profile Architecture:**

Instead of monolithic "all settings" profiles, SymbioteTrader uses modular profiles that can be mixed and matched:

```
Active Configuration:
â”œâ”€ AI Profile: "Aggressive Optimization"
â”œâ”€ Risk Profile: "Conservative"
â”œâ”€ UI Profile: "Minimal Distractions"
â””â”€ Trading Profile: "Crypto Futures"
```

**Profile Types:**

1. **AI Profile**
   - AI permission mode (Interactive/Supervised/Permissive)
   - Optimization constraints and safeguards
   - Auto-approval thresholds
   - AI cost budgets and limits

2. **Risk Profile**
   - Position size limits
   - Stop-loss defaults
   - Max drawdown thresholds
   - Leverage limits
   - Circuit breaker settings

3. **UI Profile**
   - Theme and color scheme
   - Layout preferences
   - Notification frequency
   - Chart defaults
   - Widget visibility

4. **Trading Profile**
   - Default exchanges and markets
   - Order types and execution preferences
   - Slippage tolerance
   - Fee assumptions
   - Asset class preferences

**Presets vs User Profiles:**

- **Presets**: Read-only templates shipped with app
  - "Conservative" (Interactive AI, tight risk limits, all notifications)
  - "Balanced" (Supervised AI, moderate risk, normal notifications)
  - "Aggressive" (Permissive AI, looser risk, critical notifications only)
  - Users can base custom profiles on presets

- **User Profiles**: User-created and modified
  - Can be based on presets or created from scratch
  - Fully customizable
  - Can be exported/imported/shared
  - Versioned and tracked

**Profile Workflow:**

1. **Start with Preset**: User selects "Balanced" preset
2. **Modify Settings**: User changes AI mode to Permissive
3. **Modified Indicator**: App shows "Balanced (modified)" with unsaved changes indicator
4. **Save Options**:
   - "Save Changes to Profile" (update Balanced preset copy)
   - "Save as New Profile" (create "My Aggressive Setup")
   - "Revert to Profile" (discard changes)

**Profile Switching with Diff View:**

When switching profiles, show what will change:

```
Switch to "Aggressive Optimization" profile?

Changes Preview:
â”œâ”€ AI Mode: Interactive â†’ Permissive
â”œâ”€ Max Position Size: 2% â†’ 5%
â”œâ”€ Stop Loss: 5% â†’ 3%
â”œâ”€ Notification Frequency: All â†’ Critical Only
â””â”€ Auto-Approval Threshold: None â†’ <20% parameter changes

Affected Strategies: 3 strategies will inherit new settings
â”œâ”€ Mean Reversion BTC (will change to Permissive mode)
â”œâ”€ Trend Following ETH (will change to Permissive mode)
â””â”€ Grid Bot BTC (no changes - has element overrides)

[Preview Details] [Apply Changes] [Cancel]
```

#### Easy/Advanced Mode (Progressive Disclosure)

**Philosophy:**

Power users want access to every setting, but new users can be overwhelmed. Easy/Advanced mode provides progressive disclosure without limiting functionality.

**Mode Behavior:**

- **Easy Mode (Default for New Users)**:
  - Show 20% of settings that cover 80% of use cases
  - Collapse advanced sections with "Show Advanced" expander
  - Provide helpful tooltips and explanations
  - Suggest recommended values
  - Hide technical/expert-only settings

- **Advanced Mode (Default for Experienced Users)**:
  - Show all settings (100% visibility)
  - Expand all sections by default
  - Show technical details and constraints
  - Display raw values alongside formatted values
  - Show performance implications and warnings

**Per-Category Preference:**

Users can set Easy/Advanced mode per settings category:

```
Settings Categories:
â”œâ”€ General: Easy Mode
â”œâ”€ AI: Advanced Mode (user wants full control)
â”œâ”€ Strategies: Advanced Mode
â”œâ”€ Risk: Easy Mode (using defaults)
â”œâ”€ Trading: Advanced Mode
â”œâ”€ UI: Easy Mode
â””â”€ Data: Easy Mode
```

**Toggle Location:**

- Top-right of settings page: [Easy âšª Advanced] toggle
- Per-category toggle in category header
- App remembers preference per category
- Global "Show All Advanced" option in settings

**Example: Easy vs Advanced View**

Easy Mode:
```
AI Permissions
â”œâ”€ Mode: ðŸŸ¡ Supervised
â”œâ”€ Allow small optimizations: â˜‘ Yes
â””â”€ Require approval for large changes: â˜‘ Yes

[Show Advanced Settings â–¼]
```

Advanced Mode:
```
AI Permissions
â”œâ”€ Mode: ðŸŸ¡ Supervised
â”œâ”€ Small Change Threshold: 20% (parameter change)
â”œâ”€ Auto-Apply Small Changes: â˜‘ Enabled
â”œâ”€ Large Change Threshold: >20% (parameter change)
â”œâ”€ Require Approval for Large Changes: â˜‘ Enabled
â”œâ”€ Notification Delay: 5 minutes (before auto-apply)
â”œâ”€ Max Auto-Changes Per Day: 3
â”œâ”€ Max Changes Per Strategy Per Week: 1
â”œâ”€ Pause AI on Portfolio Drawdown: >10%
â””â”€ Auto-Disable on Anomalies: â˜‘ Enabled

[Hide Advanced Settings â–²]
```

#### Settings UI Patterns

**Main Settings Page Layout:**

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Settings                    [Easy âšª Advanced]  [Search ðŸ”] â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚             â”‚ Active Profiles:                              â”‚
â”‚ Categories  â”‚ â”œâ”€ AI: Aggressive Optimization                â”‚
â”‚             â”‚ â”œâ”€ Risk: Conservative                         â”‚
â”‚ General     â”‚ â”œâ”€ UI: Minimal Distractions                   â”‚
â”‚ AI          â”‚ â””â”€ Trading: Crypto Futures                    â”‚
â”‚ Strategies  â”‚                                                â”‚
â”‚ Risk        â”‚ [Manage Profiles]                             â”‚
â”‚ Trading     â”‚                                                â”‚
â”‚ UI          â”‚ â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚ Data        â”‚ â”‚ AI Permissions                          â”‚   â”‚
â”‚ Profiles    â”‚ â”‚                                         â”‚   â”‚
â”‚             â”‚ â”‚ Mode: ðŸŸ¡ Supervised                     â”‚   â”‚
â”‚ Recently    â”‚ â”‚ [Change Mode]                           â”‚   â”‚
â”‚ Changed     â”‚ â”‚                                         â”‚   â”‚
â”‚             â”‚ â”‚ Allowed Actions:                        â”‚   â”‚
â”‚             â”‚ â”‚ â˜‘ Optimize strategy parameters          â”‚   â”‚
â”‚             â”‚ â”‚ â˜‘ Run backtests                         â”‚   â”‚
â”‚             â”‚ â”‚ â˜‘ Run paper trades                      â”‚   â”‚
â”‚             â”‚ â”‚ â˜‘ Adjust position sizes (within limits) â”‚   â”‚
â”‚             â”‚ â”‚                                         â”‚   â”‚
â”‚             â”‚ â”‚ [Show Advanced Settings â–¼]              â”‚   â”‚
â”‚             â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â”‚             â”‚                                                â”‚
â”‚             â”‚ [Save Changes] [Reset to Defaults]            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Key Features:**

1. **Left Sidebar**: Category navigation with icons
2. **Top Bar**: Profile selector, Easy/Advanced toggle, search
3. **Main Panel**: Settings for selected category
4. **Breadcrumb**: Settings > AI > Permissions > Supervised Mode
5. **Recently Changed**: Quick access to recently modified settings
6. **Unsaved Changes Indicator**: Yellow dot on categories with unsaved changes

**Feature Settings (On Feature Pages):**

Feature pages (e.g., Strategy Control Board, specific strategy type page) include a settings section:

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Mean Reversion Strategies                          [âš™ï¸ Settings]â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ Strategy-Wide Settings:                                     â”‚
â”‚                                                             â”‚
â”‚ AI Permissions:                                             â”‚
â”‚ â”œâ”€ Mode: ðŸŸ¡ Supervised                                      â”‚
â”‚ â”‚   â””â”€ Overrides: Global (ðŸ”µ Interactive)                  â”‚
â”‚ â”‚                                                           â”‚
â”‚ Risk Settings:                                              â”‚
â”‚ â”œâ”€ Max Position Size: 5%                                    â”‚
â”‚ â”‚   â””â”€ Using: Feature default                              â”‚
â”‚ â”œâ”€ Stop Loss: 3%                                            â”‚
â”‚ â”‚   â””â”€ Using: Global default                               â”‚
â”‚ â”‚                                                           â”‚
â”‚ Optimization:                                               â”‚
â”‚ â””â”€ Auto-Optimize: â˜‘ Enabled (when Sharpe improves >15%)    â”‚
â”‚                                                             â”‚
â”‚ [Apply to All Mean Reversion] [Reset to Global Defaults]   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Element Settings Modal:**

Clicking the gear icon on an individual element (strategy card, alert, widget) opens a modal:

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Strategy Settings: Mean Reversion BTC                    [Ã—]â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ â˜ Use feature defaults (uncheck to customize)              â”‚
â”‚                                                             â”‚
â”‚ AI Permissions:                                             â”‚
â”‚ â”œâ”€ Mode: ðŸŸ¢ Permissive (custom for this strategy)          â”‚
â”‚ â”‚   â””â”€ Overrides: Feature (ðŸŸ¡ Supervised)                  â”‚
â”‚ â”‚   â””â”€ Overrides: Global (ðŸ”µ Interactive)                  â”‚
â”‚ â”‚   [Change Mode] [Revert to Feature Default]             â”‚
â”‚ â”‚                                                           â”‚
â”‚ Risk Settings:                                              â”‚
â”‚ â”œâ”€ Max Position Size: 3% (custom)                          â”‚
â”‚ â”‚   â””â”€ Overrides: Feature default (5%)                     â”‚
â”‚ â”‚   [Revert to Feature Default]                            â”‚
â”‚ â”œâ”€ Stop Loss: 3% (using global default)                    â”‚
â”‚ â”‚   â””â”€ No override                                          â”‚
â”‚ â”‚                                                           â”‚
â”‚ Strategy Parameters:                                        â”‚
â”‚ â”œâ”€ Entry Threshold: 2.0Ïƒ                                    â”‚
â”‚ â”œâ”€ Exit Threshold: 0.5Ïƒ                                     â”‚
â”‚ â””â”€ Lookback Period: 20 bars                                 â”‚
â”‚                                                             â”‚
â”‚ [Apply] [Apply to All BTC Strategies] [Reset to Defaults]  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Key Features:**

1. **"Use feature defaults" checkbox**: Quick way to inherit all feature settings
2. **Override indicators**: Clear visual indication of what's overridden
3. **Revert buttons**: Per-setting revert to parent default
4. **Apply to similar**: Bulk apply to similar elements (e.g., all BTC strategies)
5. **Reset to defaults**: Nuclear option to clear all overrides

#### Settings Search & Navigation

**Global Settings Search:**

With hundreds of settings across three tiers, powerful search is essential:

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Settings                                      [Search ðŸ”]    â”‚
â”‚ Search: "stop loss"                                         â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ Found 8 results across 3 categories:                        â”‚
â”‚                                                             â”‚
â”‚ Risk > Global Settings                                      â”‚
â”‚ â”œâ”€ Default Stop Loss: 3%                                    â”‚
â”‚ â”‚   â””â”€ Applied to all strategies unless overridden         â”‚
â”‚ â”‚                                                           â”‚
â”‚ Risk > Mean Reversion Strategies                            â”‚
â”‚ â”œâ”€ Stop Loss: 5% (feature override)                        â”‚
â”‚ â”‚   â””â”€ Overrides global default (3%)                       â”‚
â”‚ â”‚                                                           â”‚
â”‚ Strategies > Mean Reversion BTC                             â”‚
â”‚ â”œâ”€ Stop Loss: 2% (element override)                        â”‚
â”‚ â”‚   â””â”€ Overrides feature (5%) and global (3%)             â”‚
â”‚ â”‚                                                           â”‚
â”‚ [View All Results] [Clear Search]                          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Search Features:**

1. **Fuzzy Search**: Matches partial terms, typos, synonyms
2. **Category Filtering**: Filter results by category (AI, Risk, Trading, etc.)
3. **Hierarchy Display**: Shows where each setting lives in the hierarchy
4. **Override Indication**: Highlights overridden settings in results
5. **Jump to Setting**: Click result to navigate directly to that setting
6. **Search History**: Recent searches saved for quick access

**Navigation Features:**

1. **Breadcrumb Trail**: Settings > AI > Permissions > Supervised Mode
2. **Category Sidebar**: Quick jump to any category
3. **Recently Changed**: Dedicated section showing last 10 modified settings
4. **Favorites**: Star frequently accessed settings for quick access
5. **Keyboard Navigation**: Arrow keys, Tab, Enter for power users

**Recently Changed Settings:**

```
Recently Changed (Last 7 Days):
â”œâ”€ AI Mode: Interactive â†’ Supervised (2 days ago)
â”œâ”€ Max Position Size: 2% â†’ 3% (3 days ago)
â”œâ”€ Notification Frequency: All â†’ Critical Only (5 days ago)
â””â”€ Theme: Light â†’ Dark (7 days ago)

[View Full History] [Undo Last Change]
```

#### Import/Export & Validation

**Profile Export:**

Users can export profiles as JSON for sharing with community:

```json
{
  "profile_type": "ai",
  "profile_name": "Aggressive Optimization",
  "version": "1.0.0",
  "created_at": "2024-10-18T12:00:00Z",
  "settings": {
    "ai_mode": "permissive",
    "optimization_constraints": {
      "max_parameter_change": 0.20,
      "max_position_size_change": 0.10,
      "min_backtest_period_days": 90,
      "min_paper_trade_period_days": 7,
      "min_sharpe_improvement": 0.15,
      "max_drawdown": 0.05
    },
    "safeguards": {
      "notification_delay_minutes": 60,
      "max_auto_changes_per_day": 3,
      "max_changes_per_strategy_per_week": 1,
      "pause_on_portfolio_drawdown": 0.10
    }
  }
}
```

**Profile Import with Validation:**

When importing a profile, the system validates:

1. **Schema Validation**: Ensure JSON structure is correct
2. **Version Compatibility**: Check if profile version matches app version
3. **Value Ranges**: Validate all values are within acceptable ranges
4. **Safety Checks**: Warn about risky settings (e.g., no stop-loss, high leverage)
5. **Dependency Checks**: Ensure required features are enabled

**Import Flow:**

```
Import Profile: "Aggressive Optimization"

Validation Results:
âœ“ Schema valid
âœ“ Version compatible (1.0.0)
âœ“ All values within acceptable ranges
âš ï¸ Warning: This profile uses Permissive AI mode
âš ï¸ Warning: Max position size (10%) exceeds recommended (5%)
âš ï¸ Warning: No stop-loss configured

Safety Recommendations:
â”œâ”€ Consider starting with Supervised mode
â”œâ”€ Reduce max position size to 5%
â””â”€ Configure stop-loss at 3-5%

[Import Anyway] [Import with Recommendations] [Cancel]
```

**Sharing & Community:**

- Export profiles to share with community
- Import profiles from trusted sources
- Profile marketplace (future): Browse and download community profiles
- Rating and reviews for shared profiles
- Safety badges: "Verified Safe", "High Risk", "Experimental"

#### Settings Sync & History

**Settings History (Undo/Redo):**

Every settings change is tracked with full history:

```
Settings History:
â”œâ”€ 2024-10-18 14:30 - Changed AI Mode: Supervised â†’ Permissive
â”œâ”€ 2024-10-18 14:25 - Changed Max Position Size: 3% â†’ 5%
â”œâ”€ 2024-10-17 09:15 - Changed Stop Loss: 5% â†’ 3%
â”œâ”€ 2024-10-16 16:45 - Changed Theme: Light â†’ Dark
â””â”€ 2024-10-15 11:20 - Changed Notification Frequency: All â†’ Critical

[Undo Last Change] [Redo] [Rollback to Date...] [Export History]
```

**Rollback to Previous State:**

```
Rollback Settings to Previous State

Select a point in time to restore:
â—‹ 2024-10-18 14:25 (Before AI Mode change)
â—‹ 2024-10-17 09:15 (Before Position Size change)
â—‹ 2024-10-16 16:45 (Before Stop Loss change)
â— 2024-10-15 11:20 (Before Theme change)

Preview Changes:
â”œâ”€ AI Mode: Permissive â†’ Supervised
â”œâ”€ Max Position Size: 5% â†’ 3%
â”œâ”€ Stop Loss: 3% â†’ 5%
â””â”€ Theme: Dark â†’ Light

[Rollback] [Cancel]
```

**Optional Cloud Sync:**

For users who want settings synced across devices:

```
Settings Sync (Optional)
â”œâ”€ Status: â˜‘ Enabled
â”œâ”€ Last Sync: 2 minutes ago
â”œâ”€ Synced Devices: 2 (Desktop, Laptop)
â””â”€ Sync Scope:
    â”œâ”€ â˜‘ Global Settings
    â”œâ”€ â˜‘ Profiles
    â”œâ”€ â˜‘ UI Preferences
    â”œâ”€ â˜ API Keys (security: keep local)
    â””â”€ â˜ Exchange Credentials (security: keep local)

[Configure Sync] [Force Sync Now] [Disable Sync]
```

**Key Features:**

1. **End-to-End Encryption**: Settings encrypted before cloud sync
2. **Selective Sync**: Choose what to sync (exclude sensitive data)
3. **Conflict Resolution**: If settings differ across devices, user chooses which to keep
4. **Offline Support**: Changes queued and synced when online
5. **Sync History**: View sync log and resolve conflicts

**Settings Backup:**

```
Automatic Backups:
â”œâ”€ Frequency: Daily at 2:00 AM
â”œâ”€ Retention: Last 30 days
â”œâ”€ Location: ~/.symbiotetrader/backups/
â””â”€ Last Backup: 2024-10-18 02:00 (Success)

Manual Backup:
[Backup Now] [Restore from Backup...] [Configure Backup]
```

#### Settings Categories Reference

**Complete list of settings categories:**

1. **General**
   - Application behavior, startup options, update preferences
   - Language, timezone, date/time formats
   - Logging level, debug options

2. **AI**
   - Permission modes (Interactive/Supervised/Permissive)
   - Optimization constraints and safeguards
   - AI cost budgets and limits
   - Model selection and provider preferences

3. **Strategies**
   - Strategy-type defaults (Mean Reversion, Trend Following, etc.)
   - Default parameters per strategy family
   - Backtesting and paper trading defaults
   - Strategy ranking weights

4. **Risk**
   - Position size limits
   - Stop-loss and take-profit defaults
   - Max drawdown thresholds
   - Leverage limits
   - Circuit breaker settings

5. **Trading**
   - **Asset Class Selection** (enable/disable specific asset classes)
     - Cryptocurrency (CEX): Spot, Perpetuals, Futures
     - Cryptocurrency (DEX): Hyperliquid, dYdX, GMX, etc.
     - Stocks & ETFs: US Stocks, US ETFs, International
     - Forex: Major Pairs, Minor Pairs, Exotic Pairs
     - Futures: Micro Futures (MES, MNQ, M2K, MGC), Standard Futures
     - Options: Equity Options, Index Options (requires approval level)
   - **Default Exchanges/Brokers per Asset Class**
     - Crypto CEX: Binance, Coinbase, Bybit, etc.
     - Crypto DEX: Hyperliquid, dYdX, GMX
     - Stocks/ETFs: IBKR, Alpaca
     - Forex: OANDA, IBKR
     - Futures: IBKR
     - Options: IBKR, Alpaca
   - Order types and execution preferences
   - Slippage tolerance
   - Fee assumptions
   - Session preferences (RTH, pre-market, after-hours)

6. **UI**
   - Theme and color scheme
   - Layout preferences
   - Chart defaults
   - Widget visibility
   - Hotkey customization

7. **Data & Data Management**
   - Database connections
   - Data retention policies
   - Market data sources
   - Sentiment data sources
   - API rate limits
   - **Data Lifecycle Management** (see detailed section below)

8. **Notifications**
   - Notification frequency and channels
   - Alert thresholds
   - Email/SMS/Webhook configuration
   - Do Not Disturb schedules

9. **Security**
   - API key management
   - Exchange credential storage
   - Two-factor authentication
   - Session timeout
   - Audit log retention

10. **Advanced**
    - Performance tuning
    - Cache settings
    - Network configuration
    - Debug and diagnostics
    - Experimental features

#### Asset Class Selection & Configuration

**Philosophy:** SymbioteTrader is a multi-asset platform supporting cryptocurrency, stocks, ETFs, forex, futures, and options. Users should be able to enable/disable specific asset classes based on their trading focus, reducing cognitive load and UI clutter.

**Location:** Settings â†’ Trading â†’ Asset Classes

**UI Mockup:**

```
Settings â†’ Trading â†’ Asset Classes

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Asset Class Selection                                       â”‚
â”‚                                                             â”‚
â”‚ Enable the asset classes you want to trade. Disabled       â”‚
â”‚ asset classes will be hidden from all UI and strategies    â”‚
â”‚ targeting them will be auto-paused.                        â”‚
â”‚                                                             â”‚
â”‚ â˜‘ Cryptocurrency (CEX)                                     â”‚
â”‚   â”œâ”€ â˜‘ Spot Trading                                        â”‚
â”‚   â”œâ”€ â˜‘ Perpetual Futures                                   â”‚
â”‚   â””â”€ â˜‘ Quarterly/Monthly Futures                           â”‚
â”‚   Default Exchanges: [Binance â–¼] [Coinbase â–¼] [+ Add]     â”‚
â”‚                                                             â”‚
â”‚ â˜‘ Cryptocurrency (DEX)                                     â”‚
â”‚   â”œâ”€ â˜‘ Hyperliquid (CCXT supported)                        â”‚
â”‚   â”œâ”€ â˜‘ dYdX v4 (Native API)                                â”‚
â”‚   â”œâ”€ â˜ GMX (Requires Web3 wallet)                          â”‚
â”‚   â””â”€ â˜ Jupiter (Solana, requires wallet)                   â”‚
â”‚   âš ï¸ DEX trading requires wallet connection                â”‚
â”‚                                                             â”‚
â”‚ â˜‘ Stocks & ETFs                                            â”‚
â”‚   â”œâ”€ â˜‘ US Stocks (11,000+ symbols)                         â”‚
â”‚   â”œâ”€ â˜‘ US ETFs (SPY, QQQ, sector ETFs)                     â”‚
â”‚   â””â”€ â˜ International Stocks (Requires IBKR)                â”‚
â”‚   Default Brokers: [IBKR â–¼] [Alpaca â–¼] [+ Add]            â”‚
â”‚   âš ï¸ Requires broker account and API keys                  â”‚
â”‚                                                             â”‚
â”‚ â˜‘ Forex                                                    â”‚
â”‚   â”œâ”€ â˜‘ Major Pairs (EUR/USD, GBP/USD, USD/JPY, etc.)       â”‚
â”‚   â”œâ”€ â˜ Minor Pairs (EUR/GBP, AUD/NZD, etc.)                â”‚
â”‚   â””â”€ â˜ Exotic Pairs (USD/TRY, USD/ZAR, etc.)               â”‚
â”‚   Default Brokers: [OANDA â–¼] [IBKR â–¼] [+ Add]             â”‚
â”‚   âš ï¸ US leverage limited to 50:1 (majors), 20:1 (minors)   â”‚
â”‚                                                             â”‚
â”‚ â˜ Futures                                                  â”‚
â”‚   â”œâ”€ â˜ Micro Futures (MES, MNQ, M2K, MGC)                  â”‚
â”‚   â””â”€ â˜ Standard Futures (ES, NQ, RTY, CL, GC)              â”‚
â”‚   Default Broker: [IBKR â–¼]                                 â”‚
â”‚   âš ï¸ Requires futures trading approval                     â”‚
â”‚                                                             â”‚
â”‚ â˜ Options                                                  â”‚
â”‚   â”œâ”€ â˜ Equity Options (Requires Level 1+ approval)         â”‚
â”‚   â”œâ”€ â˜ Index Options (Requires Level 2+ approval)          â”‚
â”‚   â””â”€ â˜ Futures Options (Requires Level 3+ approval)        â”‚
â”‚   Default Brokers: [IBKR â–¼] [Alpaca â–¼]                    â”‚
â”‚   âš ï¸ Requires broker options approval (Level 1-4)          â”‚
â”‚                                                             â”‚
â”‚ [Save Changes] [Reset to Defaults] [Import Config]         â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

Session Preferences (Per Asset Class):
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Stocks & ETFs:                                              â”‚
â”‚   â˜‘ Regular Trading Hours (9:30 AM - 4:00 PM ET)           â”‚
â”‚   â˜‘ Pre-Market (4:00 AM - 9:30 AM ET)                      â”‚
â”‚   â˜‘ After-Hours (4:00 PM - 8:00 PM ET)                     â”‚
â”‚                                                             â”‚
â”‚ Forex:                                                      â”‚
â”‚   â˜‘ All Sessions (24/5)                                    â”‚
â”‚   Preferred Session: [London/New York Overlap â–¼]           â”‚
â”‚                                                             â”‚
â”‚ Futures:                                                    â”‚
â”‚   â˜‘ CME Globex (Nearly 24/5)                               â”‚
â”‚   â˜ Pit Hours Only (9:30 AM - 4:15 PM ET)                  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

[Save All Settings]
```

**Behavior:**

1. **Disabled Asset Classes:**
   - Hidden from all UI (watchlists, strategy builder, portfolio view)
   - Strategies targeting disabled asset classes are auto-paused
   - Market data subscriptions for disabled asset classes are cancelled
   - Reduces cognitive load and UI clutter

2. **First-Time Setup:**
   - During onboarding, users select their primary asset classes
   - Default: Cryptocurrency (CEX) enabled, all others disabled
   - Users can enable more asset classes later in Settings

3. **Warnings & Requirements:**
   - DEX trading requires wallet connection (MetaMask, WalletConnect)
   - Stocks/ETFs require broker account and API keys
   - Futures require futures trading approval from broker
   - Options require options approval level (1-4) from broker
   - Forex leverage limits vary by jurisdiction (US: 50:1 majors, 20:1 minors)

4. **Default Exchanges/Brokers:**
   - Users can set default exchanges/brokers per asset class
   - Multiple exchanges/brokers can be enabled simultaneously
   - Strategies can override defaults on a per-strategy basis

5. **Session Preferences:**
   - Stocks/ETFs: Choose RTH, pre-market, after-hours
   - Forex: Choose preferred session (London/NY overlap for highest liquidity)
   - Futures: Choose Globex (24/5) or pit hours only

**Impact on UI:**

- **Watchlist Widget:** Only shows enabled asset classes, with asset class filter dropdown
- **Strategy Builder:** Asset class selector in Step 1 (only shows enabled classes)
- **Portfolio View:** Groups by asset class, only shows enabled classes
- **Strategy Control Board:** Asset class badge on each strategy chip
- **Symbol Search:** Only searches enabled asset classes

**Migration:**

- Existing users: All asset classes enabled by default (no disruption)
- New users: Only Cryptocurrency (CEX) enabled by default
- Strategies without asset_class field: Default to "crypto_cex"

---

#### Data Management UI (User-Facing Data Control)

Power users generate massive amounts of data: tick data, backtest results, AI artifacts, logs, and more. SymbioteTrader provides comprehensive tools for users to understand, manage, and control their data lifecycle.

**Philosophy:**

- **Transparency**: Users should always know what data exists, how much space it uses, and where it's stored
- **Control**: Users should be able to set retention policies, manually prune data, and export for external analysis
- **Provenance**: Users should be able to trace any trade back to the specific signal/strategy/AI decision that triggered it
- **Safety**: Deletion operations should be reversible (soft delete with grace period) or require explicit confirmation

##### Data Lifecycle Management Dashboard

**Storage Overview:**

```
Data Management Dashboard

Total Storage Used: 487 GB / 1 TB (48.7%)

Storage by Category:
â”œâ”€ Market Data (Ticks): 245 GB (50.3%)
â”‚   â”œâ”€ QuestDB (Hot): 45 GB (last 30 days)
â”‚   â””â”€ ClickHouse (Cold): 200 GB (historical)
â”œâ”€ Backtest Results: 128 GB (26.3%)
â”‚   â”œâ”€ Backtest artifacts: 95 GB
â”‚   â””â”€ Optimization runs: 33 GB
â”œâ”€ AI Artifacts: 67 GB (13.8%)
â”‚   â”œâ”€ Generated strategies: 12 GB
â”‚   â”œâ”€ RAG embeddings: 35 GB
â”‚   â””â”€ AI memory (Neo4j): 20 GB
â”œâ”€ Logs & Audit Trail: 32 GB (6.6%)
â”‚   â”œâ”€ Application logs: 18 GB
â”‚   â””â”€ Audit logs: 14 GB
â””â”€ Other: 15 GB (3.0%)
    â”œâ”€ User layouts: 2 GB
    â””â”€ Settings backups: 13 GB

[View Detailed Breakdown] [Configure Retention] [Export Data]
```

**Storage Alerts:**

```
âš ï¸ Storage Alerts:

â”œâ”€ Market Data: Approaching retention limit (245 GB / 250 GB)
â”‚   â””â”€ Recommendation: Archive data older than 90 days to cold storage
â”‚
â””â”€ Backtest Results: Growing rapidly (+15 GB in last 7 days)
    â””â”€ Recommendation: Set retention policy to delete results older than 180 days

[Configure Retention Policies] [Dismiss Alerts]
```

##### User-Defined Retention Policies

**Retention Policy Configuration:**

Users can set automatic retention policies for each data category:

```
Retention Policies

Market Data (Ticks):
â”œâ”€ Hot Storage (QuestDB): Keep last 30 days
â”œâ”€ Cold Storage (ClickHouse): Keep last 2 years
â”œâ”€ Archive: Move to external storage after 2 years
â””â”€ Delete: Never (user preference)

Backtest Results:
â”œâ”€ Keep: Last 180 days
â”œâ”€ Archive: 180-365 days (compress and move to cold storage)
â””â”€ Delete: After 365 days

AI Artifacts:
â”œâ”€ Generated Strategies: Keep all (user preference)
â”œâ”€ RAG Embeddings: Keep all (required for AI features)
â””â”€ AI Memory: Keep last 1 year

Logs & Audit Trail:
â”œâ”€ Application Logs: Keep last 90 days
â”œâ”€ Audit Logs: Keep last 2 years (compliance requirement)
â””â”€ Delete: After retention period

[Save Policies] [Reset to Defaults] [Preview Impact]
```

**Preview Impact:**

Before applying retention policies, users can preview the impact:

```
Retention Policy Impact Preview

If applied, these policies will:
â”œâ”€ Delete 45 GB of backtest results (older than 180 days)
â”œâ”€ Archive 78 GB of market data (180-365 days old)
â”œâ”€ Delete 12 GB of application logs (older than 90 days)
â””â”€ Total space freed: 57 GB (45 GB deleted + 12 GB logs)

Affected Data:
â”œâ”€ 1,247 backtest runs will be deleted
â”œâ”€ 89 days of historical tick data will be archived
â””â”€ 90 days of application logs will be deleted

âš ï¸ Warning: Deletion is permanent after 30-day grace period

[Apply Policies] [Adjust Settings] [Cancel]
```

##### Manual Data Pruning

**Selective Data Deletion:**

Users can manually delete specific data categories or date ranges:

```
Manual Data Pruning

Select data to delete:

Market Data:
â˜ Delete ticks older than: [Date Picker: 2023-01-01]
â˜ Delete specific symbols: [Multi-select: BTC/USD, ETH/USD, ...]

Backtest Results:
â˜ Delete backtests older than: [Date Picker: 2023-06-01]
â˜ Delete backtests for specific strategies: [Multi-select: ...]
â˜ Delete failed backtests only

AI Artifacts:
â˜ Delete unused generated strategies (not deployed)
â˜ Delete AI memory older than: [Date Picker: 2023-01-01]

Logs:
â˜ Delete application logs older than: [Date Picker: 2024-01-01]
â˜ Delete debug logs only

Estimated space to be freed: 23 GB

[Preview Deletion] [Delete Now] [Cancel]
```

**Soft Delete with Grace Period:**

```
Deletion Scheduled

The following data has been marked for deletion:
â”œâ”€ 23 GB of backtest results (older than 2023-06-01)
â”œâ”€ 12 GB of application logs (older than 2024-01-01)
â””â”€ Total: 35 GB

Grace Period: 30 days (until 2024-11-18)

During the grace period:
â”œâ”€ Data is hidden from UI but not deleted
â”œâ”€ You can restore deleted data at any time
â””â”€ After 30 days, data is permanently deleted

[Restore Deleted Data] [Delete Immediately] [View Deleted Data]
```

##### Data Provenance & Traceability

**Trade Provenance:**

Every trade can be traced back to its origin:

```
Trade Provenance: Trade #12345

Trade Details:
â”œâ”€ Symbol: BTC/USD
â”œâ”€ Side: Long
â”œâ”€ Entry: $42,150
â”œâ”€ Exit: $43,200
â”œâ”€ P&L: +$1,050 (+2.49%)
â””â”€ Executed: 2024-10-18 14:30:00 UTC

Provenance Chain:
â”œâ”€ Strategy: Mean Reversion BTC (strategy_id: 789)
â”‚   â””â”€ Created: 2024-09-15 by user
â”‚   â””â”€ Last Modified: 2024-10-10 by AI (optimization)
â”‚
â”œâ”€ Signal: Entry signal triggered at 14:29:45 UTC
â”‚   â”œâ”€ Indicator: RSI(14) = 28.3 (oversold)
â”‚   â”œâ”€ Condition: RSI < 30 AND price < BB_lower
â”‚   â””â”€ Data Source: Binance WebSocket (tick_id: 9876543)
â”‚
â”œâ”€ Risk Check: Passed all guardrails
â”‚   â”œâ”€ Position Size: 2.5% (within 5% limit)
â”‚   â”œâ”€ Stop Loss: 3% (configured)
â”‚   â””â”€ Max Drawdown: 4.2% (within 10% limit)
â”‚
â””â”€ Execution: Order placed via Binance API
    â”œâ”€ Order ID: 123456789
    â”œâ”€ Fill Price: $42,150 (slippage: 0.02%)
    â””â”€ Execution Time: 1.2s

[View Full Details] [Export Provenance] [Replay Signal]
```

**Signal Provenance for Custom Sources:**

For custom signal sources (webhooks, external APIs), provenance includes:

```
Custom Signal Provenance

Signal ID: signal_98765
â”œâ”€ Source: TradingView Webhook
â”œâ”€ Received: 2024-10-18 14:29:45 UTC
â”œâ”€ Payload: {"symbol": "BTC/USD", "action": "buy", "price": 42150}
â”œâ”€ Validation: Passed (schema valid, signature verified)
â”œâ”€ Strategy: Triggered "Mean Reversion BTC" strategy
â””â”€ Trade: Resulted in Trade #12345

[View Raw Payload] [View Validation Log] [Replay Signal]
```

##### Data Export & External Analysis

**Export Options:**

Users can export data for external analysis:

```
Data Export

Select data to export:

â˜‘ Market Data (Ticks)
  â”œâ”€ Format: CSV, Parquet, JSON
  â”œâ”€ Date Range: [2024-01-01] to [2024-10-18]
  â””â”€ Symbols: [All] or [Select specific]

â˜‘ Backtest Results
  â”œâ”€ Format: CSV, JSON
  â”œâ”€ Include: Trades, metrics, equity curve
  â””â”€ Strategies: [All] or [Select specific]

â˜‘ Trade History
  â”œâ”€ Format: CSV, JSON
  â”œâ”€ Include: Provenance data
  â””â”€ Date Range: [2024-01-01] to [2024-10-18]

â˜ AI Artifacts
  â”œâ”€ Generated strategies (JSON)
  â””â”€ AI memory graph (GraphML)

Estimated export size: 2.3 GB
Export destination: [Local file] or [Cloud storage]

[Export Now] [Schedule Export] [Cancel]
```

**Scheduled Exports:**

```
Scheduled Data Exports

Active Schedules:
â”œâ”€ Daily Trade History Export
â”‚   â”œâ”€ Frequency: Daily at 2:00 AM
â”‚   â”œâ”€ Destination: AWS S3 bucket
â”‚   â””â”€ Last Export: 2024-10-18 02:00 (Success)
â”‚
â””â”€ Weekly Backtest Results Export
    â”œâ”€ Frequency: Weekly on Sunday at 3:00 AM
    â”œâ”€ Destination: Local file (/exports/)
    â””â”€ Last Export: 2024-10-13 03:00 (Success)

[Add New Schedule] [Edit Schedule] [View Export History]
```

### Theming & Branding

- Consistent spacing, grid, and typography scale; tokenized colors; dark/light themes
- Visual states for risk (e.g., red for drawdown alerts) and venues (badges)

### Multipane + Draw Tools (Micro-spec)

- Hotkeys (chart context)
  - Crosshair toggle: C; Reset zoom: X; Zoom: + / -; Pan: click+drag; Fit: Shift+X
  - Draw tools: D trendline, R ray, H horizontal line, V vertical line, F fib retracement, B rectangle
  - Edit: Esc cancel current; Delete delete selection; Cmd/Ctrl+Z undo; Cmd/Ctrl+Shift+Z redo
  - Constrain & snap: Shift snap-to (OHLC/crosshair/time increments); Alt constrain angles (0/45/90Â°)
  - Selection: Click to select; Shift-click multi-select; Drag on empty space for marquee; Enter toggles edit handles
- Snapping rules
  - Magnet: Off | Weak (3â€“5 px) | Strong (8â€“12 px); configurable in toolbar
  - Targets: nearest OHLC of visible bars, crosshair time/price, drawn anchors, whole/round ticks
  - Time snapping respects exchange session/timeframe boundaries; price snapping respects tick size
- Selection/lock/hide behaviors
  - Selection priority: active edits > hovered drawing > series > pane
  - Lock: object cannot move/edit; remains selectable; shows lock icon; persisted in layout
  - Hide: object not rendered and excluded from hit-test; persisted
  - Z-order: newest on top; bring-to-front/send-back via context menu or [ / ]
- Templates & styling
  - Save drawing templates (color/width/style/labels); set default per tool; apply template to selection
  - Fib settings: levels, colors, labels on/off; snap to highs/lows option
- Persistence & cross-timeframe
  - Drawings anchor to time (timestamp) with price; visible across panes sharing the symbol; per-strategy visibility toggle
  - Option: limit drawing visibility to current timeframe or higher/lower timeframes

### Hotkeys Catalog

- Global
  - Command palette: Cmd/Ctrl+K; Slash command focus: /
  - Switch strategy tab: Cmd/Ctrl+1..9; Next/Prev tab: Cmd/Ctrl+Tab / Cmd/Ctrl+Shift+Tab
  - Voice PTT: Space (hold-to-talk when PTT enabled); Help overlay: ?
  - Open Preferences: Cmd/Ctrl+,; Toggle Theme: Cmd/Ctrl+Alt+T
- Chart context
  - Crosshair C; Reset zoom X; Zoom + / -; Pan click+drag; Fit Shift+X
  - Timeframe quick switch: 1=1m, 5=5m, 6=1h, D=1d (configurable mapping)
  - Draw: D trendline, R ray, H horizontal, V vertical, F fib, B rectangle
  - Edit: Esc cancel; Delete delete; Cmd/Ctrl+Z undo; Cmd/Ctrl+Shift+Z redo
  - Snap/Constrain: Shift snap; Alt constrain angles; G toggle magnet strength
  - Pane ops: Cmd/Ctrl+Up/Down move series between panes; P add/remove pane; L toggle layout lock
- Order entry
  - Focus order entry: O; Submit: Enter; Confirm destructive: Cmd/Ctrl+Enter
  - Adjust price: ArrowUp/Down (tick); Qty: Shift+ArrowUp/Down; Toggle type: M market/L limit
  - Flags: Alt+R reduce_only; Alt+P post_only; TIF: Alt+T cycle GTC/IOC/FOK
- Strategy management
  - Start/Resume selected: Cmd/Ctrl+Alt+S; Pause selected: Cmd/Ctrl+Alt+P; Flatten selected: Cmd/Ctrl+Alt+F
  - Open terminal for selected: Cmd/Ctrl+Enter; Open logs: Cmd/Ctrl+L
- Builder canvas
  - Insert node: N; Search/palette: Cmd/Ctrl+K; Connect: drag from port; Duplicate: Cmd/Ctrl+D
  - Align: Shift+A; Group: G; Ungroup: Shift+G; Auto-layout: Cmd/Ctrl+Shift+L
  - Undo/Redo: Cmd/Ctrl+Z / Cmd/Ctrl+Shift+Z; Delete selection: Delete

### Layout JSON schema (outline)

```json
{
  "version": 1,
  "user_id": "...",
  "updated_at": "2025-01-01T00:00:00Z",
  "workspaces": [
    {
      "id": "default",
      "name": "Main",
      "strategies": ["STRAT_A", "STRAT_B"],
      "panes": [
        {
          "id": "pane-1",
          "height": 0.6,
          "series": [
            { "symbol": "BTCUSDT", "tf": "1m", "type": "candles", "indicators": [
              { "id": "ema", "params": {"len": 50}, "style": {"color": "#..."} }
            ]}
          ]
        },
        {
          "id": "pane-2",
          "height": 0.4,
          "series": [ { "type": "histogram", "source": "volume" } ]
        }
      ],
      "drawings": [ { "tool": "trendline", "from": {"ts": 1700000000, "price": 40000}, "to": {"ts": 1700003600, "price": 42000}, "locked": false, "hidden": false } ],
      "links": { "time": ["pane-1", "pane-2"], "crosshair": ["pane-1", "pane-2"] },
      "settings": { "magnet": "weak", "theme": "dark", "locale": "en-US" }
    }
  ],
  "hotkeys": { "overrides": { "chart.draw.trendline": "D" } },
  "templates": { "draw.trendline": { "color": "#..", "width": 2 } }
}
```

### Strategy Control Board (Widget Spec)

- Columns
  - Rank (currentâ€‘fit score), Confidence, Regime, Strategy (name, tags), Mode (paper/live), State (running/paused), P&L, P&L%, Drawdown, Budget used, Open orders, Risk alerts, Latency, Last trade, Actions
- Interactions
  - Sorting by any column; multi-select rows; filters (mode/state/tags/regime/topâ€‘N/asset), search by name; toggle personalization on/off
  - Inline controls per row: Start, Pause/Resume, Flatten, Promote, Logs, Open Terminal
  - Batch actions on selected: Start, Pause, Flatten, Apply risk profile, Adjust AI/trade budgets
  - Tooltips: hover to see recent KPIs and top alerts; click to drill into terminal or reports
- Status & visuals
  - Row color accents reflect state (paused, alert) and recent P&L trend (sparkline)
  - Sticky header with aggregate P&L and risk summary for current selection

### Strategy Chip (Visual Spec)

- Content: name, mode (paper/live), state (running/paused), small P&L spark, Regime badge, quick menu (â€¦)
- States
  - Paper: neutral/blue; beaker icon
  - Live: green; rocket/play icon
  - Running: green ring/pulsing dot accent
  - Paused: amber/yellow; pause icon
  - Alert: red badge with count; red border on chip
- Accessibility: color + icon + text together; high-contrast palette; ARIA labels for mode/state
- Sizes: compact (list/grids) and regular (terminal header); responsive truncation with tooltip

Notes

- This section specifies UI/UX at a catalog level; see Frontend â†’ Charting and Slash Commands for deeper modality-specific catalogs.

- Optional: Speech-to-Text service (faster-whisper) for voice input fallback

- Optional: Service mesh (e.g., Istio)

### Reference Stack & Dependencies

See the authoritative sections for stacks and dependencies:

- Backend and Frontend: Application Architecture
- AI & Orchestration: AI Integration
- Data stores: Data Architecture & Stores


### Accessibility (WCAG 2.1 AA Compliance)

**Keyboard Navigation:**
- All interactive elements accessible via keyboard
- Logical tab order
- Focus indicators visible
- Skip to main content link
- Keyboard shortcuts (customizable)

**Screen Reader Support:**
- Semantic HTML (proper heading hierarchy)
- ARIA labels for interactive elements
- ARIA live regions for dynamic content
- Alt text for images
- Table headers for data tables

**Color Contrast:**
- Minimum contrast ratio: 4.5:1 for normal text
- Minimum contrast ratio: 3:1 for large text
- Color not sole indicator of information

**Text Sizing:**
- Support browser zoom up to 200%
- Relative units (rem, em) instead of px
- Minimum font size: 14px

**Focus Management:**
- Visible focus indicators
- Focus trap in modals
- Return focus after modal close
- Skip navigation links

**Accessibility Testing:**
- Automated testing: axe-core, Lighthouse
- Manual testing: Screen reader testing (NVDA, JAWS, VoiceOver)
- Keyboard-only navigation testing
- Color contrast testing

**Voice Control:**
- Voice commands for common actions
- Voice-to-text for chat input
- Configurable wake word


### Internationalization (i18n)

**Supported Languages:**
- English (en-US, en-GB)
- Spanish (es-ES, es-MX)
- French (fr-FR)
- German (de-DE)
- Italian (it-IT)
- Portuguese (pt-BR, pt-PT)
- Russian (ru-RU)
- Chinese Simplified (zh-CN)
- Chinese Traditional (zh-TW)
- Japanese (ja-JP)
- Korean (ko-KR)

**Translation Management:**
- JSON translation files
- Crowdin integration for community translations
- Context-aware translations
- Pluralization support
- Date/time formatting per locale

**Currency Conversion:**
- Display values in user's preferred currency
- Real-time exchange rates
- Support for: USD, EUR, GBP, JPY, CNY, KRW, BRL, RUB

**Timezone Handling:**
- Display times in user's timezone
- Support for all IANA timezones
- Trading hours adjusted per timezone
- Session times (RTH, pre-market, after-hours) per timezone


### Mobile & Responsive (Future)

**Native Mobile Apps:**
- iOS app (Swift/SwiftUI)
- Android app (Kotlin/Jetpack Compose)
- Feature parity with web (where applicable)
- Push notifications
- Biometric authentication (Face ID, Touch ID, fingerprint)

**Progressive Web App (PWA):**
- Installable on mobile devices
- Offline support (limited)
- Push notifications
- App-like experience

**Mobile-Specific UI Adaptations:**
- Bottom navigation bar
- Swipe gestures (swipe to delete, swipe to refresh)
- Pull-to-refresh
- Collapsible sections
- Mobile-optimized charts (touch-friendly)

**Touch Gestures:**
- Pinch to zoom (charts)
- Two-finger pan (charts)
- Long press for context menu
- Swipe left/right to navigate
- Pull down to refresh

**Mobile Performance Optimization:**
- Reduced bundle size (<1MB)
- Lazy loading
- Image optimization
- Reduced API calls
- Offline caching

**Offline Support:**
- View cached strategies
- View cached backtests
- View cached positions/orders
- Queue actions for sync when online


---

## PART 4: TECHNICAL IMPLEMENTATION

### 13. API Specifications

### REST API Specification

#### API Design Principles

- **RESTful**: Resource-oriented URLs, HTTP verbs, standard status codes
- **Versioned**: `/api/v1/` prefix; major version in URL path
- **Consistent**: Standardized request/response formats, error handling, pagination
- **Idempotent**: POST operations use idempotency keys; safe retries
- **Documented**: OpenAPI 3.0 specification; auto-generated client SDKs
- **Secure**: JWT authentication; API key support; rate limiting; CORS

#### Base URL Structure

```
Production:  https://api.symbiotetrader.com/api/v1
Development: http://localhost:8000/api/v1
```

#### Authentication

**JWT Bearer Token (Primary)**
```http
Authorization: Bearer <jwt_token>
```

**API Key (Alternative)**
```http
X-API-Key: <api_key>
```

**Session Cookie (Web UI)**
```http
Cookie: session=<session_id>
```

#### Standard Request Headers

```http
Content-Type: application/json
Accept: application/json
X-Request-ID: <uuid>              # Optional: client-provided correlation ID
X-Idempotency-Key: <uuid>         # Required for POST/PUT operations
```

#### Standard Response Format

**Success Response**
```json
{
  "data": { /* resource or array */ },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-10-18T12:34:56.789Z",
    "version": "v1"
  }
}
```

**Paginated Response**
```json
{
  "data": [ /* array of resources */ ],
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-10-18T12:34:56.789Z",
    "version": "v1"
  },
  "pagination": {
    "cursor": "eyJpZCI6MTIzNDU2fQ==",
    "has_more": true,
    "total_count": 1234,
    "limit": 50
  }
}
```

**Error Response**
```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance to place order",
    "details": {
      "required": "1000.00 USDT",
      "available": "500.00 USDT",
      "symbol": "BTC/USDT"
    },
    "retryable": false,
    "retry_after": null,
    "documentation_url": "https://docs.symbiotetrader.com/errors/INSUFFICIENT_BALANCE"
  },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-10-18T12:34:56.789Z",
    "version": "v1"
  }
}
```

#### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST (resource created) |
| 202 | Accepted | Async operation queued |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid request format/parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource conflict (duplicate, state mismatch) |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 502 | Bad Gateway | Upstream service error (exchange API) |
| 503 | Service Unavailable | Service temporarily unavailable |
| 504 | Gateway Timeout | Upstream service timeout |

#### Pagination

**Cursor-Based Pagination (Preferred)**
```http
GET /api/v1/strategies?cursor=eyJpZCI6MTIzNDU2fQ==&limit=50
```

**Query Parameters:**
- `cursor` (string, optional): Opaque cursor for next page
- `limit` (integer, optional): Items per page (default: 50, max: 100)

**Response includes:**
- `pagination.cursor`: Cursor for next page (null if last page)
- `pagination.has_more`: Boolean indicating more pages
- `pagination.total_count`: Total items (optional, expensive to compute)

#### Filtering and Sorting

**Filtering**
```http
GET /api/v1/strategies?status=live&symbol=BTC/USDT&created_after=2025-01-01T00:00:00Z
```

**Sorting**
```http
GET /api/v1/strategies?sort=-created_at,name
```
- Prefix with `-` for descending order
- Multiple fields comma-separated

**Field Selection (Sparse Fieldsets)**
```http
GET /api/v1/strategies?fields=id,name,status,performance.total_pnl
```

#### Rate Limiting

**Rate Limit Headers**
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1634567890
Retry-After: 60
```

**Rate Limits by Tier**
| Tier | Requests/Minute | Burst |
|------|-----------------|-------|
| Free | 60 | 10 |
| Pro | 600 | 50 |
| Enterprise | 6000 | 200 |

**Rate Limit Exceeded Response (429)**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after 60 seconds.",
    "retryable": true,
    "retry_after": 60
  }
}
```

#### API Endpoint Catalog

**Authentication & Users**
```
POST   /api/v1/auth/register          # Register new user
POST   /api/v1/auth/login             # Login (returns JWT)
POST   /api/v1/auth/logout            # Logout (invalidate token)
POST   /api/v1/auth/refresh           # Refresh JWT token
POST   /api/v1/auth/forgot-password   # Request password reset
POST   /api/v1/auth/reset-password    # Reset password with token

GET    /api/v1/users/me               # Get current user profile
PATCH  /api/v1/users/me               # Update current user profile
DELETE /api/v1/users/me               # Delete account (GDPR)

GET    /api/v1/users/me/api-keys      # List API keys
POST   /api/v1/users/me/api-keys      # Create API key
DELETE /api/v1/users/me/api-keys/:id  # Revoke API key
```

**Exchange Connections**
```
GET    /api/v1/exchanges              # List supported exchanges
GET    /api/v1/exchanges/:id          # Get exchange details (capabilities)

GET    /api/v1/connections            # List user's exchange connections
POST   /api/v1/connections            # Add exchange connection
GET    /api/v1/connections/:id        # Get connection details
PATCH  /api/v1/connections/:id        # Update connection (rotate keys)
DELETE /api/v1/connections/:id        # Remove connection
POST   /api/v1/connections/:id/test   # Test connection

GET    /api/v1/connections/:id/balance        # Get account balance
GET    /api/v1/connections/:id/positions      # Get open positions
GET    /api/v1/connections/:id/orders         # Get orders (open/history)
```

**Strategies**
```
GET    /api/v1/strategies             # List strategies (paginated, filterable)
                                       # Query params: ?status=active|paused|stopped
                                       #               ?asset_class=CRYPTO_CEX|STOCK|ETF|FOREX|FUTURES|OPTIONS
                                       #               ?venue=binance|alpaca|ibkr|oanda
                                       #               ?regime=bull|bear|sideways|high_vol|low_vol
                                       #               ?symbol=BTCUSDT|AAPL|SPY
                                       #               ?strategy_type=mean_reversion|trend_following|arbitrage
                                       #               ?min_sharpe=1.5
                                       #               ?sort_by=rank|pnl|sharpe|created_at
                                       #               ?limit=50&cursor=xyz
POST   /api/v1/strategies             # Create strategy
GET    /api/v1/strategies/:id         # Get strategy details
PATCH  /api/v1/strategies/:id         # Update strategy
DELETE /api/v1/strategies/:id         # Delete strategy

POST   /api/v1/strategies/:id/clone   # Clone strategy
POST   /api/v1/strategies/:id/export  # Export strategy (JSON/YAML)
POST   /api/v1/strategies/import      # Import strategy

GET    /api/v1/strategies/:id/versions        # List strategy versions
POST   /api/v1/strategies/:id/versions        # Create new version
GET    /api/v1/strategies/:id/versions/:ver   # Get specific version

POST   /api/v1/strategies/:id/validate        # Validate strategy definition
POST   /api/v1/strategies/:id/compile         # Compile visual â†’ Python
```

**Backtesting**
```
GET    /api/v1/backtests              # List backtests
                                       # Query params: ?strategy_id=xyz
                                       #               ?asset_class=CRYPTO_CEX|STOCK|ETF|FOREX|FUTURES|OPTIONS
                                       #               ?venue=binance|alpaca|ibkr
                                       #               ?symbol=BTCUSDT|AAPL
                                       #               ?status=pending|running|completed|failed
                                       #               ?date_from=2024-01-01&date_to=2024-12-31
                                       #               ?sort_by=sharpe|pnl|created_at
                                       #               ?limit=50&cursor=xyz
POST   /api/v1/backtests              # Create backtest
GET    /api/v1/backtests/:id          # Get backtest details
DELETE /api/v1/backtests/:id          # Delete backtest

POST   /api/v1/backtests/:id/start    # Start backtest
POST   /api/v1/backtests/:id/cancel   # Cancel running backtest

GET    /api/v1/backtests/:id/results  # Get backtest results
GET    /api/v1/backtests/:id/trades   # Get backtest trades
GET    /api/v1/backtests/:id/metrics  # Get performance metrics
GET    /api/v1/backtests/:id/equity-curve  # Get equity curve data

POST   /api/v1/backtests/:id/compare  # Compare with other backtests
GET    /api/v1/backtests/:id/overfitting-report  # Get overfitting analysis
```

**Paper Trading**
```
GET    /api/v1/paper-sessions         # List paper trading sessions
POST   /api/v1/paper-sessions         # Create paper session
GET    /api/v1/paper-sessions/:id     # Get session details
DELETE /api/v1/paper-sessions/:id     # Delete session

POST   /api/v1/paper-sessions/:id/start   # Start paper trading
POST   /api/v1/paper-sessions/:id/pause   # Pause paper trading
POST   /api/v1/paper-sessions/:id/stop    # Stop paper trading
POST   /api/v1/paper-sessions/:id/reset   # Reset paper account

GET    /api/v1/paper-sessions/:id/performance  # Get performance metrics
GET    /api/v1/paper-sessions/:id/trades      # Get paper trades
GET    /api/v1/paper-sessions/:id/orders      # Get paper orders
GET    /api/v1/paper-sessions/:id/positions   # Get paper positions
```

**Live Trading**
```
GET    /api/v1/live-sessions          # List live trading sessions
POST   /api/v1/live-sessions          # Create live session (requires approval)
GET    /api/v1/live-sessions/:id      # Get session details
DELETE /api/v1/live-sessions/:id      # Delete session

POST   /api/v1/live-sessions/:id/start    # Start live trading
POST   /api/v1/live-sessions/:id/pause    # Pause live trading
POST   /api/v1/live-sessions/:id/stop     # Stop live trading
POST   /api/v1/live-sessions/:id/emergency-stop  # Emergency stop (flatten all)

GET    /api/v1/live-sessions/:id/performance  # Get performance metrics
GET    /api/v1/live-sessions/:id/trades      # Get live trades
GET    /api/v1/live-sessions/:id/orders      # Get live orders
GET    /api/v1/live-sessions/:id/positions   # Get live positions
```

**Orders**
```
GET    /api/v1/orders                 # List orders (all sessions)
                                       # Query params: ?status=open|filled|cancelled|rejected
                                       #               ?asset_class=CRYPTO_CEX|STOCK|ETF|FOREX|FUTURES|OPTIONS
                                       #               ?venue=binance|alpaca|ibkr
                                       #               ?symbol=BTCUSDT|AAPL
                                       #               ?strategy_id=xyz
                                       #               ?session_id=xyz
                                       #               ?side=buy|sell
                                       #               ?order_type=market|limit|stop|stop_limit
                                       #               ?date_from=2024-01-01&date_to=2024-12-31
                                       #               ?limit=100&cursor=xyz
POST   /api/v1/orders                 # Place order (manual)
GET    /api/v1/orders/:id             # Get order details
PATCH  /api/v1/orders/:id             # Modify order
DELETE /api/v1/orders/:id             # Cancel order

POST   /api/v1/orders/batch           # Batch order placement
DELETE /api/v1/orders/batch           # Batch order cancellation
```

**Trades**
```
GET    /api/v1/trades                 # List trades (paginated, filterable)
                                       # Query params: ?asset_class=CRYPTO_CEX|STOCK|ETF|FOREX|FUTURES|OPTIONS
                                       #               ?venue=binance|alpaca|ibkr
                                       #               ?symbol=BTCUSDT|AAPL
                                       #               ?strategy_id=xyz
                                       #               ?session_id=xyz
                                       #               ?side=buy|sell
                                       #               ?date_from=2024-01-01&date_to=2024-12-31
                                       #               ?min_pnl=-1000&max_pnl=5000
                                       #               ?sort_by=pnl|timestamp|symbol
                                       #               ?limit=100&cursor=xyz
GET    /api/v1/trades/:id             # Get trade details
PATCH  /api/v1/trades/:id             # Update trade (add notes/tags)

GET    /api/v1/trades/stats           # Get trade statistics
                                       # Query params: ?asset_class=CRYPTO_CEX|STOCK
                                       #               ?venue=binance|alpaca
                                       #               ?strategy_id=xyz
                                       #               ?date_from=2024-01-01&date_to=2024-12-31
POST   /api/v1/trades/export          # Export trades (CSV/JSON)
```

**Market Data**
```
GET    /api/v1/markets                # List available markets
GET    /api/v1/markets/:symbol        # Get market details

GET    /api/v1/markets/:symbol/ticker # Get current ticker
GET    /api/v1/markets/:symbol/orderbook  # Get order book snapshot
GET    /api/v1/markets/:symbol/trades     # Get recent trades
GET    /api/v1/markets/:symbol/ohlcv      # Get OHLCV candles

GET    /api/v1/markets/:symbol/indicators # Get calculated indicators
```

**AI & Intelligence**
```
GET    /api/v1/ai/chat                # List chat sessions
POST   /api/v1/ai/chat                # Create chat session
GET    /api/v1/ai/chat/:id            # Get chat history
POST   /api/v1/ai/chat/:id/message    # Send message
DELETE /api/v1/ai/chat/:id            # Delete chat session

POST   /api/v1/ai/analyze-strategy    # Analyze strategy with AI
POST   /api/v1/ai/suggest-improvements # Get AI suggestions
POST   /api/v1/ai/explain-trade       # Explain trade decision
POST   /api/v1/ai/generate-strategy   # Generate strategy from description

GET    /api/v1/ai/insights            # Get AI-generated insights
GET    /api/v1/ai/insights/:id        # Get specific insight
POST   /api/v1/ai/insights/:id/feedback  # Provide feedback on insight
```

**Strategy Ranking & Recommendation**
```
GET    /api/v1/strategy-ranking       # Get ranked strategies
                                       # Query params: ?asset_class=CRYPTO_CEX|STOCK
                                       #               ?venue=binance|alpaca
                                       #               ?regime=bull|bear|sideways
                                       #               ?min_sharpe=1.5
                                       #               ?limit=20
POST   /api/v1/strategy-ranking/refresh  # Force refresh rankings
GET    /api/v1/strategy-ranking/weights  # Get current ranking weights
PATCH  /api/v1/strategy-ranking/weights  # Update ranking weights
GET    /api/v1/strategy-ranking/history  # Get ranking history
```

**Market Intelligence**
```
GET    /api/v1/market-intelligence    # Get market intelligence summary
                                       # Query params: ?asset_class=CRYPTO_CEX|STOCK
                                       #               ?symbol=BTCUSDT|AAPL
GET    /api/v1/market-intelligence/regime  # Get current market regime
GET    /api/v1/market-intelligence/sentiment  # Get market sentiment
GET    /api/v1/market-intelligence/correlations  # Get asset correlations
GET    /api/v1/market-intelligence/volatility  # Get volatility analysis
GET    /api/v1/market-intelligence/funding-rates  # Get funding rates (crypto perps)
```

**Signal Hub**
```
GET    /api/v1/signals                # List signals
                                       # Query params: ?asset_class=CRYPTO_CEX|STOCK
                                       #               ?venue=binance|alpaca
                                       #               ?symbol=BTCUSDT|AAPL
                                       #               ?strategy_id=xyz
                                       #               ?signal_type=entry|exit|scale_in|scale_out
                                       #               ?status=pending|executed|cancelled|expired
                                       #               ?limit=50&cursor=xyz
GET    /api/v1/signals/:id            # Get signal details
POST   /api/v1/signals/:id/execute    # Manually execute signal
POST   /api/v1/signals/:id/cancel     # Cancel signal
```

**Risk Management**
```
GET    /api/v1/risk/rules             # List risk rules
POST   /api/v1/risk/rules             # Create risk rule
GET    /api/v1/risk/rules/:id         # Get rule details
PATCH  /api/v1/risk/rules/:id         # Update rule
DELETE /api/v1/risk/rules/:id         # Delete rule

GET    /api/v1/risk/breaches          # List risk breaches
GET    /api/v1/risk/breaches/:id      # Get breach details

GET    /api/v1/risk/portfolio         # Get portfolio risk metrics
GET    /api/v1/risk/exposure          # Get exposure analysis
```

**Approvals & Jobs**
```
GET    /api/v1/approvals              # List pending approvals
GET    /api/v1/approvals/:id          # Get approval details
POST   /api/v1/approvals/:id/approve  # Approve request
POST   /api/v1/approvals/:id/reject   # Reject request

GET    /api/v1/jobs                   # List jobs (backtests, optimizations)
                                       # Query params: ?type=backtest|optimization|export|import
                                       #               ?status=pending|running|completed|failed|cancelled
                                       #               ?strategy_id=xyz
                                       #               ?date_from=2024-01-01&date_to=2024-12-31
                                       #               ?sort_by=created_at|priority|status
                                       #               ?limit=50&cursor=xyz
GET    /api/v1/jobs/:id               # Get job details
GET    /api/v1/jobs/:id/logs          # Get job logs
POST   /api/v1/jobs/:id/cancel        # Cancel job
POST   /api/v1/jobs/:id/retry         # Retry failed job
PATCH  /api/v1/jobs/:id/priority      # Change job priority
POST   /api/v1/jobs/:id/schedule      # Schedule job for later
GET    /api/v1/jobs/:id/dependencies  # Get job dependencies
```

**Notifications**
```
GET    /api/v1/notifications          # List notifications
GET    /api/v1/notifications/:id      # Get notification details
PATCH  /api/v1/notifications/:id      # Mark as read
DELETE /api/v1/notifications/:id      # Delete notification
POST   /api/v1/notifications/mark-all-read  # Mark all as read
```

**Settings & Preferences**
```
GET    /api/v1/settings               # Get all settings
PATCH  /api/v1/settings               # Update settings
POST   /api/v1/settings/reset         # Reset to defaults

GET    /api/v1/settings/profiles      # List settings profiles
POST   /api/v1/settings/profiles      # Create profile
GET    /api/v1/settings/profiles/:id  # Get profile
PATCH  /api/v1/settings/profiles/:id  # Update profile
DELETE /api/v1/settings/profiles/:id  # Delete profile
POST   /api/v1/settings/profiles/:id/apply  # Apply profile
```

**System & Health**
```
GET    /api/v1/health                 # Health check
GET    /api/v1/health/detailed        # Detailed health (all components)
GET    /api/v1/version                # API version info
GET    /api/v1/status                 # System status
```

#### Error Code Catalog

Complete list of error codes with descriptions and retry behavior:

**Authentication Errors (AUTH_*)**
```typescript
AUTH_INVALID_CREDENTIALS      // Invalid username/password
AUTH_INVALID_TOKEN            // JWT token invalid or malformed
AUTH_EXPIRED_TOKEN            // JWT token expired
AUTH_INVALID_API_KEY          // API key invalid or revoked
AUTH_INSUFFICIENT_PERMISSIONS // User lacks required permissions
AUTH_ACCOUNT_LOCKED           // Account locked due to security
AUTH_EMAIL_NOT_VERIFIED       // Email verification required
```

**Trading Errors (TRADE_*)**
```typescript
TRADE_INSUFFICIENT_BALANCE    // Insufficient balance for order
TRADE_INVALID_SYMBOL          // Symbol not found or not supported
TRADE_INVALID_ORDER_TYPE      // Order type not supported
TRADE_INVALID_SIDE            // Invalid order side (buy/sell)
TRADE_INVALID_QUANTITY        // Quantity below minimum or invalid
TRADE_INVALID_PRICE           // Price outside allowed range
TRADE_ORDER_SIZE_TOO_SMALL    // Order size below minimum notional
TRADE_ORDER_SIZE_TOO_LARGE    // Order size exceeds maximum
TRADE_MARKET_CLOSED           // Market is closed
TRADE_POSITION_LIMIT_EXCEEDED // Position limit exceeded
TRADE_ORDER_NOT_FOUND         // Order ID not found
TRADE_ORDER_ALREADY_FILLED    // Cannot modify filled order
TRADE_ORDER_ALREADY_CANCELLED // Cannot cancel already cancelled order
TRADE_DUPLICATE_ORDER         // Duplicate order (idempotency)
```

**Exchange Errors (EXCHANGE_*)**
```typescript
EXCHANGE_UNAVAILABLE          // Exchange API unavailable
EXCHANGE_TIMEOUT              // Exchange API timeout
EXCHANGE_RATE_LIMIT           // Exchange rate limit exceeded
EXCHANGE_INVALID_API_KEY      // Exchange API key invalid
EXCHANGE_INSUFFICIENT_PERMISSIONS // API key lacks permissions
EXCHANGE_MAINTENANCE          // Exchange under maintenance
EXCHANGE_UNKNOWN_ERROR        // Unknown exchange error
```

**Strategy Errors (STRATEGY_*)**
```typescript
STRATEGY_NOT_FOUND            // Strategy ID not found
STRATEGY_INVALID_STATE        // Invalid state transition
STRATEGY_VALIDATION_FAILED    // Strategy validation failed
STRATEGY_COMPILATION_FAILED   // Strategy compilation failed
STRATEGY_ALREADY_RUNNING      // Strategy already running
STRATEGY_NOT_RUNNING          // Strategy not running
STRATEGY_DUPLICATE_NAME       // Strategy name already exists
```

**Risk Errors (RISK_*)**
```typescript
RISK_LIMIT_EXCEEDED           // Risk limit exceeded
RISK_DRAWDOWN_LIMIT           // Drawdown limit exceeded
RISK_POSITION_SIZE_LIMIT      // Position size limit exceeded
RISK_EXPOSURE_LIMIT           // Exposure limit exceeded
RISK_DAILY_LOSS_LIMIT         // Daily loss limit exceeded
RISK_BREACH_DETECTED          // Risk breach detected
```

**System Errors (SYSTEM_*)**
```typescript
SYSTEM_INTERNAL_ERROR         // Internal server error
SYSTEM_DATABASE_ERROR         // Database error
SYSTEM_CACHE_ERROR            // Cache error
SYSTEM_QUEUE_ERROR            // Job queue error
SYSTEM_MAINTENANCE            // System under maintenance
SYSTEM_OVERLOADED             // System overloaded
```

**Validation Errors (VALIDATION_*)**
```typescript
VALIDATION_REQUIRED_FIELD     // Required field missing
VALIDATION_INVALID_FORMAT     // Invalid format
VALIDATION_OUT_OF_RANGE       // Value out of range
VALIDATION_INVALID_ENUM       // Invalid enum value
VALIDATION_CONSTRAINT_VIOLATION // Constraint violation
```

**Retry Behavior Matrix**

| Error Code | Retryable | Retry Strategy | Max Retries |
|------------|-----------|----------------|-------------|
| AUTH_EXPIRED_TOKEN | Yes | Refresh token first | 1 |
| EXCHANGE_RATE_LIMIT | Yes | Exponential backoff | 3 |
| EXCHANGE_TIMEOUT | Yes | Exponential backoff | 3 |
| EXCHANGE_UNAVAILABLE | Yes | Exponential backoff | 5 |
| SYSTEM_OVERLOADED | Yes | Exponential backoff | 3 |
| TRADE_INSUFFICIENT_BALANCE | No | N/A | 0 |
| TRADE_INVALID_SYMBOL | No | N/A | 0 |
| STRATEGY_VALIDATION_FAILED | No | N/A | 0 |
| RISK_LIMIT_EXCEEDED | No | N/A | 0 |

### WebSocket API Specification

#### Connection Protocol

**WebSocket URL**
```
Production:  wss://api.symbiotetrader.com/ws/v1
Development: ws://localhost:8000/ws/v1
```

**Authentication**

Option 1: JWT Token (Query Parameter)
```
wss://api.symbiotetrader.com/ws/v1?token=<jwt_token>
```

Option 2: API Key (Query Parameter)
```
wss://api.symbiotetrader.com/ws/v1?api_key=<api_key>
```

Option 3: Session Cookie (Automatic for Web UI)
```javascript
// Cookie automatically sent by browser
const ws = new WebSocket('wss://api.symbiotetrader.com/ws/v1');
```

#### Message Format

All messages are JSON with the following structure:

**Client â†’ Server Messages**
```typescript
interface ClientMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'request';
  id: string;                    // Correlation ID (UUID)
  payload: any;                  // Message-specific payload
  timestamp?: string;            // ISO 8601 timestamp
}
```

**Server â†’ Client Messages**
```typescript
interface ServerMessage {
  type: 'event' | 'response' | 'error' | 'pong';
  id: string;                    // Correlation ID (matches request)
  event?: string;                // Event type (for type='event')
  payload: any;                  // Message-specific payload
  timestamp: string;             // ISO 8601 timestamp
}
```

#### Connection Lifecycle

**1. Connection Established**
```json
{
  "type": "event",
  "id": "system-001",
  "event": "connection.established",
  "payload": {
    "connection_id": "conn_abc123",
    "user_id": "user_xyz789",
    "server_time": "2025-10-18T12:34:56.789Z"
  },
  "timestamp": "2025-10-18T12:34:56.789Z"
}
```

**2. Heartbeat (Keep-Alive)**

Client sends ping every 30 seconds:
```json
{
  "type": "ping",
  "id": "ping-001",
  "timestamp": "2025-10-18T12:35:26.789Z"
}
```

Server responds with pong:
```json
{
  "type": "pong",
  "id": "ping-001",
  "payload": {
    "server_time": "2025-10-18T12:35:26.790Z"
  },
  "timestamp": "2025-10-18T12:35:26.790Z"
}
```

**3. Disconnection**

Server sends before closing:
```json
{
  "type": "event",
  "id": "system-002",
  "event": "connection.closing",
  "payload": {
    "reason": "server_restart",
    "reconnect_after": 5
  },
  "timestamp": "2025-10-18T12:40:00.000Z"
}
```

#### Subscription Model

**Subscribe to Events**
```json
{
  "type": "subscribe",
  "id": "sub-001",
  "payload": {
    "channels": [
      "ticks:BTC/USDT",
      "orders:user_xyz789",
      "strategy:strategy_abc123",
      "risk:user_xyz789"
    ]
  }
}
```

**Server Confirmation**
```json
{
  "type": "response",
  "id": "sub-001",
  "payload": {
    "subscribed": [
      "ticks:BTC/USDT",
      "orders:user_xyz789",
      "strategy:strategy_abc123",
      "risk:user_xyz789"
    ],
    "failed": []
  },
  "timestamp": "2025-10-18T12:34:57.000Z"
}
```

**Unsubscribe from Events**
```json
{
  "type": "unsubscribe",
  "id": "unsub-001",
  "payload": {
    "channels": ["ticks:BTC/USDT"]
  }
}
```

#### Event Catalog

**Market Data Events**
```typescript
// Real-time tick data
"tick.updated"
{
  "symbol": "BTC/USDT",
  "asset_class": "CRYPTO_CEX",
  "venue": "binance",
  "price": 43250.50,
  "volume": 1.234,
  "timestamp": "2025-10-18T12:34:56.789Z"
}

// Order book updates
"orderbook.updated"
{
  "symbol": "BTC/USDT",
  "asset_class": "CRYPTO_CEX",
  "venue": "binance",
  "bids": [[43250.00, 1.5], [43249.50, 2.3]],
  "asks": [[43251.00, 1.2], [43251.50, 3.1]],
  "timestamp": "2025-10-18T12:34:56.789Z"
}

// OHLCV candle completed
"candle.completed"
{
  "symbol": "BTC/USDT",
  "asset_class": "CRYPTO_CEX",
  "venue": "binance",
  "timeframe": "1m",
  "open": 43200.00,
  "high": 43300.00,
  "low": 43150.00,
  "close": 43250.00,
  "volume": 123.45,
  "timestamp": "2025-10-18T12:35:00.000Z"
}
```

**Order Events**
```typescript
// Order placed
"order.placed"
{
  "order_id": "order_abc123",
  "strategy_id": "strategy_xyz789",
  "symbol": "BTC/USDT",
  "asset_class": "CRYPTO_CEX",
  "venue": "binance",
  "side": "buy",
  "type": "limit",
  "quantity": 0.1,
  "price": 43200.00,
  "status": "pending",
  "timestamp": "2025-10-18T12:34:56.789Z"
}

// Order filled (partial or complete)
"order.filled"
{
  "order_id": "order_abc123",
  "fill_id": "fill_def456",
  "asset_class": "CRYPTO_CEX",
  "venue": "binance",
  "filled_quantity": 0.05,
  "remaining_quantity": 0.05,
  "fill_price": 43200.00,
  "fee": 2.16,
  "fee_currency": "USDT",
  "status": "partial",
  "timestamp": "2025-10-18T12:34:57.123Z"
}

// Order cancelled
"order.cancelled"
{
  "order_id": "order_abc123",
  "asset_class": "CRYPTO_CEX",
  "venue": "binance",
  "reason": "user_requested",
  "timestamp": "2025-10-18T12:35:00.000Z"
}

// Order rejected
"order.rejected"
{
  "order_id": "order_abc123",
  "asset_class": "CRYPTO_CEX",
  "venue": "binance",
  "reason": "INSUFFICIENT_BALANCE",
  "message": "Insufficient balance to place order",
  "timestamp": "2025-10-18T12:34:57.000Z"
}
```

**Strategy Events**
```typescript
// Strategy signal generated
"strategy.signal"
{
  "strategy_id": "strategy_xyz789",
  "signal": "buy",
  "symbol": "BTC/USDT",
  "asset_class": "CRYPTO_CEX",
  "venue": "binance",
  "strength": 0.85,
  "indicators": {
    "rsi": 32.5,
    "macd": 125.3,
    "bb_position": 0.15
  },
  "timestamp": "2025-10-18T12:34:56.789Z"
}

// Strategy state changed
"strategy.state_changed"
{
  "strategy_id": "strategy_xyz789",
  "asset_class": "CRYPTO_CEX",
  "venue": "binance",
  "old_state": "paper",
  "new_state": "live",
  "reason": "user_promoted",
  "timestamp": "2025-10-18T12:34:56.789Z"
}

// Strategy performance update
"strategy.performance"
{
  "strategy_id": "strategy_xyz789",
  "asset_class": "CRYPTO_CEX",
  "venue": "binance",
  "total_pnl": 1234.56,
  "total_pnl_percent": 12.35,
  "win_rate": 0.65,
  "sharpe_ratio": 1.85,
  "max_drawdown": -5.2,
  "timestamp": "2025-10-18T12:34:56.789Z"
}

// Strategy ranking updated
"strategy.ranking_updated"
{
  "strategy_id": "strategy_xyz789",
  "asset_class": "CRYPTO_CEX",
  "venue": "binance",
  "old_rank": 5,
  "new_rank": 3,
  "score": 87.5,
  "timestamp": "2025-10-18T12:34:56.789Z"
}

// Strategy health check
"strategy.health"
{
  "strategy_id": "strategy_xyz789",
  "asset_class": "CRYPTO_CEX",
  "venue": "binance",
  "health_score": 92.5,
  "issues": [],
  "warnings": ["High correlation with strategy_abc456"],
  "timestamp": "2025-10-18T12:34:56.789Z"
}
```

**Risk Events**
```typescript
// Risk limit breached
"risk.breach"
{
  "rule_id": "rule_abc123",
  "rule_name": "Daily Loss Limit",
  "severity": "high",
  "current_value": -1050.00,
  "limit_value": -1000.00,
  "action_taken": "pause_all_strategies",
  "timestamp": "2025-10-18T12:34:56.789Z"
}

// Risk warning
"risk.warning"
{
  "rule_id": "rule_abc123",
  "rule_name": "Drawdown Warning",
  "severity": "medium",
  "current_value": -8.5,
  "warning_threshold": -8.0,
  "limit_threshold": -10.0,
  "timestamp": "2025-10-18T12:34:56.789Z"
}
```

**Position Events**
```typescript
// Position opened
"position.opened"
{
  "position_id": "pos_abc123",
  "strategy_id": "strategy_xyz789",
  "symbol": "BTC/USDT",
  "asset_class": "CRYPTO_CEX",
  "venue": "binance",
  "side": "long",
  "quantity": 0.1,
  "entry_price": 43200.00,
  "timestamp": "2025-10-18T12:34:56.789Z"
}

// Position updated
"position.updated"
{
  "position_id": "pos_abc123",
  "asset_class": "CRYPTO_CEX",
  "venue": "binance",
  "quantity": 0.15,
  "average_price": 43150.00,
  "unrealized_pnl": 15.00,
  "timestamp": "2025-10-18T12:34:57.000Z"
}

// Position closed
"position.closed"
{
  "position_id": "pos_abc123",
  "asset_class": "CRYPTO_CEX",
  "venue": "binance",
  "exit_price": 43300.00,
  "realized_pnl": 15.00,
  "holding_time_seconds": 3600,
  "timestamp": "2025-10-18T13:34:56.789Z"
}
```

**Market Intelligence Events**
```typescript
// Market regime changed
"regime.changed"
{
  "asset_class": "CRYPTO_CEX",
  "symbol": "BTC/USDT",
  "old_regime": "bull",
  "new_regime": "sideways",
  "confidence": 0.85,
  "indicators": {
    "volatility": "medium",
    "trend_strength": 0.35,
    "volume_profile": "declining"
  },
  "timestamp": "2025-10-18T12:34:56.789Z"
}

// Funding rate updated (crypto perps)
"funding_rate.updated"
{
  "symbol": "BTC/USDT",
  "asset_class": "CRYPTO_DEX",
  "venue": "hyperliquid",
  "funding_rate": 0.0001,
  "funding_rate_8h": 0.024,
  "next_funding_time": "2025-10-18T16:00:00.000Z",
  "timestamp": "2025-10-18T12:34:56.789Z"
}

// Liquidation detected
"liquidation.detected"
{
  "symbol": "BTC/USDT",
  "asset_class": "CRYPTO_CEX",
  "venue": "binance",
  "side": "long",
  "quantity": 5.0,
  "price": 43100.00,
  "timestamp": "2025-10-18T12:34:56.789Z"
}
```

**AI Events**
```typescript
// AI suggestion generated
"ai.suggestion"
{
  "suggestion_id": "sugg_abc123",
  "type": "strategy_improvement",
  "strategy_id": "strategy_xyz789",
  "title": "Consider adding stop-loss at 42800",
  "description": "Current strategy lacks downside protection in high volatility regime",
  "confidence": 0.78,
  "priority": "medium",
  "timestamp": "2025-10-18T12:34:56.789Z"
}

// AI insight generated
"ai.insight"
{
  "insight_id": "insight_def456",
  "category": "correlation",
  "title": "High correlation detected between BTC and ETH strategies",
  "description": "Your BTC and ETH strategies have 0.92 correlation, reducing diversification",
  "actionable": true,
  "timestamp": "2025-10-18T12:34:56.789Z"
}
```

#### Rate Limiting & Backpressure

**Rate Limits**
- Max connections per user: 5
- Max subscriptions per connection: 50
- Max messages per second: 100

**Backpressure Handling**

If client cannot keep up with message rate:
```json
{
  "type": "event",
  "id": "system-003",
  "event": "backpressure.warning",
  "payload": {
    "queue_size": 1000,
    "dropped_messages": 50,
    "recommendation": "Reduce subscriptions or increase processing speed"
  },
  "timestamp": "2025-10-18T12:34:56.789Z"
}
```

#### Reconnection Strategy

**Client-Side Reconnection Logic**
```javascript
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;
const baseDelay = 1000; // 1 second

function reconnect() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.error('Max reconnection attempts reached');
    return;
  }

  const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempts), 30000);
  reconnectAttempts++;

  setTimeout(() => {
    console.log(`Reconnecting... (attempt ${reconnectAttempts})`);
    connect();
  }, delay);
}

function connect() {
  const ws = new WebSocket('wss://api.symbiotetrader.com/ws/v1?token=' + token);

  ws.onopen = () => {
    console.log('Connected');
    reconnectAttempts = 0;
    // Resubscribe to channels
    resubscribe();
  };

  ws.onclose = (event) => {
    console.log('Disconnected:', event.code, event.reason);
    reconnect();
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}
```


### Added
- New endpoint: GET /api/v1/strategy-ranking
- New field: asset_class in all order/trade responses

### Changed
- Increased rate limit for read operations: 50 â†’ 100 req/min

### Deprecated
- Offset-based pagination (use cursor-based instead)

### Removed
- Legacy endpoint: GET /api/v1/strategies/list (use GET /api/v1/strategies)

### Fixed
- Fixed order placement latency issue
```

#### Migration Guides

**Version Migration:**
- Step-by-step migration instructions
- Breaking changes highlighted
- Code examples (before/after)
- Rollback instructions

**Platform Migration:**
- Import from TradingView
- Import from QuantConnect
- Import from Freqtrade
- Data migration tools

#### Video Tutorials

**Tutorial Series:**
1. Platform Overview (5 min)
2. Creating Your First Strategy (10 min)
3. Running Backtests (8 min)
4. Setting Up Risk Rules (7 min)
5. Using AI Features (12 min)
6. Live Trading Setup (15 min)

**Advanced Tutorials:**
- Custom Indicators
- Advanced Strategy Patterns
- Multi-Asset Strategies
- Portfolio Optimization

#### Interactive Tutorials

**In-App Tutorials:**
- Step-by-step guided tours
- Interactive tooltips
- Progress tracking
- Completion badges



### 14. Database & Data Management

### Database Schema Specifications

**Complete production-ready DDL scripts for all databases with indexes, foreign keys, constraints, and partitioning.**

**Dependencies:** PostgreSQL 14+, ClickHouse 23+, Neo4j 5+, Redis 7+, Qdrant 1.7+

#### PostgreSQL Schema (Operational Data)

**Users & Authentication**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  account_status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'locked', 'suspended', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  key_prefix VARCHAR(20) NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at) WHERE revoked_at IS NULL;

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

**Exchange Connections**
```sql
CREATE TABLE exchange_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exchange_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  passphrase_encrypted TEXT,
  subaccount VARCHAR(100),
  is_testnet BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(user_id, exchange_id, name)
);

CREATE INDEX idx_exchange_connections_user_id ON exchange_connections(user_id);
CREATE INDEX idx_exchange_connections_exchange_id ON exchange_connections(exchange_id);
CREATE INDEX idx_exchange_connections_is_active ON exchange_connections(is_active);
```

**Strategies**
```sql
CREATE TABLE strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'backtesting', 'paper', 'live', 'paused', 'archived')),
  strategy_type VARCHAR(50) NOT NULL CHECK (strategy_type IN ('visual', 'yaml', 'python', 'external')),
  asset_class VARCHAR(50) NOT NULL CHECK (asset_class IN ('CRYPTO_CEX', 'CRYPTO_DEX', 'STOCK', 'ETF', 'FOREX', 'FUTURES', 'OPTIONS')),
  venue VARCHAR(100) NOT NULL,
  regime VARCHAR(50) CHECK (regime IN ('bull', 'bear', 'sideways', 'high_vol', 'low_vol')),
  definition JSONB NOT NULL,
  compiled_code TEXT,
  symbols TEXT[] NOT NULL,
  timeframes TEXT[] NOT NULL,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(user_id, name, version)
);

CREATE INDEX idx_strategies_user_id ON strategies(user_id);
CREATE INDEX idx_strategies_status ON strategies(status);
CREATE INDEX idx_strategies_asset_class ON strategies(asset_class);
CREATE INDEX idx_strategies_venue ON strategies(venue);
CREATE INDEX idx_strategies_regime ON strategies(regime);
CREATE INDEX idx_strategies_user_status ON strategies(user_id, status);
CREATE INDEX idx_strategies_user_asset_class ON strategies(user_id, asset_class);
CREATE INDEX idx_strategies_created_at ON strategies(created_at DESC);
CREATE INDEX idx_strategies_symbols ON strategies USING GIN(symbols);
CREATE INDEX idx_strategies_tags ON strategies USING GIN(tags);
```

**Strategy Versions**
```sql
CREATE TABLE strategy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
  version VARCHAR(50) NOT NULL,
  definition JSONB NOT NULL,
  compiled_code TEXT,
  change_summary TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(strategy_id, version)
);

CREATE INDEX idx_strategy_versions_strategy_id ON strategy_versions(strategy_id);
CREATE INDEX idx_strategy_versions_created_at ON strategy_versions(created_at DESC);
```

**Orders**
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES strategies(id) ON DELETE SET NULL,
  connection_id UUID NOT NULL REFERENCES exchange_connections(id) ON DELETE CASCADE,
  exchange_order_id VARCHAR(255),
  client_order_id VARCHAR(255) NOT NULL UNIQUE,
  symbol VARCHAR(50) NOT NULL,
  asset_class VARCHAR(50) NOT NULL CHECK (asset_class IN ('CRYPTO_CEX', 'CRYPTO_DEX', 'STOCK', 'ETF', 'FOREX', 'FUTURES', 'OPTIONS')),
  venue VARCHAR(100) NOT NULL,
  side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
  order_type VARCHAR(50) NOT NULL CHECK (order_type IN ('market', 'limit', 'stop', 'stop_limit', 'trailing_stop', 'post_only', 'reduce_only')),
  time_in_force VARCHAR(20) NOT NULL DEFAULT 'GTC' CHECK (time_in_force IN ('GTC', 'IOC', 'FOK', 'GTD', 'DAY')),
  quantity DECIMAL(20, 8) NOT NULL,
  price DECIMAL(20, 8),
  stop_price DECIMAL(20, 8),
  trailing_delta DECIMAL(20, 8),
  filled_quantity DECIMAL(20, 8) NOT NULL DEFAULT 0,
  remaining_quantity DECIMAL(20, 8) NOT NULL,
  average_fill_price DECIMAL(20, 8),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'partial', 'filled', 'cancelled', 'rejected', 'expired')),
  reject_reason TEXT,
  fees DECIMAL(20, 8) NOT NULL DEFAULT 0,
  fee_currency VARCHAR(10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  filled_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_strategy_id ON orders(strategy_id);
CREATE INDEX idx_orders_connection_id ON orders(connection_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_asset_class ON orders(asset_class);
CREATE INDEX idx_orders_venue ON orders(venue);
CREATE INDEX idx_orders_symbol ON orders(symbol);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_orders_user_asset_class ON orders(user_id, asset_class);
CREATE INDEX idx_orders_exchange_order_id ON orders(exchange_order_id) WHERE exchange_order_id IS NOT NULL;
```

**Trades**
```sql
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES strategies(id) ON DELETE SET NULL,
  connection_id UUID NOT NULL REFERENCES exchange_connections(id) ON DELETE CASCADE,
  symbol VARCHAR(50) NOT NULL,
  asset_class VARCHAR(50) NOT NULL CHECK (asset_class IN ('CRYPTO_CEX', 'CRYPTO_DEX', 'STOCK', 'ETF', 'FOREX', 'FUTURES', 'OPTIONS')),
  venue VARCHAR(100) NOT NULL,
  side VARCHAR(10) NOT NULL CHECK (side IN ('long', 'short')),
  entry_order_id UUID REFERENCES orders(id),
  exit_order_id UUID REFERENCES orders(id),
  quantity DECIMAL(20, 8) NOT NULL,
  entry_price DECIMAL(20, 8) NOT NULL,
  exit_price DECIMAL(20, 8),
  realized_pnl DECIMAL(20, 8),
  realized_pnl_percent DECIMAL(10, 4),
  fees DECIMAL(20, 8) NOT NULL DEFAULT 0,
  holding_time_seconds INTEGER,
  opened_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  notes TEXT,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_strategy_id ON trades(strategy_id);
CREATE INDEX idx_trades_connection_id ON trades(connection_id);
CREATE INDEX idx_trades_asset_class ON trades(asset_class);
CREATE INDEX idx_trades_venue ON trades(venue);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_opened_at ON trades(opened_at DESC);
CREATE INDEX idx_trades_closed_at ON trades(closed_at DESC) WHERE closed_at IS NOT NULL;
CREATE INDEX idx_trades_user_asset_class ON trades(user_id, asset_class);
CREATE INDEX idx_trades_tags ON trades USING GIN(tags);
```

**Backtests**
```sql
CREATE TABLE backtests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  asset_class VARCHAR(50) NOT NULL CHECK (asset_class IN ('CRYPTO_CEX', 'CRYPTO_DEX', 'STOCK', 'ETF', 'FOREX', 'FUTURES', 'OPTIONS')),
  venue VARCHAR(100) NOT NULL,
  timeframe VARCHAR(20) NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  initial_capital DECIMAL(20, 2) NOT NULL,
  slippage_model VARCHAR(50) DEFAULT 'fixed' CHECK (slippage_model IN ('fixed', 'volume_based', 'spread_based')),
  commission_tier VARCHAR(50) DEFAULT 'standard',
  market_impact_model VARCHAR(50) DEFAULT 'none' CHECK (market_impact_model IN ('none', 'linear', 'sqrt')),
  execution_method VARCHAR(50) DEFAULT 'market' CHECK (execution_method IN ('market', 'limit', 'twap', 'vwap')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  progress_percent INTEGER NOT NULL DEFAULT 0,
  total_trades INTEGER,
  winning_trades INTEGER,
  losing_trades INTEGER,
  win_rate DECIMAL(5, 2),
  total_pnl DECIMAL(20, 2),
  total_pnl_percent DECIMAL(10, 4),
  max_drawdown DECIMAL(10, 4),
  sharpe_ratio DECIMAL(10, 4),
  sortino_ratio DECIMAL(10, 4),
  profit_factor DECIMAL(10, 4),
  overfitting_score DECIMAL(5, 2),
  overfitting_risk VARCHAR(20) CHECK (overfitting_risk IN ('low', 'medium', 'high')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  results JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_backtests_user_id ON backtests(user_id);
CREATE INDEX idx_backtests_strategy_id ON backtests(strategy_id);
CREATE INDEX idx_backtests_status ON backtests(status);
CREATE INDEX idx_backtests_created_at ON backtests(created_at DESC);
```

**Risk Rules**
```sql
CREATE TABLE risk_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('daily_loss', 'drawdown', 'position_size', 'exposure', 'correlation', 'consecutive_losses', 'trade_frequency')),
  threshold_value DECIMAL(20, 8) NOT NULL,
  warning_value DECIMAL(20, 8),
  time_window_seconds INTEGER,  -- For time-based rules (e.g., max 5 trades per hour = 3600)
  cooldown_period_seconds INTEGER,  -- Cooldown after breach before re-enabling
  consecutive_loss_limit INTEGER,  -- Max consecutive losses before action
  correlation_threshold DECIMAL(5, 4),  -- For correlation rules (0.0 to 1.0)
  action VARCHAR(50) NOT NULL CHECK (action IN ('alert', 'pause_strategy', 'pause_all', 'close_positions')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  scope VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (scope IN ('user', 'strategy', 'symbol', 'asset_class')),
  scope_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risk_rules_user_id ON risk_rules(user_id);
CREATE INDEX idx_risk_rules_is_active ON risk_rules(is_active);
CREATE INDEX idx_risk_rules_rule_type ON risk_rules(rule_type);
CREATE INDEX idx_risk_rules_scope ON risk_rules(scope, scope_id);
```

**AI Interactions**
```sql
CREATE TABLE ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN ('chat', 'analysis', 'suggestion', 'generation', 'explanation')),
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  model VARCHAR(100) NOT NULL,
  tokens_used INTEGER NOT NULL,
  cost_usd DECIMAL(10, 6),
  latency_ms INTEGER,
  feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),
  feedback_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_ai_interactions_user_id ON ai_interactions(user_id);
CREATE INDEX idx_ai_interactions_session_id ON ai_interactions(session_id);
CREATE INDEX idx_ai_interactions_created_at ON ai_interactions(created_at DESC);
CREATE INDEX idx_ai_interactions_interaction_type ON ai_interactions(interaction_type);
```

#### QuestDB Schema (Real-Time Market Data)

**Ticks (Real-Time Price Updates)**
```sql
CREATE TABLE ticks (
  timestamp TIMESTAMP,
  symbol SYMBOL,
  exchange SYMBOL,
  price DOUBLE,
  volume DOUBLE,
  bid DOUBLE,
  ask DOUBLE,
  bid_volume DOUBLE,
  ask_volume DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY;

-- QuestDB automatically creates indexes on SYMBOL columns
```

**OHLCV Candles (Multiple Timeframes)**
```sql
CREATE TABLE candles_1m (
  timestamp TIMESTAMP,
  symbol SYMBOL,
  exchange SYMBOL,
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume DOUBLE,
  trades INT
) TIMESTAMP(timestamp) PARTITION BY DAY;

CREATE TABLE candles_5m (
  timestamp TIMESTAMP,
  symbol SYMBOL,
  exchange SYMBOL,
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume DOUBLE,
  trades INT
) TIMESTAMP(timestamp) PARTITION BY DAY;

CREATE TABLE candles_15m (
  timestamp TIMESTAMP,
  symbol SYMBOL,
  exchange SYMBOL,
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume DOUBLE,
  trades INT
) TIMESTAMP(timestamp) PARTITION BY DAY;

CREATE TABLE candles_1h (
  timestamp TIMESTAMP,
  symbol SYMBOL,
  exchange SYMBOL,
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume DOUBLE,
  trades INT
) TIMESTAMP(timestamp) PARTITION BY DAY;

CREATE TABLE candles_4h (
  timestamp TIMESTAMP,
  symbol SYMBOL,
  exchange SYMBOL,
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume DOUBLE,
  trades INT
) TIMESTAMP(timestamp) PARTITION BY DAY;

CREATE TABLE candles_1d (
  timestamp TIMESTAMP,
  symbol SYMBOL,
  exchange SYMBOL,
  open DOUBLE,
  high DOUBLE,
  low DOUBLE,
  close DOUBLE,
  volume DOUBLE,
  trades INT
) TIMESTAMP(timestamp) PARTITION BY MONTH;
```

**Order Book Snapshots**
```sql
CREATE TABLE orderbook_snapshots (
  timestamp TIMESTAMP,
  symbol SYMBOL,
  exchange SYMBOL,
  bids STRING,  -- JSON array of [price, quantity]
  asks STRING,  -- JSON array of [price, quantity]
  checksum LONG
) TIMESTAMP(timestamp) PARTITION BY DAY;
```

#### ClickHouse Schema (Historical Analytics & Telemetry)

**Strategy Telemetry Events**
```sql
CREATE TABLE strategy_events (
  timestamp DateTime64(3),
  event_id UUID,
  correlation_id UUID,
  user_id UUID,
  strategy_id UUID,
  event_type LowCardinality(String),
  symbol LowCardinality(String),
  payload String,  -- JSON
  metadata String  -- JSON
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (user_id, strategy_id, timestamp)
TTL timestamp + INTERVAL 90 DAY;

CREATE INDEX idx_event_type ON strategy_events(event_type) TYPE bloom_filter GRANULARITY 1;
CREATE INDEX idx_correlation_id ON strategy_events(correlation_id) TYPE bloom_filter GRANULARITY 1;
```

**Order Fill Events**
```sql
CREATE TABLE order_fills (
  timestamp DateTime64(3),
  fill_id UUID,
  order_id UUID,
  user_id UUID,
  strategy_id Nullable(UUID),
  connection_id UUID,
  symbol LowCardinality(String),
  side LowCardinality(String),
  quantity Decimal(20, 8),
  price Decimal(20, 8),
  fee Decimal(20, 8),
  fee_currency LowCardinality(String),
  exchange LowCardinality(String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (user_id, strategy_id, timestamp)
TTL timestamp + INTERVAL 365 DAY;
```

**Performance Snapshots**
```sql
CREATE TABLE performance_snapshots (
  timestamp DateTime64(3),
  user_id UUID,
  strategy_id UUID,
  total_pnl Decimal(20, 2),
  total_pnl_percent Decimal(10, 4),
  daily_pnl Decimal(20, 2),
  win_rate Decimal(5, 2),
  sharpe_ratio Decimal(10, 4),
  max_drawdown Decimal(10, 4),
  total_trades UInt32,
  open_positions UInt16
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (user_id, strategy_id, timestamp)
TTL timestamp + INTERVAL 180 DAY;
```

#### Neo4j Schema (Knowledge Graph)

**Node Types & Relationships**
```cypher
// User Node
CREATE CONSTRAINT user_id_unique IF NOT EXISTS
FOR (u:User) REQUIRE u.id IS UNIQUE;

CREATE INDEX user_email IF NOT EXISTS
FOR (u:User) ON (u.email);

// Strategy Node
CREATE CONSTRAINT strategy_id_unique IF NOT EXISTS
FOR (s:Strategy) REQUIRE s.id IS UNIQUE;

CREATE INDEX strategy_name IF NOT EXISTS
FOR (s:Strategy) ON (s.name);

// Market Condition Node
CREATE CONSTRAINT market_condition_id_unique IF NOT EXISTS
FOR (m:MarketCondition) REQUIRE m.id IS UNIQUE;

// Outcome Node
CREATE CONSTRAINT outcome_id_unique IF NOT EXISTS
FOR (o:Outcome) REQUIRE o.id IS UNIQUE;

// Relationships
// (:Strategy)-[:PERFORMED_IN]->(:MarketCondition)
// (:Strategy)-[:RESULTED_IN]->(:Outcome)
// (:MarketCondition)-[:LED_TO]->(:Outcome)
// (:User)-[:OWNS]->(:Strategy)
// (:Strategy)-[:SIMILAR_TO]->(:Strategy)

// Example: Create Success Map
MATCH (s:Strategy {id: $strategy_id})
MATCH (m:MarketCondition {regime: $regime, volatility: $volatility})
MATCH (o:Outcome {pnl: $pnl, win_rate: $win_rate})
MERGE (s)-[:PERFORMED_IN {timestamp: $timestamp}]->(m)
MERGE (s)-[:RESULTED_IN {timestamp: $timestamp}]->(o)
MERGE (m)-[:LED_TO {count: 1}]->(o)
  ON MATCH SET m.count = m.count + 1;
```

**Node Properties**
```cypher
// User
{
  id: UUID,
  email: String,
  username: String,
  created_at: DateTime
}

// Strategy
{
  id: UUID,
  name: String,
  type: String,
  symbols: [String],
  timeframes: [String],
  parameters: Map,
  created_at: DateTime
}

// MarketCondition
{
  id: UUID,
  regime: String,  // trending, ranging, volatile, calm
  volatility: Float,
  volume_profile: String,
  time_of_day: String,
  day_of_week: String
}

// Outcome
{
  id: UUID,
  pnl: Float,
  pnl_percent: Float,
  win_rate: Float,
  sharpe_ratio: Float,
  max_drawdown: Float,
  trade_count: Int
}
```

#### Qdrant Schema (Vector Embeddings)

**Collections**
```python
# Strategy Embeddings Collection
{
  "collection_name": "strategies",
  "vectors": {
    "size": 1536,  # OpenAI ada-002 embedding size
    "distance": "Cosine"
  },
  "payload_schema": {
    "strategy_id": "uuid",
    "user_id": "uuid",
    "name": "keyword",
    "description": "text",
    "symbols": "keyword[]",
    "timeframes": "keyword[]",
    "tags": "keyword[]",
    "performance_score": "float",
    "created_at": "datetime"
  }
}

# Market Pattern Embeddings Collection
{
  "collection_name": "market_patterns",
  "vectors": {
    "size": 768,  # Custom embedding size
    "distance": "Cosine"
  },
  "payload_schema": {
    "pattern_id": "uuid",
    "symbol": "keyword",
    "timeframe": "keyword",
    "pattern_type": "keyword",
    "timestamp": "datetime",
    "metadata": "json"
  }
}

# AI Insight Embeddings Collection
{
  "collection_name": "ai_insights",
  "vectors": {
    "size": 1536,
    "distance": "Cosine"
  },
  "payload_schema": {
    "insight_id": "uuid",
    "user_id": "uuid",
    "insight_type": "keyword",
    "content": "text",
    "relevance_score": "float",
    "created_at": "datetime"
  }
}
```


#### Market Data Quality (Consolidated)

### Market Data Quality & Monitoring

Comprehensive market data quality indicators, monitoring, and management features.

#### Data Quality Indicators

**Real-Time Quality Metrics:**

1. **Stale Data Warning**
   - Alert when last tick is >5 seconds old (crypto)
   - Alert when last tick is >1 minute old (stocks during RTH)
   - Visual indicator: Yellow warning icon
   - Action: Attempt reconnection

2. **Missing Data Warning**
   - Detect gaps in tick data (>10 seconds with no ticks)
   - Detect missing candles (expected candle not received)
   - Visual indicator: Red warning icon
   - Action: Backfill missing data

3. **Data Latency Display**
   - Show exchange timestamp vs received timestamp
   - Display latency in milliseconds
   - Color-coded: Green (<50ms), Yellow (50-200ms), Red (>200ms)
   - Historical latency chart

4. **Data Quality Score**
   - Composite score (0-100) based on:
     - Latency (40%)
     - Completeness (30%)
     - Freshness (20%)
     - Consistency (10%)
   - Display per symbol and per venue
   - Alert when score drops below threshold (e.g., <80)

**Data Source Selection:**

1. **Primary/Fallback Sources**
   - Configure primary data source per symbol
   - Configure fallback sources (up to 3)
   - Automatic failover on quality degradation
   - Manual override available

2. **Data Source Comparison**
   - Compare prices across multiple sources
   - Detect price discrepancies (arbitrage opportunities)
   - Alert on significant divergence (>0.5%)

**Data Replay (Testing):**

1. **Historical Data Replay**
   - Replay historical tick data for testing
   - Adjustable playback speed (1x, 2x, 5x, 10x)
   - Pause/resume/skip functionality
   - Use case: Test strategies on historical data in real-time mode

2. **Scenario Replay**
   - Replay specific market events (flash crash, high volatility)
   - Test strategy behavior during extreme conditions
   - Saved scenarios library

**Custom Data Sources:**

1. **Import CSV Data**
   - Import historical OHLCV data from CSV
   - Map columns to required fields
   - Validate data integrity
   - Store in QuestDB/ClickHouse

2. **Connect to Custom API**
   - Configure custom REST/WebSocket endpoints
   - Define data format and mapping
   - Authentication configuration
   - Rate limiting configuration

**Data Quality Dashboard:**

- Real-time quality metrics per symbol/venue
- Historical quality trends
- Latency distribution charts
- Completeness percentage
- Downtime incidents
- Failover events log


### Market Data Quality & Validation

Comprehensive data quality monitoring, normalization procedures, and failover strategies to ensure reliable market data for trading decisions.

#### Data Quality Checks

**Real-Time Quality Monitoring:**

```python
class DataQualityMonitor:
    """
    Monitor market data quality in real-time and flag anomalies.
    """

    def check_data_quality(self, tick: Tick) -> QualityCheckResult:
        """
        Run comprehensive quality checks on incoming tick data.
        """
        issues = []

        # 1. Price spike detection (>X% move in Y seconds)
        if self.is_price_spike(tick):
            issues.append(QualityIssue(
                type='PRICE_SPIKE',
                severity='HIGH',
                message=f'Price moved {tick.price_change_pct:.2f}% in {tick.time_delta}s',
                action='FLAG_FOR_REVIEW'
            ))

        # 2. Stale data detection (timestamp lag)
        timestamp_lag = (datetime.utcnow() - tick.timestamp).total_seconds()
        if timestamp_lag > 5:  # 5 second threshold
            issues.append(QualityIssue(
                type='STALE_DATA',
                severity='MEDIUM',
                message=f'Data is {timestamp_lag:.1f}s old',
                action='USE_WITH_CAUTION'
            ))

        # 3. Out-of-sequence detection
        if not self.is_sequence_valid(tick):
            issues.append(QualityIssue(
                type='OUT_OF_SEQUENCE',
                severity='HIGH',
                message='Tick received out of chronological order',
                action='REORDER_BUFFER'
            ))

        # 4. Duplicate detection
        if self.is_duplicate(tick):
            issues.append(QualityIssue(
                type='DUPLICATE',
                severity='LOW',
                message='Duplicate tick detected',
                action='DISCARD'
            ))

        # 5. Cross-venue price validation
        cross_venue_diff = self.check_cross_venue_price(tick)
        if cross_venue_diff > 0.01:  # 1% difference threshold
            issues.append(QualityIssue(
                type='CROSS_VENUE_ANOMALY',
                severity='MEDIUM',
                message=f'Price differs {cross_venue_diff*100:.2f}% from other venues',
                action='FLAG_FOR_REVIEW'
            ))

        return QualityCheckResult(
            tick=tick,
            is_valid=len([i for i in issues if i.severity == 'HIGH']) == 0,
            issues=issues,
            quality_score=self.calculate_quality_score(issues)
        )

    def is_price_spike(self, tick: Tick) -> bool:
        """
        Detect abnormal price movements.
        """
        recent_prices = self.get_recent_prices(tick.symbol, seconds=60)
        if not recent_prices:
            return False

        avg_price = sum(recent_prices) / len(recent_prices)
        price_change_pct = abs(tick.price - avg_price) / avg_price

        # Dynamic threshold based on volatility
        volatility = self.get_volatility(tick.symbol)
        threshold = 0.05 + (volatility * 0.1)  # Base 5% + volatility adjustment

        return price_change_pct > threshold
```

**Missing Data Detection:**

```typescript
interface DataGap {
  symbol: string;
  exchange: string;
  gap_start: string;
  gap_end: string;
  gap_duration_seconds: number;
  expected_ticks: number;
  missing_ticks: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

class GapDetector {
  detectGaps(symbol: string, timeframe: string): DataGap[] {
    const expectedInterval = this.getExpectedInterval(timeframe);
    const ticks = this.getRecentTicks(symbol, hours: 1);
    const gaps: DataGap[] = [];

    for (let i = 1; i < ticks.length; i++) {
      const timeDiff = ticks[i].timestamp - ticks[i-1].timestamp;

      if (timeDiff > expectedInterval * 2) {
        // Gap detected
        const missingTicks = Math.floor(timeDiff / expectedInterval) - 1;

        gaps.push({
          symbol,
          exchange: ticks[i].exchange,
          gap_start: ticks[i-1].timestamp,
          gap_end: ticks[i].timestamp,
          gap_duration_seconds: timeDiff,
          expected_ticks: Math.floor(timeDiff / expectedInterval),
          missing_ticks: missingTicks,
          severity: this.calculateGapSeverity(timeDiff, missingTicks)
        });
      }
    }

    return gaps;
  }
}
```

#### Data Normalization

**Timestamp Normalization:**

```python
class DataNormalizer:
    """
    Normalize market data from different exchanges to consistent format.
    """

    def normalize_timestamp(self, tick: RawTick) -> datetime:
        """
        Convert exchange timestamp to UTC with microsecond precision.
        """
        # Handle different timestamp formats
        if isinstance(tick.timestamp, int):
            # Unix timestamp (milliseconds or seconds)
            if tick.timestamp > 1e12:
                # Milliseconds
                timestamp = datetime.fromtimestamp(tick.timestamp / 1000, tz=timezone.utc)
            else:
                # Seconds
                timestamp = datetime.fromtimestamp(tick.timestamp, tz=timezone.utc)
        elif isinstance(tick.timestamp, str):
            # ISO 8601 string
            timestamp = datetime.fromisoformat(tick.timestamp.replace('Z', '+00:00'))
        else:
            timestamp = tick.timestamp

        # Ensure UTC
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        else:
            timestamp = timestamp.astimezone(timezone.utc)

        return timestamp

    def normalize_symbol(self, symbol: str, exchange: str) -> str:
        """
        Normalize symbol format across exchanges.

        Examples:
        - Binance: BTCUSDT â†’ BTC/USDT
        - Coinbase: BTC-USD â†’ BTC/USD
        - Kraken: XXBTZUSD â†’ BTC/USD
        """
        symbol_map = self.get_symbol_map(exchange)

        if symbol in symbol_map:
            return symbol_map[symbol]

        # Default normalization (add slash)
        if '/' not in symbol and '-' not in symbol:
            # Guess base/quote split (common patterns)
            for quote in ['USDT', 'USD', 'USDC', 'BTC', 'ETH']:
                if symbol.endswith(quote):
                    base = symbol[:-len(quote)]
                    return f"{base}/{quote}"

        return symbol.replace('-', '/')

    def normalize_price_precision(self, price: float, symbol: str) -> Decimal:
        """
        Normalize price to correct precision for symbol.
        """
        tick_size = self.get_tick_size(symbol)

        # Round to tick size
        normalized = Decimal(str(price))
        normalized = (normalized / tick_size).quantize(Decimal('1')) * tick_size

        return normalized
```

#### Data Failover & Redundancy

**Multi-Source Failover Strategy:**

```typescript
interface DataSource {
  name: string;
  priority: number;  // 1 = primary, 2 = secondary, etc.
  status: 'healthy' | 'degraded' | 'offline';
  latency_ms: number;
  error_rate: number;
  last_tick_timestamp: string;
}

class DataFailoverManager {
  private sources: Map<string, DataSource[]>;

  async getActiveSource(symbol: string): Promise<DataSource> {
    const sources = this.sources.get(symbol) || [];

    // Sort by priority, then by health
    const sortedSources = sources
      .filter(s => s.status !== 'offline')
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        // If same priority, prefer lower latency
        return a.latency_ms - b.latency_ms;
      });

    if (sortedSources.length === 0) {
      throw new Error(`No healthy data sources for ${symbol}`);
    }

    return sortedSources[0];
  }

  async handleSourceFailure(source: DataSource, symbol: string) {
    // Mark source as offline
    source.status = 'offline';

    // Switch to backup source
    const backupSource = await this.getActiveSource(symbol);

    // Log failover event
    await this.logFailover({
      symbol,
      failed_source: source.name,
      backup_source: backupSource.name,
      timestamp: new Date().toISOString()
    });

    // Trigger backfill for missed data
    await this.triggerBackfill(symbol, source.last_tick_timestamp);

    // Schedule health check to restore primary
    this.scheduleHealthCheck(source);
  }
}
```

**Automatic Backfill Procedures:**

```python
class BackfillManager:
    """
    Automatically backfill missing data after outages.
    """

    async def backfill_gap(self, gap: DataGap):
        """
        Backfill missing data for detected gap.
        """
        # Determine backfill source (REST API typically)
        source = self.get_backfill_source(gap.exchange)

        # Calculate required candles
        timeframe = '1m'  # Start with 1-minute candles
        candles_needed = gap.gap_duration_seconds // 60

        # Fetch historical data
        candles = await source.fetch_ohlcv(
            symbol=gap.symbol,
            timeframe=timeframe,
            since=gap.gap_start,
            limit=candles_needed
        )

        # Insert into database
        await self.insert_historical_data(candles)

        # Verify backfill completeness
        verification = await self.verify_backfill(gap)

        if not verification.complete:
            # Retry with different source or timeframe
            await self.retry_backfill(gap, verification)

        return BackfillResult(
            gap=gap,
            candles_filled=len(candles),
            complete=verification.complete,
            duration_seconds=verification.duration
        )
```

#### Historical Data Management

**Data Retention Policies:**

```typescript
interface RetentionPolicy {
  timeframe: string;
  retention_days: number;
  compression: 'none' | 'gzip' | 'zstd';
  archive_after_days?: number;
  archive_location?: string;
}

const DATA_RETENTION_POLICIES: RetentionPolicy[] = [
  // Tick data
  { timeframe: 'tick', retention_days: 7, compression: 'zstd', archive_after_days: 7, archive_location: 's3://backups/ticks' },

  // Candle data
  { timeframe: '1m', retention_days: 90, compression: 'zstd', archive_after_days: 30 },
  { timeframe: '5m', retention_days: 180, compression: 'gzip', archive_after_days: 90 },
  { timeframe: '1h', retention_days: 730, compression: 'gzip' },  // 2 years
  { timeframe: '1d', retention_days: 3650, compression: 'none' },  // 10 years

  // Order book snapshots
  { timeframe: 'orderbook', retention_days: 30, compression: 'zstd', archive_after_days: 7 }
];
```

**Data Integrity Verification:**

```python
class DataIntegrityChecker:
    """
    Verify data integrity with checksums and validation.
    """

    def verify_data_integrity(self, dataset_id: str) -> IntegrityReport:
        """
        Verify integrity of stored dataset.
        """
        dataset = self.load_dataset(dataset_id)

        issues = []

        # 1. Checksum verification
        expected_checksum = dataset.metadata.checksum
        actual_checksum = self.calculate_checksum(dataset.data)

        if expected_checksum != actual_checksum:
            issues.append('CHECKSUM_MISMATCH')

        # 2. Completeness check
        expected_rows = dataset.metadata.row_count
        actual_rows = len(dataset.data)

        if expected_rows != actual_rows:
            issues.append(f'ROW_COUNT_MISMATCH: expected {expected_rows}, got {actual_rows}')

        # 3. Timestamp continuity
        gaps = self.detect_timestamp_gaps(dataset.data)
        if gaps:
            issues.append(f'TIMESTAMP_GAPS: {len(gaps)} gaps detected')

        # 4. Value range validation
        outliers = self.detect_outliers(dataset.data)
        if outliers:
            issues.append(f'OUTLIERS: {len(outliers)} outliers detected')

        return IntegrityReport(
            dataset_id=dataset_id,
            is_valid=len(issues) == 0,
            issues=issues,
            checked_at=datetime.utcnow()
        )
```


### Data Import/Export Specifications

Standard formats for importing and exporting data, enabling data portability and backup/restore functionality.

#### Trade History Export (CSV)

**Format Specification**

```csv
timestamp,exchange,symbol,side,order_type,quantity,price,fee,fee_currency,total,strategy_id,strategy_name,notes
2024-10-18T14:32:15.123Z,binance,BTC/USDT,buy,limit,0.05,67500.00,0.0000375,BTC,3375.00,550e8400-e29b-41d4-a716-446655440000,Mean Reversion v2,Entry signal
2024-10-18T15:45:22.456Z,binance,BTC/USDT,sell,limit,0.05,68200.00,34.10,USDT,3410.00,550e8400-e29b-41d4-a716-446655440000,Mean Reversion v2,Exit signal
```

**Field Definitions**

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `timestamp` | ISO 8601 | Trade execution time (UTC) | Yes |
| `exchange` | string | Exchange name (lowercase) | Yes |
| `symbol` | string | Trading pair (BASE/QUOTE) | Yes |
| `side` | enum | `buy` or `sell` | Yes |
| `order_type` | enum | `market`, `limit`, `stop`, etc. | Yes |
| `quantity` | decimal | Amount of base currency | Yes |
| `price` | decimal | Execution price | Yes |
| `fee` | decimal | Trading fee amount | Yes |
| `fee_currency` | string | Currency of fee | Yes |
| `total` | decimal | Total value (quantity Ã— price) | Yes |
| `strategy_id` | UUID | Strategy that placed trade | No |
| `strategy_name` | string | Human-readable strategy name | No |
| `notes` | string | Additional notes | No |

#### Strategy Export (JSON)

**Format Specification**

```json
{
  "version": "1.0",
  "exported_at": "2024-10-18T14:32:15.123Z",
  "strategy": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Mean Reversion v2",
    "description": "RSI-based mean reversion strategy",
    "type": "mean_reversion",
    "symbols": ["BTC/USDT", "ETH/USDT"],
    "timeframes": ["15m", "1h"],
    "parameters": {
      "rsi_period": 14,
      "rsi_oversold": 30,
      "rsi_overbought": 70,
      "position_size": 0.05,
      "stop_loss_pct": 2.0,
      "take_profit_pct": 4.0
    },
    "entry_conditions": [
      {
        "indicator": "rsi",
        "operator": "<",
        "value": 30
      }
    ],
    "exit_conditions": [
      {
        "indicator": "rsi",
        "operator": ">",
        "value": 70
      }
    ],
    "risk_limits": {
      "max_position_size": 1000.0,
      "max_daily_loss": 500.0,
      "max_open_positions": 3
    },
    "metadata": {
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-10-18T14:00:00Z",
      "version": 2,
      "tags": ["rsi", "mean-reversion", "crypto"]
    }
  }
}
```

**Field Definitions**

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `version` | string | Export format version | Yes |
| `exported_at` | ISO 8601 | Export timestamp | Yes |
| `strategy.id` | UUID | Unique strategy identifier | Yes |
| `strategy.name` | string | Strategy name | Yes |
| `strategy.description` | string | Strategy description | No |
| `strategy.type` | enum | Strategy type | Yes |
| `strategy.symbols` | array | Trading pairs | Yes |
| `strategy.timeframes` | array | Timeframes | Yes |
| `strategy.parameters` | object | Strategy parameters | Yes |
| `strategy.entry_conditions` | array | Entry rules | Yes |
| `strategy.exit_conditions` | array | Exit rules | Yes |
| `strategy.risk_limits` | object | Risk management rules | Yes |
| `strategy.metadata` | object | Additional metadata | No |

#### Backtest Results Export (JSON)

**Format Specification**

```json
{
  "version": "1.0",
  "exported_at": "2024-10-18T14:32:15.123Z",
  "backtest": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "strategy_id": "550e8400-e29b-41d4-a716-446655440000",
    "strategy_name": "Mean Reversion v2",
    "start_date": "2024-01-01T00:00:00Z",
    "end_date": "2024-12-31T23:59:59Z",
    "initial_capital": 10000.0,
    "final_capital": 12500.0,
    "metrics": {
      "total_return": 25.0,
      "total_return_pct": 25.0,
      "sharpe_ratio": 1.85,
      "sortino_ratio": 2.34,
      "max_drawdown": -8.5,
      "max_drawdown_pct": -8.5,
      "win_rate": 62.5,
      "profit_factor": 2.1,
      "total_trades": 120,
      "winning_trades": 75,
      "losing_trades": 45,
      "avg_win": 85.50,
      "avg_loss": -42.30,
      "largest_win": 320.00,
      "largest_loss": -180.00
    },
    "overfitting_analysis": {
      "score": 35,
      "risk_level": "low",
      "tests": {
        "walk_forward": "pass",
        "out_of_sample": "pass",
        "parameter_sensitivity": "pass",
        "monte_carlo": "pass"
      }
    },
    "trades": [
      {
        "timestamp": "2024-01-05T10:30:00Z",
        "symbol": "BTC/USDT",
        "side": "buy",
        "quantity": 0.05,
        "entry_price": 45000.0,
        "exit_price": 46500.0,
        "pnl": 75.0,
        "pnl_pct": 3.33
      }
    ]
  }
}
```

#### Portfolio Export (JSON)

**Format Specification**

```json
{
  "version": "1.0",
  "exported_at": "2024-10-18T14:32:15.123Z",
  "portfolio": {
    "user_id": "770e8400-e29b-41d4-a716-446655440000",
    "balances": [
      {
        "exchange": "binance",
        "currency": "USDT",
        "total": 5000.0,
        "available": 4500.0,
        "locked": 500.0
      },
      {
        "exchange": "binance",
        "currency": "BTC",
        "total": 0.15,
        "available": 0.10,
        "locked": 0.05
      }
    ],
    "positions": [
      {
        "exchange": "binance",
        "symbol": "BTC/USDT",
        "side": "long",
        "quantity": 0.05,
        "entry_price": 67500.0,
        "current_price": 68200.0,
        "unrealized_pnl": 35.0,
        "unrealized_pnl_pct": 0.52
      }
    ],
    "total_value_usd": 15250.0
  }
}
```

#### Backup & Restore Procedures

**Full Backup (All User Data)**

**Backup Contents:**
1. User profile and settings
2. Exchange connections (encrypted API keys)
3. All strategies (with versions)
4. Trade history
5. Backtest results
6. Risk rules and limits
7. AI chat history

**Backup Format:**
```json
{
  "version": "1.0",
  "backup_type": "full",
  "created_at": "2024-10-18T14:32:15.123Z",
  "user": { /* user data */ },
  "connections": [ /* exchange connections */ ],
  "strategies": [ /* all strategies */ ],
  "trades": [ /* trade history */ ],
  "backtests": [ /* backtest results */ ],
  "risk_rules": [ /* risk rules */ ],
  "ai_history": [ /* AI interactions */ ]
}
```

**Backup Procedure:**
1. Navigate to Settings â†’ Data Management â†’ Backup
2. Select backup type (Full or Partial)
3. Select date range (if partial)
4. Click "Create Backup"
5. Download encrypted backup file (`.stbackup` extension)
6. Store securely (backup is encrypted with user password)

**Restore Procedure:**
1. Navigate to Settings â†’ Data Management â†’ Restore
2. Upload backup file (`.stbackup`)
3. Enter backup password
4. Review restore preview (shows what will be restored)
5. Select restore options:
   - Merge with existing data
   - Replace existing data
   - Restore to new account
6. Confirm restore
7. System validates backup integrity
8. Data restored (strategies, trades, settings)
9. Exchange connections require re-authentication (security)

**Automated Backups:**
- Daily backups (last 7 days retained)
- Weekly backups (last 4 weeks retained)
- Monthly backups (last 12 months retained)
- Stored encrypted in user's cloud storage (optional)

#### Data Import from Other Platforms

**Supported Import Formats**

| Platform | Format | Supported Data |
|----------|--------|----------------|
| **TradingView** | CSV | Trade history, alerts |
| **MetaTrader** | CSV | Trade history, orders |
| **3Commas** | JSON | Strategies, trades |
| **Binance** | CSV | Trade history, deposits/withdrawals |
| **Coinbase** | CSV | Trade history, transactions |
| **Generic** | CSV/JSON | Trade history (custom mapping) |

**Import Procedure:**
1. Navigate to Settings â†’ Data Management â†’ Import
2. Select platform or "Generic CSV/JSON"
3. Upload file
4. Map columns (for generic imports)
5. Preview imported data
6. Validate data (check for errors)
7. Confirm import
8. Data imported and reconciled with existing data



### Regime Detection Algorithm Specification

**Purpose:** Define the complete algorithm for market regime detection that underpins Strategy Ranking, Risk Management, and adaptive features.

#### Regime Taxonomy

Each asset is classified across **6 independent dimensions**:

1. **Trend Strength**: `STRONG_UP` | `WEAK_UP` | `RANGING` | `WEAK_DOWN` | `STRONG_DOWN`
2. **Volatility State**: `VERY_LOW` | `LOW` | `NORMAL` | `HIGH` | `VERY_HIGH`
3. **Liquidity State**: `DEEP` | `NORMAL` | `THIN` | `VERY_THIN`
4. **Spread State**: `TIGHT` | `NORMAL` | `WIDE` | `VERY_WIDE`
5. **Time-of-Day**: `ASIA` | `EUROPE` | `US` | `OVERLAP` | `OFF_HOURS`
6. **Market Stress**: `CALM` | `ELEVATED` | `STRESSED` | `CRISIS`

**Composite Regime Labels** (for UI and strategy fingerprinting):
- `TRENDING_LOW_VOL` - Strong trend + low volatility (ideal for trend-following)
- `TRENDING_HIGH_VOL` - Strong trend + high volatility (momentum strategies)
- `RANGING_LOW_VOL` - No trend + low volatility (mean-reversion)
- `RANGING_HIGH_VOL` - No trend + high volatility (avoid or short gamma)
- `BREAKOUT` - Transition from ranging to trending (breakout strategies)
- `REVERSAL` - Extreme trend + elevated stress (reversal strategies)
- `ILLIQUID` - Thin liquidity regardless of trend (avoid or reduce size)
- `CRISIS` - Market stress elevated (risk-off, flatten positions)

#### Feature Extraction

**1. Trend Strength (ADX + Linear Regression)**

```python
def classify_trend_strength(prices, period=14):
    # Calculate ADX (Average Directional Index)
    adx = calculate_adx(prices, period)

    # Calculate linear regression slope
    lr_slope = linear_regression_slope(prices, period)

    # Calculate directional indicators
    plus_di = calculate_plus_di(prices, period)
    minus_di = calculate_minus_di(prices, period)

    # Classification
    if adx < 20:
        return "RANGING"

    # Determine direction
    if lr_slope > 0.005 and plus_di > minus_di:
        direction = "UP"
    elif lr_slope < -0.005 and minus_di > plus_di:
        direction = "DOWN"
    else:
        return "RANGING"

    # Determine strength
    if adx > 40:
        strength = "STRONG"
    else:
        strength = "WEAK"

    return f"{strength}_{direction}"  # e.g., "STRONG_UP", "WEAK_DOWN"
```

**Thresholds:**
- ADX < 20: RANGING
- ADX 20-40: WEAK trend
- ADX > 40: STRONG trend
- LR Slope > 0.005: Upward bias
- LR Slope < -0.005: Downward bias

**2. Volatility State (Realized Volatility + Percentile)**

```python
def classify_volatility(returns, lookback=90):
    # Calculate realized volatility (annualized)
    realized_vol = returns.std() * sqrt(252)  # For daily returns

    # Calculate percentile vs historical (90-day lookback)
    historical_vols = rolling_volatility(returns, lookback)
    percentile = percentileofscore(historical_vols, realized_vol)

    # Classification
    if percentile < 20:
        return "VERY_LOW"
    elif percentile < 40:
        return "LOW"
    elif percentile < 60:
        return "NORMAL"
    elif percentile < 80:
        return "HIGH"
    else:
        return "VERY_HIGH"
```

**Thresholds:**
- Percentile < 20: VERY_LOW
- Percentile 20-40: LOW
- Percentile 40-60: NORMAL
- Percentile 60-80: HIGH
- Percentile > 80: VERY_HIGH

**3. Liquidity State (ADV + Order Book Depth)**

```python
def classify_liquidity(symbol, venue):
    # Get 30-day average daily volume
    adv_30d = get_average_daily_volume(symbol, days=30)

    # Get current order book depth (sum of bids/asks within 1% of mid)
    book_depth = get_order_book_depth(symbol, venue, bps=100)

    # Get typical depth for this asset
    typical_depth = get_typical_depth(symbol, days=30)

    # Classification
    depth_ratio = book_depth / typical_depth

    if depth_ratio > 1.5:
        return "DEEP"
    elif depth_ratio > 0.7:
        return "NORMAL"
    elif depth_ratio > 0.3:
        return "THIN"
    else:
        return "VERY_THIN"
```

**Thresholds:**
- Depth ratio > 1.5: DEEP
- Depth ratio 0.7-1.5: NORMAL
- Depth ratio 0.3-0.7: THIN
- Depth ratio < 0.3: VERY_THIN

**4. Spread State (Bid-Ask Spread in BPS)**

```python
def classify_spread(symbol, venue):
    # Get current bid-ask spread
    bid, ask = get_best_bid_ask(symbol, venue)
    mid = (bid + ask) / 2
    spread_bps = ((ask - bid) / mid) * 10000

    # Get typical spread for this asset
    typical_spread = get_typical_spread(symbol, days=30)

    # Classification
    spread_ratio = spread_bps / typical_spread

    if spread_ratio < 0.5:
        return "TIGHT"
    elif spread_ratio < 1.5:
        return "NORMAL"
    elif spread_ratio < 3.0:
        return "WIDE"
    else:
        return "VERY_WIDE"
```

**Thresholds:**
- Spread ratio < 0.5: TIGHT
- Spread ratio 0.5-1.5: NORMAL
- Spread ratio 1.5-3.0: WIDE
- Spread ratio > 3.0: VERY_WIDE

**5. Time-of-Day (UTC-based)**

```python
def classify_time_of_day(timestamp_utc):
    hour = timestamp_utc.hour

    # Trading session hours (UTC)
    # Asia: 00:00-08:00
    # Europe: 07:00-16:00
    # US: 13:00-21:00

    if 7 <= hour < 8 or 13 <= hour < 16:
        return "OVERLAP"  # Europe/Asia or Europe/US overlap
    elif 0 <= hour < 8:
        return "ASIA"
    elif 8 <= hour < 13:
        return "EUROPE"
    elif 13 <= hour < 21:
        return "US"
    else:
        return "OFF_HOURS"
```

**6. Market Stress (Volatility + Volume + Spread)**

```python
def classify_market_stress(symbol, venue):
    # Get stress indicators
    vol_percentile = get_volatility_percentile(symbol, days=90)
    volume_spike = get_volume_spike(symbol)  # Current vol / 30d avg
    spread_spike = get_spread_spike(symbol, venue)  # Current spread / 30d avg

    # Calculate stress score (0-100)
    stress_score = (
        vol_percentile * 0.4 +
        min(volume_spike * 20, 40) +  # Cap at 40
        min(spread_spike * 20, 20)    # Cap at 20
    )

    # Classification
    if stress_score < 30:
        return "CALM"
    elif stress_score < 60:
        return "ELEVATED"
    elif stress_score < 80:
        return "STRESSED"
    else:
        return "CRISIS"
```

**Thresholds:**
- Stress score < 30: CALM
- Stress score 30-60: ELEVATED
- Stress score 60-80: STRESSED
- Stress score > 80: CRISIS

#### Hysteresis Mechanism

To prevent regime flapping, require **3 consecutive periods** of the same classification before transitioning:

```python
class RegimeDetector:
    def __init__(self):
        self.current_regime = None
        self.candidate_regime = None
        self.confirmation_count = 0
        self.confirmation_threshold = 3

    def update(self, new_classification):
        if new_classification == self.current_regime:
            # Still in same regime
            self.candidate_regime = None
            self.confirmation_count = 0
        elif new_classification == self.candidate_regime:
            # Same candidate as before
            self.confirmation_count += 1
            if self.confirmation_count >= self.confirmation_threshold:
                # Transition confirmed
                self.current_regime = new_classification
                self.candidate_regime = None
                self.confirmation_count = 0
        else:
            # New candidate
            self.candidate_regime = new_classification
            self.confirmation_count = 1

        return self.current_regime
```

#### Confidence Calculation

```python
def calculate_regime_confidence(features):
    # Confidence based on:
    # 1. Feature strength (how far from thresholds)
    # 2. Feature agreement (do all features agree?)
    # 3. Data quality (completeness, recency)

    feature_strengths = []

    # ADX strength (distance from 20 and 40 thresholds)
    if features['adx'] < 20:
        feature_strengths.append(1.0 - features['adx'] / 20)
    elif features['adx'] > 40:
        feature_strengths.append((features['adx'] - 40) / 60)
    else:
        feature_strengths.append(0.5)

    # Volatility percentile strength
    vol_pct = features['vol_percentile']
    if vol_pct < 20 or vol_pct > 80:
        feature_strengths.append(1.0)
    elif 40 <= vol_pct <= 60:
        feature_strengths.append(0.5)
    else:
        feature_strengths.append(0.75)

    # Average feature strength
    avg_strength = sum(feature_strengths) / len(feature_strengths)

    # Data quality factor
    data_quality = features['data_quality_score'] / 100

    # Final confidence
    confidence = avg_strength * data_quality

    return confidence
```

#### Update Cadence

- **Real-time features**: Updated every tick (spread, depth, stress)
- **Regime classification**: Recalculated every **5 minutes**
- **Regime transition**: Requires 3 consecutive 5-minute periods (15 minutes total)

#### Storage Schema

**ClickHouse (Historical)**:
```sql
CREATE TABLE regime_history (
    timestamp DateTime64(3),
    asset String,
    venue String,
    trend_strength Enum8('STRONG_UP'=1, 'WEAK_UP'=2, 'RANGING'=3, 'WEAK_DOWN'=4, 'STRONG_DOWN'=5),
    volatility_state Enum8('VERY_LOW'=1, 'LOW'=2, 'NORMAL'=3, 'HIGH'=4, 'VERY_HIGH'=5),
    liquidity_state Enum8('DEEP'=1, 'NORMAL'=2, 'THIN'=3, 'VERY_THIN'=4),
    spread_state Enum8('TIGHT'=1, 'NORMAL'=2, 'WIDE'=3, 'VERY_WIDE'=4),
    time_of_day Enum8('ASIA'=1, 'EUROPE'=2, 'US'=3, 'OVERLAP'=4, 'OFF_HOURS'=5),
    market_stress Enum8('CALM'=1, 'ELEVATED'=2, 'STRESSED'=3, 'CRISIS'=4),
    composite_regime String,
    confidence Float32,
    adx Float32,
    vol_percentile Float32,
    depth_ratio Float32,
    spread_bps Float32,
    stress_score Float32
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (asset, venue, timestamp)
TTL timestamp + INTERVAL 90 DAY;
```

**Redis (Current State)**:
```python
# Key: regime:current:{asset}:{venue}
# Value: JSON
{
    "timestamp": "2025-10-18T12:00:00Z",
    "composite_regime": "TRENDING_LOW_VOL",
    "confidence": 0.85,
    "dimensions": {
        "trend_strength": "STRONG_UP",
        "volatility_state": "LOW",
        "liquidity_state": "NORMAL",
        "spread_state": "TIGHT",
        "time_of_day": "US",
        "market_stress": "CALM"
    },
    "features": {
        "adx": 45.2,
        "vol_percentile": 25.0,
        "depth_ratio": 1.2,
        "spread_bps": 5.0,
        "stress_score": 20.0
    }
}
# TTL: 5 minutes
```

#### API Endpoints

**GET /api/v1/regime/current**
```json
{
  "asset": "BTCUSDT",
  "venue": "binance",
  "regime": "TRENDING_LOW_VOL",
  "confidence": 0.85,
  "dimensions": { ... },
  "features": { ... },
  "updated_at": "2025-10-18T12:00:00Z"
}
```

**GET /api/v1/regime/history**
```json
{
  "asset": "BTCUSDT",
  "venue": "binance",
  "start_time": "2025-10-17T00:00:00Z",
  "end_time": "2025-10-18T00:00:00Z",
  "regimes": [
    {
      "timestamp": "2025-10-17T00:00:00Z",
      "regime": "RANGING_LOW_VOL",
      "confidence": 0.75
    },
    ...
  ]
}
```

**WebSocket Event**:
```json
{
  "type": "regime.transition",
  "asset": "BTCUSDT",
  "venue": "binance",
  "from_regime": "RANGING_LOW_VOL",
  "to_regime": "TRENDING_LOW_VOL",
  "confidence": 0.85,
  "timestamp": "2025-10-18T12:00:00Z"
}
```



### 15. Trading & Execution Specifications

### Order Types & Execution Specifications

Complete order type matrix with exchange-specific behavior, validation rules, and execution details.

#### Supported Order Types

| Order Type | Description | Use Case | Exchanges |
|------------|-------------|----------|-----------|
| **Market** | Execute immediately at best available price | Quick entry/exit | All |
| **Limit** | Execute at specified price or better | Price control | All |
| **Stop** | Market order triggered when price crosses stop | Stop loss | All |
| **Stop-Limit** | Limit order triggered when price crosses stop | Controlled stop loss | All |
| **Trailing Stop** | Stop that trails price by fixed amount/percent | Protect profits | Binance, Kraken, Bybit |
| **Post-Only** | Only add liquidity (maker), reject if taker | Maker fees | Binance, Coinbase, Kraken |
| **Reduce-Only** | Only reduce existing position | Close positions | Binance, Bybit (futures) |
| **OCO** | One-Cancels-Other (stop + limit) | Bracket orders | Binance |
| **Iceberg** | Show only portion of order size | Hide large orders | Binance |

#### Time-In-Force (TIF) Options

| TIF | Full Name | Behavior | Exchanges |
|-----|-----------|----------|-----------|
| **GTC** | Good-Till-Cancelled | Remains active until filled or cancelled | All |
| **IOC** | Immediate-Or-Cancel | Fill immediately, cancel unfilled portion | All |
| **FOK** | Fill-Or-Kill | Fill entire order immediately or cancel | All |
| **GTD** | Good-Till-Date | Active until specified date/time | Kraken, Coinbase |
| **DAY** | Day Order | Active until end of trading day | Coinbase |

#### Order Type Detailed Specifications

**Market Order**
```typescript
{
  type: 'market',
  symbol: 'BTC/USDT',
  side: 'buy' | 'sell',
  quantity: number,
  // Optional
  time_in_force: 'IOC' | 'FOK',  // Default: IOC
  client_order_id?: string
}
```
- **Execution**: Immediate at best available price
- **Slippage**: Expected, especially for large orders
- **Validation**: Quantity must meet minimum notional value
- **Use Case**: Quick entry/exit when price is secondary

**Limit Order**
```typescript
{
  type: 'limit',
  symbol: 'BTC/USDT',
  side: 'buy' | 'sell',
  quantity: number,
  price: number,
  // Optional
  time_in_force: 'GTC' | 'IOC' | 'FOK',  // Default: GTC
  post_only: boolean,  // Default: false
  client_order_id?: string
}
```
- **Execution**: At specified price or better
- **Slippage**: None (price guaranteed)
- **Validation**: Price must be within tick size, quantity within lot size
- **Use Case**: Price control, maker fees (with post_only)

**Stop Order (Stop-Loss)**
```typescript
{
  type: 'stop',
  symbol: 'BTC/USDT',
  side: 'buy' | 'sell',
  quantity: number,
  stop_price: number,
  // Optional
  trigger_price_type: 'last' | 'mark' | 'index',  // Default: last
  time_in_force: 'GTC' | 'IOC' | 'FOK',  // Default: GTC
  client_order_id?: string
}
```
- **Execution**: Market order when price crosses stop_price
- **Trigger**: Last price (default), mark price, or index price
- **Slippage**: Expected after trigger
- **Validation**: Stop price must be below current (sell) or above current (buy)
- **Use Case**: Stop loss, breakout entry

**Stop-Limit Order**
```typescript
{
  type: 'stop_limit',
  symbol: 'BTC/USDT',
  side: 'buy' | 'sell',
  quantity: number,
  stop_price: number,
  limit_price: number,
  // Optional
  trigger_price_type: 'last' | 'mark' | 'index',  // Default: last
  time_in_force: 'GTC' | 'IOC' | 'FOK',  // Default: GTC
  client_order_id?: string
}
```
- **Execution**: Limit order placed when price crosses stop_price
- **Trigger**: Last price (default), mark price, or index price
- **Slippage**: Controlled by limit_price
- **Validation**: Stop and limit prices must be logical
- **Use Case**: Controlled stop loss with price protection

**Trailing Stop Order**
```typescript
{
  type: 'trailing_stop',
  symbol: 'BTC/USDT',
  side: 'buy' | 'sell',
  quantity: number,
  // One of:
  trailing_delta: number,      // Absolute price distance
  trailing_percent: number,    // Percentage distance
  // Optional
  activation_price: number,    // Price to activate trailing
  time_in_force: 'GTC',
  client_order_id?: string
}
```
- **Execution**: Stop price trails market price by fixed amount/percent
- **Trigger**: When price reverses by trailing amount
- **Slippage**: Expected after trigger
- **Validation**: Trailing delta/percent must be positive
- **Use Case**: Protect profits while letting winners run
- **Exchange-Specific**:
  - Binance: Uses callback rate (percent)
  - Kraken: Uses absolute or percent offset
  - Bybit: Uses trailing distance

**Post-Only Order**
```typescript
{
  type: 'limit',
  symbol: 'BTC/USDT',
  side: 'buy' | 'sell',
  quantity: number,
  price: number,
  post_only: true,
  time_in_force: 'GTC',
  client_order_id?: string
}
```
- **Execution**: Only if order adds liquidity (maker)
- **Rejection**: If order would take liquidity (taker)
- **Slippage**: None
- **Validation**: Price must not cross spread
- **Use Case**: Ensure maker fees, avoid taker fees

**Reduce-Only Order**
```typescript
{
  type: 'limit' | 'market' | 'stop',
  symbol: 'BTC/USDT',
  side: 'buy' | 'sell',
  quantity: number,
  reduce_only: true,
  // ... other fields based on type
}
```
- **Execution**: Only reduces existing position
- **Rejection**: If would increase position or open new position
- **Validation**: Must have existing position in opposite direction
- **Use Case**: Close positions without risk of reversal
- **Availability**: Futures/margin only (Binance, Bybit)

#### Order Validation Rules

**Minimum Order Size**
```typescript
interface OrderLimits {
  symbol: string;
  min_quantity: number;        // Minimum order quantity
  max_quantity: number;        // Maximum order quantity
  min_notional: number;        // Minimum order value (quantity * price)
  max_notional: number;        // Maximum order value
  quantity_step: number;       // Quantity increment (lot size)
  price_tick: number;          // Price increment (tick size)
}

// Example: BTC/USDT on Binance
{
  symbol: 'BTC/USDT',
  min_quantity: 0.00001,
  max_quantity: 9000,
  min_notional: 10.00,         // $10 minimum
  max_notional: 1000000,
  quantity_step: 0.00001,
  price_tick: 0.01
}
```

**Validation Logic**
```python
def validate_order(order, limits, venue_info, trading_hours):
    # Quantity validation
    if order.quantity < limits.min_quantity:
        raise ValidationError(f"Quantity below minimum: {limits.min_quantity}")

    if order.quantity > limits.max_quantity:
        raise ValidationError(f"Quantity exceeds maximum: {limits.max_quantity}")

    # Quantity step validation (lot size)
    if (order.quantity % limits.quantity_step) != 0:
        # Auto-round down to nearest valid quantity
        rounded_qty = (order.quantity // limits.quantity_step) * limits.quantity_step
        raise ValidationError(f"Quantity must be multiple of {limits.quantity_step}. Suggested: {rounded_qty}")

    # Notional validation (for limit orders)
    if order.type == 'limit':
        notional = order.quantity * order.price
        if notional < limits.min_notional:
            raise ValidationError(f"Order value below minimum: ${limits.min_notional}")

        if notional > limits.max_notional:
            raise ValidationError(f"Order value exceeds maximum: ${limits.max_notional}")

        # Price tick validation
        if (order.price % limits.price_tick) != 0:
            # Auto-round to nearest valid price
            rounded_price = round(order.price / limits.price_tick) * limits.price_tick
            raise ValidationError(f"Price must be multiple of {limits.price_tick}. Suggested: {rounded_price}")

    # Trading hours validation
    if not is_trading_hours(order.symbol, order.asset_class, trading_hours):
        if order.asset_class in ['STOCK', 'ETF', 'OPTIONS']:
            raise ValidationError(f"Market closed. Trading hours: {trading_hours.rth_start} - {trading_hours.rth_end}")
        elif order.asset_class == 'FOREX':
            if is_weekend():
                raise ValidationError("Forex market closed on weekends")

    # Venue-specific validation
    if venue_info.requires_margin_approval and not user.has_margin_approval:
        raise ValidationError("Margin trading requires approval. Apply in Settings â†’ Trading â†’ Margin")

    # Asset class-specific validation
    if order.asset_class == 'OPTIONS':
        if not order.option_type or not order.strike or not order.expiry:
            raise ValidationError("Options orders require: option_type, strike, expiry")

    if order.asset_class in ['FUTURES', 'OPTIONS']:
        if not user.has_derivatives_approval:
            raise ValidationError("Derivatives trading requires approval. Apply in Settings â†’ Trading â†’ Derivatives")

    # Leverage validation
    if order.leverage and order.leverage > venue_info.max_leverage:
        raise ValidationError(f"Leverage exceeds maximum: {venue_info.max_leverage}x")

    # Balance validation (pre-flight check)
    required_balance = calculate_required_balance(order)
    if user.available_balance < required_balance:
        raise ValidationError(f"Insufficient balance. Required: ${required_balance}, Available: ${user.available_balance}")

    return True
```

**Additional Validation Rules:**

1. **Order Size vs Venue Minimums:**
   - Validate against venue-specific minimums (fetched from exchange API)
   - Cache limits for 1 hour, refresh on validation error

2. **Price Tick Size:**
   - Round prices to nearest valid tick
   - Suggest corrected price in error message

3. **Notional Minimums:**
   - Calculate order value (quantity * price)
   - Validate against venue minimum notional value
   - Example: Binance requires $10 minimum notional

4. **Trading Hours:**
   - Validate order placement during trading hours
   - Stocks/ETFs: RTH (9:30 AM - 4:00 PM ET) or extended hours if enabled
   - Forex: 24/5 (closed weekends)
   - Crypto: 24/7
   - Futures: Extended hours per contract

5. **Venue Requirements:**
   - Margin approval for margin trading
   - Derivatives approval for futures/options
   - Leverage limits per venue and asset class

6. **Balance Validation:**
   - Check available balance before order placement
   - Account for existing open orders (reserved balance)
   - Account for margin requirements

7. **Rate Limiting:**
   - Validate against venue rate limits
   - Queue orders if rate limit exceeded
   - Show estimated wait time

8. **Symbol Validation:**
   - Verify symbol exists on venue
   - Verify symbol is enabled for user's asset classes
   - Suggest similar symbols if typo detected


### Position Management Features

Comprehensive position management capabilities for opening, modifying, and closing positions with advanced features.

#### Position Operations

**1. Partial Close**
- Close a portion of an existing position
- Specify quantity or percentage to close
- Maintains remaining position
- Example: Close 50% of BTC/USDT long position

```python
# Close 50% of position
close_position_partial(
    symbol="BTC/USDT",
    percentage=50,  # or quantity=0.5
    reason="Take profit"
)
```

**2. Scale In/Out**
- Gradually increase (scale in) or decrease (scale out) position size
- Define entry/exit levels and quantities
- Automated execution based on price levels
- Example: Scale out at +2%, +5%, +10% profit levels

```python
# Scale out configuration
scale_out_config = {
    "symbol": "BTC/USDT",
    "levels": [
        {"price_offset": 0.02, "quantity_pct": 33},  # Close 33% at +2%
        {"price_offset": 0.05, "quantity_pct": 33},  # Close 33% at +5%
        {"price_offset": 0.10, "quantity_pct": 34},  # Close 34% at +10%
    ]
}
```

**3. Position Averaging (Add to Position)**
- Add to existing position (average up/down)
- Recalculate average entry price
- Update position size and P&L
- Risk management: Limit number of adds, max position size

```python
# Add to existing position
add_to_position(
    symbol="BTC/USDT",
    quantity=0.1,
    max_adds=3,  # Maximum 3 additions
    max_position_size=1.0  # Maximum total position size
)
```

**4. Position Hedging**
- Open opposite position to hedge risk
- Maintain both long and short positions simultaneously
- Venue support: Binance (hedge mode), Bybit, IBKR
- Use case: Protect profits, reduce risk during uncertainty

```python
# Hedge existing long position
hedge_position(
    symbol="BTC/USDT",
    hedge_ratio=0.5,  # Hedge 50% of position
    hedge_type="opposite"  # or "correlated", "options"
)
```

**5. Position Transfer (Between Venues)**
- Transfer position from one venue to another
- Close on venue A, open on venue B
- Minimize slippage and timing risk
- Use case: Better fees, better liquidity, regulatory requirements

```python
# Transfer position between venues
transfer_position(
    symbol="BTC/USDT",
    from_venue="binance",
    to_venue="coinbase",
    method="simultaneous"  # or "sequential"
)
```

**6. Position Notes/Tags**
- Add notes and tags to positions
- Track rationale, thesis, lessons learned
- Search and filter positions by tags
- Export notes to trade journal

```python
# Add notes to position
add_position_note(
    position_id="pos_abc123",
    note="Entered on breakout above $43k resistance. Target: $45k",
    tags=["breakout", "momentum", "btc"]
)
```

#### Position Monitoring

**Real-Time Position Tracking:**
- Current P&L (realized + unrealized)
- Entry price vs current price
- Position size and value
- Liquidation price (for leveraged positions)
- Funding rate impact (for perpetuals)
- Time in position
- Risk metrics (position heat, correlation)

**Position Alerts:**
- P&L threshold alerts (profit/loss)
- Liquidation distance alerts
- Time-based alerts (position held too long)
- Correlation alerts (position correlation with other positions)

**Position Analytics:**
- Average hold time
- Win rate by position size
- Best/worst performing positions
- Position size distribution
- Correlation matrix

#### Position Lifecycle

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   Opened    â”‚ â† Entry order filled
â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜
       â”‚
       â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
       â”‚                                 â”‚
       â–¼                                 â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   Active    â”‚                   â”‚   Hedged    â”‚
â”‚  (Unhedged) â”‚                   â”‚             â”‚
â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜                   â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜
       â”‚                                 â”‚
       â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
       â”‚                                 â”‚
       â–¼                                 â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   Partial   â”‚                   â”‚   Closed    â”‚
â”‚   Closed    â”‚                   â”‚             â”‚
â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜                   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
       â”‚
       â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   Closed    â”‚
â”‚             â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

#### Position Risk Management

**Position Limits:**
- Max position size per symbol
- Max position value per asset class
- Max number of open positions
- Max correlation between positions
- Max leverage per position

**Position Monitoring:**
- Real-time risk checks
- Position heat (% of portfolio)
- Correlation with other positions
- Liquidation distance
- Funding rate impact

**Automatic Actions:**
- Auto-close on risk limit breach
- Auto-hedge on correlation spike
- Auto-reduce on drawdown
- Auto-flatten on circuit breaker



### Margin & Leverage Management

Comprehensive margin calculation, liquidation logic, and funding rate management for leveraged trading across spot margin, futures, and perpetual contracts.

#### Margin Calculation Methods

**Margin Types:**

| Margin Type | Description | Risk Profile | Use Case |
|-------------|-------------|--------------|----------|
| **Cross Margin** | Shared margin across all positions | Higher risk, better capital efficiency | Experienced traders, correlated positions |
| **Isolated Margin** | Per-position margin allocation | Lower risk, position-specific | Risk management, uncorrelated positions |
| **Portfolio Margin** | Risk-based margin (advanced) | Lowest margin, highest complexity | Institutional, hedged portfolios |

**Margin Requirement Formulas:**

```python
class MarginCalculator:
    """
    Calculate margin requirements for different position types.
    """

    def calculate_initial_margin(self, position: Position) -> Decimal:
        """
        Initial margin required to open position.

        Formula: Position Value / Leverage
        """
        position_value = position.quantity * position.entry_price
        initial_margin = position_value / position.leverage

        # Apply leverage tier adjustments (higher size = lower max leverage)
        tier_multiplier = self.get_leverage_tier_multiplier(position)
        adjusted_margin = initial_margin * tier_multiplier

        return adjusted_margin

    def calculate_maintenance_margin(self, position: Position) -> Decimal:
        """
        Maintenance margin required to keep position open.

        Typically 50-80% of initial margin.
        """
        initial_margin = self.calculate_initial_margin(position)
        maintenance_rate = self.get_maintenance_rate(position.symbol)

        return initial_margin * maintenance_rate

    def calculate_cross_margin_level(self, account: Account) -> Decimal:
        """
        Cross margin level = Total Equity / Total Maintenance Margin

        Liquidation occurs when margin level < 1.0
        """
        total_equity = account.balance + account.unrealized_pnl
        total_maintenance_margin = sum(
            self.calculate_maintenance_margin(pos)
            for pos in account.positions
        )

        if total_maintenance_margin == 0:
            return Decimal('Infinity')

        margin_level = total_equity / total_maintenance_margin
        return margin_level

    def calculate_isolated_margin_level(self, position: Position) -> Decimal:
        """
        Isolated margin level for single position.

        Margin Level = (Margin Balance + Unrealized PnL) / Maintenance Margin
        """
        position_equity = position.margin_balance + position.unrealized_pnl
        maintenance_margin = self.calculate_maintenance_margin(position)

        if maintenance_margin == 0:
            return Decimal('Infinity')

        margin_level = position_equity / maintenance_margin
        return margin_level
```

**Leverage Tier System:**

```typescript
// Example: BTC/USDT Perpetual on Binance
interface LeverageTier {
  tier: number;
  notional_floor: number;  // USD
  notional_cap: number;    // USD
  max_leverage: number;
  maintenance_margin_rate: number;
}

const BTC_LEVERAGE_TIERS: LeverageTier[] = [
  { tier: 1, notional_floor: 0, notional_cap: 50000, max_leverage: 125, maintenance_margin_rate: 0.004 },
  { tier: 2, notional_floor: 50000, notional_cap: 250000, max_leverage: 100, maintenance_margin_rate: 0.005 },
  { tier: 3, notional_floor: 250000, notional_cap: 1000000, max_leverage: 50, maintenance_margin_rate: 0.01 },
  { tier: 4, notional_floor: 1000000, notional_cap: 5000000, max_leverage: 20, maintenance_margin_rate: 0.025 },
  { tier: 5, notional_floor: 5000000, notional_cap: 20000000, max_leverage: 10, maintenance_margin_rate: 0.05 },
  { tier: 6, notional_floor: 20000000, notional_cap: 50000000, max_leverage: 5, maintenance_margin_rate: 0.10 },
  { tier: 7, notional_floor: 50000000, notional_cap: 100000000, max_leverage: 4, maintenance_margin_rate: 0.125 },
  { tier: 8, notional_floor: 100000000, notional_cap: Infinity, max_leverage: 3, maintenance_margin_rate: 0.15 }
];
```

#### Liquidation Logic

**Liquidation Price Calculation:**

```python
def calculate_liquidation_price(position: Position, margin_type: str) -> Decimal:
    """
    Calculate price at which position will be liquidated.

    For Long Position:
    Liquidation Price = Entry Price * (1 - (Initial Margin - Maintenance Margin) / Position Size)

    For Short Position:
    Liquidation Price = Entry Price * (1 + (Initial Margin - Maintenance Margin) / Position Size)
    """
    if margin_type == 'isolated':
        return calculate_isolated_liquidation_price(position)
    elif margin_type == 'cross':
        return calculate_cross_liquidation_price(position)
    else:
        raise ValueError(f"Unknown margin type: {margin_type}")

def calculate_isolated_liquidation_price(position: Position) -> Decimal:
    """
    Isolated margin liquidation price.
    """
    entry_price = position.entry_price
    leverage = position.leverage
    maintenance_rate = position.maintenance_margin_rate

    if position.side == 'long':
        # Long liquidation price
        liq_price = entry_price * (1 - (1/leverage - maintenance_rate))
    else:
        # Short liquidation price
        liq_price = entry_price * (1 + (1/leverage - maintenance_rate))

    return liq_price

def calculate_cross_liquidation_price(position: Position) -> Decimal:
    """
    Cross margin liquidation price (more complex, depends on all positions).
    """
    # Simplified calculation (actual implementation more complex)
    account_equity = position.account.total_equity
    other_positions_margin = sum(
        calc_maintenance_margin(p)
        for p in position.account.positions
        if p.id != position.id
    )

    available_margin = account_equity - other_positions_margin
    maintenance_margin = position.quantity * position.entry_price * position.maintenance_margin_rate

    if position.side == 'long':
        liq_price = (position.quantity * position.entry_price - available_margin + maintenance_margin) / position.quantity
    else:
        liq_price = (position.quantity * position.entry_price + available_margin - maintenance_margin) / position.quantity

    return liq_price
```

**Liquidation Process:**

```typescript
interface LiquidationEvent {
  position_id: string;
  user_id: string;
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  entry_price: number;
  liquidation_price: number;
  liquidation_type: 'partial' | 'full';
  liquidation_fee: number;
  insurance_fund_contribution: number;
  timestamp: string;
}

class LiquidationEngine {
  async check_liquidation(position: Position): Promise<LiquidationResult> {
    const current_price = await this.get_mark_price(position.symbol);
    const liq_price = this.calculate_liquidation_price(position);

    // Check if liquidation triggered
    const should_liquidate = (
      (position.side === 'long' && current_price <= liq_price) ||
      (position.side === 'short' && current_price >= liq_price)
    );

    if (!should_liquidate) {
      return { liquidated: false };
    }

    // Attempt partial liquidation first (reduce position by 50%)
    const partial_result = await this.attempt_partial_liquidation(position);
    if (partial_result.success) {
      return { liquidated: true, type: 'partial', ...partial_result };
    }

    // Full liquidation if partial fails
    const full_result = await this.execute_full_liquidation(position);
    return { liquidated: true, type: 'full', ...full_result };
  }

  async execute_full_liquidation(position: Position): Promise<LiquidationResult> {
    // Close position at bankruptcy price
    const bankruptcy_price = this.calculate_bankruptcy_price(position);

    // Calculate liquidation fee (typically 0.5-1% of position value)
    const liquidation_fee = position.quantity * bankruptcy_price * 0.005;

    // Remaining value goes to insurance fund
    const insurance_contribution = Math.max(0,
      position.margin_balance - liquidation_fee
    );

    // Execute liquidation order
    await this.place_liquidation_order({
      symbol: position.symbol,
      side: position.side === 'long' ? 'sell' : 'buy',
      quantity: position.quantity,
      price: bankruptcy_price,
      reduce_only: true
    });

    // Log liquidation event
    await this.log_liquidation({
      position_id: position.id,
      user_id: position.user_id,
      liquidation_type: 'full',
      liquidation_fee,
      insurance_fund_contribution: insurance_contribution
    });

    // Notify user
    await this.notify_user_liquidation(position.user_id, position);

    return {
      success: true,
      liquidation_fee,
      insurance_contribution
    };
  }
}
```

**Auto-Deleveraging (ADL) System:**

When insurance fund insufficient, ADL system deleverages profitable positions:

```python
class ADLSystem:
    """
    Auto-Deleveraging system for when insurance fund is depleted.
    """

    def calculate_adl_ranking(self, position: Position) -> float:
        """
        ADL ranking = Profit Percentage * Effective Leverage

        Higher ranking = higher priority for deleveraging
        """
        profit_pct = position.unrealized_pnl / position.margin_balance
        effective_leverage = position.position_value / position.margin_balance

        adl_score = profit_pct * effective_leverage
        return adl_score

    def get_adl_queue(self, symbol: str, side: str) -> List[Position]:
        """
        Get positions ranked by ADL priority (highest first).
        """
        positions = self.get_profitable_positions(symbol, side)
        ranked = sorted(positions, key=self.calculate_adl_ranking, reverse=True)
        return ranked
```

#### Funding Rates (Perpetual Futures)

**Funding Rate Mechanism:**

```python
class FundingRateCalculator:
    """
    Calculate and apply funding rates for perpetual contracts.
    """

    def calculate_funding_rate(self, symbol: str) -> Decimal:
        """
        Funding Rate = Premium Index / Funding Interval

        Premium Index = (Mark Price - Index Price) / Index Price
        Funding Interval = 8 hours (typical)
        """
        mark_price = self.get_mark_price(symbol)
        index_price = self.get_index_price(symbol)

        premium = (mark_price - index_price) / index_price

        # Apply interest rate component (typically 0.01% per 8 hours)
        interest_rate = Decimal('0.0001')

        # Clamp funding rate (typically Â±0.75% per 8 hours)
        funding_rate = premium + interest_rate
        funding_rate = max(min(funding_rate, Decimal('0.0075')), Decimal('-0.0075'))

        return funding_rate

    def calculate_funding_payment(self, position: Position, funding_rate: Decimal) -> Decimal:
        """
        Funding Payment = Position Value * Funding Rate

        Positive = Long pays Short
        Negative = Short pays Long
        """
        position_value = position.quantity * position.mark_price

        if position.side == 'long':
            payment = -position_value * funding_rate  # Long pays
        else:
            payment = position_value * funding_rate   # Short receives

        return payment

    async def apply_funding(self, symbol: str):
        """
        Apply funding payments every 8 hours.
        """
        funding_rate = self.calculate_funding_rate(symbol)
        positions = self.get_open_positions(symbol)

        for position in positions:
            payment = self.calculate_funding_payment(position, funding_rate)

            # Update position margin
            position.margin_balance += payment

            # Log funding event
            await self.log_funding_event({
                'position_id': position.id,
                'symbol': symbol,
                'funding_rate': funding_rate,
                'payment': payment,
                'timestamp': utc_now()
            })
```

**Funding Rate History & Prediction:**

```typescript
interface FundingRateHistory {
  symbol: string;
  timestamp: string;
  funding_rate: number;
  predicted_next_rate: number;
  mark_price: number;
  index_price: number;
  premium: number;
}

// Display funding rate in UI
{
  "symbol": "BTC/USDT:USDT",
  "current_funding_rate": 0.0001,  // 0.01%
  "next_funding_time": "2024-10-18T16:00:00Z",
  "8h_avg": 0.00015,
  "24h_avg": 0.00012,
  "7d_avg": 0.00008,
  "predicted_next": 0.00009
}
```

#### Margin Calls & Alerts

**Margin Level Thresholds:**

| Margin Level | Status | Action | Alert |
|--------------|--------|--------|-------|
| > 2.0 | Healthy | None | None |
| 1.5 - 2.0 | Warning | Monitor | Email notification |
| 1.2 - 1.5 | Critical | Add margin or reduce position | Push + Email + SMS |
| 1.0 - 1.2 | Danger | Immediate action required | All channels + In-app modal |
| < 1.0 | Liquidation | Automatic liquidation | Post-liquidation notification |

**Margin Call Automation:**

```python
class MarginCallSystem:
    """
    Automated margin call and position management system.
    """

    async def monitor_margin_levels(self):
        """
        Continuously monitor all positions for margin calls.
        """
        while True:
            accounts = await self.get_all_leveraged_accounts()

            for account in accounts:
                margin_level = self.calculate_margin_level(account)

                if margin_level < 2.0:
                    await self.handle_low_margin(account, margin_level)

            await asyncio.sleep(10)  # Check every 10 seconds

    async def handle_low_margin(self, account: Account, margin_level: float):
        """
        Handle low margin situations with escalating actions.
        """
        if margin_level >= 1.5:
            # Warning level - notify user
            await self.send_margin_warning(account, margin_level)

        elif margin_level >= 1.2:
            # Critical level - urgent notification
            await self.send_critical_margin_alert(account, margin_level)

            # Suggest actions
            suggestions = self.generate_margin_suggestions(account)
            await self.send_action_suggestions(account, suggestions)

        elif margin_level >= 1.0:
            # Danger level - auto-reduce if enabled
            if account.settings.auto_reduce_enabled:
                await self.auto_reduce_position(account)
            else:
                await self.send_emergency_alert(account, margin_level)

        else:
            # Liquidation triggered
            await self.trigger_liquidation(account)

    def generate_margin_suggestions(self, account: Account) -> List[str]:
        """
        Generate actionable suggestions to improve margin level.
        """
        suggestions = []

        # Calculate required margin to reach safe level (2.0)
        current_equity = account.total_equity
        maintenance_margin = account.total_maintenance_margin
        required_equity = maintenance_margin * 2.0
        margin_deficit = required_equity - current_equity

        suggestions.append(f"Add ${margin_deficit:.2f} to margin balance")

        # Suggest reducing positions
        positions_by_risk = sorted(
            account.positions,
            key=lambda p: p.unrealized_pnl / p.margin_balance
        )

        for position in positions_by_risk[:3]:
            reduce_pct = 0.5  # Reduce by 50%
            margin_freed = position.margin_balance * reduce_pct
            suggestions.append(
                f"Reduce {position.symbol} position by {reduce_pct*100}% "
                f"(frees ${margin_freed:.2f} margin)"
            )

        return suggestions
```


### Commission & Fee Structures

Comprehensive fee modeling, slippage prediction, and Total Cost Analysis (TCA) for accurate P&L calculation and execution optimization.

#### Exchange Fee Tiers

**Maker/Taker Fee Schedules:**

```typescript
interface FeeTier {
  tier: number;
  volume_30d_usd: number;  // 30-day trading volume
  maker_fee: number;       // Percentage (0.001 = 0.1%)
  taker_fee: number;       // Percentage
  requirements?: string;   // Additional requirements (e.g., hold BNB)
}

// Example: Binance Spot Fee Tiers
const BINANCE_SPOT_TIERS: FeeTier[] = [
  { tier: 0, volume_30d_usd: 0, maker_fee: 0.001, taker_fee: 0.001 },
  { tier: 1, volume_30d_usd: 50000, maker_fee: 0.0009, taker_fee: 0.001 },
  { tier: 2, volume_30d_usd: 500000, maker_fee: 0.0008, taker_fee: 0.001 },
  { tier: 3, volume_30d_usd: 2000000, maker_fee: 0.0007, taker_fee: 0.001 },
  { tier: 4, volume_30d_usd: 5000000, maker_fee: 0.0007, taker_fee: 0.0009 },
  { tier: 5, volume_30d_usd: 10000000, maker_fee: 0.0006, taker_fee: 0.0008 },
  { tier: 6, volume_30d_usd: 20000000, maker_fee: 0.0005, taker_fee: 0.0007 },
  { tier: 7, volume_30d_usd: 40000000, maker_fee: 0.0004, taker_fee: 0.0006 },
  { tier: 8, volume_30d_usd: 80000000, maker_fee: 0.0003, taker_fee: 0.0005 },
  { tier: 9, volume_30d_usd: 150000000, maker_fee: 0.0000, taker_fee: 0.0002 }  // Maker rebate!
];

// Example: Coinbase Advanced Trade Fee Tiers
const COINBASE_ADVANCED_TIERS: FeeTier[] = [
  { tier: 0, volume_30d_usd: 0, maker_fee: 0.006, taker_fee: 0.008 },
  { tier: 1, volume_30d_usd: 10000, maker_fee: 0.004, taker_fee: 0.006 },
  { tier: 2, volume_30d_usd: 50000, maker_fee: 0.0025, taker_fee: 0.004 },
  { tier: 3, volume_30d_usd: 100000, maker_fee: 0.0015, taker_fee: 0.0025 },
  { tier: 4, volume_30d_usd: 1000000, maker_fee: 0.001, taker_fee: 0.0018 },
  { tier: 5, volume_30d_usd: 15000000, maker_fee: 0.0008, taker_fee: 0.0015 },
  { tier: 6, volume_30d_usd: 75000000, maker_fee: 0.0005, taker_fee: 0.0012 },
  { tier: 7, volume_30d_usd: 300000000, maker_fee: 0.0003, taker_fee: 0.001 },
  { tier: 8, volume_30d_usd: 500000000, maker_fee: 0.0000, taker_fee: 0.0008 }
];
```

**Fee Discount Programs:**

| Exchange | Discount Type | Discount Amount | Requirements |
|----------|---------------|-----------------|--------------|
| **Binance** | BNB Holdings | 25% off fees | Hold â‰¥25 BNB |
| **Binance** | BNB Payment | 10% off fees | Pay fees in BNB |
| **Bybit** | VIP Program | Up to 50% off | Volume + holdings |
| **OKX** | OKB Holdings | Up to 40% off | Hold OKB tokens |
| **KuCoin** | KCS Holdings | Up to 20% off | Hold KCS tokens |

**Fee Calculation Engine:**

```python
class FeeCalculator:
    """
    Calculate trading fees with tier-based pricing and discounts.
    """

    def calculate_fee(self, order: Order, user: User) -> FeeResult:
        """
        Calculate fee for an order considering tier, discounts, and payment currency.
        """
        # Get user's fee tier based on 30-day volume
        tier = self.get_user_tier(user, order.exchange)

        # Determine if maker or taker
        is_maker = self.is_maker_order(order)
        fee_rate = tier.maker_fee if is_maker else tier.taker_fee

        # Apply discounts
        if self.has_token_discount(user, order.exchange):
            discount = self.get_token_discount(user, order.exchange)
            fee_rate = fee_rate * (1 - discount)

        # Calculate base fee
        order_value = order.quantity * order.price
        base_fee = order_value * fee_rate

        # Handle negative fees (maker rebates)
        if fee_rate < 0:
            return FeeResult(
                amount=abs(base_fee),
                rate=fee_rate,
                is_rebate=True,
                currency=order.quote_currency
            )

        # Determine fee currency
        fee_currency = self.get_fee_currency(user, order)

        # Convert if paying in different currency (e.g., BNB)
        if fee_currency != order.quote_currency:
            fee_amount = self.convert_fee_currency(
                base_fee,
                order.quote_currency,
                fee_currency
            )
        else:
            fee_amount = base_fee

        return FeeResult(
            amount=fee_amount,
            rate=fee_rate,
            is_rebate=False,
            currency=fee_currency,
            discount_applied=discount if 'discount' in locals() else 0
        )

    def get_user_tier(self, user: User, exchange: str) -> FeeTier:
        """
        Determine user's fee tier based on 30-day trading volume.
        """
        volume_30d = self.calculate_30d_volume(user, exchange)
        tiers = self.get_exchange_tiers(exchange)

        # Find highest tier user qualifies for
        applicable_tier = tiers[0]  # Default to tier 0
        for tier in tiers:
            if volume_30d >= tier.volume_30d_usd:
                applicable_tier = tier
            else:
                break

        return applicable_tier
```

#### Slippage Modeling

**Slippage Prediction Models:**

```python
class SlippagePredictor:
    """
    Predict slippage based on order size, market conditions, and historical data.
    """

    def predict_slippage(self, order: Order, market_data: MarketData) -> SlippagePrediction:
        """
        Predict expected slippage for an order.

        Uses multiple models:
        1. Order book depth analysis
        2. Historical slippage by order size
        3. Volatility-adjusted estimates
        4. Market impact models
        """
        # Model 1: Order book depth
        depth_slippage = self.calculate_depth_slippage(order, market_data.order_book)

        # Model 2: Historical slippage
        historical_slippage = self.get_historical_slippage(
            symbol=order.symbol,
            exchange=order.exchange,
            order_size=order.quantity * order.price,
            time_of_day=order.timestamp.hour
        )

        # Model 3: Volatility adjustment
        volatility = market_data.volatility_1h
        volatility_multiplier = 1 + (volatility / 100)  # Higher vol = more slippage

        # Model 4: Market impact (square-root model)
        adv = market_data.average_daily_volume
        participation_rate = (order.quantity * order.price) / adv
        market_impact = 0.1 * math.sqrt(participation_rate)  # 10 bps * sqrt(participation)

        # Combine models (weighted average)
        predicted_slippage = (
            depth_slippage * 0.4 +
            historical_slippage * 0.3 +
            (depth_slippage * volatility_multiplier) * 0.2 +
            market_impact * 0.1
        )

        return SlippagePrediction(
            expected_slippage_bps=predicted_slippage * 10000,  # Convert to basis points
            confidence=self.calculate_confidence(market_data),
            breakdown={
                'depth': depth_slippage,
                'historical': historical_slippage,
                'volatility': volatility_multiplier,
                'market_impact': market_impact
            }
        )

    def calculate_depth_slippage(self, order: Order, order_book: OrderBook) -> float:
        """
        Calculate slippage based on order book depth.
        """
        if order.side == 'buy':
            levels = order_book.asks
        else:
            levels = order_book.bids

        remaining_quantity = order.quantity
        total_cost = 0

        for price, quantity in levels:
            fill_quantity = min(remaining_quantity, quantity)
            total_cost += fill_quantity * price
            remaining_quantity -= fill_quantity

            if remaining_quantity <= 0:
                break

        if remaining_quantity > 0:
            # Not enough liquidity - high slippage expected
            return 0.01  # 1% slippage estimate

        avg_fill_price = total_cost / order.quantity
        mid_price = (order_book.best_bid + order_book.best_ask) / 2

        slippage = abs(avg_fill_price - mid_price) / mid_price
        return slippage
```

**Time-of-Day Slippage Patterns:**

```typescript
interface SlippagePattern {
  hour_utc: number;
  avg_slippage_bps: number;
  sample_size: number;
}

// Example: BTC/USDT slippage by hour (UTC)
const BTC_SLIPPAGE_PATTERNS: SlippagePattern[] = [
  { hour_utc: 0, avg_slippage_bps: 3.2, sample_size: 1250 },   // Low liquidity
  { hour_utc: 1, avg_slippage_bps: 3.5, sample_size: 980 },
  { hour_utc: 8, avg_slippage_bps: 2.1, sample_size: 3200 },   // Asia trading hours
  { hour_utc: 13, avg_slippage_bps: 1.8, sample_size: 4500 },  // EU trading hours
  { hour_utc: 14, avg_slippage_bps: 1.5, sample_size: 5200 },  // Peak liquidity (EU + US overlap)
  { hour_utc: 20, avg_slippage_bps: 2.3, sample_size: 2800 },  // US evening
  { hour_utc: 23, avg_slippage_bps: 3.0, sample_size: 1500 }   // Low liquidity
];
```

#### Total Cost Analysis (TCA)

**TCA Metrics:**

```typescript
interface TCAMetrics {
  order_id: string;
  symbol: string;
  side: 'buy' | 'sell';

  // Prices
  decision_price: number;      // Price when decision made
  arrival_price: number;       // Price when order submitted
  benchmark_price: number;     // VWAP/TWAP during execution period
  average_fill_price: number;  // Actual average fill price

  // Slippage components
  decision_slippage: number;   // Arrival - Decision
  execution_slippage: number;  // Fill - Arrival
  total_slippage: number;      // Fill - Decision

  // Costs
  explicit_costs: number;      // Fees paid
  implicit_costs: number;      // Slippage cost
  total_costs: number;         // Explicit + Implicit

  // Performance metrics
  implementation_shortfall: number;  // Total cost as % of decision price
  price_improvement: number;         // Positive if better than benchmark
  fill_rate: number;                 // Percentage filled
  time_to_fill: number;              // Seconds

  // Market impact
  market_impact_bps: number;   // Estimated market impact
  participation_rate: number;  // Order size / ADV
}
```

**TCA Calculation:**

```python
class TCAAnalyzer:
    """
    Comprehensive Transaction Cost Analysis.
    """

    def analyze_execution(self, order: Order, fills: List[Fill]) -> TCAMetrics:
        """
        Analyze execution quality for a completed order.
        """
        # Calculate average fill price
        total_quantity = sum(f.quantity for f in fills)
        total_cost = sum(f.quantity * f.price for f in fills)
        avg_fill_price = total_cost / total_quantity

        # Get benchmark prices
        decision_price = order.decision_price  # Price when strategy decided to trade
        arrival_price = order.arrival_price    # Price when order submitted
        benchmark_price = self.calculate_vwap(
            symbol=order.symbol,
            start_time=order.created_at,
            end_time=fills[-1].timestamp
        )

        # Calculate slippage components
        decision_slippage = arrival_price - decision_price
        execution_slippage = avg_fill_price - arrival_price
        total_slippage = avg_fill_price - decision_price

        # Calculate costs
        explicit_costs = sum(f.fee for f in fills)
        implicit_costs = abs(total_slippage) * total_quantity
        total_costs = explicit_costs + implicit_costs

        # Implementation shortfall (as percentage)
        implementation_shortfall = (total_costs / (decision_price * total_quantity)) * 100

        # Price improvement (positive is good)
        price_improvement = (benchmark_price - avg_fill_price) * total_quantity
        if order.side == 'sell':
            price_improvement = -price_improvement  # Flip sign for sells

        # Fill metrics
        fill_rate = total_quantity / order.quantity
        time_to_fill = (fills[-1].timestamp - order.created_at).total_seconds()

        # Market impact
        adv = self.get_average_daily_volume(order.symbol)
        participation_rate = (order.quantity * decision_price) / adv
        market_impact_bps = self.estimate_market_impact(participation_rate) * 10000

        return TCAMetrics(
            order_id=order.id,
            symbol=order.symbol,
            side=order.side,
            decision_price=decision_price,
            arrival_price=arrival_price,
            benchmark_price=benchmark_price,
            average_fill_price=avg_fill_price,
            decision_slippage=decision_slippage,
            execution_slippage=execution_slippage,
            total_slippage=total_slippage,
            explicit_costs=explicit_costs,
            implicit_costs=implicit_costs,
            total_costs=total_costs,
            implementation_shortfall=implementation_shortfall,
            price_improvement=price_improvement,
            fill_rate=fill_rate,
            time_to_fill=time_to_fill,
            market_impact_bps=market_impact_bps,
            participation_rate=participation_rate
        )
```

**Venue Comparison Scorecards:**

```typescript
interface VenueScorecard {
  exchange: string;
  symbol: string;
  period: string;  // '7d', '30d', '90d'

  // Execution quality
  avg_fill_rate: number;
  avg_slippage_bps: number;
  avg_time_to_fill_ms: number;
  price_improvement_rate: number;  // % of orders with price improvement

  // Costs
  avg_maker_fee_bps: number;
  avg_taker_fee_bps: number;
  maker_taker_ratio: number;  // % maker orders

  // Reliability
  order_success_rate: number;
  avg_latency_ms: number;
  uptime_pct: number;

  // Liquidity
  avg_spread_bps: number;
  avg_depth_at_best: number;

  // Overall score (0-100)
  overall_score: number;
}

// Example scorecard
{
  "exchange": "binance",
  "symbol": "BTC/USDT",
  "period": "30d",
  "avg_fill_rate": 0.98,
  "avg_slippage_bps": 1.8,
  "avg_time_to_fill_ms": 250,
  "price_improvement_rate": 0.15,
  "avg_maker_fee_bps": 1.0,
  "avg_taker_fee_bps": 1.0,
  "maker_taker_ratio": 0.65,
  "order_success_rate": 0.995,
  "avg_latency_ms": 45,
  "uptime_pct": 99.9,
  "avg_spread_bps": 0.5,
  "avg_depth_at_best": 50000,
  "overall_score": 92
}
```


### Advanced Order Types & Execution Algorithms

Sophisticated order types and execution algorithms for professional trading, including TWAP, VWAP, conditional orders, and multi-leg strategies.

#### Algorithmic Order Types

**TWAP (Time-Weighted Average Price):**

```python
class TWAPExecutor:
    """
    Execute order evenly over specified time period.
    """

    def execute_twap(self, order: Order, duration_minutes: int) -> TWAPExecution:
        """
        Split order into equal slices and execute at regular intervals.

        Example: 1000 BTC over 60 minutes = 16.67 BTC every minute
        """
        total_quantity = order.quantity
        num_slices = duration_minutes
        slice_quantity = total_quantity / num_slices
        interval_seconds = 60  # 1 minute intervals

        executions = []
        for i in range(num_slices):
            # Schedule slice execution
            execution_time = datetime.now() + timedelta(seconds=i * interval_seconds)

            slice_order = Order(
                symbol=order.symbol,
                side=order.side,
                type='market',  # or 'limit' with current price
                quantity=slice_quantity,
                scheduled_time=execution_time,
                parent_order_id=order.id,
                execution_strategy='TWAP'
            )

            executions.append(slice_order)

        return TWAPExecution(
            parent_order=order,
            slices=executions,
            duration_minutes=duration_minutes,
            slice_interval_seconds=interval_seconds
        )
```

**VWAP (Volume-Weighted Average Price):**

```typescript
interface VWAPExecution {
  parent_order: Order;
  slices: Order[];
  target_vwap: number;
  actual_vwap: number;
  participation_rate: number;  // % of market volume
}

class VWAPExecutor {
  async executeVWAP(
    order: Order,
    duration_minutes: number,
    participation_rate: number = 0.1  // 10% of market volume
  ): Promise<VWAPExecution> {
    // Get historical volume profile
    const volumeProfile = await this.getHistoricalVolumeProfile(
      order.symbol,
      duration_minutes
    );

    // Calculate slice sizes based on expected volume
    const slices: Order[] = [];
    let remainingQuantity = order.quantity;

    for (let i = 0; i < duration_minutes; i++) {
      const expectedVolume = volumeProfile[i];
      const targetVolume = expectedVolume * participation_rate;
      const sliceQuantity = Math.min(targetVolume, remainingQuantity);

      slices.push({
        symbol: order.symbol,
        side: order.side,
        type: 'limit',  // Use limit orders to control price
        quantity: sliceQuantity,
        price: await this.getCurrentPrice(order.symbol),
        scheduled_time: new Date(Date.now() + i * 60000),
        parent_order_id: order.id,
        execution_strategy: 'VWAP'
      });

      remainingQuantity -= sliceQuantity;

      if (remainingQuantity <= 0) break;
    }

    return {
      parent_order: order,
      slices,
      target_vwap: await this.calculateTargetVWAP(order.symbol),
      actual_vwap: 0,  // Updated as slices execute
      participation_rate
    };
  }
}
```

**POV (Percentage of Volume):**

```python
class POVExecutor:
    """
    Execute order as percentage of market volume.
    """

    async def execute_pov(
        self,
        order: Order,
        target_pov: float = 0.1,  # 10% of volume
        max_duration_minutes: int = 60
    ) -> POVExecution:
        """
        Continuously monitor market volume and execute proportionally.
        """
        start_time = datetime.now()
        executed_quantity = 0
        executions = []

        while executed_quantity < order.quantity:
            # Check if max duration exceeded
            if (datetime.now() - start_time).total_seconds() > max_duration_minutes * 60:
                # Execute remaining quantity immediately
                remaining = order.quantity - executed_quantity
                await self.execute_market_order(order.symbol, order.side, remaining)
                break

            # Get recent market volume (last 1 minute)
            market_volume = await self.get_recent_volume(order.symbol, seconds=60)

            # Calculate target execution quantity
            target_quantity = market_volume * target_pov
            slice_quantity = min(target_quantity, order.quantity - executed_quantity)

            # Execute slice
            if slice_quantity > 0:
                execution = await self.execute_market_order(
                    order.symbol,
                    order.side,
                    slice_quantity
                )
                executions.append(execution)
                executed_quantity += slice_quantity

            # Wait before next slice (e.g., 10 seconds)
            await asyncio.sleep(10)

        return POVExecution(
            parent_order=order,
            executions=executions,
            target_pov=target_pov,
            actual_pov=self.calculate_actual_pov(executions),
            duration_seconds=(datetime.now() - start_time).total_seconds()
        )
```

**Iceberg Orders (Advanced):**

```typescript
interface IcebergOrder {
  symbol: string;
  side: 'buy' | 'sell';
  total_quantity: number;
  visible_quantity: number;  // Show only this amount
  price: number;
  slices_executed: number;
  remaining_quantity: number;
}

class IcebergExecutor {
  async executeIceberg(order: IcebergOrder): Promise<IcebergExecution> {
    const slices: Order[] = [];
    let remaining = order.total_quantity;

    while (remaining > 0) {
      const sliceQuantity = Math.min(order.visible_quantity, remaining);

      // Place visible slice
      const sliceOrder = await this.placeOrder({
        symbol: order.symbol,
        side: order.side,
        type: 'limit',
        quantity: sliceQuantity,
        price: order.price,
        post_only: true  // Ensure maker order
      });

      // Wait for slice to fill
      await this.waitForFill(sliceOrder.id);

      slices.push(sliceOrder);
      remaining -= sliceQuantity;

      // Small delay before next slice
      await this.sleep(1000);
    }

    return {
      parent_order: order,
      slices,
      total_executed: order.total_quantity,
      avg_fill_price: this.calculateAvgPrice(slices)
    };
  }
}
```

#### Conditional Orders

**If-Then Orders:**

```python
class ConditionalOrderEngine:
    """
    Execute orders based on conditions.
    """

    def create_if_then_order(
        self,
        condition: OrderCondition,
        then_order: Order
    ) -> ConditionalOrder:
        """
        Create order that executes when condition is met.

        Example: If BTC > $50,000, then buy 1 ETH
        """
        return ConditionalOrder(
            id=generate_uuid(),
            condition=condition,
            action=then_order,
            status='pending',
            created_at=datetime.utcnow()
        )

    async def monitor_conditions(self):
        """
        Continuously monitor all pending conditional orders.
        """
        while True:
            pending_orders = self.get_pending_conditional_orders()

            for order in pending_orders:
                if await self.evaluate_condition(order.condition):
                    # Condition met - execute order
                    await self.execute_order(order.action)
                    order.status = 'triggered'
                    await self.save_order(order)

            await asyncio.sleep(1)  # Check every second
```

**Bracket Orders:**

```typescript
interface BracketOrder {
  entry_order: Order;
  take_profit_order: Order;
  stop_loss_order: Order;
  status: 'pending' | 'entry_filled' | 'closed';
}

class BracketOrderManager {
  async createBracketOrder(
    symbol: string,
    side: 'buy' | 'sell',
    quantity: number,
    entry_price: number,
    take_profit_price: number,
    stop_loss_price: number
  ): Promise<BracketOrder> {
    // Place entry order
    const entryOrder = await this.placeOrder({
      symbol,
      side,
      type: 'limit',
      quantity,
      price: entry_price
    });

    // Create OCO for exit (take profit + stop loss)
    const exitSide = side === 'buy' ? 'sell' : 'buy';

    const takeProfitOrder = {
      symbol,
      side: exitSide,
      type: 'limit',
      quantity,
      price: take_profit_price,
      reduce_only: true,
      parent_order_id: entryOrder.id
    };

    const stopLossOrder = {
      symbol,
      side: exitSide,
      type: 'stop',
      quantity,
      stop_price: stop_loss_price,
      reduce_only: true,
      parent_order_id: entryOrder.id
    };

    return {
      entry_order: entryOrder,
      take_profit_order: takeProfitOrder,
      stop_loss_order: stopLossOrder,
      status: 'pending'
    };
  }

  async onEntryFilled(bracket: BracketOrder) {
    // Entry filled - place exit orders
    await this.placeOCOOrder(
      bracket.take_profit_order,
      bracket.stop_loss_order
    );

    bracket.status = 'entry_filled';
  }
}
```

#### Multi-Leg Orders

**Spread Orders:**

```python
class SpreadOrderExecutor:
    """
    Execute multi-leg spread orders.
    """

    def create_spread_order(
        self,
        leg1: SpreadLeg,
        leg2: SpreadLeg,
        spread_price: float
    ) -> SpreadOrder:
        """
        Create spread order (e.g., buy BTC/sell ETH).

        Example: Long BTC/Short ETH spread
        """
        return SpreadOrder(
            legs=[leg1, leg2],
            spread_price=spread_price,
            status='pending'
        )

    async def execute_spread(self, spread: SpreadOrder):
        """
        Execute both legs simultaneously or near-simultaneously.
        """
        # Execute legs in parallel
        leg1_task = asyncio.create_task(self.execute_leg(spread.legs[0]))
        leg2_task = asyncio.create_task(self.execute_leg(spread.legs[1]))

        # Wait for both legs
        leg1_result, leg2_result = await asyncio.gather(leg1_task, leg2_task)

        # Calculate actual spread
        actual_spread = leg1_result.avg_price - leg2_result.avg_price

        return SpreadExecution(
            spread=spread,
            leg1_execution=leg1_result,
            leg2_execution=leg2_result,
            target_spread=spread.spread_price,
            actual_spread=actual_spread,
            slippage=actual_spread - spread.spread_price
        )
```


### Multi-Asset Portfolio Management

Advanced portfolio management features including rebalancing, risk parity allocation, multi-currency accounting, and comprehensive portfolio analytics.

#### Portfolio Rebalancing

**Rebalancing Strategies:**

```python
class PortfolioRebalancer:
    """
    Automated portfolio rebalancing with multiple strategies.
    """

    def rebalance_portfolio(self, portfolio: Portfolio, strategy: str) -> RebalanceProposal:
        """
        Generate rebalancing proposal based on strategy.

        Strategies:
        - threshold: Rebalance when allocation drifts > X%
        - calendar: Rebalance on fixed schedule (monthly, quarterly)
        - volatility: Rebalance when volatility exceeds threshold
        - tax_aware: Minimize tax impact (avoid wash sales, harvest losses)
        """
        if strategy == 'threshold':
            return self.threshold_rebalance(portfolio)
        elif strategy == 'calendar':
            return self.calendar_rebalance(portfolio)
        elif strategy == 'volatility':
            return self.volatility_rebalance(portfolio)
        elif strategy == 'tax_aware':
            return self.tax_aware_rebalance(portfolio)
        else:
            raise ValueError(f"Unknown rebalancing strategy: {strategy}")

    def threshold_rebalance(self, portfolio: Portfolio) -> RebalanceProposal:
        """
        Rebalance when allocation drifts beyond threshold.
        """
        target_allocations = portfolio.target_allocations
        current_allocations = self.calculate_current_allocations(portfolio)

        trades = []
        for asset, target_pct in target_allocations.items():
            current_pct = current_allocations.get(asset, 0)
            drift = abs(current_pct - target_pct)

            # Rebalance if drift > 5%
            if drift > 0.05:
                target_value = portfolio.total_value * target_pct
                current_value = portfolio.positions.get(asset, 0) * self.get_price(asset)
                trade_value = target_value - current_value

                trades.append(RebalanceTrade(
                    asset=asset,
                    current_allocation=current_pct,
                    target_allocation=target_pct,
                    drift=drift,
                    trade_value=trade_value,
                    side='buy' if trade_value > 0 else 'sell',
                    quantity=abs(trade_value) / self.get_price(asset)
                ))

        return RebalanceProposal(
            strategy='threshold',
            trades=trades,
            estimated_cost=self.calculate_rebalance_cost(trades),
            tax_impact=self.calculate_tax_impact(trades)
        )
```

**Tax-Aware Rebalancing:**

```typescript
interface TaxAwareRebalance {
  trades: RebalanceTrade[];
  tax_optimization: {
    losses_harvested: number;
    gains_deferred: number;
    wash_sales_avoided: number;
    net_tax_savings: number;
  };
  alternative_proposals: RebalanceProposal[];  // Different tax scenarios
}

class TaxAwareRebalancer {
  generateTaxOptimizedRebalance(portfolio: Portfolio): TaxAwareRebalance {
    const trades: RebalanceTrade[] = [];
    let lossesHarvested = 0;
    let gainsDeferred = 0;

    // Identify positions with unrealized losses (tax loss harvesting)
    const lossPositions = portfolio.positions.filter(p => p.unrealized_pnl < 0);

    for (const position of lossPositions) {
      // Check if we can harvest loss without triggering wash sale
      if (!this.wouldTriggerWashSale(position)) {
        trades.push({
          asset: position.asset,
          action: 'sell',
          quantity: position.quantity,
          reason: 'tax_loss_harvest',
          tax_benefit: Math.abs(position.unrealized_pnl) * 0.25  // Assume 25% tax rate
        });

        lossesHarvested += Math.abs(position.unrealized_pnl);
      }
    }

    // Defer gains by not selling profitable positions
    const gainPositions = portfolio.positions.filter(p => p.unrealized_pnl > 0);
    for (const position of gainPositions) {
      if (position.holding_period_days < 365) {
        // Short-term gain - defer if possible
        gainsDeferred += position.unrealized_pnl;
      }
    }

    return {
      trades,
      tax_optimization: {
        losses_harvested: lossesHarvested,
        gains_deferred: gainsDeferred,
        wash_sales_avoided: this.countWashSalesAvoided(trades),
        net_tax_savings: lossesHarvested * 0.25  // Simplified calculation
      },
      alternative_proposals: this.generateAlternatives(portfolio)
    };
  }
}
```

#### Risk Parity & Allocation

**Risk Parity Implementation:**

```python
class RiskParityAllocator:
    """
    Allocate portfolio based on equal risk contribution.
    """

    def calculate_risk_parity_weights(self, assets: List[str], returns: pd.DataFrame) -> Dict[str, float]:
        """
        Calculate portfolio weights where each asset contributes equally to portfolio risk.

        Risk Contribution = Weight * (Asset Volatility) * (Correlation with Portfolio)
        """
        # Calculate covariance matrix
        cov_matrix = returns.cov()

        # Initial equal weights
        n_assets = len(assets)
        initial_weights = np.array([1/n_assets] * n_assets)

        # Optimize to equal risk contribution
        def risk_budget_objective(weights):
            portfolio_vol = np.sqrt(weights @ cov_matrix @ weights)
            marginal_contrib = cov_matrix @ weights
            risk_contrib = weights * marginal_contrib / portfolio_vol

            # Target: equal risk contribution (1/n for each asset)
            target_risk = np.array([1/n_assets] * n_assets)
            return np.sum((risk_contrib - target_risk) ** 2)

        # Constraints: weights sum to 1, all positive
        constraints = [
            {'type': 'eq', 'fun': lambda w: np.sum(w) - 1},
        ]
        bounds = [(0, 1) for _ in range(n_assets)]

        # Optimize
        result = minimize(
            risk_budget_objective,
            initial_weights,
            method='SLSQP',
            bounds=bounds,
            constraints=constraints
        )

        return dict(zip(assets, result.x))
```

**Volatility Targeting:**

```python
def calculate_volatility_target_position_size(
    target_vol: float,
    asset_vol: float,
    portfolio_value: float,
    correlation_adjustment: float = 1.0
) -> float:
    """
    Calculate position size to achieve target portfolio volatility.

    Position Size = (Target Vol / Asset Vol) * Portfolio Value * Correlation Adjustment
    """
    position_size = (target_vol / asset_vol) * portfolio_value * correlation_adjustment
    return position_size
```

#### Multi-Currency Accounting

**Currency Conversion & Tracking:**

```typescript
interface MultiCurrencyPortfolio {
  base_currency: string;  // e.g., 'USD'
  positions: Map<string, Position>;
  fx_rates: Map<string, number>;  // Currency pair -> rate
  fx_exposure: Map<string, number>;  // Currency -> exposure amount
  fx_pnl: Map<string, number>;  // Currency -> unrealized FX gain/loss
}

class MultiCurrencyAccountant {
  calculatePortfolioValue(portfolio: MultiCurrencyPortfolio): number {
    let totalValue = 0;

    for (const [asset, position] of portfolio.positions) {
      const assetCurrency = this.getAssetCurrency(asset);
      const assetValue = position.quantity * position.current_price;

      // Convert to base currency
      if (assetCurrency !== portfolio.base_currency) {
        const fxRate = this.getFXRate(assetCurrency, portfolio.base_currency);
        totalValue += assetValue * fxRate;
      } else {
        totalValue += assetValue;
      }
    }

    return totalValue;
  }

  calculateFXExposure(portfolio: MultiCurrencyPortfolio): Map<string, number> {
    const exposure = new Map<string, number>();

    for (const [asset, position] of portfolio.positions) {
      const currency = this.getAssetCurrency(asset);
      const value = position.quantity * position.current_price;

      exposure.set(currency, (exposure.get(currency) || 0) + value);
    }

    return exposure;
  }

  calculateFXPnL(portfolio: MultiCurrencyPortfolio): Map<string, number> {
    const fxPnL = new Map<string, number>();

    for (const [asset, position] of portfolio.positions) {
      const currency = this.getAssetCurrency(asset);

      if (currency !== portfolio.base_currency) {
        // Calculate FX gain/loss
        const entryFXRate = position.entry_fx_rate;
        const currentFXRate = this.getFXRate(currency, portfolio.base_currency);

        const fxGainLoss = position.quantity * position.entry_price *
                          (currentFXRate - entryFXRate);

        fxPnL.set(currency, (fxPnL.get(currency) || 0) + fxGainLoss);
      }
    }

    return fxPnL;
  }
}
```

#### Portfolio Analytics

**Comprehensive Portfolio Metrics:**

```python
class PortfolioAnalytics:
    """
    Calculate advanced portfolio analytics.
    """

    def calculate_portfolio_metrics(self, portfolio: Portfolio) -> PortfolioMetrics:
        """
        Calculate comprehensive portfolio metrics.
        """
        returns = self.get_portfolio_returns(portfolio)

        return PortfolioMetrics(
            # Return metrics
            total_return=self.calculate_total_return(returns),
            annualized_return=self.calculate_annualized_return(returns),

            # Risk metrics
            volatility=returns.std() * np.sqrt(252),  # Annualized
            sharpe_ratio=self.calculate_sharpe_ratio(returns),
            sortino_ratio=self.calculate_sortino_ratio(returns),
            max_drawdown=self.calculate_max_drawdown(returns),

            # Diversification metrics
            diversification_ratio=self.calculate_diversification_ratio(portfolio),
            concentration_risk=self.calculate_concentration_risk(portfolio),

            # Factor exposure
            beta=self.calculate_portfolio_beta(portfolio),
            sector_exposure=self.calculate_sector_exposure(portfolio),

            # Correlation
            correlation_matrix=self.calculate_correlation_matrix(portfolio),

            # Tracking error (vs benchmark)
            tracking_error=self.calculate_tracking_error(portfolio)
        )

    def calculate_diversification_ratio(self, portfolio: Portfolio) -> float:
        """
        Diversification Ratio = Weighted Average Volatility / Portfolio Volatility

        Higher ratio = better diversification
        """
        weights = self.get_position_weights(portfolio)
        volatilities = self.get_asset_volatilities(portfolio)

        weighted_avg_vol = sum(w * v for w, v in zip(weights, volatilities))
        portfolio_vol = self.calculate_portfolio_volatility(portfolio)

        return weighted_avg_vol / portfolio_vol
```


### 16. Exchange Integration

### Exchange Integration Details

SymbioteTrader is a **multi-asset trading platform** supporting cryptocurrency, stocks, ETFs, forex, futures, and options. This section provides comprehensive capability matrices organized by asset class, showing which features are supported by which exchanges/brokers, including order types, market data, API limitations, and integration approaches.

**Asset Classes Supported:**
- **Cryptocurrency (CEX)**: Centralized exchanges via CCXT (104+ exchanges)
- **Cryptocurrency (DEX)**: Decentralized perpetuals (Hyperliquid, dYdX, GMX)
- **Stocks & ETFs**: US equities via broker APIs (IBKR, Alpaca)
- **Forex**: Currency pairs via forex brokers (OANDA, IBKR)
- **Futures**: CME and global futures via IBKR
- **Options**: Equity options via IBKR and Alpaca

---

#### 1. Cryptocurrency Exchanges (CEX)

**Integration Approach:** CCXT unified library (supports 104+ exchanges as of 2025)

**Tier 1: Essential (High Priority)**

| Exchange | Spot | Futures | Margin | WebSocket | CCXT | Priority | Notes |
|----------|------|---------|--------|-----------|------|----------|-------|
| **Binance** | âœ… | âœ… | âœ… | âœ… | âœ… | Essential | Highest volume (~4x #2), most complete API |
| **Coinbase** | âœ… | âœ… | âŒ | âœ… | âœ… | Essential | US-regulated, $5.3B daily volume, institutional-grade |
| **Bybit** | âœ… | âœ… | âœ… | âœ… | âœ… | Essential | Derivatives leader, $8.2B daily volume |

**Tier 2: High Priority**

| Exchange | Spot | Futures | Margin | WebSocket | CCXT | Priority | Notes |
|----------|------|---------|--------|-----------|------|----------|-------|
| **OKX** | âœ… | âœ… | âœ… | âœ… | âœ… | High | Major derivatives exchange, strong API |
| **Kraken** | âœ… | âœ… | âœ… | âœ… | âœ… | High | US/EU regulated, strong security |
| **KuCoin** | âœ… | âœ… | âœ… | âœ… | âœ… | High | Wide altcoin selection, good liquidity |

**Tier 3: Medium Priority**

| Exchange | Spot | Futures | Margin | WebSocket | CCXT | Priority | Notes |
|----------|------|---------|--------|-----------|------|----------|-------|
| **Gate.io** | âœ… | âœ… | âœ… | âœ… | âœ… | Medium | High volume, wide selection |
| **Bitget** | âœ… | âœ… | âœ… | âœ… | âœ… | Medium | Growing derivatives platform |
| **MEXC** | âœ… | âœ… | âœ… | âœ… | âœ… | Medium | Low fees, wide selection |
| **HTX** | âœ… | âœ… | âœ… | âœ… | âœ… | Medium | Formerly Huobi, Asian market leader |

**Tier 4: Optional**

| Exchange | Spot | Futures | Margin | WebSocket | CCXT | Priority | Notes |
|----------|------|---------|--------|-----------|------|----------|-------|
| **Bitfinex** | âœ… | âŒ | âœ… | âœ… | âœ… | Optional | Margin trading specialist |
| **Bitstamp** | âœ… | âŒ | âŒ | âœ… | âœ… | Optional | Oldest exchange, EU-regulated |
| **Crypto.com** | âœ… | âœ… | âœ… | âœ… | âœ… | Optional | Consumer-focused |

---

#### 2. Decentralized Perpetuals Exchanges (DEX)

**Integration Approach:** Mixed (CCXT for Hyperliquid, native APIs for others, Web3 for on-chain DEX)

**Supported DEX Platforms**

| Platform | Type | Perpetuals | Spot | API | CCXT | Priority | Notes |
|----------|------|------------|------|-----|------|----------|-------|
| **Hyperliquid** | L1 CLOB | âœ… | âœ… | âœ… | âœ… | High | Leading perp DEX, ultra-fast, no KYC, CCXT supported |
| **dYdX v4** | Cosmos L1 | âœ… | âŒ | âœ… | âœ… | High | 98% API improvement in 2025, strong reliability |
| **GMX** | AMM | âœ… | âœ… | âœ… | âŒ | Medium | Arbitrum/Avalanche, DeFi favorite, Web3 integration |
| **Jupiter** | Aggregator | âœ… | âœ… | âœ… | âŒ | Medium | Solana-based, perp aggregator |
| **Uniswap v3** | AMM | âŒ | âœ… | âœ… | âŒ | Optional | Spot DEX, different use case, Web3 integration |

**DEX-Specific Considerations:**
- **Wallet Management**: Requires private key management (non-custodial by design)
- **Gas Fees**: Transaction costs vary by L1/L2 (Hyperliquid/dYdX have low fees)
- **Liquidity**: Generally lower than CEX, but improving rapidly
- **KYC**: None required (decentralized)
- **API Maturity**: Hyperliquid and dYdX have mature APIs; others require Web3 integration
- **Settlement**: On-chain settlement (slower than CEX but trustless)

**Integration Libraries:**
- **Hyperliquid**: CCXT + official Python SDK (`hyperliquid-python-sdk`)
- **dYdX v4**: Native API (Cosmos-based, REST + WebSocket)
- **GMX**: Web3.py/ethers.js (smart contract interaction)
- **Jupiter**: Solana Web3.js

---

#### 3. Stock & ETF Brokers

**Integration Approach:** Native broker APIs (ib_insync for IBKR, REST API for Alpaca)

**Supported Brokers**

| Broker | Stocks | ETFs | Options | Futures | Forex | API Type | Priority | Notes |
|--------|--------|------|---------|---------|-------|----------|----------|-------|
| **Interactive Brokers (IBKR)** | âœ… | âœ… | âœ… | âœ… | âœ… | TWS API, Client Portal | Essential | Most comprehensive, 150+ markets, 33 countries |
| **Alpaca** | âœ… | âœ… | âœ… | âŒ | âŒ | REST + WebSocket | Essential | US only, commission-free, developer-friendly |

**Interactive Brokers (IBKR) Details:**
- **Markets**: Global (US, Europe, Asia, etc.)
- **Assets**: Stocks, ETFs, Options, Futures, Forex, Bonds, CFDs
- **API**: TWS API (via `ib_insync`), Client Portal API, FIX CTCI
- **Fees**: IBKR Pro (tiered), IBKR Lite (commission-free US stocks/ETFs)
- **Data**: Real-time and historical data (subscription-based)
- **Margin**: Portfolio margin, Reg T margin
- **Strengths**: Most comprehensive for multi-asset algo trading
- **Integration Library**: `ib_insync` (async Python wrapper)

**Alpaca Details:**
- **Markets**: US only
- **Assets**: US Stocks (11,000+), ETFs, Options (API live as of 2024)
- **API**: REST API, WebSocket (very clean, developer-first)
- **Fees**: Commission-free stocks/ETFs
- **Data**: Integrated data + trading (Polygon, IEX Cloud)
- **Paper Trading**: Full paper trading environment
- **Strengths**: Easiest API for beginners, excellent docs
- **Limitations**: US markets only, no futures
- **Integration**: Native REST/WebSocket API

**Order Types Supported (Stocks/ETFs):**

| Order Type | IBKR | Alpaca | Notes |
|------------|------|--------|-------|
| **Market** | âœ… | âœ… | Immediate execution at best available price |
| **Limit** | âœ… | âœ… | Execute at specified price or better |
| **Stop** | âœ… | âœ… | Trigger market order at stop price |
| **Stop-Limit** | âœ… | âœ… | Trigger limit order at stop price |
| **Trailing Stop** | âœ… | âœ… | Stop that trails price by amount/percent |
| **Bracket** | âœ… | âœ… | Entry + profit target + stop loss |
| **OCO** | âœ… | âœ… | One-Cancels-Other |
| **MOC** | âœ… | âœ… | Market-On-Close |
| **LOC** | âœ… | âœ… | Limit-On-Close |
| **Iceberg** | âœ… | âŒ | Show only portion of order |
| **VWAP** | âœ… | âŒ | Volume-weighted average price algo |
| **TWAP** | âœ… | âŒ | Time-weighted average price algo |

**Time-In-Force (Stocks/ETFs):**

| TIF | IBKR | Alpaca | Notes |
|-----|------|--------|-------|
| **DAY** | âœ… | âœ… | Valid until market close |
| **GTC** | âœ… | âœ… | Good-Till-Cancelled (up to 90 days) |
| **IOC** | âœ… | âœ… | Immediate-Or-Cancel |
| **FOK** | âœ… | âœ… | Fill-Or-Kill |
| **GTD** | âœ… | âœ… | Good-Till-Date |
| **OPG** | âœ… | âœ… | At-The-Opening |
| **CLS** | âœ… | âœ… | At-The-Close |

**Session Support (Stocks/ETFs):**
- **Regular Trading Hours (RTH)**: 9:30 AM - 4:00 PM ET
- **Pre-Market**: 4:00 AM - 9:30 AM ET (IBKR, Alpaca)
- **After-Hours**: 4:00 PM - 8:00 PM ET (IBKR, Alpaca)
- **Extended Hours**: Both brokers support extended hours trading

---

#### 4. Forex Brokers

**Integration Approach:** Native broker APIs (OANDA API v20, IBKR TWS API)

**Supported Brokers**

| Broker | Currency Pairs | Leverage (US) | Leverage (Intl) | API Type | Priority | Notes |
|--------|----------------|---------------|-----------------|----------|----------|-------|
| **OANDA** | 70+ | 50:1 | 100:1 | REST + Streaming | High | Forex specialist, "Most Trusted 2025" |
| **Interactive Brokers** | 100+ | 50:1 | 100:1+ | TWS API | High | Same API as stocks/futures |

**OANDA Details:**
- **Currency Pairs**: 70+ (majors, minors, exotics)
- **API**: REST API v20, Streaming API
- **Pricing**: Spread-based (no commissions)
- **Leverage**: Up to 50:1 (US), 100:1 (international)
- **Minimum Trade**: 1 unit (micro-lots supported)
- **Data**: Real-time tick data included
- **Strengths**: Reliable API, popular with algo traders
- **Integration**: Native Python API (well-documented)

**IBKR Forex Details:**
- **Currency Pairs**: 100+ pairs
- **Leverage**: Up to 50:1 (US), higher internationally
- **Pricing**: Commission-based or spread-based
- **Integration**: Same TWS API as other assets

**Major Currency Pairs Supported:**
- EUR/USD, GBP/USD, USD/JPY, AUD/USD (mentioned in spec)
- USD/CHF, USD/CAD, NZD/USD
- EUR/GBP, EUR/JPY, GBP/JPY, etc.

**Forex Trading Hours:**
- **24/5**: Sunday 5:00 PM ET - Friday 5:00 PM ET
- **No gaps**: Continuous trading across global sessions
- **Sessions**: Sydney, Tokyo, London, New York

---

#### 5. Futures Brokers

**Integration Approach:** IBKR TWS API (via `ib_insync`)

**Supported Broker**

| Broker | Exchanges | Micro Futures | API Type | Priority | Notes |
|--------|-----------|---------------|----------|----------|-------|
| **Interactive Brokers** | CME, CBOT, NYMEX, COMEX, Eurex, etc. | âœ… | TWS API | Essential | Best access to global futures |

**IBKR Futures Details:**
- **Exchanges**: CME, CBOT, NYMEX, COMEX, Eurex, SGX, HKEX, etc.
- **Micro Futures** (mentioned in spec):
  - **MES**: Micro E-mini S&P 500 (1/10 size of ES)
  - **MNQ**: Micro E-mini Nasdaq-100 (1/10 size of NQ)
  - **M2K**: Micro E-mini Russell 2000 (1/10 size of RTY)
  - **MGC**: Micro Gold (1/10 size of GC)
- **Standard Futures**: ES, NQ, RTY, CL (crude oil), GC (gold), etc.
- **Margin**: SPAN margin, portfolio margin
- **API**: Same TWS API as stocks
- **Data**: Real-time and historical futures data
- **Strengths**: Comprehensive global futures access

**Futures Trading Hours:**
- **CME Globex**: Nearly 24/5 (Sunday 6:00 PM - Friday 5:00 PM ET)
- **Pit Hours**: Vary by contract (typically 9:30 AM - 4:15 PM ET)
- **Maintenance**: Daily maintenance window (typically 5:00 PM - 6:00 PM ET)

---

#### 6. Options Brokers

**Integration Approach:** Native broker APIs (IBKR TWS API, Alpaca REST API)

**Supported Brokers**

| Broker | Equity Options | Index Options | Futures Options | API Type | Priority | Notes |
|--------|----------------|---------------|-----------------|----------|----------|-------|
| **Interactive Brokers** | âœ… | âœ… | âœ… | TWS API | Essential | Full options chain, complex strategies |
| **Alpaca** | âœ… | âŒ | âŒ | REST API | High | US equity options, simple strategies |

**IBKR Options Details:**
- **Assets**: Equity options, index options, futures options
- **Strategies**: Covered calls/puts, spreads, straddles, strangles, iron condors, etc.
- **API**: Full options chain access via TWS API
- **Margin**: Portfolio margin for complex strategies
- **Strengths**: Most comprehensive options support

**Alpaca Options Details:**
- **Assets**: US equity options only
- **Strategies**: Covered calls/puts, basic spreads
- **API**: Options API (live as of 2024-2025)
- **Strengths**: Simple API for basic options strategies
- **Limitations**: No index options, no futures options

**Options Order Types:**

| Order Type | IBKR | Alpaca | Notes |
|------------|------|--------|-------|
| **Market** | âœ… | âœ… | Immediate execution |
| **Limit** | âœ… | âœ… | Execute at specified price or better |
| **Stop** | âœ… | âœ… | Trigger at stop price |
| **Stop-Limit** | âœ… | âœ… | Trigger limit order at stop |
| **Combo** | âœ… | âœ… | Multi-leg strategies |
| **Conditional** | âœ… | âŒ | Trigger based on underlying |

**Guardrails for Options:**
- **Stricter risk limits**: Options have higher risk profiles
- **Mandatory approval**: Complex strategies require user approval
- **Position limits**: Per-strategy and portfolio-wide caps
- **Expiration tracking**: Auto-alerts before expiration
- **Assignment risk**: Monitoring and alerts for ITM options

---

#### Order Type Support by Exchange (Crypto CEX)

| Order Type | Binance | Coinbase | Kraken | Bybit | OKX | KuCoin |
|------------|---------|----------|--------|-------|-----|--------|
| **Market** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| **Limit** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| **Stop** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| **Stop-Limit** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| **Trailing Stop** | âœ… | âŒ | âœ… | âœ… | âœ… | âœ… |
| **Post-Only** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| **Reduce-Only** | âœ… (Futures) | âŒ | âŒ | âœ… (Futures) | âœ… (Futures) | âœ… (Futures) |
| **OCO** | âœ… | âŒ | âŒ | âœ… | âœ… | âœ… |
| **Iceberg** | âœ… | âŒ | âœ… | âœ… | âœ… | âœ… |
| **FOK** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| **IOC** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |

#### Time-In-Force Support by Exchange

| TIF | Binance | Coinbase | Kraken | Bybit | OKX | KuCoin |
|-----|---------|----------|--------|-------|-----|--------|
| **GTC** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| **IOC** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| **FOK** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| **GTD** | âŒ | âœ… | âœ… | âŒ | âŒ | âŒ |
| **DAY** | âŒ | âœ… | âŒ | âŒ | âŒ | âŒ |

#### Market Data Support by Exchange

| Data Type | Binance | Coinbase | Kraken | Bybit | OKX | KuCoin |
|-----------|---------|----------|--------|-------|-----|--------|
| **Ticker** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| **Order Book** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| **Recent Trades** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| **OHLCV Candles** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| **Funding Rate** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| **Open Interest** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| **Liquidations** | âœ… | âŒ | âŒ | âœ… | âœ… | âœ… |
| **Mark Price** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| **Index Price** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |

#### WebSocket Feed Support by Exchange

| Feed Type | Binance | Coinbase | Kraken | Bybit | OKX | KuCoin |
|-----------|---------|----------|--------|-------|-----|--------|
| **Ticker** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| **Order Book (Full)** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| **Order Book (Diff)** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| **Trades** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| **Candles** | âœ… | âŒ | âœ… | âœ… | âœ… | âœ… |
| **User Orders** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| **User Trades** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| **User Balance** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| **User Positions** | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |

#### API Rate Limits by Exchange

| Exchange | REST (Weight/Min) | REST (Orders/Sec) | WebSocket (Connections) | WebSocket (Subscriptions) |
|----------|-------------------|-------------------|------------------------|--------------------------|
| **Binance** | 1200 | 10 | 5 | 200 |
| **Coinbase** | 10 (public), 15 (private) | 10 | 5 | 100 |
| **Kraken** | 15-20 (tier-based) | 10 | 5 | 50 |
| **Bybit** | 120 | 10 | 5 | 100 |
| **OKX** | 20 | 10 | 5 | 100 |
| **KuCoin** | 1800 | 10 | 5 | 100 |

**Notes:**
- Binance uses a weight-based system (different endpoints have different weights)
- Coinbase has separate limits for public and private endpoints
- Kraken limits vary by verification tier
- All exchanges have burst allowances

#### Exchange-Specific Features

**Binance**
- **Strengths**: Highest liquidity, most trading pairs, comprehensive API
- **Order Types**: All supported including OCO, Iceberg
- **Trailing Stop**: Uses callback rate (percentage)
- **Futures**: Full support with isolated/cross margin
- **Quirks**: Weight-based rate limiting, requires signature on all private endpoints

**Coinbase**
- **Strengths**: US-regulated, high security, institutional-grade
- **Order Types**: Basic types, no OCO or trailing stops
- **Time-In-Force**: Supports GTD (Good-Till-Date)
- **Futures**: Limited futures support
- **Quirks**: Strict rate limits, requires API key passphrase

**Kraken**
- **Strengths**: European regulation, strong security, margin trading
- **Order Types**: Comprehensive including trailing stops
- **Trailing Stop**: Uses absolute or percentage offset
- **Margin**: Full margin trading support
- **Quirks**: Tier-based rate limits, complex order validation

**Bybit**
- **Strengths**: Derivatives-focused, high leverage, good API
- **Order Types**: Full support for futures trading
- **Trailing Stop**: Uses trailing distance
- **Futures**: Excellent futures support with USDT/USDC perpetuals
- **Quirks**: Separate endpoints for spot vs futures

#### Exchange Connection Configuration

**Required Credentials per Exchange**

| Exchange | API Key | API Secret | Passphrase | Additional |
|----------|---------|------------|------------|------------|
| **Binance** | âœ… | âœ… | âŒ | âŒ |
| **Coinbase** | âœ… | âœ… | âœ… | âŒ |
| **Kraken** | âœ… | âœ… | âŒ | âŒ |
| **Bybit** | âœ… | âœ… | âŒ | âŒ |
| **OKX** | âœ… | âœ… | âœ… | âŒ |
| **KuCoin** | âœ… | âœ… | âœ… | âŒ |

**API Permissions Required**

| Permission | Purpose | Required For |
|------------|---------|--------------|
| **Read** | View balances, positions, orders | All features |
| **Trade** | Place, modify, cancel orders | Paper trading, Live trading |
| **Withdraw** | Withdraw funds | âŒ Never required |
| **Futures** | Trade futures contracts | Futures trading |
| **Margin** | Trade on margin | Margin trading |

---

#### 7. Integration Architecture & Libraries

**Overview:** SymbioteTrader uses different integration approaches for each asset class, optimized for the specific characteristics of each market type.

**Crypto CEX Integration (CCXT)**

```python
# CCXT unified interface for all crypto exchanges
import ccxt

# Initialize exchange
exchange = ccxt.binance({
    'apiKey': user_api_key,
    'secret': user_api_secret,
    'enableRateLimit': True,
    'options': {
        'defaultType': 'future',  # or 'spot'
    }
})

# Unified methods work across all exchanges
markets = exchange.load_markets()
ticker = exchange.fetch_ticker('BTC/USDT')
orderbook = exchange.fetch_order_book('BTC/USDT')
balance = exchange.fetch_balance()
order = exchange.create_limit_buy_order('BTC/USDT', 0.01, 50000)
```

**Benefits:**
- Single API for 104+ exchanges
- Automatic rate limiting
- Unified error handling
- Symbol normalization
- Automatic retries

**Limitations:**
- Lowest common denominator (some exchange-specific features unavailable)
- Slight performance overhead vs native APIs
- May lag behind exchange API updates

**Crypto DEX Integration (Mixed)**

```python
# Hyperliquid via CCXT
import ccxt
exchange = ccxt.hyperliquid({
    'walletAddress': user_wallet,
    'privateKey': user_private_key,
})

# Or use native Hyperliquid SDK for advanced features
from hyperliquid.exchange import Exchange
from hyperliquid.info import Info

exchange = Exchange(wallet_address, private_key)
info = Info()

# dYdX v4 native API
from dydx_v4_client import Client
client = Client(network='mainnet')
```

**Stock/ETF Integration (IBKR via ib_insync)**

```python
# Interactive Brokers via ib_insync
from ib_insync import IB, Stock, MarketOrder, LimitOrder

ib = IB()
ib.connect('127.0.0.1', 7497, clientId=1)  # TWS or IB Gateway

# Create contract
contract = Stock('AAPL', 'SMART', 'USD')
ib.qualifyContracts(contract)

# Place order
order = MarketOrder('BUY', 100)
trade = ib.placeOrder(contract, order)

# Stream market data
ib.reqMktData(contract, '', False, False)
ticker = ib.ticker(contract)
```

**Benefits:**
- Async/await support
- Clean Pythonic API
- Automatic reconnection
- Event-driven architecture

**Stock/ETF Integration (Alpaca)**

```python
# Alpaca native API
from alpaca.trading.client import TradingClient
from alpaca.trading.requests import MarketOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce

client = TradingClient(api_key, secret_key, paper=True)

# Place order
order_data = MarketOrderRequest(
    symbol='AAPL',
    qty=100,
    side=OrderSide.BUY,
    time_in_force=TimeInForce.DAY
)
order = client.submit_order(order_data)

# WebSocket for real-time data
from alpaca.data.live import StockDataStream
stream = StockDataStream(api_key, secret_key)

@stream.on_bar('AAPL')
async def on_bar(bar):
    print(f"Bar: {bar}")
```

**Forex Integration (OANDA)**

```python
# OANDA API v20
import oandapyV20
from oandapyV20 import API
from oandapyV20.endpoints.orders import OrderCreate

api = API(access_token=token, environment='practice')

# Place order
order_data = {
    'order': {
        'instrument': 'EUR_USD',
        'units': '1000',
        'type': 'MARKET',
        'positionFill': 'DEFAULT'
    }
}
r = OrderCreate(accountID, data=order_data)
api.request(r)
```

**Futures/Options Integration (IBKR)**

```python
# Same ib_insync library as stocks
from ib_insync import IB, Future, Option, FuturesOption

# Micro E-mini S&P 500
contract = Future('MES', '202503', 'CME')

# Equity option
contract = Option('AAPL', '20250321', 150, 'C', 'SMART')

# Same order placement as stocks
order = MarketOrder('BUY', 1)
trade = ib.placeOrder(contract, order)
```

**Integration Layer Architecture:**

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    SymbioteTrader Core                      â”‚
â”‚                  (Strategy Engine, OMS, Risk)               â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                              â”‚
                              â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                   Exchange Adapter Layer                    â”‚
â”‚         (Unified interface for all asset classes)           â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                              â”‚
        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
        â–¼                     â–¼                     â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ CCXT Adapter â”‚    â”‚ IBKR Adapter â”‚    â”‚Other Adaptersâ”‚
â”‚  (Crypto)    â”‚    â”‚(Stocks/Fut)  â”‚    â”‚(Alpaca/OANDA)â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
        â”‚                     â”‚                     â”‚
        â–¼                     â–¼                     â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   CCXT Lib   â”‚    â”‚  ib_insync   â”‚    â”‚ Native APIs  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
        â”‚                     â”‚                     â”‚
        â–¼                     â–¼                     â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚104+ Crypto   â”‚    â”‚ IBKR TWS/    â”‚    â”‚Alpaca/OANDA/ â”‚
â”‚  Exchanges   â”‚    â”‚ IB Gateway   â”‚    â”‚  DEX APIs    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Adapter Responsibilities:**
- **Symbol Normalization**: Convert between internal and exchange formats
- **Order Translation**: Map internal order types to exchange-specific formats
- **Error Handling**: Translate exchange errors to unified error codes
- **Rate Limiting**: Enforce per-exchange rate limits
- **Reconnection**: Handle disconnections and reconnect automatically
- **Data Normalization**: Standardize timestamps, prices, quantities

---

#### 8. Trading Hours & Session Calendars

**Overview:** Different asset classes have different trading hours and session structures. SymbioteTrader respects these calendars and provides session-aware trading.

**Cryptocurrency (24/7/365)**

| Asset Type | Trading Hours | Notes |
|------------|---------------|-------|
| **Crypto Spot** | 24/7/365 | Continuous trading, no breaks |
| **Crypto Perpetuals** | 24/7/365 | Funding every 8 hours (varies by exchange) |
| **Crypto Futures** | 24/7/365 | Quarterly/monthly expiration |

**Maintenance Windows:**
- **Binance**: Weekly maintenance (typically Wed 2:00-4:00 AM UTC)
- **Coinbase**: Scheduled maintenance announced in advance
- **Most exchanges**: Brief maintenance windows (5-30 minutes)

**Stocks & ETFs (US Markets)**

| Session | Hours (ET) | Notes |
|---------|------------|-------|
| **Pre-Market** | 4:00 AM - 9:30 AM | Lower liquidity, wider spreads |
| **Regular Trading Hours (RTH)** | 9:30 AM - 4:00 PM | Primary session, highest liquidity |
| **After-Hours** | 4:00 PM - 8:00 PM | Lower liquidity, wider spreads |

**Market Holidays (US):**
- New Year's Day, MLK Day, Presidents' Day, Good Friday, Memorial Day, Juneteenth, Independence Day, Labor Day, Thanksgiving, Christmas
- Early close days: Day before Independence Day, Day after Thanksgiving, Christmas Eve

**Forex (24/5)**

| Session | Hours (ET) | Major Centers | Notes |
|---------|------------|---------------|-------|
| **Sydney** | 5:00 PM - 2:00 AM | AUD, NZD | Lowest liquidity |
| **Tokyo** | 7:00 PM - 4:00 AM | JPY | Asian session |
| **London** | 3:00 AM - 12:00 PM | EUR, GBP | Highest liquidity |
| **New York** | 8:00 AM - 5:00 PM | USD | Overlaps with London |

**Overall Forex Hours:** Sunday 5:00 PM ET - Friday 5:00 PM ET (continuous)

**Session Overlaps (Highest Liquidity):**
- **London/New York**: 8:00 AM - 12:00 PM ET (most active)
- **Tokyo/London**: 3:00 AM - 4:00 AM ET
- **Sydney/Tokyo**: 7:00 PM - 2:00 AM ET

**Futures (Nearly 24/5)**

| Contract | Exchange | Trading Hours (ET) | Maintenance Window |
|----------|----------|-------------------|-------------------|
| **MES, MNQ, M2K** | CME Globex | Sun 6:00 PM - Fri 5:00 PM | Daily 5:00-6:00 PM |
| **MGC** | COMEX | Sun 6:00 PM - Fri 5:00 PM | Daily 5:00-6:00 PM |
| **CL (Crude)** | NYMEX | Sun 6:00 PM - Fri 5:00 PM | Daily 5:00-6:00 PM |

**Pit Hours (if applicable):** Typically 9:30 AM - 4:15 PM ET

**Options (US Markets)**

| Session | Hours (ET) | Notes |
|---------|------------|-------|
| **Regular Hours** | 9:30 AM - 4:00 PM | Same as underlying stock |
| **Extended Hours** | Limited | Some brokers support, but illiquid |

**Expiration:** Typically 3rd Friday of month (equity options)

**Session-Aware Features in SymbioteTrader:**

1. **Automatic Session Detection**
   - Strategies know current session (RTH, pre-market, after-hours, etc.)
   - Can filter signals based on session

2. **Session-Specific Rules**
   - Different position limits per session
   - Different order types allowed per session
   - Wider slippage assumptions for extended hours

3. **Holiday Calendar Integration**
   - Auto-pause strategies on market holidays
   - Alerts for early close days
   - Prevent orders during closed sessions

4. **Funding Rate Tracking (Crypto Perpetuals)**
   - Track funding times per exchange
   - Alert before funding (avoid unexpected costs)
   - Funding rate in strategy signals

5. **Rollover Management (Futures)**
   - Track contract expiration dates
   - Auto-alert before expiration
   - Optional auto-roll to next contract

---

#### 9. Regulatory Considerations by Asset Class

**Cryptocurrency (CEX & DEX)**

- **KYC/AML**: Handled by exchange (CEX) or not required (DEX)
- **Custody**: Non-custodial (user maintains control via API keys or wallets)
- **Leverage Limits**: Varies by exchange and jurisdiction
  - Binance: Up to 125x (varies by region)
  - Coinbase: Up to 5x (US)
  - Bybit: Up to 100x
- **Position Limits**: Exchange-imposed, varies by contract
- **Reporting**: User responsible for tax reporting (capital gains)
- **Restrictions**: Some exchanges restricted in certain jurisdictions (e.g., Binance.US vs Binance.com)

**Stocks & ETFs (US)**

- **Pattern Day Trader (PDT) Rule**:
  - Applies if 4+ day trades in 5 business days
  - Requires $25,000 minimum account balance
  - SymbioteTrader tracks day trades and warns before PDT threshold
- **Wash Sale Rule**: 30-day rule for claiming losses
- **Settlement**: T+2 (trade date + 2 business days)
- **Margin Requirements**: Reg T (50% initial margin)
- **Reporting**: Form 1099-B from broker, Schedule D for taxes
- **Restrictions**: Some stocks restricted for short selling

**Forex**

- **Leverage Limits**:
  - US: Maximum 50:1 (majors), 20:1 (minors)
  - International: Up to 100:1 or higher
- **FIFO Rule (US)**: First-In-First-Out for closing positions
- **Reporting**: Form 1099 from broker, Section 988 or 1256 treatment
- **Restrictions**: US residents must use NFA-registered brokers

**Futures**

- **CFTC Reporting**: Large trader reporting thresholds
  - Example: 25 BTC futures contracts
  - Automatic reporting when threshold exceeded
- **Position Limits**: Per-contract limits set by exchanges
- **Margin Requirements**: SPAN margin (risk-based)
- **Reporting**: Form 1099-B, Section 1256 treatment (60/40 rule)
- **Restrictions**: Must use registered FCMs (Futures Commission Merchants)

**Options**

- **Approval Levels**: Brokers assign levels based on experience
  - Level 1: Covered calls/puts
  - Level 2: Long calls/puts
  - Level 3: Spreads
  - Level 4: Naked options (highest risk)
- **Position Limits**: Per-underlying limits set by exchanges
- **Margin Requirements**: Varies by strategy complexity
- **Reporting**: Form 1099-B, Schedule D
- **Restrictions**: Some strategies require higher approval levels

**SymbioteTrader Compliance Features:**

1. **PDT Tracking & Warnings**
   - Real-time day trade counter
   - Alerts before hitting PDT threshold
   - Auto-pause option when approaching limit

2. **Position Limit Monitoring**
   - Track exchange-imposed limits
   - Track regulatory limits (CFTC, etc.)
   - Prevent orders that would exceed limits

3. **Wash Sale Tracking**
   - Identify potential wash sales
   - Warn before triggering wash sale
   - Track for tax reporting

4. **Leverage Enforcement**
   - Respect jurisdiction-specific leverage limits
   - Per-asset-class default limits
   - User-configurable caps (can be stricter, not looser)

5. **Audit Trail**
   - Immutable log of all trades
   - Correlation IDs for every action
   - Export for tax reporting

6. **Jurisdiction Warnings**
   - Warn when exchange/broker restricted in user's region
   - Highlight features that may be unavailable

**Security Best Practices:**
- Never request withdraw permissions
- Use IP whitelisting when available
- Rotate API keys every 90 days
- Store keys encrypted at rest (AES-256)
- Use separate keys for paper vs live trading


### 17. Technical Implementation Details

### Technical Implementation Details

#### Authentication & Authorization

**Authentication Methods:**

1. **JWT (JSON Web Tokens)**
   - Access token: 15-minute expiry
   - Refresh token: 7-day expiry
   - Token rotation on refresh
   - Stored in httpOnly cookies (web) or secure storage (mobile)

2. **API Keys**
   - Generate multiple API keys per user
   - Scoped permissions per key (read-only, trade, admin)
   - Key expiration (optional)
   - Key rotation
   - Last used timestamp
   - IP whitelist (optional)

3. **OAuth2 Support** (Future)
   - Google OAuth
   - GitHub OAuth
   - Custom OAuth providers

**Two-Factor Authentication (2FA):**
- TOTP (Time-based One-Time Password) via authenticator apps
- Backup codes (10 codes, single-use)
- Required for: Live trading, API key generation, settings changes
- Optional for: Login, paper trading

**Session Management:**
- Max concurrent sessions: 5
- Session timeout: 24 hours of inactivity
- Force logout all sessions
- View active sessions (device, location, last active)

**API Key Scopes:**
- `read`: Read-only access (strategies, backtests, positions, orders)
- `trade:paper`: Paper trading only
- `trade:live`: Live trading (requires 2FA)
- `admin`: Full access (settings, API keys, connections)

**Rate Limiting per API Key:**
- Read operations: 100 requests/minute
- Write operations: 20 requests/minute
- Burst allowance: 2x limit for 10 seconds
- Rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

#### Pagination

**Cursor-Based Pagination (Preferred):**

```typescript
// Request
GET /api/v1/orders?limit=50&cursor=eyJpZCI6ImFiYzEyMyIsInRzIjoxNzAwMDAwMDAwfQ==

// Response
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6Inhtejc4OSIsInRzIjoxNzAwMDAwMTAwfQ==",
    "has_more": true,
    "limit": 50
  }
}
```

**Benefits:**
- Consistent results (no duplicates/skips)
- Efficient for large datasets
- Works with real-time data

**Offset-Based Pagination (Legacy):**

```typescript
// Request
GET /api/v1/strategies?limit=50&offset=100

// Response
{
  "data": [...],
  "pagination": {
    "total": 1234,
    "limit": 50,
    "offset": 100,
    "pages": 25
  }
}
```

**Use Cases:**
- Cursor: Orders, trades, ticks (real-time data)
- Offset: Strategies, backtests (static data)

#### Idempotency

**Idempotency Keys:**

```typescript
// Request with idempotency key
POST /api/v1/orders
Headers:
  Idempotency-Key: order_abc123_20251018_143000

Body:
{
  "symbol": "BTC/USDT",
  "side": "buy",
  "quantity": 0.01,
  "type": "market"
}

// Duplicate request (same key) returns cached response
// No duplicate order created
```

**Implementation:**
- Store idempotency key + response in Redis
- TTL: 24 hours
- Collision handling: Return 409 Conflict if key exists with different request body
- Automatic key generation: Client can omit key, server generates one

**Idempotent Operations:**
- Order placement
- Strategy creation
- Backtest creation
- Risk rule creation
- Any state-changing operation

**Non-Idempotent Operations:**
- GET requests (naturally idempotent)
- DELETE requests (idempotent by nature)

#### Error Handling

**Error Response Format:**

```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance to place order",
    "details": {
      "required": 1000.00,
      "available": 500.00,
      "currency": "USDT"
    },
    "retryable": false,
    "suggestion": "Deposit more funds or reduce order size",
    "correlation_id": "abc123",
    "timestamp": "2025-10-18T12:34:56.789Z"
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR`: Invalid request parameters
- `AUTHENTICATION_ERROR`: Invalid credentials
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INSUFFICIENT_BALANCE`: Not enough funds
- `ORDER_REJECTED`: Exchange rejected order
- `SYMBOL_NOT_FOUND`: Symbol doesn't exist
- `STRATEGY_NOT_FOUND`: Strategy doesn't exist
- `INTERNAL_ERROR`: Server error
- `SERVICE_UNAVAILABLE`: Service temporarily unavailable

**Error Recovery Suggestions:**
- Provide actionable suggestions in error messages
- Link to documentation
- Suggest alternative actions

**Error Categorization:**
- Client errors (4xx): User can fix
- Server errors (5xx): System issue, retry may help
- Retryable flag: Indicates if retry is recommended

**Error Aggregation:**
- Group similar errors
- Show error trends
- Alert on error rate spike


### User Workflows & State Machines

Visual state machine diagrams showing all possible states and transitions for critical entities in the system.

#### Strategy Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Draft: Create Strategy

    Draft --> Validating: Validate
    Validating --> Draft: Validation Failed
    Validating --> Valid: Validation Passed

    Valid --> Compiling: Compile
    Compiling --> Valid: Compilation Failed
    Compiling --> Ready: Compilation Succeeded

    Ready --> Backtesting: Start Backtest
    Ready --> PaperTrading: Start Paper Trading
    Ready --> LiveTrading: Start Live Trading
    Ready --> Archived: Archive

    Backtesting --> Ready: Backtest Complete
    Backtesting --> Draft: Modify Strategy

    PaperTrading --> Paused: Pause
    Paused --> PaperTrading: Resume
    PaperTrading --> Ready: Stop
    PaperTrading --> Draft: Modify Strategy

    LiveTrading --> Paused: Pause
    Paused --> LiveTrading: Resume
    LiveTrading --> Ready: Stop
    LiveTrading --> EmergencyStopped: Emergency Stop
    EmergencyStopped --> Ready: Reset

    Archived --> Draft: Restore
    Archived --> [*]: Delete

    Draft --> [*]: Delete
    Valid --> [*]: Delete
    Ready --> [*]: Delete
```

**State Descriptions:**

| State | Description | Allowed Actions |
|-------|-------------|-----------------|
| **Draft** | Initial state, strategy being edited | Edit, Validate, Delete |
| **Validating** | Strategy validation in progress | Cancel |
| **Valid** | Strategy passed validation | Edit, Compile, Delete |
| **Compiling** | Strategy compilation in progress | Cancel |
| **Ready** | Strategy compiled and ready to use | Backtest, Paper Trade, Live Trade, Archive, Delete |
| **Backtesting** | Strategy running in backtest | Stop, View Results |
| **PaperTrading** | Strategy running in paper trading | Pause, Stop, View Performance |
| **Paused** | Strategy temporarily paused | Resume, Stop |
| **LiveTrading** | Strategy running with real money | Pause, Stop, Emergency Stop, View Performance |
| **EmergencyStopped** | Strategy stopped due to risk breach | Reset, View Logs |
| **Archived** | Strategy archived for reference | Restore, Delete |

#### Order Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Pending: Create Order

    Pending --> Validating: Submit
    Validating --> Rejected: Validation Failed
    Validating --> Submitted: Validation Passed

    Submitted --> Rejected: Exchange Rejected
    Submitted --> Open: Exchange Accepted

    Open --> PartiallyFilled: Partial Fill
    Open --> Filled: Fully Filled
    Open --> Cancelling: Cancel Request
    Open --> Expired: Time Expired

    PartiallyFilled --> Filled: Remaining Filled
    PartiallyFilled --> Cancelling: Cancel Request
    PartiallyFilled --> Expired: Time Expired

    Cancelling --> Cancelled: Cancel Confirmed
    Cancelling --> Filled: Filled Before Cancel

    Filled --> [*]
    Cancelled --> [*]
    Rejected --> [*]
    Expired --> [*]
```

**State Descriptions:**

| State | Description | Allowed Actions |
|-------|-------------|-----------------|
| **Pending** | Order created locally, not yet submitted | Edit, Submit, Cancel |
| **Validating** | Order being validated | None (automatic) |
| **Submitted** | Order sent to exchange, awaiting confirmation | None (automatic) |
| **Rejected** | Order rejected by exchange or validation | View Reason |
| **Open** | Order active on exchange order book | Cancel, Modify |
| **PartiallyFilled** | Order partially executed | Cancel, View Fills |
| **Cancelling** | Cancel request sent to exchange | None (automatic) |
| **Cancelled** | Order successfully cancelled | View History |
| **Filled** | Order fully executed | View Fills |
| **Expired** | Order expired (GTD, DAY orders) | View History |

#### Backtest Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Configuring: Create Backtest

    Configuring --> Validating: Start
    Validating --> Configuring: Invalid Configuration
    Validating --> Queued: Valid Configuration

    Queued --> Running: Resources Available
    Queued --> Cancelled: User Cancelled

    Running --> Paused: Pause
    Paused --> Running: Resume
    Running --> Cancelled: User Cancelled
    Running --> Failed: Error Occurred
    Running --> Analyzing: Execution Complete

    Analyzing --> Completed: Analysis Complete
    Analyzing --> Failed: Analysis Error

    Completed --> [*]: View Results
    Failed --> [*]: View Error
    Cancelled --> [*]: View Partial Results
```

**State Descriptions:**

| State | Description | Allowed Actions |
|-------|-------------|-----------------|
| **Configuring** | User setting backtest parameters | Edit, Start, Delete |
| **Validating** | Validating configuration and data availability | None (automatic) |
| **Queued** | Waiting for compute resources | Cancel, View Queue Position |
| **Running** | Backtest executing | Pause, Cancel, View Progress |
| **Paused** | Backtest temporarily paused | Resume, Cancel |
| **Analyzing** | Computing metrics and overfitting analysis | None (automatic) |
| **Completed** | Backtest finished successfully | View Results, Export, Clone |
| **Failed** | Backtest failed with error | View Error, Retry |
| **Cancelled** | User cancelled backtest | View Partial Results |

#### Trading Session Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Configuring: Create Session

    Configuring --> Starting: Start
    Starting --> Configuring: Startup Failed
    Starting --> Active: Startup Succeeded

    Active --> Paused: Pause
    Paused --> Active: Resume

    Active --> Stopping: Stop
    Paused --> Stopping: Stop

    Active --> EmergencyStopped: Emergency Stop
    Active --> EmergencyStopped: Risk Breach
    Paused --> EmergencyStopped: Risk Breach

    Stopping --> Stopped: Graceful Shutdown
    Stopping --> EmergencyStopped: Force Stop

    EmergencyStopped --> Stopped: Cleanup Complete

    Stopped --> [*]: Archive
    Stopped --> Configuring: Restart
```

**State Descriptions:**

| State | Description | Allowed Actions |
|-------|-------------|-----------------|
| **Configuring** | Session being configured | Edit, Start, Delete |
| **Starting** | Session initializing | None (automatic) |
| **Active** | Session running, strategy executing | Pause, Stop, Emergency Stop, View Performance |
| **Paused** | Session paused, no new orders | Resume, Stop, View Performance |
| **Stopping** | Session shutting down gracefully | Force Stop |
| **EmergencyStopped** | Session stopped immediately | View Logs, Cleanup |
| **Stopped** | Session ended | View Results, Export, Restart, Archive |


### 18. UI Component Specifications

### UI Component Specifications

Design system, component library, and accessibility requirements for the SymbioteTrader frontend.

#### Design System Tokens

**Color Palette**

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--color-primary` | `#3B82F6` | `#60A5FA` | Primary actions, links |
| `--color-secondary` | `#8B5CF6` | `#A78BFA` | Secondary actions |
| `--color-success` | `#10B981` | `#34D399` | Success states, buy orders |
| `--color-danger` | `#EF4444` | `#F87171` | Error states, sell orders |
| `--color-warning` | `#F59E0B` | `#FBBF24` | Warning states |
| `--color-info` | `#06B6D4` | `#22D3EE` | Info states |
| `--color-background` | `#FFFFFF` | `#0F172A` | Page background |
| `--color-surface` | `#F8FAFC` | `#1E293B` | Card background |
| `--color-border` | `#E2E8F0` | `#334155` | Borders |
| `--color-text-primary` | `#0F172A` | `#F1F5F9` | Primary text |
| `--color-text-secondary` | `#64748B` | `#94A3B8` | Secondary text |
| `--color-text-disabled` | `#CBD5E1` | `#475569` | Disabled text |

**Typography**

| Token | Value | Usage |
|-------|-------|-------|
| `--font-family-sans` | `'Inter', sans-serif` | Body text |
| `--font-family-mono` | `'JetBrains Mono', monospace` | Code, numbers |
| `--font-size-xs` | `0.75rem` (12px) | Small labels |
| `--font-size-sm` | `0.875rem` (14px) | Body text |
| `--font-size-base` | `1rem` (16px) | Default text |
| `--font-size-lg` | `1.125rem` (18px) | Large text |
| `--font-size-xl` | `1.25rem` (20px) | Headings |
| `--font-size-2xl` | `1.5rem` (24px) | Large headings |
| `--font-size-3xl` | `1.875rem` (30px) | Page titles |
| `--font-weight-normal` | `400` | Body text |
| `--font-weight-medium` | `500` | Emphasis |
| `--font-weight-semibold` | `600` | Headings |
| `--font-weight-bold` | `700` | Strong emphasis |

**Spacing**

| Token | Value | Usage |
|-------|-------|-------|
| `--spacing-1` | `0.25rem` (4px) | Tight spacing |
| `--spacing-2` | `0.5rem` (8px) | Small spacing |
| `--spacing-3` | `0.75rem` (12px) | Medium spacing |
| `--spacing-4` | `1rem` (16px) | Default spacing |
| `--spacing-6` | `1.5rem` (24px) | Large spacing |
| `--spacing-8` | `2rem` (32px) | Extra large spacing |
| `--spacing-12` | `3rem` (48px) | Section spacing |

**Border Radius**

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `0.25rem` (4px) | Small elements |
| `--radius-md` | `0.5rem` (8px) | Default elements |
| `--radius-lg` | `0.75rem` (12px) | Large elements |
| `--radius-full` | `9999px` | Pills, badges |

**Shadows**

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle elevation |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Popovers |

#### Component Library

**Core Components (shadcn/ui based)**

| Component | Purpose | Variants | Accessibility |
|-----------|---------|----------|---------------|
| **Button** | Actions | primary, secondary, ghost, danger | ARIA labels, keyboard nav |
| **Input** | Text entry | text, number, password, search | Labels, error messages |
| **Select** | Dropdown selection | single, multi | Keyboard nav, ARIA |
| **Checkbox** | Boolean selection | default, indeterminate | ARIA checked state |
| **Radio** | Single selection | default | ARIA checked state |
| **Switch** | Toggle | default | ARIA switch role |
| **Slider** | Range selection | single, range | ARIA slider role |
| **Card** | Content container | default, interactive | Semantic HTML |
| **Badge** | Status indicator | default, success, danger, warning | ARIA label |
| **Alert** | Notifications | info, success, warning, error | ARIA alert role |
| **Dialog** | Modal | default, alert | Focus trap, ESC to close |
| **Popover** | Contextual info | default | Focus management |
| **Tooltip** | Hover info | default | ARIA describedby |
| **Tabs** | Content sections | default | ARIA tabs pattern |
| **Table** | Data display | default, sortable | ARIA table roles |

**Trading-Specific Components**

| Component | Purpose | Features |
|-----------|---------|----------|
| **OrderBook** | Display order book | Real-time updates, depth visualization |
| **PriceChart** | Display price charts | TradingView integration, multiple timeframes |
| **OrderForm** | Place orders | Validation, slippage calculator |
| **PositionCard** | Display position | PnL, liquidation price, close button |
| **StrategyCard** | Display strategy | Status, performance, controls |
| **BacktestResults** | Display backtest | Metrics, charts, overfitting score |
| **RiskGauge** | Display risk level | Visual gauge, color-coded |
| **BalanceDisplay** | Display balance | Multi-currency, conversion |

#### Accessibility Requirements (WCAG 2.1 AA)

**Perceivable**

| Requirement | Implementation |
|-------------|----------------|
| **Text Alternatives** | All images have alt text, icons have aria-labels |
| **Color Contrast** | Minimum 4.5:1 for normal text, 3:1 for large text |
| **Adaptable Content** | Semantic HTML, proper heading hierarchy |
| **Distinguishable** | Don't rely on color alone, use icons + text |

**Operable**

| Requirement | Implementation |
|-------------|----------------|
| **Keyboard Accessible** | All interactive elements keyboard accessible |
| **Focus Visible** | Clear focus indicators (2px outline) |
| **No Keyboard Trap** | Users can navigate away from all elements |
| **Skip Links** | "Skip to main content" link at top |
| **Timing Adjustable** | No time limits on critical actions |

**Understandable**

| Requirement | Implementation |
|-------------|----------------|
| **Readable** | Clear language, avoid jargon, provide tooltips |
| **Predictable** | Consistent navigation, no unexpected changes |
| **Input Assistance** | Clear labels, error messages, validation |
| **Error Prevention** | Confirmation for destructive actions |

**Robust**

| Requirement | Implementation |
|-------------|----------------|
| **Compatible** | Valid HTML, ARIA roles, tested with screen readers |
| **Screen Reader Support** | NVDA, JAWS, VoiceOver tested |

**Testing Tools**
- **axe DevTools** - Automated accessibility testing
- **WAVE** - Web accessibility evaluation
- **Lighthouse** - Accessibility audit
- **Screen Readers** - NVDA (Windows), VoiceOver (Mac), JAWS

#### Responsive Design

**Breakpoints**

| Breakpoint | Width | Target Device |
|------------|-------|---------------|
| `xs` | < 640px | Mobile portrait |
| `sm` | 640px - 768px | Mobile landscape |
| `md` | 768px - 1024px | Tablet |
| `lg` | 1024px - 1280px | Desktop |
| `xl` | 1280px - 1536px | Large desktop |
| `2xl` | > 1536px | Extra large desktop |

**Layout Patterns**

- **Mobile**: Single column, bottom navigation, collapsible sections
- **Tablet**: Two columns, side navigation, expandable panels
- **Desktop**: Multi-column, persistent navigation, split views


### Chart & Drawing Tools (Complete Specification)

#### Drawing Tools

**1. Trendline**
- Draw line between two points
- Extend: None, Left, Right, Both
- Style: Solid, Dashed, Dotted
- Width: 1-5px
- Color: Customizable
- Hotkey: D

**2. Ray**
- Line extending infinitely in one direction
- Starting point + direction
- Style: Solid, Dashed, Dotted
- Width: 1-5px
- Color: Customizable
- Hotkey: R

**3. Horizontal Line**
- Horizontal line at specific price
- Extends across entire chart
- Style: Solid, Dashed, Dotted
- Width: 1-5px
- Color: Customizable
- Label: Optional text label
- Hotkey: H

**4. Vertical Line**
- Vertical line at specific time
- Extends across entire chart height
- Style: Solid, Dashed, Dotted
- Width: 1-5px
- Color: Customizable
- Label: Optional text label
- Hotkey: V

**5. Rectangle**
- Draw rectangle between two points
- Fill: Optional fill color with opacity
- Border: Customizable color, width, style
- Hotkey: B

**6. Ellipse/Circle**
- Draw ellipse or circle
- Fill: Optional fill color with opacity
- Border: Customizable color, width, style
- Constrain to circle: Hold Shift
- Hotkey: E

**7. Text Annotation**
- Add text at specific point
- Font: Size, family, weight
- Color: Text and background
- Alignment: Left, center, right
- Anchor: Top, middle, bottom
- Hotkey: T

**8. Arrow**
- Draw arrow between two points
- Head style: Triangle, circle, none
- Tail style: Triangle, circle, none
- Width: 1-5px
- Color: Customizable
- Hotkey: A

**9. Fibonacci Retracement**
- Draw between two points (swing high/low)
- Levels: 0%, 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100%
- Customizable levels
- Show prices and percentages
- Extend: None, Left, Right, Both
- Hotkey: F

**10. Fibonacci Extension**
- Draw using three points
- Levels: 0%, 61.8%, 100%, 161.8%, 261.8%, 423.6%
- Customizable levels
- Show prices and percentages

**11. Pitchfork (Andrews' Pitchfork)**
- Draw using three points (pivot + two extremes)
- Median line + parallel channels
- Customizable line styles
- Show price levels

**12. Gann Fan**
- Draw from pivot point
- Angles: 1x1, 1x2, 1x4, 1x8, 2x1, 4x1, 8x1
- Customizable angles
- Show angle labels

**13. Regression Channel**
- Linear regression line + channels
- Standard deviation bands (1Ïƒ, 2Ïƒ, 3Ïƒ)
- Customizable period
- Show RÂ² value

**14. Parallel Channel**
- Two parallel trendlines
- Draw first line, then parallel line
- Extend: None, Left, Right, Both
- Fill between lines (optional)

**15. Triangle**
- Draw triangle using three points
- Fill: Optional fill color with opacity
- Border: Customizable color, width, style

**Drawing Collaboration/Sharing:**
- Save drawings to cloud
- Share drawings with other users (optional)
- Import/export drawings (JSON format)
- Drawing templates library
- Community drawings (optional)


### Hotkeys (Complete Specification)

#### Global Hotkeys

**Navigation:**
- `Ctrl/Cmd + 1-9`: Switch to strategy 1-9
- `Ctrl/Cmd + Tab`: Next strategy
- `Ctrl/Cmd + Shift + Tab`: Previous strategy
- `Ctrl/Cmd + W`: Close current tab
- `Ctrl/Cmd + T`: New tab
- `Ctrl/Cmd + ,`: Open settings
- `Ctrl/Cmd + K`: Open command palette
- `Ctrl/Cmd + /`: Toggle AI chat

**Views:**
- `Ctrl/Cmd + Shift + T`: Toggle trading view
- `Ctrl/Cmd + Shift + S`: Toggle strategies view
- `Ctrl/Cmd + Shift + B`: Toggle backtests view
- `Ctrl/Cmd + Shift + P`: Toggle portfolio view
- `Ctrl/Cmd + Shift + R`: Toggle risk view
- `Ctrl/Cmd + Shift + A`: Toggle AI view

**Watchlist:**
- `W`: Focus watchlist
- `Up/Down`: Navigate watchlist
- `Enter`: Open selected symbol
- `Delete`: Remove from watchlist
- `Ctrl/Cmd + F`: Search watchlist

**Notifications:**
- `N`: Open notification center
- `Shift + N`: Mark all as read
- `Esc`: Close notification center

**AI Chat:**
- `Ctrl/Cmd + /`: Toggle AI chat
- `Ctrl/Cmd + Enter`: Send message
- `Up/Down`: Navigate message history
- `Esc`: Close AI chat

**Global Search:**
- `Ctrl/Cmd + P`: Open global search
- `Ctrl/Cmd + Shift + P`: Open command palette
- `Esc`: Close search

#### Chart Hotkeys

**Navigation:**
- `C`: Toggle crosshair
- `X`: Reset zoom
- `+/-`: Zoom in/out
- `Shift + X`: Fit to screen
- `Click + Drag`: Pan
- `Scroll`: Zoom horizontally
- `Shift + Scroll`: Zoom vertically

**Timeframes:**
- `1`: 1 minute
- `5`: 5 minutes
- `6`: 1 hour
- `D`: 1 day
- `W`: 1 week
- `M`: 1 month

**Drawing Tools:**
- `D`: Trendline
- `R`: Ray
- `H`: Horizontal line
- `V`: Vertical line
- `F`: Fibonacci retracement
- `B`: Rectangle
- `E`: Ellipse
- `T`: Text annotation
- `A`: Arrow

**Editing:**
- `Esc`: Cancel current drawing
- `Delete`: Delete selected drawing
- `Ctrl/Cmd + Z`: Undo
- `Ctrl/Cmd + Shift + Z`: Redo
- `Ctrl/Cmd + A`: Select all drawings
- `Ctrl/Cmd + D`: Duplicate selected drawing

**Snapping:**
- `Shift`: Snap to OHLC/crosshair
- `Alt`: Constrain angles (0Â°/45Â°/90Â°)
- `G`: Toggle magnet strength

**Panes:**
- `Ctrl/Cmd + Up/Down`: Move series between panes
- `P`: Add/remove pane
- `L`: Toggle layout lock

#### Order Entry Hotkeys

**Focus:**
- `O`: Focus order entry
- `Tab`: Navigate fields
- `Shift + Tab`: Navigate fields (reverse)

**Order Types:**
- `M`: Market order
- `L`: Limit order
- `S`: Stop order
- `T`: Trailing stop

**Sides:**
- `B`: Buy
- `S`: Sell (conflicts with Stop, use context)

**Submission:**
- `Enter`: Submit order
- `Ctrl/Cmd + Enter`: Confirm destructive action
- `Esc`: Cancel order entry

**Quick Actions:**
- `Ctrl/Cmd + Shift + F`: Flatten all positions
- `Ctrl/Cmd + Shift + C`: Cancel all orders

#### Strategy Management Hotkeys

**Actions:**
- `Space`: Start/pause selected strategy
- `Ctrl/Cmd + E`: Edit strategy
- `Ctrl/Cmd + B`: Run backtest
- `Ctrl/Cmd + L`: View logs
- `Delete`: Delete strategy (with confirmation)

**Selection:**
- `Up/Down`: Navigate strategies
- `Shift + Up/Down`: Multi-select
- `Ctrl/Cmd + A`: Select all


---

## PART 5: PERFORMANCE & OPTIMIZATION

### 19. Performance & Optimization

### Performance Optimization

#### Database Optimization

**Query Optimization:**
- Use indexes on frequently queried columns
- Avoid N+1 queries (use joins or batch loading)
- Use EXPLAIN ANALYZE to identify slow queries
- Cache frequently accessed data

**Connection Pooling:**
- PostgreSQL: 20 connections per instance
- QuestDB: 10 connections per instance
- ClickHouse: 5 connections per instance
- Redis: 50 connections per instance

**Query Plan Analysis:**
- Log slow queries (>100ms)
- Analyze query plans weekly
- Optimize based on actual usage patterns

**Database Sharding** (Future):
- Shard by user_id for horizontal scaling
- Shard by asset_class for data isolation
- Cross-shard queries via aggregation layer

**Read Replicas:**
- PostgreSQL: 2 read replicas for reporting
- ClickHouse: 1 read replica for analytics
- Route read-only queries to replicas

**Database-Specific Optimizations:**

*PostgreSQL Optimization:*
- `shared_buffers`: 25% of RAM (e.g., 8GB for 32GB RAM)
- `effective_cache_size`: 50% of RAM (e.g., 16GB for 32GB RAM)
- `work_mem`: 50MB per connection (for sorting, hashing)
- `maintenance_work_mem`: 2GB (for VACUUM, CREATE INDEX)
- `max_connections`: 100 (balance between concurrency and overhead)
- `checkpoint_completion_target`: 0.9 (spread checkpoint I/O)
- `wal_buffers`: 16MB (write-ahead log buffer)
- `random_page_cost`: 1.1 (SSD optimization, default 4.0 for HDD)
- Vacuum schedule: `autovacuum = on`, `autovacuum_naptime = 1min`
- Analyze schedule: `autovacuum_analyze_threshold = 50`, `autovacuum_analyze_scale_factor = 0.1`
- JSONB indexing: Use GIN indexes for JSONB columns (`CREATE INDEX idx_data ON table USING GIN (data)`)
- Monitoring: Enable `pg_stat_statements` for query performance tracking

*QuestDB Optimization:*
- Write buffer: 1GB per table (balance between memory and flush frequency)
- Commit lag: 1000ms (batch commits for throughput)
- Max uncommitted rows: 100,000 (force commit after N rows)
- Partition by: DAY (fast queries, easy retention management)
- Symbol capacity: 10,000 symbols per table (pre-allocate for performance)
- O3 max lag: 10s (out-of-order data tolerance)
- Query timeout: 60s (prevent runaway queries)
- Memory allocation: 50% of RAM for QuestDB process
- Compression: Enable for cold partitions (70% storage reduction)

*ClickHouse Optimization:*
- MergeTree settings: `index_granularity = 8192` (balance between index size and query speed)
- Compression codec: `ZSTD(3)` for cold data (70-90% reduction), `LZ4` for hot data (50-70% reduction)
- Max memory usage: `max_memory_usage = 10GB` per query (prevent OOM)
- Max threads: `max_threads = 8` (parallel query execution)
- Materialized views: Pre-aggregate common queries (1-minute candles â†’ 1-hour candles)
- Distributed tables: Shard by symbol hash (horizontal scaling)
- Merge settings: `max_bytes_to_merge_at_max_space_in_pool = 150GB` (large merges for better compression)
- Query cache: Enable for repeated queries (`use_query_cache = 1`)

*Redis Optimization:*
- Max memory: 8GB (adjust based on cache size)
- Eviction policy: `allkeys-lru` (evict least recently used keys when memory full)
- Persistence: `appendonly yes` with `appendfsync everysec` (balance between durability and performance)
- Save snapshots: `save 900 1` (save after 900s if 1 key changed)
- Max clients: 10,000 (concurrent connections)
- Timeout: 300s (close idle connections after 5 minutes)
- TCP backlog: 511 (connection queue size)
- Lazy freeing: `lazyfree-lazy-eviction yes` (non-blocking eviction)

*Qdrant Optimization:*
- Collection config: `on_disk_payload = true` (store payloads on disk, vectors in memory)
- HNSW parameters: `m = 16` (connections per node), `ef_construct = 100` (index build quality)
- Search parameters: `ef = 128` (search quality, higher = better but slower)
- Quantization: Enable scalar quantization for 4x memory reduction (slight accuracy loss)
- Payload indexing: Index frequently filtered fields (`user_id`, `strategy_id`, `timestamp`)
- Memory limit: 16GB for vectors (adjust based on collection size)
- Disk limit: 100GB for payloads (adjust based on data size)

*Neo4j Optimization:*
- Heap size: `dbms.memory.heap.initial_size = 4GB`, `dbms.memory.heap.max_size = 8GB`
- Page cache: `dbms.memory.pagecache.size = 8GB` (cache for graph data)
- Indexes: Create indexes on frequently queried properties (`CREATE INDEX ON :Strategy(name)`)
- Query optimization: Use `EXPLAIN` and `PROFILE` to analyze query plans
- Traversal optimization: Use `MATCH (a)-[:REL*1..3]->(b)` for bounded traversals (avoid unbounded)
- Batch imports: Use `UNWIND` for bulk inserts (10-100x faster than individual `CREATE`)
- Transaction size: Commit every 10,000 operations (balance between atomicity and performance)

#### Caching Strategy

**Redis Caching:**

1. **Hot Data (TTL: 5 minutes)**
   - Current prices
   - Order book snapshots
   - Position summaries
   - Account balances

2. **Warm Data (TTL: 1 hour)**
   - Strategy configurations
   - Risk rules
   - User settings
   - Exchange limits

3. **Cold Data (TTL: 24 hours)**
   - Historical candles
   - Backtest results
   - Performance metrics

**Cache Invalidation:**
- Invalidate on write (e.g., strategy updated â†’ invalidate strategy cache)
- Time-based expiration (TTL)
- Manual invalidation (admin action)

**Cache Warming:**
- Pre-load frequently accessed data on startup
- Background jobs to refresh cache before expiry

#### Frontend Optimization

**Code Splitting:**
- Split by route (lazy load pages)
- Split by feature (lazy load components)
- Vendor bundle separate from app bundle

**Lazy Loading:**
- Images: Lazy load below-the-fold images
- Components: Lazy load heavy components (charts, tables)
- Routes: Lazy load route components

**CDN for Static Assets:**
- Serve static assets (JS, CSS, images) from CDN
- Cache-Control headers: 1 year for versioned assets
- Gzip/Brotli compression

**Image Optimization:**
- WebP format with JPEG fallback
- Responsive images (srcset)
- Lazy loading
- Compression (80% quality)

**Bundle Size Optimization:**
- Tree shaking (remove unused code)
- Minification
- Compression (Gzip/Brotli)
- Target: <500KB initial bundle

**React Performance Patterns:**

*Component Memoization:*
- Use `React.memo()` for expensive components that receive same props
- Use `useMemo()` for expensive calculations (indicator computations, data transformations)
- Use `useCallback()` for event handlers passed to child components
- Avoid inline object/array creation in render (causes unnecessary re-renders)

*Virtualization for Large Lists:*
- Use `react-window` or `@tanstack/react-virtual` for lists with 100+ items
- Apply to: Order book (1000+ orders), strategy list (100+ strategies), trade history (1000+ trades)
- Target: Smooth 60 FPS scrolling with 10,000+ items
- Configuration: Item height (fixed or dynamic), overscan count (5-10 items)

*Canvas Rendering for High-Frequency Updates:*
- Use Canvas API directly for ultra-high-frequency updates (>100 updates/sec)
- Apply to: Order book depth visualization, ticker tape, real-time price ladder
- Pattern: React component wraps Canvas element, useEffect handles Canvas drawing
- Target: 60 FPS (16ms per frame) with 1000+ updates/sec

*WebWorkers for Heavy Computation:*
- Offload CPU-intensive tasks to Web Workers (separate thread, no UI blocking)
- Apply to: Indicator calculations (RSI, MACD, Bollinger Bands on 10,000+ bars)
- Apply to: Backtest result processing, large dataset transformations
- Pattern: Use `comlink` library for easy Worker communication
- Target: Keep main thread <50% CPU usage during heavy computation

*React 18 Concurrent Features:*
- Use `useDeferredValue()` for non-urgent updates (search filters, secondary charts)
- Use `useTransition()` for non-urgent state updates (tab switching, filter changes)
- Use `startTransition()` to mark low-priority updates
- Target: Keep UI responsive during heavy updates (no input lag)

*State Management Optimization:*
- Use Zustand or Redux Toolkit with atomic state updates
- Avoid large monolithic state objects (split by domain: market data, strategies, portfolio)
- Use selectors with memoization (reselect library)
- Normalize state shape (avoid nested objects, use IDs for relationships)
- Target: <5ms state update time, <10ms selector computation time

*Real-Time Update Optimization:*
- Throttle high-frequency updates: Ticker (100ms = 10 updates/sec), Order book (50ms = 20 updates/sec)
- Debounce user input: Search (300ms), Filter (200ms)
- Batch updates: Collect 50ms worth of WebSocket messages, apply all at once
- Frame rate target: 60 FPS (16ms per frame budget)
- Priority: Critical updates (order fills) â†’ High (price updates) â†’ Medium (indicators) â†’ Low (UI polish)

*WebSocket Client Optimization:*
- Single WebSocket connection per exchange (multiplex all subscriptions)
- Message batching: Collect messages for 50ms, process batch in single render
- Subscription multiplexing: Share data streams across components (use context or state management)
- Automatic reconnection: Exponential backoff (1s, 2s, 4s, 8s, max 30s)
- Binary protocol support: MessagePack or Protobuf for 50-70% size reduction
- Heartbeat/keepalive: Send ping every 30s, expect pong within 5s

*Memory Management:*
- Clean up on component unmount: WebSocket subscriptions, timers, event listeners
- Limit chart data retention: Keep last 10,000 bars in memory, lazy-load older data
- Pagination for large datasets: Load 50-100 items at a time, infinite scroll
- Avoid memory leaks: Use `useEffect` cleanup functions, unsubscribe from observables
- Target: <500MB total memory usage for frontend

*Performance Targets:*
- Initial page load: <3s (Time to Interactive)
- Route transition: <200ms
- Component render: <16ms (60 FPS)
- State update: <5ms
- User input response: <100ms (perceived as instant)
- WebSocket message processing: <10ms per message
- Chart update: <16ms (60 FPS)

#### Backend Optimization

**Async/Await Patterns:**

*FastAPI Async Endpoints:*
- Use `async def` for all I/O-bound endpoints (database queries, external APIs, WebSocket)
- Use `await` for async operations (database queries, HTTP requests, file I/O)
- Avoid blocking operations in async functions (use `asyncio.to_thread()` for CPU-bound tasks)
- Target: Handle 1000+ concurrent requests per instance

*Async Database Queries:*
- Use `asyncpg` for PostgreSQL (10x faster than psycopg2)
- Use async drivers for all databases (QuestDB, ClickHouse, Redis)
- Use connection pooling with async context managers
- Batch queries when possible (reduce round trips)
- Target: <50ms query latency for 95th percentile

*Concurrent Request Handling:*
- Configure uvicorn workers: 2x CPU cores (e.g., 8 cores = 16 workers)
- Set worker timeout: 60s for long-running requests (backtests)
- Use worker class: `uvicorn.workers.UvicornWorker`
- Target: 10,000+ requests/sec per instance

*Background Task Patterns:*
- Use `asyncio.create_task()` for fire-and-forget tasks (logging, metrics)
- Use Celery for long-running tasks (backtests, data imports, report generation)
- Use Redis as message broker for Celery (low latency, high throughput)
- Target: <100ms task submission latency

**API Endpoint Optimization:**

*Response Compression:*
- Enable gzip compression for responses >1KB
- Use Brotli compression for static assets (better compression ratio)
- Compression level: 6 (balance between speed and size)
- Target: 70-90% size reduction for JSON responses

*Pagination Optimization:*
- Use cursor-based pagination (not offset-based) for large datasets
- Page size: 50-100 items (balance between requests and payload size)
- Include `next_cursor` and `has_more` in response
- Cache pagination results for 60s (reduce database load)

*Bulk Operation Endpoints:*
- Provide bulk endpoints for common operations (batch order placement, bulk strategy updates)
- Batch size limit: 100 items per request (prevent abuse)
- Use database transactions for atomicity
- Target: 10x faster than individual requests

*Streaming Responses:*
- Use Server-Sent Events (SSE) for real-time updates (strategy status, backtest progress)
- Use streaming responses for large datasets (export trades, download reports)
- Chunk size: 8KB (balance between latency and throughput)
- Target: <100ms time to first byte

**WebSocket Server Optimization:**

*Connection Management:*
- Connection limit per instance: 10,000 connections
- Use Redis pub/sub for multi-instance broadcasting
- Heartbeat interval: 30s (detect dead connections)
- Idle timeout: 5 minutes (close inactive connections)

*Message Batching:*
- Collect messages for 50ms, send batch (reduce syscalls)
- Batch size limit: 100 messages (prevent large payloads)
- Priority queue: Critical messages (order fills) sent immediately
- Target: 100,000+ messages/sec per instance

*Broadcast Optimization:*
- Use Redis pub/sub for broadcasting to all connections
- Use room-based subscriptions (users only receive relevant data)
- Compress broadcast messages (MessagePack or Protobuf)
- Target: <10ms broadcast latency

*Binary Protocol Support:*
- Support MessagePack for 50-70% size reduction vs JSON
- Support Protobuf for strongly-typed messages
- Fallback to JSON for compatibility
- Target: 2-3x throughput improvement with binary protocols

**Worker Pool Optimization:**

*Celery Configuration:*
- Worker count: 4-8 workers per instance (CPU-bound tasks)
- Concurrency: 4-8 threads per worker (I/O-bound tasks)
- Task timeout: 300s (5 minutes) for backtests, 60s for others
- Result backend: Redis (fast, supports expiration)

*Task Priority Queues:*
- Critical queue: Order placement, risk checks (priority 10)
- High queue: Strategy signals, data ingestion (priority 5)
- Normal queue: Backtests, reports (priority 0)
- Low queue: Cleanup, maintenance (priority -5)

*Worker Autoscaling:*
- Scale up: When queue length >100 tasks for >60s
- Scale down: When queue length <10 tasks for >300s
- Min workers: 2 (always available)
- Max workers: 20 (prevent resource exhaustion)

*Task Retry Configuration:*
- Max retries: 3 attempts
- Retry backoff: Exponential (1s, 2s, 4s)
- Retry on: Network errors, temporary failures
- Don't retry on: Validation errors, permanent failures

**Python-Specific Optimizations:**

*GIL Considerations:*
- Use `asyncio` for I/O-bound tasks (not affected by GIL)
- Use `multiprocessing` for CPU-bound tasks (bypass GIL)
- Use Celery workers for parallel CPU-bound tasks
- Avoid threading for CPU-bound tasks (GIL contention)

*NumPy/Pandas Optimization:*
- Use vectorized operations (avoid Python loops)
- Use `numba` JIT compilation for hot paths (10-100x speedup)
- Use `pandas.eval()` for complex expressions (faster than Python)
- Avoid `.apply()` with Python functions (use vectorized alternatives)

*Memory Management:*
- Use generators for large datasets (avoid loading all in memory)
- Use `__slots__` for classes with many instances (reduce memory)
- Use `weakref` for caches (allow garbage collection)
- Profile memory usage with `memory_profiler` (identify leaks)

*Cython/Numba for Hot Paths:*
- Use `numba.jit` for indicator calculations (RSI, MACD, Bollinger Bands)
- Use Cython for performance-critical modules (order matching, risk calculations)
- Target: 10-100x speedup for hot paths
- Only optimize after profiling (avoid premature optimization)

**Performance Targets:**

- API endpoint latency: <50ms p50, <200ms p95, <500ms p99
- WebSocket message latency: <10ms p95
- Database query latency: <50ms p95
- Background task submission: <100ms
- Concurrent connections: 10,000+ per instance
- Requests per second: 10,000+ per instance
- WebSocket messages per second: 100,000+ per instance

#### Network Optimization

**WebSocket Protocol Optimization:**

*Binary Protocol Support:*
- MessagePack: 50-70% size reduction vs JSON, fast encoding/decoding
- Protobuf: Strongly-typed, efficient, requires schema definition
- JSON: Fallback for compatibility, human-readable
- Recommendation: MessagePack for production, JSON for development

*Compression:*
- Enable permessage-deflate extension (WebSocket compression)
- Compression threshold: Messages >1KB (avoid overhead for small messages)
- Compression level: 6 (balance between CPU and size)
- Target: 60-80% size reduction for text messages

*Message Size Limits:*
- Max message size: 1MB (prevent abuse)
- Large messages: Split into chunks (100KB per chunk)
- Chunk format: `{chunk_id, total_chunks, data}`
- Reassemble on client side

*Multiplexing Strategies:*
- Single WebSocket connection per exchange (multiplex all subscriptions)
- Use message routing: `{channel, symbol, data}`
- Client subscribes to channels: `ticker.BTC/USDT`, `orderbook.ETH/USDT`
- Server broadcasts to subscribed clients only

**REST API Optimization:**

*HTTP/2 Support:*
- Enable HTTP/2 for multiplexing (multiple requests over single connection)
- Server push for related resources (CSS, JS after HTML)
- Header compression (HPACK algorithm)
- Target: 30-50% latency reduction vs HTTP/1.1

*Request/Response Compression:*
- Enable gzip compression for responses >1KB
- Enable Brotli compression for static assets (better ratio than gzip)
- Compression level: 6 for dynamic content, 9 for static assets
- Target: 70-90% size reduction for JSON responses

*Connection Keep-Alive:*
- Enable HTTP keep-alive (reuse TCP connections)
- Keep-alive timeout: 60s (balance between reuse and resource usage)
- Max requests per connection: 1000 (prevent connection exhaustion)
- Target: 50-100ms latency reduction per request

*CDN Caching for API Responses:*
- Cache GET endpoints with low volatility (strategy list, user settings)
- Cache-Control headers: `public, max-age=60` (1 minute)
- Vary header: `Accept-Encoding, Authorization` (per-user caching)
- Invalidate on write: Purge cache when data changes

**Data Transfer Optimization:**

*Payload Size Optimization:*
- Field selection: Allow clients to specify fields (`?fields=id,name,price`)
- Sparse responses: Omit null/empty fields (reduce payload size)
- Pagination: Limit response size (50-100 items per page)
- Target: <100KB per response (balance between requests and payload size)

*Delta Updates:*
- Send only changes, not full snapshots (order book, portfolio)
- Delta format: `{action: "update", id: 123, changes: {price: 50000}}`
- Client maintains local state, applies deltas
- Target: 90-95% size reduction for incremental updates

*Batch Operations:*
- Bulk endpoints: `/api/v1/orders/batch` (place multiple orders)
- Batch size limit: 100 items (prevent abuse)
- Atomic transactions: All succeed or all fail
- Target: 10x faster than individual requests

*Streaming vs Polling:*
- Use WebSocket/SSE for real-time data (price updates, order fills)
- Use polling for low-frequency data (strategy list, user settings)
- Polling interval: 30-60s (balance between freshness and load)
- Target: 100x reduction in requests with streaming

**Bandwidth Optimization:**

*Data Compression Ratios:*
- JSON with gzip: 70-80% reduction
- MessagePack: 50-70% reduction vs JSON
- Protobuf: 60-80% reduction vs JSON
- Target: <1MB/min bandwidth per active user

*Tick Data Aggregation:*
- Send 1-minute candles instead of ticks when possible (99% size reduction)
- Send ticks only for active trading (order placement, monitoring)
- Aggregate ticks on server side (reduce client processing)
- Target: 10-100x bandwidth reduction

*Subscription Filtering:*
- Server-side filtering: Only send subscribed symbols
- Client-side filtering: Filter by price range, volume threshold
- Unsubscribe from inactive symbols (automatic after 5 minutes)
- Target: 50-90% bandwidth reduction

*Rate Limiting:*
- Per-user rate limits: 100 req/min for reads, 10 req/min for writes
- Per-IP rate limits: 1000 req/min (prevent abuse)
- Burst allowance: 2x rate limit for short bursts
- Response header: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

**Performance Targets:**

- WebSocket message size: <1KB average, <10KB p95
- REST API response size: <100KB average, <1MB p95
- Compression ratio: 70-90% for JSON, 50-70% for binary
- Bandwidth per user: <1MB/min average, <10MB/min peak
- Network latency: <50ms p50, <200ms p95 (within region)
- Connection reuse: >80% of requests use keep-alive

#### Data Pipeline Optimization

**Market Data Ingestion Optimization:**

*Parallel Ingestion:*
- Multiple workers per exchange (2-4 workers for high-volume exchanges)
- Worker assignment: Round-robin by symbol (distribute load evenly)
- Independent WebSocket connections per worker (avoid single point of failure)
- Target: 5,000-10,000 ticks/sec per exchange (20,000+ ticks/sec total)

*Batch Insert Optimization:*
- Buffer size: 1000 ticks or 100ms (whichever comes first)
- Batch insert to QuestDB (10-100x faster than individual inserts)
- Use prepared statements (reduce parsing overhead)
- Target: <10ms insert latency for 1000-tick batch

*Backpressure Handling:*
- Monitor queue depth: Alert when >10,000 ticks queued
- Slow consumer detection: Drop non-critical ticks when queue >50,000
- Priority queue: Order fills (critical) > price updates (high) > volume updates (normal)
- Circuit breaker: Pause ingestion when database unavailable (retry after 5s)

*Data Deduplication:*
- Deduplicate by (exchange, symbol, timestamp, price, volume)
- Use bloom filter for fast duplicate detection (99.9% accuracy, <1ms)
- Store last 10,000 ticks in memory for exact deduplication
- Target: <1% duplicate rate

**Data Processing Optimization:**

*Indicator Calculation Optimization:*
- Use vectorized operations (NumPy) for batch calculations (10-100x faster)
- Use `numba.jit` for hot paths (RSI, MACD, Bollinger Bands)
- Calculate indicators on-demand (not pre-computed for all symbols)
- Cache indicator results for 60s (reduce recalculation)
- Target: <100ms to calculate 20 indicators on 10,000 bars

*Candle Aggregation Optimization:*
- Aggregate 1m â†’ 5m â†’ 15m â†’ 1h â†’ 4h â†’ 1d (hierarchical aggregation)
- Use materialized views in QuestDB (pre-aggregated, fast queries)
- Incremental aggregation (update only new candles, not full recalculation)
- Target: <10ms to aggregate 1000 1-minute candles to 5-minute candles

*Real-Time vs Batch Processing:*
- Real-time: Price updates, order fills, position updates (latency-sensitive)
- Batch: Indicator calculations, backtest results, reports (throughput-optimized)
- Hybrid: Candle aggregation (real-time for active symbols, batch for inactive)
- Target: <100ms latency for real-time, <10s for batch

*Pipeline Parallelization:*
- Stage 1: Ingestion (parallel by exchange)
- Stage 2: Normalization (parallel by symbol)
- Stage 3: Storage (parallel by partition)
- Stage 4: Aggregation (parallel by timeframe)
- Use message queue (Redis Streams) between stages (decouple, scale independently)

**Data Storage Optimization:**

*Compression Strategies:*
- QuestDB: Use built-in compression (LZ4, 50-70% reduction)
- ClickHouse: Use ZSTD compression (70-90% reduction, slower)
- PostgreSQL: Use TOAST compression for large JSONB fields
- Target: 50-90% storage reduction vs uncompressed

*Partition Strategies:*
- QuestDB: Partition by day (fast queries, easy retention management)
- ClickHouse: Partition by month (balance between partition count and query performance)
- PostgreSQL: Partition by user_id (horizontal scaling)
- Target: <100ms query latency with proper partitioning

*Data Lifecycle Management:*
- Hot data (0-7 days): QuestDB, high-performance SSD, no compression
- Warm data (7-30 days): QuestDB, standard SSD, LZ4 compression
- Cold data (30-365 days): ClickHouse, HDD, ZSTD compression
- Archive (>365 days): S3/Glacier, maximum compression, rare access
- Automatic aging: Daily job moves data between tiers

*Retention Policies:*
- Tick data: 7 days hot, 30 days warm, 365 days cold, archive after 1 year
- 1-minute candles: 30 days hot, 365 days warm, archive after 2 years
- 1-hour candles: 365 days hot, archive after 5 years
- Daily candles: Permanent (never delete)
- Trades: Permanent (regulatory requirement)

**Data Retrieval Optimization:**

*Query Result Caching:*
- Cache common queries: Latest price (5s TTL), 1-hour candles (60s TTL), daily candles (1h TTL)
- Cache key: `{query_hash, params_hash}` (unique per query)
- Cache invalidation: On new data arrival (invalidate affected queries)
- Target: >80% cache hit rate for common queries

*Prefetching:*
- Prefetch next page when user scrolls to 80% of current page
- Prefetch related data: When loading strategy, prefetch backtest results
- Prefetch on idle: Load commonly accessed data during low-traffic periods
- Target: <100ms perceived latency with prefetching

*Lazy Loading vs Eager Loading:*
- Lazy loading: Large datasets (trade history, backtest results)
- Eager loading: Small datasets (strategy config, user settings)
- Hybrid: Load summary first, details on-demand (strategy list â†’ strategy details)
- Target: <500ms initial load, <200ms detail load

*Pagination Optimization:*
- Cursor-based pagination (not offset-based) for large datasets
- Page size: 50-100 items (balance between requests and payload size)
- Prefetch next page in background (reduce perceived latency)
- Target: <100ms per page load

**Performance Targets:**

- Ingestion throughput: 5,000-10,000 ticks/sec per exchange
- Batch insert latency: <10ms for 1000-tick batch
- Indicator calculation: <100ms for 20 indicators on 10,000 bars
- Candle aggregation: <10ms for 1000 1-minute candles
- Query latency: <50ms p95 for hot data, <200ms p95 for warm data
- Cache hit rate: >80% for common queries
- Storage compression: 50-90% reduction vs uncompressed

#### AI/ML Optimization

**Model Inference Optimization:**

*Batch Inference:*
- Collect multiple requests for 100ms, process batch (10-100x faster than individual)
- Batch size: 8-32 requests (balance between latency and throughput)
- Use case: Strategy analysis, signal generation, risk assessment
- Target: <500ms latency for batch of 32 requests

*Model Quantization:*
- 4-bit quantization: 75% memory reduction, 2-3x faster inference (slight quality loss)
- 8-bit quantization: 50% memory reduction, 1.5-2x faster inference (minimal quality loss)
- Use case: Local models (Llama, Mistral) for cost reduction
- Target: <2GB memory per model instance

*GPU Utilization:*
- Use GPU for large models (>7B parameters)
- Batch size: 16-32 for GPU (maximize utilization)
- Mixed precision: FP16 for 2x speedup, minimal quality loss
- Target: >80% GPU utilization during inference

*Inference Caching:*
- Cache responses for semantically similar queries (cosine similarity >0.95)
- Cache key: Embedding of query (768-dim vector)
- Cache TTL: 1 hour for strategy analysis, 5 minutes for market analysis
- Target: >30% cache hit rate

**Prompt Optimization:**

*Prompt Compression:*
- Remove redundant context (deduplicate information)
- Use structured output (JSON schema) to reduce response tokens
- Use few-shot examples only when necessary (zero-shot first)
- Target: 30-50% token reduction vs naive prompts

*Few-Shot vs Zero-Shot:*
- Zero-shot: Use for simple tasks (classification, extraction)
- Few-shot: Use for complex tasks (strategy generation, analysis)
- Few-shot examples: 2-3 examples (more doesn't always help)
- Target: <1000 tokens for few-shot prompts

*Structured Output Optimization:*
- Use JSON schema for structured responses (reduce parsing errors)
- Use Pydantic models for validation (type safety)
- Use function calling for tool use (more reliable than text parsing)
- Target: >95% valid structured outputs

*Token Reduction Strategies:*
- Use abbreviations for repeated terms (BTC instead of Bitcoin)
- Remove unnecessary formatting (markdown, whitespace)
- Use token-efficient encodings (numbers as digits, not words)
- Target: 20-40% token reduction

**Embedding Optimization:**

*Batch Embedding Generation:*
- Batch size: 100-1000 texts (10-100x faster than individual)
- Use case: Document indexing, semantic search
- Target: <1s to embed 1000 documents

*Embedding Cache:*
- Cache embeddings for static content (strategy descriptions, documentation)
- Cache key: Hash of text content
- Cache TTL: Permanent for static content, 1 hour for dynamic content
- Target: >90% cache hit rate for static content

*Dimensionality Reduction:*
- Use PCA or UMAP to reduce 1536-dim â†’ 768-dim (50% storage reduction)
- Minimal accuracy loss (<2% for most tasks)
- Use case: Large-scale semantic search (millions of documents)
- Target: 2x faster search with reduced dimensions

*Quantization for Storage:*
- Store embeddings as int8 instead of float32 (75% storage reduction)
- Minimal accuracy loss (<1% for most tasks)
- Use case: Large-scale vector storage (Qdrant)
- Target: 4x more vectors in same memory

**RAG Optimization:**

*Chunk Size Optimization:*
- Chunk size: 512-1024 tokens (balance between context and relevance)
- Overlap: 50-100 tokens (preserve context across chunks)
- Use case: Documentation, strategy knowledge base
- Rationale: Smaller chunks = more precise retrieval, larger chunks = more context

*Retrieval Caching:*
- Cache retrieval results for common queries (cosine similarity >0.95)
- Cache key: Embedding of query
- Cache TTL: 1 hour for documentation, 5 minutes for market data
- Target: >40% cache hit rate

*Hybrid Search Optimization:*
- Combine vector search (semantic) + BM25 (keyword) for better results
- Weight: 70% vector, 30% BM25 (adjust based on use case)
- Use case: Documentation search, strategy search
- Target: 20-30% better recall vs vector-only search

*Re-Ranking Strategies:*
- Use cross-encoder for re-ranking top 10-20 results (more accurate than bi-encoder)
- Use case: High-stakes queries (strategy recommendations, risk analysis)
- Target: 10-20% better precision vs no re-ranking

**Cost Optimization:**

*Provider Cost Comparison:*
- OpenAI GPT-4: $0.03/1K input tokens, $0.06/1K output tokens (highest quality)
- Anthropic Claude: $0.015/1K input tokens, $0.075/1K output tokens (good quality)
- OpenAI GPT-3.5: $0.0015/1K input tokens, $0.002/1K output tokens (fast, cheap)
- Local models (Llama 3): $0/token (one-time GPU cost, lower quality)
- Recommendation: GPT-4 for critical tasks, GPT-3.5 for simple tasks, local for high-volume

*Cache Hit Rate Targets:*
- Prompt caching: >40% hit rate (save 40% of input token costs)
- Response caching: >30% hit rate (save 30% of total costs)
- Embedding caching: >90% hit rate for static content
- Target: 50-70% total cost reduction with caching

*Model Selection Criteria:*
- Critical tasks (strategy generation, risk analysis): GPT-4 (highest quality)
- Simple tasks (classification, extraction): GPT-3.5 (fast, cheap)
- High-volume tasks (signal generation): Local models (zero marginal cost)
- Target: <$100/month AI costs for typical user

*Budget Allocation:*
- Strategy analysis: 40% of budget (most valuable)
- Market analysis: 30% of budget (high frequency)
- Risk analysis: 20% of budget (critical)
- Other (chat, help): 10% of budget (nice-to-have)
- Alert when 80% of budget consumed (prevent overruns)

**Performance Targets:**

- Model inference latency: <500ms p50, <2s p95
- Batch inference throughput: 100+ requests/sec
- Prompt caching hit rate: >40%
- Response caching hit rate: >30%
- Embedding generation: <1s for 1000 documents
- RAG retrieval latency: <200ms p95
- AI cost per user: <$100/month average

#### Memory & Resource Optimization

**Memory Allocation:**

*Per-Container Memory Limits:*
- Frontend (React): 512MB limit, 256MB request
- API Gateway (FastAPI): 2GB limit, 1GB request
- Worker (Celery): 4GB limit, 2GB request (CPU-intensive tasks)
- PostgreSQL: 8GB limit, 4GB request (25% of total RAM)
- QuestDB: 16GB limit, 8GB request (50% of total RAM for high-throughput)
- ClickHouse: 8GB limit, 4GB request
- Redis: 8GB limit, 4GB request (cache size)
- Qdrant: 16GB limit, 8GB request (vector storage)
- Neo4j: 8GB limit, 4GB request

*Memory Reservation vs Limits:*
- Request (reservation): Guaranteed memory, always available
- Limit: Maximum memory, can burst up to this
- Recommendation: Set request = 50% of limit (allow bursting)
- OOM killer: Kills container when limit exceeded (set alerts)

*OOM Killer Prevention:*
- Set memory limits 20% below physical RAM (leave room for OS)
- Monitor memory usage: Alert at 80% of limit
- Use swap space: 2GB swap for emergency (slow but prevents OOM)
- Graceful degradation: Reduce cache size when memory pressure detected

*Memory Monitoring & Alerting:*
- Alert at 80% memory usage (warning)
- Alert at 90% memory usage (critical)
- Track memory growth rate (detect leaks)
- Monitor swap usage (indicates memory pressure)

**Garbage Collection:**

*Python GC Tuning:*
- Generation thresholds: `gc.set_threshold(700, 10, 10)` (default: 700, 10, 10)
- Disable GC during critical sections: `gc.disable()` before, `gc.enable()` after
- Manual GC: `gc.collect()` after large operations (backtest, data import)
- Monitor GC stats: `gc.get_stats()` to track collections and pauses

*Redis Memory Eviction:*
- Eviction policy: `allkeys-lru` (evict least recently used keys)
- Max memory: 8GB (adjust based on cache size)
- Eviction samples: 5 (balance between accuracy and speed)
- Monitor evicted keys: Alert when eviction rate >1000 keys/sec

*Database Buffer Pool Sizing:*
- PostgreSQL `shared_buffers`: 25% of RAM (e.g., 8GB for 32GB RAM)
- QuestDB memory: 50% of RAM (e.g., 16GB for 32GB RAM)
- ClickHouse `max_memory_usage`: 10GB per query
- Neo4j page cache: 8GB (cache for graph data)

*Memory Leak Detection:*
- Use `memory_profiler` for Python (line-by-line memory usage)
- Use `objgraph` to track object references (find circular references)
- Monitor memory growth over time (detect slow leaks)
- Restart containers weekly (temporary mitigation for leaks)

**Resource Scaling:**

*Horizontal Scaling Triggers:*
- CPU usage >70% for >5 minutes â†’ Scale up
- Memory usage >80% for >5 minutes â†’ Scale up
- Request queue length >100 for >1 minute â†’ Scale up
- CPU usage <30% for >15 minutes â†’ Scale down
- Memory usage <50% for >15 minutes â†’ Scale down

*Vertical Scaling Recommendations:*
- Start with: 4 CPU, 16GB RAM (Intermediate profile)
- Scale to: 8 CPU, 32GB RAM (Full-Featured profile)
- Scale to: 16 CPU, 64GB RAM (High-Performance profile)
- Monitor: CPU and memory usage to determine when to scale

*Autoscaling Configuration:*
- Min replicas: 2 (high availability)
- Max replicas: 10 (prevent runaway scaling)
- Target CPU utilization: 70% (balance between cost and performance)
- Target memory utilization: 80% (leave room for bursts)
- Scale-up cooldown: 1 minute (fast response to load)
- Scale-down cooldown: 5 minutes (avoid flapping)

*Resource Limits per Deployment Profile:*

**Minimal Profile (1 user, testing):**
- Total: 2 CPU, 8GB RAM
- Frontend: 0.25 CPU, 256MB RAM
- API: 0.5 CPU, 1GB RAM
- PostgreSQL: 0.5 CPU, 2GB RAM
- QuestDB: 0.5 CPU, 2GB RAM
- Redis: 0.25 CPU, 1GB RAM

**Intermediate Profile (1-5 users, development):**
- Total: 4 CPU, 16GB RAM
- Frontend: 0.5 CPU, 512MB RAM
- API: 1 CPU, 2GB RAM
- PostgreSQL: 1 CPU, 4GB RAM
- QuestDB: 1 CPU, 4GB RAM
- Redis: 0.5 CPU, 2GB RAM

**Full-Featured Profile (5-20 users, production):**
- Total: 8 CPU, 32GB RAM
- Frontend: 1 CPU, 1GB RAM
- API: 2 CPU, 4GB RAM
- Worker: 2 CPU, 8GB RAM
- PostgreSQL: 1 CPU, 8GB RAM
- QuestDB: 2 CPU, 8GB RAM
- Redis: 1 CPU, 4GB RAM

**Container Optimization:**

*Docker Image Size Optimization:*
- Use multi-stage builds (separate build and runtime stages)
- Use Alpine Linux base images (5-10x smaller than Ubuntu)
- Remove build dependencies in final stage (only runtime dependencies)
- Target: <500MB per image (balance between size and functionality)

*Layer Caching Strategies:*
- Order Dockerfile commands: Least frequently changed first (base image, system packages)
- Copy dependency files first: `COPY requirements.txt` before `COPY .` (cache dependencies)
- Use `.dockerignore`: Exclude unnecessary files (node_modules, .git, __pycache__)
- Target: <1 minute build time with cache, <5 minutes without cache

*Resource Requests vs Limits (Kubernetes):*
- Request: Guaranteed resources (used for scheduling)
- Limit: Maximum resources (hard cap)
- Recommendation: Set limit = 2x request (allow bursting)
- QoS class: Burstable (request < limit) for most services

*Health Checks & Liveness Probes:*
- Liveness probe: Restart container if unhealthy (HTTP /health endpoint)
- Readiness probe: Remove from load balancer if not ready (HTTP /ready endpoint)
- Startup probe: Allow slow startup (60s timeout for database initialization)
- Probe interval: 10s (balance between responsiveness and overhead)

**Performance Targets:**

- Memory usage: <80% of limit (leave room for bursts)
- CPU usage: <70% average (leave room for spikes)
- GC pause time: <100ms p95 (minimize impact on latency)
- Container startup time: <30s (fast recovery from failures)
- Autoscaling response time: <2 minutes (from trigger to new replica ready)
- OOM kill rate: <1 per week (indicates memory leaks or undersizing)


### Performance SLOs (Service Level Objectives)

Exact performance targets for all critical operations to ensure responsive user experience and reliable trading execution.

#### Latency Targets

**Critical Trading Operations (P95 < 100ms, P99 < 200ms)**

| Operation | P50 | P95 | P99 | Timeout |
|-----------|-----|-----|-----|---------|
| Place Order | 30ms | 80ms | 150ms | 5s |
| Cancel Order | 25ms | 70ms | 120ms | 3s |
| Modify Order | 30ms | 80ms | 150ms | 5s |
| Get Order Status | 10ms | 30ms | 50ms | 2s |
| Get Position | 10ms | 30ms | 50ms | 2s |
| Get Balance | 15ms | 40ms | 70ms | 2s |

**Market Data Operations (P95 < 50ms, P99 < 100ms)**

| Operation | P50 | P95 | P99 | Timeout |
|-----------|-----|-----|-----|---------|
| Get Ticker | 5ms | 20ms | 40ms | 1s |
| Get Order Book | 8ms | 25ms | 50ms | 1s |
| Get Recent Trades | 10ms | 30ms | 60ms | 2s |
| Get OHLCV Candles | 15ms | 40ms | 80ms | 3s |
| WebSocket Tick Latency | 2ms | 10ms | 20ms | N/A |

**Strategy Operations (P95 < 500ms, P99 < 1s)**

| Operation | P50 | P95 | P99 | Timeout |
|-----------|-----|-----|-----|---------|
| Create Strategy | 100ms | 300ms | 600ms | 10s |
| Update Strategy | 80ms | 250ms | 500ms | 10s |
| Validate Strategy | 50ms | 200ms | 400ms | 5s |
| Compile Strategy | 150ms | 400ms | 800ms | 15s |
| List Strategies | 20ms | 80ms | 150ms | 5s |

**Backtest Operations (Long-Running, Progress Updates)**

| Operation | P50 | P95 | P99 | Timeout |
|-----------|-----|-----|-----|---------|
| Start Backtest | 200ms | 500ms | 1s | 10s |
| Backtest Execution | 5s | 30s | 60s | 5min |
| Get Backtest Results | 50ms | 200ms | 400ms | 5s |
| Overfitting Analysis | 500ms | 2s | 4s | 30s |

**AI Operations (P95 < 3s, P99 < 5s)**

| Operation | P50 | P95 | P99 | Timeout |
|-----------|-----|-----|-----|---------|
| AI Chat Response | 800ms | 2.5s | 4s | 30s |
| Strategy Analysis | 1s | 3s | 5s | 30s |
| Generate Strategy | 2s | 5s | 8s | 60s |
| Market Insights | 500ms | 2s | 3.5s | 20s |

#### Throughput Requirements

**Per-User Limits**

| Tier | Orders/sec | API Calls/min | WebSocket Connections | Concurrent Strategies |
|------|------------|---------------|----------------------|----------------------|
| Free | 1 | 60 | 1 | 3 |
| Pro | 10 | 600 | 5 | 25 |
| Enterprise | 100 | 6000 | 20 | Unlimited |

**System-Wide Capacity**

| Metric | Target | Peak Capacity |
|--------|--------|---------------|
| Total Users (Concurrent) | 10,000 | 50,000 |
| Orders/sec (System) | 10,000 | 50,000 |
| WebSocket Messages/sec | 100,000 | 500,000 |
| Database Writes/sec | 50,000 | 200,000 |
| Database Reads/sec | 200,000 | 1,000,000 |

#### Availability Targets

**Service Level Agreements**

| Service Tier | Uptime Target | Max Downtime/Month | Max Downtime/Year |
|--------------|---------------|-------------------|-------------------|
| Free | 99.0% | 7h 18m | 3.65 days |
| Pro | 99.9% | 43m 49s | 8.76 hours |
| Enterprise | 99.95% | 21m 54s | 4.38 hours |

**Component Availability**

| Component | Target | Recovery Time |
|-----------|--------|---------------|
| API Gateway | 99.99% | < 1 minute |
| Trading Engine | 99.95% | < 2 minutes |
| Market Data Feed | 99.9% | < 5 minutes |
| Database (Primary) | 99.99% | < 30 seconds |
| Database (Replica) | 99.9% | < 2 minutes |
| WebSocket Service | 99.9% | < 1 minute |
| AI Services | 99.5% | < 5 minutes |

#### Error Rate Budgets

**Acceptable Error Rates**

| Operation Type | Target Success Rate | Max Error Rate | Error Budget/Month |
|----------------|---------------------|----------------|-------------------|
| Order Placement | 99.9% | 0.1% | 43,200 errors |
| Order Cancellation | 99.95% | 0.05% | 21,600 errors |
| Market Data Fetch | 99.5% | 0.5% | 216,000 errors |
| API Calls | 99.9% | 0.1% | 43,200 errors |
| WebSocket Messages | 99.99% | 0.01% | 4,320 errors |
| Database Queries | 99.99% | 0.01% | 4,320 errors |

**Error Categories**

| Error Type | Retryable | Count Toward Budget | User Impact |
|------------|-----------|---------------------|-------------|
| 4xx Client Errors | No | No | User mistake |
| 5xx Server Errors | Yes | Yes | Service issue |
| Timeout Errors | Yes | Yes | Performance issue |
| Rate Limit Errors | Yes | No | Expected behavior |
| Exchange API Errors | Depends | Partial | External dependency |

#### Database Performance Targets

**PostgreSQL (Operational Data)**

| Query Type | P50 | P95 | P99 |
|------------|-----|-----|-----|
| Simple SELECT | 1ms | 5ms | 10ms |
| JOIN Query | 5ms | 20ms | 40ms |
| INSERT | 2ms | 8ms | 15ms |
| UPDATE | 3ms | 10ms | 20ms |
| Complex Aggregation | 20ms | 100ms | 200ms |

**QuestDB (Time-Series Data)**

| Query Type | P50 | P95 | P99 |
|------------|-----|-----|-----|
| Latest Tick | 1ms | 3ms | 5ms |
| Candle Range (1 day) | 5ms | 15ms | 30ms |
| Candle Range (1 month) | 20ms | 80ms | 150ms |
| Aggregation Query | 10ms | 50ms | 100ms |

**ClickHouse (Analytics)**

| Query Type | P50 | P95 | P99 |
|------------|-----|-----|-----|
| Event Count | 10ms | 40ms | 80ms |
| Time-Series Aggregation | 50ms | 200ms | 400ms |
| Complex Analytics | 200ms | 1s | 2s |

**Neo4j (Knowledge Graph)**

| Query Type | P50 | P95 | P99 |
|------------|-----|-----|-----|
| Node Lookup | 2ms | 8ms | 15ms |
| 1-Hop Traversal | 5ms | 20ms | 40ms |
| 2-Hop Traversal | 15ms | 60ms | 120ms |
| Pattern Match | 30ms | 150ms | 300ms |

**Qdrant (Vector Search)**

| Query Type | P50 | P95 | P99 |
|------------|-----|-----|-----|
| Nearest Neighbor (k=10) | 10ms | 40ms | 80ms |
| Filtered Search | 20ms | 80ms | 150ms |
| Batch Search | 50ms | 200ms | 400ms |

#### Monitoring & Alerting Thresholds

**Critical Alerts (Page On-Call)**

| Metric | Threshold | Action |
|--------|-----------|--------|
| API Error Rate | > 1% for 5 minutes | Page on-call engineer |
| Order Placement Latency | P95 > 200ms for 5 minutes | Page on-call engineer |
| Database Connection Pool | > 90% utilization | Page on-call engineer |
| WebSocket Disconnections | > 10% for 5 minutes | Page on-call engineer |
| System CPU | > 90% for 10 minutes | Page on-call engineer |
| System Memory | > 95% for 5 minutes | Page on-call engineer |

**Warning Alerts (Notify Team)**

| Metric | Threshold | Action |
|--------|-----------|--------|
| API Error Rate | > 0.5% for 10 minutes | Notify team channel |
| API Latency | P95 > 150% of target | Notify team channel |
| Database Slow Queries | > 100 queries/min over 1s | Notify team channel |
| Cache Hit Rate | < 80% for 15 minutes | Notify team channel |
| Disk Usage | > 80% | Notify team channel |


### Performance Metrics (Complete List)

#### Risk-Adjusted Returns

**1. Sharpe Ratio**
- Formula: (Return - Risk-Free Rate) / Standard Deviation
- Interpretation: Return per unit of risk
- Good: >1.0, Excellent: >2.0

**2. Sortino Ratio**
- Formula: (Return - Risk-Free Rate) / Downside Deviation
- Interpretation: Return per unit of downside risk
- Good: >1.5, Excellent: >3.0

**3. Calmar Ratio**
- Formula: Annual Return / Maximum Drawdown
- Interpretation: Return per unit of maximum drawdown
- Good: >0.5, Excellent: >1.0

**4. Omega Ratio**
- Formula: Probability-weighted gains / Probability-weighted losses
- Interpretation: Ratio of gains to losses above/below threshold
- Good: >1.5, Excellent: >2.0

**5. Tail Ratio**
- Formula: 95th percentile return / 5th percentile return
- Interpretation: Right tail vs left tail
- Good: >1.0 (positive skew)

#### Risk Metrics

**6. Value at Risk (VaR)**
- 95% VaR: Maximum loss expected 95% of the time
- 99% VaR: Maximum loss expected 99% of the time
- Calculation methods: Historical, Parametric, Monte Carlo

**7. Conditional Value at Risk (CVaR)**
- Expected loss beyond VaR threshold
- Also known as Expected Shortfall
- More conservative than VaR

**8. Maximum Adverse Excursion (MAE)**
- Largest unrealized loss during a trade
- Helps optimize stop-loss placement
- Analyze per trade and aggregate

**9. Maximum Favorable Excursion (MFE)**
- Largest unrealized profit during a trade
- Helps optimize take-profit placement
- Analyze per trade and aggregate

**10. Ulcer Index**
- Measures depth and duration of drawdowns
- Lower is better
- Formula: sqrt(sum((drawdown%)Â²) / n)

#### Trade Statistics

**11. Win Rate**
- Percentage of winning trades
- Formula: Winning Trades / Total Trades
- Good: >50%, Excellent: >60%

**12. Profit Factor**
- Ratio of gross profit to gross loss
- Formula: Gross Profit / Gross Loss
- Good: >1.5, Excellent: >2.0

**13. Expectancy**
- Average profit/loss per trade
- Formula: (Win Rate Ã— Avg Win) - (Loss Rate Ã— Avg Loss)
- Positive expectancy required for profitability

**14. Average Win / Average Loss Ratio**
- Size of average win vs average loss
- Good: >1.5, Excellent: >2.0
- Compensates for lower win rate

**15. Consecutive Wins/Losses**
- Maximum consecutive winning/losing trades
- Helps assess psychological impact
- Informs risk management

#### Execution Quality

**16. Slippage**
- Difference between expected and actual fill price
- Measured in ticks or percentage
- Track per venue and order type

**17. Fill Rate**
- Percentage of orders filled
- Formula: Filled Orders / Total Orders
- Good: >95%, Excellent: >98%

**18. Price Improvement**
- Better fill price than expected
- Positive slippage
- Track per venue and order type

**19. Time to Fill**
- Time from order placement to fill
- Track p50, p95, p99
- Good: <1s, Excellent: <100ms


---

## PART 6: OPERATIONS & DEPLOYMENT

### 20. Testing & Quality Assurance

### Testing Strategy

Comprehensive testing approach to ensure reliability, correctness, and performance of the SymbioteTrader platform.

#### Test Coverage Requirements

**Minimum Coverage Targets**

| Component | Unit Test Coverage | Integration Test Coverage | E2E Test Coverage |
|-----------|-------------------|--------------------------|-------------------|
| **Trading Engine** | 95% | 90% | 80% |
| **Strategy Execution** | 95% | 90% | 85% |
| **Risk Management** | 98% | 95% | 90% |
| **Order Management** | 95% | 90% | 85% |
| **Market Data** | 90% | 85% | 75% |
| **API Endpoints** | 90% | 85% | 80% |
| **WebSocket Handlers** | 90% | 85% | 75% |
| **Database Layer** | 85% | 80% | N/A |
| **AI Services** | 85% | 80% | 70% |
| **UI Components** | 80% | 75% | 70% |

**Critical Path Coverage: 100%**
- Order placement and execution
- Risk limit enforcement
- Emergency stop mechanisms
- Balance and position calculations
- Authentication and authorization

#### Test Pyramid

**Distribution of Tests (Recommended Ratios)**

```
         /\
        /  \  E2E Tests (10%)
       /____\
      /      \  Integration Tests (30%)
     /________\
    /          \  Unit Tests (60%)
   /____________\
```

**Test Count Targets**

| Test Type | Target Count | Execution Time | Run Frequency |
|-----------|--------------|----------------|---------------|
| **Unit Tests** | 3,000+ | < 5 minutes | Every commit |
| **Integration Tests** | 1,500+ | < 15 minutes | Every PR |
| **E2E Tests** | 500+ | < 30 minutes | Pre-merge, Nightly |
| **Performance Tests** | 50+ | < 1 hour | Nightly, Pre-release |
| **Security Tests** | 100+ | < 30 minutes | Weekly, Pre-release |

#### Testing Tools & Frameworks

**Backend (Python)**

| Tool | Purpose | Usage |
|------|---------|-------|
| **pytest** | Unit & integration testing | Primary test runner |
| **pytest-asyncio** | Async test support | Testing async functions |
| **pytest-cov** | Coverage reporting | Generate coverage reports |
| **pytest-mock** | Mocking framework | Mock external dependencies |
| **pytest-xdist** | Parallel test execution | Speed up test runs |
| **Hypothesis** | Property-based testing | Generate test cases |
| **Faker** | Test data generation | Generate realistic test data |
| **freezegun** | Time mocking | Test time-dependent logic |
| **responses** | HTTP mocking | Mock external API calls |
| **testcontainers** | Docker containers for tests | Integration testing with real databases |

**Frontend (TypeScript/React)**

| Tool | Purpose | Usage |
|------|---------|-------|
| **Vitest** | Unit & integration testing | Primary test runner |
| **React Testing Library** | Component testing | Test React components |
| **MSW** | API mocking | Mock REST/WebSocket APIs |
| **Playwright** | E2E testing | Browser automation |
| **Storybook** | Component development | Visual testing & documentation |
| **Chromatic** | Visual regression testing | Catch UI regressions |
| **axe-core** | Accessibility testing | WCAG compliance testing |

**Performance & Load Testing**

| Tool | Purpose | Usage |
|------|---------|-------|
| **Locust** | Load testing | Simulate concurrent users |
| **k6** | Performance testing | API performance benchmarks |
| **Artillery** | WebSocket load testing | Test WebSocket scalability |
| **pytest-benchmark** | Micro-benchmarks | Test function performance |

**Security Testing**

| Tool | Purpose | Usage |
|------|---------|-------|
| **Bandit** | Python security linting | Find security issues in code |
| **Safety** | Dependency vulnerability scanning | Check for vulnerable packages |
| **OWASP ZAP** | Security scanning | Find web vulnerabilities |
| **Trivy** | Container scanning | Scan Docker images |

#### Test Categories & Examples

**1. Unit Tests**

Test individual functions and classes in isolation.

```python
# Example: Test order validation
def test_validate_order_quantity_below_minimum():
    order = Order(symbol="BTC/USDT", side="buy", quantity=0.00001)
    limits = OrderLimits(min_quantity=0.0001)

    with pytest.raises(ValidationError, match="Quantity below minimum"):
        validate_order(order, limits)

def test_calculate_position_pnl():
    position = Position(symbol="BTC/USDT", side="long", entry_price=50000, quantity=1.0)
    current_price = 55000

    pnl = position.calculate_pnl(current_price)

    assert pnl == 5000.0
```

**2. Integration Tests**

Test interactions between multiple components.

```python
# Example: Test order placement flow
@pytest.mark.integration
async def test_place_order_end_to_end(db_session, exchange_client):
    # Create user and exchange connection
    user = await create_test_user(db_session)
    connection = await create_test_connection(db_session, user.id)

    # Place order
    order = await place_order(
        user_id=user.id,
        connection_id=connection.id,
        symbol="BTC/USDT",
        side="buy",
        quantity=0.01,
        order_type="limit",
        price=50000
    )

    # Verify order in database
    db_order = await db_session.get(Order, order.id)
    assert db_order.status == "submitted"

    # Verify order sent to exchange
    assert exchange_client.create_order.called_once()
```

**3. E2E Tests**

Test complete user workflows through the UI.

```typescript
// Example: Test strategy creation workflow
test('user can create and backtest a strategy', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Navigate to strategy builder
  await page.click('text=Strategies');
  await page.click('text=Create Strategy');

  // Build strategy
  await page.fill('[name="name"]', 'Test Strategy');
  await page.selectOption('[name="type"]', 'mean_reversion');
  await page.fill('[name="symbol"]', 'BTC/USDT');

  // Start backtest
  await page.click('text=Backtest');
  await page.fill('[name="start_date"]', '2024-01-01');
  await page.fill('[name="end_date"]', '2024-12-31');
  await page.click('button:has-text("Run Backtest")');

  // Wait for results
  await page.waitForSelector('text=Backtest Complete', { timeout: 60000 });

  // Verify results displayed
  await expect(page.locator('[data-testid="total-return"]')).toBeVisible();
  await expect(page.locator('[data-testid="win-rate"]')).toBeVisible();
});
```

**4. Property-Based Tests**

Test properties that should always hold true.

```python
# Example: Test order quantity rounding
from hypothesis import given, strategies as st

@given(
    quantity=st.floats(min_value=0.0001, max_value=1000.0),
    step_size=st.floats(min_value=0.0001, max_value=1.0)
)
def test_round_quantity_always_valid(quantity, step_size):
    rounded = round_to_step_size(quantity, step_size)

    # Property: Rounded quantity should be multiple of step size
    assert (rounded % step_size) < 1e-8

    # Property: Rounded quantity should be <= original
    assert rounded <= quantity
```

#### Testing Best Practices

**General Principles**
- Write tests before fixing bugs (TDD for bug fixes)
- Test behavior, not implementation
- Use descriptive test names that explain what is being tested
- Keep tests independent and isolated
- Use fixtures and factories for test data
- Mock external dependencies (exchanges, AI APIs)
- Test edge cases and error conditions
- Maintain test code quality (DRY, readable)

**Critical Trading Logic**
- Always test with real market data samples
- Test order placement with exchange sandbox APIs
- Test risk limits with extreme scenarios
- Test position calculations with various fee structures
- Test strategy execution with different market conditions

**Performance Testing**
- Benchmark critical paths (order placement, market data processing)
- Test database query performance with realistic data volumes
- Test WebSocket message throughput
- Test concurrent user scenarios
- Monitor memory usage and leaks

**Security Testing**
- Test authentication and authorization
- Test input validation and sanitization
- Test rate limiting
- Test API key encryption
- Test SQL injection prevention
- Test XSS prevention

#### Test Data Management

**Test Data Strategy:**

1. **Fixtures & Factories**
   - Use pytest fixtures for reusable test data
   - Use Factory Boy for generating test objects
   - Seed databases with realistic data for integration tests
   - Use Faker for generating realistic user data

2. **Test Database Management**
   - Use testcontainers for isolated database instances
   - Reset database state between tests
   - Use transactions for test isolation
   - Maintain separate test databases per environment

3. **Market Data Fixtures**
   - Store historical market data samples for backtesting
   - Use recorded WebSocket messages for replay testing
   - Generate synthetic market data for edge cases
   - Version control test data fixtures

4. **Sensitive Data Handling**
   - Never commit real API keys or credentials
   - Use environment variables for test credentials
   - Encrypt sensitive test data at rest
   - Rotate test API keys regularly

#### Test Environment Setup

**Local Development:**
```bash
# Setup test environment
docker compose -f docker-compose.test.yml up -d
pytest --cov=symbiotetrader --cov-report=html
```

**CI/CD Environment:**
```yaml
# GitHub Actions example
test:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:15
    redis:
      image: redis:7
    questdb:
      image: questdb/questdb:latest
  steps:
    - uses: actions/checkout@v3
    - name: Run tests
      run: pytest --cov --cov-fail-under=90
```

#### Test Parallelization

**Parallel Execution Strategy:**

1. **Unit Tests**: Run in parallel across all CPU cores
   ```bash
   pytest -n auto  # Uses pytest-xdist
   ```

2. **Integration Tests**: Run in parallel with isolated databases
   ```bash
   pytest -n 4 --dist loadscope
   ```

3. **E2E Tests**: Run in parallel with separate browser instances
   ```bash
   playwright test --workers=4
   ```

#### Test Reporting

**Coverage Reports:**
- Generate HTML coverage reports for local development
- Upload coverage to Codecov/Coveralls for PR reviews
- Fail CI if coverage drops below threshold (90%)
- Track coverage trends over time

**Test Results:**
- Generate JUnit XML reports for CI integration
- Create test result dashboards (Allure, ReportPortal)
- Track test execution time trends
- Identify flaky tests and fix them

#### Flakiness Monitoring

**Flaky Test Detection:**
- Run tests multiple times to detect flakiness
- Track test failure rates over time
- Quarantine flaky tests until fixed
- Root cause analysis for flaky tests

**Common Causes of Flakiness:**
- Race conditions in async code
- Time-dependent assertions
- External API dependencies
- Insufficient test isolation
- Resource contention

#### Performance Testing

**Load Testing Scenarios:**

1. **Concurrent Users**: Simulate 1000+ concurrent users
2. **Order Throughput**: Test 10,000+ orders/second
3. **Market Data Ingestion**: Test 100,000+ ticks/second
4. **WebSocket Connections**: Test 5,000+ concurrent connections
5. **Database Queries**: Test query performance with 10M+ rows

**Performance Benchmarks:**
```python
# Example: Benchmark order placement
@pytest.mark.benchmark
def test_order_placement_performance(benchmark):
    result = benchmark(place_order, symbol="BTC/USDT", quantity=0.01)
    assert result.execution_time < 0.1  # < 100ms
```

#### Chaos Testing

**Chaos Engineering Scenarios:**

1. **Database Failures**: Kill database connections mid-transaction
2. **Network Partitions**: Simulate network splits between services
3. **High Latency**: Inject latency into API calls
4. **Resource Exhaustion**: Simulate CPU/memory exhaustion
5. **Exchange API Failures**: Simulate exchange downtime

**Tools:**
- Chaos Mesh (Kubernetes)
- Toxiproxy (Network chaos)
- Gremlin (Chaos engineering platform)


### 21. Deployment & Operations

### Deployment & Operations

Complete CI/CD pipeline, deployment procedures, and operational best practices for the SymbioteTrader platform.

#### CI/CD Pipeline

**Pipeline Stages**

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   Commit    â”‚â”€â”€â”€â–¶â”‚    Build    â”‚â”€â”€â”€â–¶â”‚    Test     â”‚â”€â”€â”€â–¶â”‚   Deploy    â”‚â”€â”€â”€â–¶â”‚   Monitor   â”‚
â”‚   & Push    â”‚    â”‚  & Lint     â”‚    â”‚  & Scan     â”‚    â”‚  Staging    â”‚    â”‚ & Validate  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                                                â”‚
                                                                â”‚ Manual Approval
                                                                â–¼
                                                          â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                                                          â”‚   Deploy    â”‚
                                                          â”‚ Production  â”‚
                                                          â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Stage 1: Build & Lint (< 5 minutes)**

| Step | Tool | Action | Failure Action |
|------|------|--------|----------------|
| Checkout Code | Git | Clone repository | Fail pipeline |
| Install Dependencies | npm/pip | Install packages | Fail pipeline |
| Lint Code | ESLint/Ruff | Check code style | Fail pipeline |
| Type Check | TypeScript/mypy | Verify types | Fail pipeline |
| Build Frontend | Vite | Bundle React app | Fail pipeline |
| Build Backend | Docker | Build container images | Fail pipeline |

**Stage 2: Test & Scan (< 30 minutes)**

| Step | Tool | Action | Failure Action |
|------|------|--------|----------------|
| Unit Tests | pytest/Vitest | Run unit tests | Fail pipeline |
| Integration Tests | pytest/Playwright | Run integration tests | Fail pipeline |
| E2E Tests | Playwright | Run E2E tests (smoke) | Fail pipeline |
| Security Scan | Bandit/Trivy | Scan for vulnerabilities | Warn (fail on critical) |
| Dependency Check | Safety/npm audit | Check dependencies | Warn (fail on critical) |
| Coverage Report | pytest-cov/Vitest | Generate coverage | Warn if < threshold |

**Stage 3: Deploy Staging (< 10 minutes)**

| Step | Action | Rollback Trigger |
|------|--------|------------------|
| Database Migration | Run Alembic migrations | Migration failure |
| Deploy Backend | Update ECS/K8s services | Health check failure |
| Deploy Frontend | Upload to S3/CDN | Upload failure |
| Smoke Tests | Run critical E2E tests | Test failure |
| Health Check | Verify all services healthy | Any service unhealthy |

**Stage 4: Deploy Production (< 15 minutes)**

| Step | Action | Rollback Trigger |
|------|--------|------------------|
| Manual Approval | Require approval from team | N/A |
| Blue-Green Switch | Route 10% traffic to new version | Error rate spike |
| Canary Monitoring | Monitor metrics for 10 minutes | SLO breach |
| Gradual Rollout | 10% â†’ 50% â†’ 100% over 30 minutes | Error rate spike |
| Full Deployment | Route 100% traffic to new version | SLO breach |

#### Deployment Strategies

**Blue-Green Deployment (Preferred for Production)**

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                     Load Balancer                        â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
             â”‚
             â”‚ Traffic Routing
             â”‚
    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”
    â”‚                 â”‚
    â–¼                 â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”       â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Blue   â”‚       â”‚  Green  â”‚
â”‚ (Old)   â”‚       â”‚  (New)  â”‚
â”‚ v1.2.3  â”‚       â”‚ v1.2.4  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Process:**
1. Deploy new version (Green) alongside old version (Blue)
2. Run smoke tests on Green environment
3. Route 10% of traffic to Green
4. Monitor for 10 minutes
5. If healthy, route 50% of traffic to Green
6. Monitor for 10 minutes
7. If healthy, route 100% of traffic to Green
8. Keep Blue running for 1 hour for quick rollback
9. Decommission Blue environment

**Rollback:** Instant - just route traffic back to Blue

**Canary Deployment (For High-Risk Changes)**

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                     Load Balancer                        â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
             â”‚
             â”‚ 95% traffic        5% traffic
             â”‚                    (canary)
    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”          â”‚
    â”‚                 â”‚          â”‚
    â–¼                 â–¼          â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”       â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Stable  â”‚       â”‚ Stable  â”‚  â”‚ Canary  â”‚
â”‚ v1.2.3  â”‚       â”‚ v1.2.3  â”‚  â”‚ v1.2.4  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Process:**
1. Deploy new version to small subset (5% of instances)
2. Route 5% of traffic to canary
3. Monitor metrics for 30 minutes
4. If healthy, increase to 25%
5. Monitor for 30 minutes
6. If healthy, increase to 50%
7. Monitor for 30 minutes
8. If healthy, deploy to all instances (100%)

**Rollback:** Terminate canary instances, route traffic to stable

#### Deployment Procedures

**Pre-Deployment Checklist**

- [ ] All tests passing in CI
- [ ] Code review approved by 2+ engineers
- [ ] Database migrations tested in staging
- [ ] Feature flags configured (if applicable)
- [ ] Rollback plan documented
- [ ] On-call engineer notified
- [ ] Deployment window scheduled (avoid market hours)
- [ ] Monitoring dashboards prepared

**Deployment Steps**

1. **Announce Deployment**
   - Post in team channel: "Deploying v1.2.4 to production"
   - Include: version, changes, expected duration, rollback plan

2. **Enable Maintenance Mode (Optional)**
   - For breaking changes only
   - Display banner: "System maintenance in progress"
   - Disable new order placement (allow cancellations)

3. **Database Migration**
   ```bash
   # Run migrations
   alembic upgrade head

   # Verify migration
   alembic current
   ```

4. **Deploy Backend**
   ```bash
   # Build and push Docker image
   docker build -t symbiotetrader/backend:v1.2.4 .
   docker push symbiotetrader/backend:v1.2.4

   # Update ECS service (Blue-Green)
   aws ecs update-service \
     --cluster symbiotetrader-prod \
     --service backend \
     --task-definition backend:v1.2.4 \
     --desired-count 10

   # Wait for deployment
   aws ecs wait services-stable \
     --cluster symbiotetrader-prod \
     --services backend
   ```

5. **Deploy Frontend**
   ```bash
   # Build frontend
   npm run build

   # Upload to S3
   aws s3 sync dist/ s3://symbiotetrader-frontend/ --delete

   # Invalidate CloudFront cache
   aws cloudfront create-invalidation \
     --distribution-id E1234567890ABC \
     --paths "/*"
   ```

6. **Smoke Tests**
   ```bash
   # Run critical E2E tests
   npm run test:e2e:smoke
   ```

7. **Monitor Metrics**
   - Watch error rate, latency, throughput for 30 minutes
   - Check logs for errors
   - Verify WebSocket connections stable
   - Verify order placement working

8. **Disable Maintenance Mode**
   - Remove banner
   - Re-enable order placement

9. **Announce Completion**
   - Post in team channel: "Deployment v1.2.4 complete"

#### Rollback Procedures

**Automatic Rollback Triggers**

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error Rate | > 1% for 5 minutes | Automatic rollback |
| API Latency (P95) | > 2x baseline for 5 minutes | Automatic rollback |
| Order Placement Failures | > 5% for 2 minutes | Automatic rollback |
| WebSocket Disconnections | > 20% for 5 minutes | Automatic rollback |
| Database Connection Errors | > 10 errors/minute | Automatic rollback |

**Manual Rollback Process**

1. **Announce Rollback**
   ```
   ðŸš¨ ROLLBACK IN PROGRESS ðŸš¨
   Version: v1.2.4 â†’ v1.2.3
   Reason: [Error rate spike / Performance degradation / etc.]
   ETA: 5 minutes
   ```

2. **Blue-Green Rollback (Instant)**
   ```bash
   # Route traffic back to Blue (old version)
   aws elbv2 modify-listener \
     --listener-arn arn:aws:elasticloadbalancing:... \
     --default-actions TargetGroupArn=arn:aws:elasticloadbalancing:...:targetgroup/blue
   ```

3. **Database Rollback (If Needed)**
   ```bash
   # Rollback migration (only if backward compatible)
   alembic downgrade -1
   ```

4. **Verify Rollback**
   - Check error rate returned to normal
   - Check latency returned to baseline
   - Run smoke tests

5. **Post-Mortem**
   - Document what went wrong
   - Create incident report
   - Schedule post-mortem meeting
   - Create action items to prevent recurrence

#### Environment Configuration

**Environments**

| Environment | Purpose | Data | Deployment Frequency |
|-------------|---------|------|---------------------|
| **Local** | Development | Fake/Sandbox | Continuous |
| **Staging** | Pre-production testing | Anonymized production data | Every commit to main |
| **Production** | Live trading | Real user data | 2-3x per week |

**Environment Variables**

```bash
# Example: Production environment variables
DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/symbiotetrader
REDIS_URL=redis://prod-redis.example.com:6379
QUESTDB_URL=http://prod-questdb.example.com:9000
CLICKHOUSE_URL=http://prod-clickhouse.example.com:8123
NEO4J_URL=bolt://prod-neo4j.example.com:7687
QDRANT_URL=http://prod-qdrant.example.com:6333

JWT_SECRET=<secret-from-secrets-manager>
ENCRYPTION_KEY=<secret-from-secrets-manager>

BINANCE_API_URL=https://api.binance.com
COINBASE_API_URL=https://api.coinbase.com

OPENAI_API_KEY=<secret-from-secrets-manager>
ANTHROPIC_API_KEY=<secret-from-secrets-manager>

LOG_LEVEL=INFO
ENVIRONMENT=production
```

**Secrets Management**
- Use AWS Secrets Manager or HashiCorp Vault
- Rotate secrets every 90 days
- Never commit secrets to Git
- Use different secrets per environment


### 22. Observability & Monitoring

- Tracing: OpenTelemetry end-to-end across API, Celery, LangGraph; correlation IDs on every request/job
- Unified Observability & Intelligence Hub: correlate OMS/TCA, ingest health, AI costs/ROI; what-if forecasting/parallel cones
- Metrics: Prometheus for OMS (orders/fills/errors), data ingest (ticks/latency), AI (cost/latency), jobs (queue/run times)
- Dashboards: Grafana boards for Trading (OMS/TCA), Ingestion Health, AI Cost/Usage, Jobs & Approvals
- Logs: structured JSON with PII/API-key redaction; sampling for high-volume paths; retention per Data Architecture
- Alerts: SLO-based alerts (order p95, error rate, ingest lag), dead-manâ€™s switch on event streams, alert routing (email/webhook)
- Langfuse: traces for LangGraph runs with links back to correlation IDs in UI
- Health checks: /healthz, /readyz; K8s/Compose probes; component-level health (exchanges, DBs, workers)
- SLOs and error budgets per domain (OMS latency, ingest delay, AI SLA) with burn-rate alerts
- Blackbox monitors for exchange endpoints and WebSocket reconnect SLA tracking
- Cost monitoring: exchange fee burn vs PnL, compute cost per strategy; surface ROI and throttle policies

- Runbooks: incident steps (pause trading, flatten, reconnect/backfill, resume); circuit-breaker triggers and safe-unwind
- Cost controls: AI provider budgets/quotas; semantic/prompt caching; per-agent caps and cost dashboards
- Chaos testing: scheduled fault injection (WS drops, rate-limit spikes, DB failovers) to validate recovery paths


### Detailed Observability Specifications

#### Distributed Tracing

**OpenTelemetry Integration:**
- End-to-end tracing across API, Celery, LangGraph
- Trace sampling: 100% errors, 10% success, 100% critical paths (orders, risk checks)
- Trace retention: 7 days hot (Jaeger), 30 days cold (S3), 1 year archived (S3 Glacier)
- Visualization: Jaeger UI with correlation_id search
- Custom span attributes: user_id, strategy_id, asset_class, venue, order_id, correlation_id

**Trace Propagation:**
- HTTP: traceparent/tracestate headers
- WebSocket: correlation_id in message payload
- Celery: correlation_id in task metadata
- Database: correlation_id in query comments

#### Logging Details

**Log Levels:**
- DEBUG: Detailed diagnostics (disabled in production)
- INFO: General informational messages
- WARN: Potential issues
- ERROR: Failures
- CRITICAL: System-wide failures

**Log Filtering:**
- Filter by: level, service, user_id, correlation_id, asset_class, venue
- Full-text search with LogQL
- Regex search support
- Time range filtering

**Log Aggregation:**
- Loki for aggregation
- Grafana for visualization
- S3 for long-term storage

**Log Export:**
- Export to S3 (daily batches)
- Export to external SIEM (Splunk, ELK)
- Export format: JSON Lines

#### Alert Details

**Alert Severity:**
- CRITICAL: System-wide failure, page immediately
- HIGH: Service degradation, respond within 1 hour
- MEDIUM: Performance issue, respond within 4 hours
- LOW: Minor issue, respond within 24 hours

**Alert Escalation:**
- Level 1: Notify on-call (Slack/PagerDuty)
- Level 2: Escalate to manager after 15 min
- Level 3: Escalate to director after 1 hour

**Alert Acknowledgment:**
- Must acknowledge within 15 minutes
- Include estimated resolution time
- Auto-resolve when condition clears

**Alert Suppression:**
- Maintenance windows: suppress all
- Known issues: suppress specific alerts
- Flapping: suppress after 3 occurrences in 10 min

**Alert Grouping:**
- Group related alerts (e.g., all DB alerts)
- Single notification per group
- Reduce alert fatigue

**Alert Dependencies:**
- Don't alert downstream if upstream is down
- Example: Don't alert on orders if exchange API is down

#### Health Check Details

**Health Check Frequency:**
- Liveness: Every 10 seconds
- Readiness: Every 5 seconds
- Component health: Every 30 seconds

**Health Check Timeout:**
- Liveness: 5 seconds
- Readiness: 10 seconds
- Component health: 15 seconds

**Health Check Dependencies:**
- Database: Required for readiness
- Redis: Required for readiness
- Exchange API: Optional (degraded if down)
- Workers: Optional (degraded if down)

**Health Check UI:**
- Dashboard showing all component health
- Historical health data (7 days)
- Health check logs
- Trend analysis

**Health Check History:**
- Store results for 7 days
- Analyze trends
- Identify recurring issues
- Generate health reports

#### Backup & Restore

**Backup Frequency:**
- PostgreSQL: Daily full, hourly incremental
- QuestDB: Daily snapshots
- ClickHouse: Weekly full, daily incremental
- Redis: Hourly RDB snapshots
- Qdrant: Daily snapshots
- Neo4j: Daily backups

**Backup Retention:**
- Daily backups: 30 days
- Weekly backups: 90 days
- Monthly backups: 1 year
- Yearly backups: 7 years (compliance)

**Backup Verification:**
- Test restore weekly
- Verify backup integrity daily
- Monitor backup success/failure
- Alert on backup failures

**Backup Encryption:**
- Encrypt at rest (AES-256)
- Encrypt in transit (TLS 1.3)
- Key rotation every 90 days

**Backup Monitoring:**
- Alert on backup failure
- Alert on backup size anomalies
- Track backup duration trends

**Disaster Recovery:**
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 1 hour
- DR runbook with step-by-step procedures
- DR drills quarterly

#### Deployment Details

**Blue-Green Deployment:**
- Deploy new version alongside old
- Route 10% traffic to new version
- Monitor for 10 minutes
- Gradual rollout: 10% â†’ 50% â†’ 100% over 30 min
- Rollback if error rate > 1%

**Canary Deployment:**
- Deploy to 1 instance
- Monitor for 15 minutes
- Expand to 10% of instances
- Monitor for 30 minutes
- Full rollout if metrics are healthy

**Rollback Procedure:**
- Automatic rollback if error rate > 1%
- Automatic rollback if p95 latency > 2x baseline
- Manual rollback via CLI command
- Rollback completes within 5 minutes

**Deployment Validation:**
- Smoke tests after deployment
- Health checks pass
- No error rate spike
- Latency within SLO

**Deployment Notifications:**
- Slack notification on start
- Slack notification on completion
- Slack notification on rollback
- Email summary to team

**Deployment Approval:**
- Staging: Automatic
- Production: Manual approval required
- Approval via Slack or CLI
- Approval expires after 1 hour

#### Security Scanning

**Security Scanning Frequency:**
- Code scanning: On every commit (SAST)
- Dependency scanning: Daily
- Container scanning: On every build
- Infrastructure scanning: Weekly

**Vulnerability Management:**
- Critical vulnerabilities: Fix within 24 hours
- High vulnerabilities: Fix within 7 days
- Medium vulnerabilities: Fix within 30 days
- Low vulnerabilities: Fix within 90 days

**Security Incident Response:**
1. Detect: Automated alerts
2. Contain: Isolate affected systems
3. Investigate: Root cause analysis
4. Remediate: Apply fixes
5. Review: Post-mortem

**Security Audit Logs:**
- Log all authentication attempts
- Log all authorization failures
- Log all data access
- Log all configuration changes
- Retention: 7 years

**Security Compliance:**
- SOC 2 Type II compliance
- ISO 27001 compliance
- GDPR compliance (if applicable)
- CCPA compliance (if applicable)

**Penetration Testing:**
- Annual penetration tests
- Quarterly vulnerability assessments
- Bug bounty program (optional)

**Security Training:**
- Annual security training for all engineers
- Phishing simulations quarterly
- Security champions program



### 23. Security & Compliance

### Security Model

#### Single-User Security Model

- Local authentication with secure password storage (Argon2id)
- Optional biometric authentication (fingerprint, face recognition)
- Hardware security key support (FIDO2/WebAuthn)
- Encrypted local storage for all sensitive data (AES-256)

- Session management: token rotation and inactivity timeouts; device/session list with revoke; per-session scope caps
- Network controls: optional IP allowlists; signed webhooks with secret rotation; replay protection (timestamps, nonces)
- Secrets rotation workflows with audit: rolling key updates for exchange API keys and webhooks; break-glass procedures

#### AI Agent RBAC (Policies & Controls)

- Defines roles, scopes, guardrails, and escalation; maps to agents in AI Integration â†’ AI Agents (Catalog & Permissions)
- Enforced behaviors: least-privilege scopes per agent; audit logging; budget/rate limits; emergency kill-switch
- Mode linkage: Manual/Hybrid/Full Auto enforcement with per-agent overrides

#### Data Security & Privacy

- End-to-end encryption for all data in transit (TLS 1.3)
- Secrets management: API keys and credentials encrypted at rest; rotation support; optional BYOK/KMS for key management
- Datastores encrypted at rest (DB volumes, object storage); backup artifacts encrypted
- Local-only analytics by default; egress only to explicitly configured exchanges/data providers/AI (BYOK) with fine-grained egress controls
- Logging privacy: PII/API-key redaction and sampling policies
- Audio privacy: voice input audio not stored by default; transcripts retained per user policy; optional on-device/server STT; PII redaction on transcripts; explicit mic consent

- Secure backup and recovery with encryption and tested restores

#### System Security

- Container isolation with Docker security profiles
- Network segmentation for different system components
- Automatic security updates and vulnerability scanning
- Intrusion detection and prevention

### Regulatory & Legal

#### Non-Custodial Model (Regulatory Context)

- Direct-to-exchange execution through trade-only API permissions
- No handling of private keys or wallet operations
- No fund transfers, deposits, or withdrawals
- Users maintain full control of assets in their exchange accounts
- Intended classification as an "automation tool" (non-custodial, trade-only API usage) rather than a financial intermediary; users' KYC/AML handled by connected exchanges

#### Compliance Strategy

- Trade-only API keys with withdrawal permissions explicitly blocked; principle of least privilege
- Clear user consent for each trading strategy and AI agent; explicit approvals for elevated-risk actions
- Transparent, immutable audit logs of all actions with correlation IDs
- KYC/AML is handled by the user's connected exchanges; the application performs no KYC
- Disclosures: Not financial advice; user remains responsible for trading decisions and compliance with local laws
- Exchange Terms: Users must comply with connected exchanges/brokers' ToS and API usage policies
- Terms of Service defining non-custodial relationship

#### Pattern Day Trader (PDT) Rules (US)

**Regulatory Background:**
- FINRA Rule 4210 requires $25,000 minimum equity for pattern day traders
- Pattern Day Trader = 4+ day trades within 5 business days
- Day Trade = Buy and sell (or sell and buy) same security on same day
- Applies to margin accounts only (not cash accounts)

**PDT Detection & Enforcement:**

```typescript
interface PDTTracker {
  user_id: string;
  account_type: 'cash' | 'margin';
  day_trade_count: number;  // Rolling 5 business days
  day_trades: DayTrade[];
  pdt_status: 'non_pdt' | 'pdt' | 'pdt_restricted';
  account_equity: number;
  minimum_equity_required: number;  // $25,000 for PDT
}

class PDTEnforcer {
  check_day_trade(order: Order): PDTCheckResult {
    // Check if order would create a day trade
    const open_positions = this.get_open_positions_today(order.symbol);

    if (open_positions.length > 0 && order.side === 'sell') {
      // This would be a day trade
      const day_trade_count = this.get_day_trade_count_5_days();

      if (day_trade_count >= 3) {
        // Would trigger PDT status
        if (this.account_equity < 25000) {
          return {
            allowed: false,
            reason: 'PDT_RESTRICTION',
            message: 'This trade would exceed day trade limit. Account equity below $25,000.',
            day_trades_remaining: 0
          };
        }
      }

      return {
        allowed: true,
        is_day_trade: true,
        day_trades_remaining: 3 - day_trade_count,
        warning: day_trade_count >= 2 ? 'Approaching PDT limit' : null
      };
    }

    return { allowed: true, is_day_trade: false };
  }
}
```

**User Interface Elements:**
- Day trade counter badge (e.g., "2/3 day trades used")
- Warning modal before 3rd day trade
- PDT status indicator in account summary
- Educational tooltips explaining PDT rules
- Cash account option (no PDT restrictions)

**Exemptions:**
- Cash accounts (no PDT rules apply)
- Accounts with >$25,000 equity
- Crypto-only accounts (PDT doesn't apply to crypto)

#### Position Limits & Reporting

**Exchange-Imposed Position Limits:**

| Exchange | Asset Class | Typical Limits | Enforcement |
|----------|-------------|----------------|-------------|
| **Binance** | Futures | Varies by contract | Soft limit (warning), hard limit (rejection) |
| **Coinbase** | Spot | No position limits | N/A |
| **Kraken** | Futures | Varies by contract | Hard limit at order placement |
| **Bybit** | Futures | Varies by tier | Tiered limits based on account level |

**Position Limit Monitoring:**

```python
class PositionLimitMonitor:
    def check_position_limit(self, order: Order) -> LimitCheckResult:
        """
        Check if order would exceed position limits.

        Checks:
        1. Exchange-specific position limits
        2. Regulatory position limits (if applicable)
        3. User-defined position limits
        """
        current_position = self.get_position(order.symbol, order.exchange)
        new_position_size = current_position + order.quantity

        # Check exchange limits
        exchange_limit = self.get_exchange_limit(order.symbol, order.exchange)
        if abs(new_position_size) > exchange_limit:
            return LimitCheckResult(
                allowed=False,
                reason='EXCHANGE_LIMIT_EXCEEDED',
                limit=exchange_limit,
                current=current_position,
                requested=new_position_size
            )

        # Check regulatory limits (e.g., CFTC for US futures)
        if self.is_regulated_instrument(order.symbol):
            regulatory_limit = self.get_regulatory_limit(order.symbol)
            if abs(new_position_size) > regulatory_limit:
                return LimitCheckResult(
                    allowed=False,
                    reason='REGULATORY_LIMIT_EXCEEDED',
                    limit=regulatory_limit,
                    reportable=True  # May require position reporting
                )

        # Check user-defined limits
        user_limit = self.get_user_limit(order.user_id, order.symbol)
        if user_limit and abs(new_position_size) > user_limit:
            return LimitCheckResult(
                allowed=False,
                reason='USER_LIMIT_EXCEEDED',
                limit=user_limit
            )

        return LimitCheckResult(allowed=True)
```

**Reportable Position Thresholds:**
- CFTC (US): Varies by commodity (e.g., 25 BTC futures contracts)
- Automatic reporting when threshold exceeded
- Daily position reports for large traders
- Unique trader identification (UTI) codes

#### Best Execution Requirements

**Order Routing Documentation:**

```typescript
interface OrderRoutingDecision {
  order_id: string;
  timestamp: string;
  symbol: string;
  quantity: number;
  selected_venue: string;
  routing_reason: string;
  alternative_venues: VenueOption[];
  execution_quality_factors: {
    expected_price: number;
    expected_fees: number;
    expected_slippage: number;
    liquidity_score: number;
    historical_fill_rate: number;
  };
}

// Example routing decision
{
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-10-18T14:32:15.123Z",
  "symbol": "BTC/USDT",
  "quantity": 0.5,
  "selected_venue": "binance",
  "routing_reason": "Best price with sufficient liquidity",
  "alternative_venues": [
    {
      "venue": "coinbase",
      "price": 67505.00,
      "fees": 0.50,
      "liquidity": "high",
      "score": 0.92
    },
    {
      "venue": "kraken",
      "price": 67510.00,
      "fees": 0.40,
      "liquidity": "medium",
      "score": 0.88
    }
  ],
  "execution_quality_factors": {
    "expected_price": 67500.00,
    "expected_fees": 0.60,
    "expected_slippage": 2.50,
    "liquidity_score": 0.95,
    "historical_fill_rate": 0.98
  }
}
```

**Venue Selection Criteria:**
1. **Price** - Best available price (including fees)
2. **Liquidity** - Sufficient depth to fill order
3. **Speed** - Expected execution latency
4. **Reliability** - Historical fill rate and uptime
5. **Cost** - Total cost including fees and slippage

**Best Execution Reviews:**
- Quarterly review of execution quality by venue
- Comparison of actual vs expected execution
- Venue scorecard updates
- User-facing execution quality reports

#### Enhanced Audit Trail

**Comprehensive Audit Logging:**

```python
class AuditLogger:
    """
    Immutable, append-only audit trail for all system events.
    Stored in ClickHouse with 7-year retention.
    """

    def log_order_event(self, event: OrderEvent):
        """
        Log order lifecycle event with full context.
        """
        audit_entry = {
            'event_id': generate_uuid(),
            'correlation_id': event.correlation_id,
            'timestamp': utc_now(),
            'event_type': 'order',
            'action': event.action,  # 'created', 'modified', 'cancelled', 'filled'
            'user_id': event.user_id,
            'strategy_id': event.strategy_id,
            'order_id': event.order_id,
            'order_details': {
                'symbol': event.symbol,
                'side': event.side,
                'quantity': event.quantity,
                'price': event.price,
                'order_type': event.order_type
            },
            'decision_context': {
                'trigger': event.trigger,  # 'manual', 'strategy', 'ai_agent'
                'reason': event.reason,
                'market_conditions': event.market_snapshot
            },
            'ip_address': event.ip_address,
            'user_agent': event.user_agent,
            'session_id': event.session_id
        }

        self.write_to_clickhouse(audit_entry)

    def log_ai_decision(self, decision: AIDecision):
        """
        Log AI agent decision with full reasoning chain.
        """
        audit_entry = {
            'event_id': generate_uuid(),
            'correlation_id': decision.correlation_id,
            'timestamp': utc_now(),
            'event_type': 'ai_decision',
            'agent_type': decision.agent_type,
            'decision': decision.action,
            'reasoning': decision.reasoning_chain,
            'confidence': decision.confidence_score,
            'data_sources': decision.data_sources_used,
            'user_approval': decision.requires_approval,
            'approved_by': decision.approved_by,
            'approved_at': decision.approved_at
        }

        self.write_to_clickhouse(audit_entry)
```

**Audit Trail Requirements:**

| Event Category | Retention | Immutability | Access Control |
|----------------|-----------|--------------|----------------|
| **Order Events** | 7 years | Append-only | User + Admin |
| **AI Decisions** | 7 years | Append-only | User + Admin |
| **User Actions** | 7 years | Append-only | User + Admin |
| **System Events** | 3 years | Append-only | Admin only |
| **Security Events** | 10 years | Append-only | Admin only |

**Audit Trail Features:**
- Correlation IDs linking related events
- Complete decision context (why action was taken)
- Market conditions snapshot at decision time
- User approval records for AI actions
- Tamper-evident (cryptographic hashing)
- Exportable for regulatory requests
- Searchable by user, strategy, symbol, date range

**Regulatory Audit Support:**
- Generate audit reports for specific time periods
- Export in standard formats (CSV, JSON, PDF)
- Provide chain-of-custody documentation
- Support for regulatory inquiries
- Automated compliance reporting

#### Legal Documentation Requirements

- Terms of Service: Non-custodial automation service definition
- Privacy Policy: API key handling and GDPR/CCPA compliance
- Risk Disclosure: Market risks and potential system failures
- End-User License Agreement: Software usage rights and limitations

#### Jurisdictional Compliance

- Intended classification: software automation tool (non-custodial, trade-only API usage); not legal advice
- Users are responsible for operating within their local regulatory requirements
- Guidance: highlight exchange/broker features that may be restricted in certain regions; warn when unsupported


---

## PART 7: DOCUMENTATION & SUPPORT

### 24. Documentation

### Documentation

#### User Documentation

**Getting Started Guide:**
- Installation instructions
- First-time setup wizard
- Quick start tutorial
- Video walkthrough (5 minutes)

**Feature Documentation:**
- Strategy creation guide
- Backtesting guide
- Risk management guide
- AI features guide
- Trading guide

**How-To Guides:**
- How to create a strategy
- How to run a backtest
- How to set up risk rules
- How to connect an exchange
- How to interpret backtest results

**Troubleshooting Guide:**
- Common issues and solutions
- Error message explanations
- Performance troubleshooting
- Connection issues
- Data quality issues

**FAQ:**
- General questions
- Technical questions
- Trading questions
- Billing questions

#### Developer Documentation

**API Documentation:**
- OpenAPI/Swagger specification
- Interactive API explorer
- Code examples (Python, JavaScript, cURL)
- Authentication guide
- Rate limiting guide
- Webhook guide

**Architecture Documentation:**
- System architecture diagram
- Database schema
- Data flow diagrams
- Component interaction diagrams

**Deployment Documentation:**
- Docker Compose setup
- Kubernetes setup
- Environment variables
- Configuration options
- Scaling guide

**Contributing Guide:**
- Code style guide
- Git workflow
- Pull request process
- Testing requirements

#### API Changelog

**Versioning:**
- Semantic versioning (v1.0.0)
- Breaking changes: Major version bump
- New features: Minor version bump
- Bug fixes: Patch version bump

**Changelog Format:**
```markdown
## v1.2.0 (2025-10-18)


- In-app enterprise-grade Knowledgebase (KB) for all product docs, SOPs/playbooks, tool cards, strategy templates, and a specialized trading glossary
- Search
  - Hybrid BM25 + vector search with re-ranking; typo tolerance; synonyms/aliases; filters by topic, version, content type
  - Citations with deep links/anchors; highlight matched passages; copy citation
- Content types
  - Manual (How the platform works), Playbooks/SOPs (step-by-step operations), Tool Cards (purpose, inputs/outputs, examples, failure modes), Strategy Templates (requirements + promotion checklist), Glossary, Release Notes/Changelogs
- Governance & versioning
  - Content owners and review workflow; versioned pages; deprecation notices; provenance metadata
- Indexing & storage (build on existing stack)
  - Sources: markdown in repo, authored pages, approved URLs
  - Chunking: heading-aware 200â€“500 token chunks; anchors preserved; frontmatter (title, tags, type, version)
  - Embeddings in Qdrant; metadata filters; BM25 side index; objects in S3; metadata in PostgreSQL; usage analytics in ClickHouse
- UI/UX
  - Global search (Cmd/Ctrl+K) with facets; dedicated KB app (Manual, Playbooks, Tool Cards, Glossary, Changelogs)
  - Inline glossary tooltips on terms throughout the app with â€œLearn moreâ€ deep-links
  - â€œAsk the manualâ€ mode: answers grounded to KB with citations; oneâ€‘click open page
- Security & privacy
  - Single-user by default; prep for optional RBAC later; webhook/IP allowlists for external sources; PII redaction filters at index time
- Analytics
  - Search queries, clickâ€‘through rate, noâ€‘result rate, dwell time; glossary tooltip usage; surface content gaps for authors


### 25. Support & Community

### Support & Community

**Support Channels:**
- Email support: support@symbiotetrader.com
- In-app chat support (business hours)
- Community forum: forum.symbiotetrader.com
- Discord server: discord.gg/symbiotetrader
- GitHub Discussions: github.com/symbiotetrader/discussions

**Support SLAs:**
- Critical issues: 4-hour response time
- High priority: 24-hour response time
- Medium priority: 48-hour response time
- Low priority: 5-day response time

**Support Ticketing System:**
- Create ticket from in-app
- Track ticket status
- Attach screenshots/logs
- Priority levels
- Automatic escalation

**Community Forum:**
- Categories: General, Strategies, Technical, Feature Requests, Bug Reports
- Upvoting/downvoting
- Best answer marking
- User reputation system
- Moderators

**Discord/Slack Community:**
- Real-time chat
- Channels: #general, #strategies, #technical-help, #announcements
- Voice channels (optional)
- Screen sharing for troubleshooting

**Bug Reporting:**
- In-app bug reporter
- Automatic log collection
- Screenshot attachment
- Steps to reproduce
- Priority assignment

**Feature Requests:**
- In-app feature request form
- Upvoting system
- Status tracking (planned, in progress, completed)
- Roadmap visibility

**Roadmap:**
- Public roadmap: roadmap.symbiotetrader.com
- Quarterly releases
- Feature voting
- Transparency on priorities


---

## PART 8: BUSINESS & LEGAL

### 26. Business Model

### Distribution Model

#### Self-Hosted Application

- Single-user, single-tenant deployment
- One-time license fee for the software
- Users host on their own infrastructure (local machine, VPS, or cloud)
- No usage limits or subscription fees
- Complete data privacy and control

### Revenue Model

#### One-Time Software License

- Initial purchase price for the application
- Optional annual maintenance and updates (20% of license fee)
- Optional paid support tiers (SLA/priority fixes)

### Cost Structure for Users

#### Infrastructure Costs

- Self-hosted server requirements (minimum: 4-core CPU, 8GB RAM, 100GB SSD)
- Optional cloud hosting costs (AWS/GCP/Azure) if preferred
- Database hosting (can be self-hosted or cloud-based)

#### AI API Costs

- Users bring their own AI API keys (OpenAI, Anthropic, etc.)
- Direct billing from AI providers based on usage
- Optional local AI models to reduce API costs

#### Exchange Fees

- Users pay exchange fees directly to their chosen exchanges
- No additional markup or revenue sharing


### 27. Risks & Mitigations

### Technical Risks

- **Exchange API Limitations**: Mitigation with multiple exchange support and fallback mechanisms
- **AI Model Costs**: Mitigation with cost optimization and intelligent caching
- **System Performance**: Mitigation with scalable architecture and performance monitoring
- **Strategy Overfitting**: Mitigation with walk-forward validation, out-of-sample tests, and promotion gates
- **Model/Data Drift**: Mitigation with KPI monitoring and alerts; auto-demotion to paper; periodic recalibration/retraining
- **Data Quality & Time Skew**: Mitigation with timestamp/source-of-truth normalization, audits, and fallback sources

### Business Risks

- **Market Volatility**: Mitigation with diversified revenue streams and risk management tools
- **Regulatory Changes**: Mitigation with compliance framework and legal monitoring
- **Competition**: Mitigation with unique features and continuous innovation

### Operational Risks

- **Security Breaches**: Mitigation with enterprise-grade security and regular audits
- **Data Loss**: Mitigation with redundant backups and disaster recovery procedures
- **Key Personnel**: Mitigation with knowledge sharing and documentation practices
- **Provider/Exchange Outages or Delistings**: Mitigation with SOR/failover, venue allow/deny lists, and capability matrix refresh
- **Configuration Errors**: Mitigation with typed schemas, validations, dry-run modes, and approval workflows


### 28. Open Questions & Assumptions

- Exchange/Broker coverage: US-accessible venues listed; assumption that additional brokers can be added via adapters. Clarify near-term priorities if any
- Data licensing: Users supply keys for live data; clarify redistribution constraints for backtest datasets and any bundled samples
- Strategy ecosystem: native strategy engine (no cross-framework adapters); external strategies via Strategy Advisor Agent; external signals via TradingView webhooks

- Performance SLO context: Targets measured on a well-provisioned self-hosted server; specify reference hardware/region for benchmarks
- AI provider defaults: BYOK only; clarify recommended baseline models for good out-of-box UX (and local model suggestions)
- Paper trading fidelity: Simulation calibrated to venue behavior; clarify calibration data sources and recalibration cadence


---

## PART 9: REFERENCE MATERIAL

### 29. Appendices

### Technical Specification Appendices

The following detailed technical specifications provide complete implementation details for critical system components. These appendices contain production-ready algorithms, formulas, state machines, and decision trees.

#### Appendix A: Regime Detection Algorithm

**File:** `SPEC-ADDITION-1-REGIME-DETECTION.md`

**Summary:** Complete market regime detection algorithm with 6 dimensions (Trend, Volatility, Liquidity, Spread, Time-of-Day, Stress) and 8 composite labels. Includes feature extraction formulas (ADX, Linear Regression, Parkinson Volatility), classification thresholds, hysteresis mechanism, confidence calculation, storage schemas, and API endpoints.

**Key Components:**
- Regime taxonomy with 6 independent dimensions
- Feature extraction algorithms (ADX, LR Slope, Realized Vol, Parkinson Vol, ADV, Book Depth, Spread, Stress Indicator)
- Classification thresholds for each dimension
- Hysteresis mechanism (3-period confirmation)
- Confidence calculation formula
- ClickHouse + Redis storage schemas
- REST API and WebSocket event specifications
- Complete examples for BTC and ETH

**Status:** Production-ready, 609 lines

---

#### Appendix B: Strategy Ranking Algorithm

**File:** `SPEC-ADDITION-2-STRATEGY-RANKING-ALGORITHM.md`

**Summary:** Complete mathematical formulas for the 5-component strategy ranking system. Includes Fit calculation (cosine similarity), RiskAdjROI (EWMA), CapacityPenalty (sigmoid), TurnoverPenalty (cost drag), and ConstraintPenalty (hard/soft).

**Key Components:**
- Master formula: `S(a, s) = w1·Fit + w2·RiskAdjROI - w3·CapacityPenalty - w4·TurnoverPenalty - w5·ConstraintPenalty`
- Default weights: [0.45, 0.30, 0.10, 0.05, 0.10]
- Fit: Cosine similarity between current features and strategy fingerprint, weighted by regime probability
- RiskAdjROI: EWMA across 7/30/90-day horizons with volatility and drawdown adjustments
- CapacityPenalty: Sigmoid-based penalties for ADV, spread, and depth constraints
- TurnoverPenalty: Annual cost drag from fees and slippage
- ConstraintPenalty: Hard (infinite) and soft (graduated) penalties
- Complete worked example with real numbers
- Unit test cases

**Status:** Production-ready, 300 lines

---

#### Appendix C: PydanticAI vs LangGraph Decision Tree

**File:** `SPEC-ADDITION-3-PYDANTIC-LANGGRAPH-DECISION-TREE.md`

**Summary:** Clear decision criteria for choosing between PydanticAI (fast, stateless) and LangGraph (durable, multi-step) for AI features. Includes 7 decision points, 37 concrete examples, escalation patterns, and anti-patterns.

**Key Components:**
- Quick reference decision tree with 7 decision points
- **30-second runtime threshold** (key boundary)
- Detailed criteria: PydanticAI for < 30s, single-step, stateless; LangGraph for > 30s, multi-step, durable state
- 37 concrete examples across 6 feature categories
- Escalation pattern (start with PydanticAI, escalate to LangGraph if needed)
- Hybrid workflow examples
- Performance, complexity, and state persistence thresholds
- Implementation checklist (9 questions)
- Anti-patterns (what NOT to do)
- Mermaid flowchart

**Status:** Production-ready, 376 lines

---

#### Appendix D: Overfill Protection State Machine

**File:** `SPEC-ADDITION-4-OVERFILL-PROTECTION.md`

**Summary:** Complete state machine for preventing over-execution with 7 states, 6 edge cases, recovery procedures, and safety thresholds. Critical safety feature for production trading.

**Key Components:**
- Configuration: 10% warning threshold, 25% critical threshold
- 7-state state machine: NORMAL → WARNING → OVERFILL → CRITICAL → PAUSED → RECOVERING → RESOLVED
- State transition diagram (Mermaid)
- Complete Python implementation with all state handlers
- 6 edge cases with handling:
  1. Late fill confirmations (5-minute window)
  2. Duplicate fills (exchange bugs)
  3. Partial fills
  4. Multi-leg orders (spreads)
  5. Exchange-side cancellations
  6. Network partitions (duplicate order detection)
- Manual and automatic recovery procedures
- Monitoring (Prometheus metrics)
- Multi-channel alerts (in-app, email, webhook)
- Testing scenarios (unit and integration tests)

**Status:** Production-ready, 300 lines

---

#### Appendix E: Complete Database DDL Scripts

**File:** `SPEC-ADDITION-5-DATABASE-DDL.md`

**Summary:** Production-ready DDL scripts for all 5 databases with indexes, foreign keys, constraints, partitioning, TTL policies, backup scripts, and migration templates.

**Key Components:**
- **PostgreSQL**: 15 tables (users, sessions, API keys, exchange accounts, strategies, orders, fills, positions, jobs, checkpoints) with 30+ indexes, all foreign keys, all constraints, triggers for updated_at, partitioning strategy
- **ClickHouse**: 7 tables (ohlcv_1m, trades, orderbook_snapshots, strategy_equity, strategy_trades, regime_history) with monthly partitioning, TTL policies (7-730 days), bloom filter indexes, materialized views
- **Neo4j**: 6 node types (User, Strategy, Asset, Regime, Concept, Conversation), 12 relationship types, constraints, indexes, example queries
- **Redis**: 10 key patterns with TTLs (sessions, positions, regime, rankings, orderbook, rate limits, job status, WebSocket subscriptions, AI context), 8 pub/sub channels
- **Qdrant**: 4 collections (strategy_docs, conversations, market_intelligence, backtest_results) with HNSW config, payload indexes
- Migration script templates for all databases
- Backup scripts (PostgreSQL, ClickHouse, Neo4j) with retention policies

**Status:** Production-ready, 1,021 lines

---

### Database Schemas & DDL (Examples)

- PostgreSQL (ops): users, strategies, orders, trades, performance, ai_interactions (DDL examples kept concise)
- QuestDB (hot): ticks/candles with designated timestamp + daily partitions
- ClickHouse (history): ticks/candles with partitioning and TTL; order by (symbol, ts)
- Partitioning/indexing: pg_partman (time-based partitions), pgvector examples, HNSW index notes

### AI Memory Schemas (Qdrant & Neo4j)

- Qdrant collections: trade_memory, strategy_memory, market_regime_memory (payload fields and filters; quantization notes)
- Neo4j graph: nodes (Asset, Strategy, Regime, Event), relationships (USES, CORRELATES, CAUSES), constraints/indexes

### Kubernetes Patterns (Ops)

- Optional mesh (Istio), event-driven autoscaling (KEDA), StatefulSets per DB, PodDisruptionBudgets
- ConfigMaps/Secrets patterns; Ingress for WebSocket/SSE; probes; resource limits; anti-affinity for DBs
- Observability stack: OTel Collector, Jaeger, Loki, Prom/Grafana; alerts
- DR: backup/restore drills, multi-region notes

### Security & Compliance (Extended)

- Zero Trust (NIST SP 800-207), FIPS 140-3 crypto modules, certificate pinning
- SBOM/supply chain controls; dependency scanning (Snyk/Trivy)
- Secure headers, network segmentation, VPN, DDoS protections, rate limiting, input sanitization

### Technical Catalogs (Indicators/Strategies/Algos)

- OMS Order Types Matrix: native vs synthetic support per venue (OCO/OTO/OTOCO, bracket, reduce-only, post-only, peg)
- SLO Catalog: ingest lag, OMS latency, AI response SLOs; alert policies and burn-rate examples

- Indicators: trend, momentum, volatility, volume, support/resistance, candlestick patterns (comprehensive enumerations available)
- Strategies: trend-following, mean reversion, breakout/momentum, scalping, portfolio, quantitative, event-driven
- Algos: execution (TWAP/VWAP/POV/iceberg), arbitrage, market making (non-HFT retail scope)

### External Platform Integrations (Examples)

- MetaTrader 5 (mt5), Interactive Brokers (ib_insync), NinjaTrader (NT8) â€” adapter examples (optional; parity via Strategy Advisor/native API)

- Risk governance defaults: Provided per-asset defaults; confirm appetite for stricter/looser defaults per asset class
- On-chain DEX support: Optional; clarify enablement triggers (user opt-in vs. strategy requirement)
- Observability scope: Local-only metrics by default; clarify opt-in for remote telemetry/integrations
- Data retention: 7-year financial/audit retention; clarify retention for embeddings/logs and user-configurable policies
- Platform support: Windows/macOS/Linux via Docker; clarify ARM vs. x86 expectations and minimum OS versions
- Commercial terms: One-time license + optional maintenance; clarify license scope (per user vs. per machine) and upgrade policy


### 30. Glossary

- OMS: Order Management System (ordersâ€™ full lifecycle)
- SOR: Smart Order Routing (multi-venue selection/splitting)
- TCA: Transaction Cost Analysis (execution quality metrics)
- RAG: Retrieval Augmented Generation (context-aware AI)


### 31. Conclusion

SymbioteTrader represents a significant opportunity in the algorithmic trading market by combining AI technology with a user-friendly interface. The platform addresses key pain points for retail traders while providing the sophistication needed by advanced traders.

With a clear, comprehensive specification and strong technical foundation, SymbioteTrader is positioned to become a leading platform in the algorithmic trading space.

