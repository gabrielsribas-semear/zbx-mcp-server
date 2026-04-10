# Copilot Instructions — Zabbix MCP Server

## Project Identity

**Name:** `zbx-mcp-server`  
**Purpose:** A production-grade [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that exposes the complete Zabbix API surface (90+ tools across 19 categories) as MCP tools, prompts, and resources — enabling AI assistants to fully manage Zabbix monitoring infrastructure.  
**Runtime:** Node.js 18+ (CommonJS, `"type": "commonjs"`)  
**Transport:** stdio (primary, for MCP clients) and HTTP/Streamable (secondary, for development/integration)  
**Distribution:** npm package (`zbx-mcp-server`) — runnable via `npx zbx-mcp-server` without prior installation.

---

## Architecture Overview

```
zbx-mcp-server/
├── bin/
│   └── zbx-mcp-server.js   # CLI entry point (shebang, arg parsing, env injection)
├── src/
│   ├── index.js             # Server bootstrap: createServer(), startStdioServer(), startHttpServer()
│   ├── config.js            # Env-driven config (URL, auth, transport, cache, logging)
│   ├── api/                 # Thin Zabbix API clients — one module per domain
│   │   ├── zabbix-client.js # Core HTTP client (axios, token/password auth, retry)
│   │   ├── hosts.js         # Host CRUD operations
│   │   ├── problems.js      # Active problem queries
│   │   └── ...              # One file per Zabbix API domain
│   ├── tools/               # MCP tool registrations — maps API functions to MCP tool schema
│   │   ├── index.js         # registerAllTools() — orchestrates all tool registrations
│   │   ├── schemas/         # Zod input schemas shared across tools
│   │   └── *.js             # One file per tool category
│   ├── security/            # Auth middleware, token validation
│   ├── types/               # JSDoc type definitions
│   └── utils/
│       ├── logger.js        # Structured logger (writes to stderr in stdio mode)
│       ├── cache.js         # In-memory TTL cache (generalCache)
│       ├── health.js        # Health/metrics endpoint helpers
│       └── retry.js         # Axios retry wrapper
└── .github/
    ├── copilot-instructions.md  # This file
    └── workflows/               # CI/CD: ci.yml, docker.yml, test.yml
```

---

## Core Patterns & Conventions

### 1. MCP Tool Registration Pattern

Each tool category file (`src/tools/*.js`) exports a `register<Category>Tools(server)` function. Tools are registered using `server.tool(name, zodSchema, handler)`. The central `src/tools/index.js` calls all registrations:

```js
// src/tools/hosts.js
function registerHostTools(server) {
  server.tool('zabbix_host_get', schemas.hostGet, async (args) => {
    const result = await hostsApi.getHosts(args);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  });
}
```

**Rule:** Tool handlers must return `{ content: [{ type: 'text', text: string }] }`. Never throw unhandled errors — catch and return structured error content.

### 2. Zod Schema Ownership

All input schemas live in `src/tools/schemas/`. Schemas are reused across tools and API validation. Use `.describe()` on every field — these descriptions surface directly in the MCP tool manifest seen by AI clients.

### 3. API Client Pattern

`src/api/zabbix-client.js` is the singleton HTTP client. Domain modules (`hosts.js`, `problems.js`, etc.) are thin wrappers that call `zabbixClient.request(method, params)`. They must:
- Return plain JSON-serializable objects
- Not contain MCP-specific logic
- Handle Zabbix-specific error codes and rethrow as standard `Error`

### 4. Configuration Loading

All configuration is driven by environment variables, loaded in `src/config.js` via `dotenv`. No hardcoded credentials anywhere in the codebase. Sensitive defaults (API URL) should not be committed.

**Key env vars:**

| Variable | Required | Description |
|---|---|---|
| `ZABBIX_API_URL` | ✅ | Full URL to Zabbix `api_jsonrpc.php` |
| `ZABBIX_API_TOKEN` | ⚠️ | API token (Zabbix 5.4+, preferred) |
| `ZABBIX_USERNAME` | ⚠️ | Username for password auth |
| `ZABBIX_PASSWORD` | ⚠️ | Password for password auth |
| `MCP_TRANSPORT_MODE` | ❌ | `stdio` (default) or `http` |
| `MCP_HTTP_PORT` | ❌ | HTTP port (default: `3000`) |
| `MCP_HTTP_HOST` | ❌ | HTTP host (default: `localhost`) |
| `MCP_SESSION_MANAGEMENT` | ❌ | Enable HTTP sessions (`true`/`false`) |
| `CACHE_ENABLED` | ❌ | Enable response caching |
| `CACHE_TTL` | ❌ | Cache TTL in seconds (default: `300`) |

⚠️ Either `ZABBIX_API_TOKEN` **or** `ZABBIX_PASSWORD` is required for authentication.

### 5. Transport Architecture

- **stdio:** Default mode. MCP clients (Claude Desktop, Cursor, etc.) spawn the process and communicate via stdin/stdout. `console.log` must never be used — all output goes through the logger (which writes to stderr).
- **HTTP/Streamable:** Uses `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk`. Supports both session-based and stateless modes.

### 6. Logger Rules (CRITICAL for stdio mode)

```js
const { logger } = require('./utils/logger');
logger.info('message');   // writes to stderr
logger.error('message');  // writes to stderr
```

**Never use `console.log()` in any production code path.** stdio transport uses stdout exclusively for MCP protocol messages. Any stray `console.log` will corrupt the MCP stream.

---

## npx Distribution

The package is distributed on npm as `zbx-mcp-server`. Users can run it without installation:

```bash
npx zbx-mcp-server
```

Or configure it in MCP client configs:

```json
{
  "mcpServers": {
    "zabbix": {
      "command": "npx",
      "args": ["-y", "zbx-mcp-server"],
      "env": {
        "ZABBIX_API_URL": "https://zabbix.example.com/api_jsonrpc.php",
        "ZABBIX_API_TOKEN": "your_token"
      }
    }
  }
}
```

**CLI flags** (parsed in `bin/zbx-mcp-server.js`) map to env vars:

| Flag | Env var |
|---|---|
| `--url` | `ZABBIX_API_URL` |
| `--token` | `ZABBIX_API_TOKEN` |
| `--user` | `ZABBIX_USERNAME` |
| `--pass` | `ZABBIX_PASSWORD` |
| `--http` | `MCP_TRANSPORT_MODE=http` |
| `--port` | `MCP_HTTP_PORT` |

---

## Quality Standards

### Testing
- Framework: **Jest** (`src/__tests__/`)
- Unit, integration, and contract tests
- Run all: `npm test`
- Coverage: `npm run test:coverage`
- CI: `npm run test:ci`

### Linting & Formatting
- **ESLint** with security plugin (`eslint-plugin-security`)
- **Prettier** for formatting
- Run: `npm run lint`, `npm run format`
- Pre-commit hooks via **husky** + **lint-staged**

### Security
- `npm audit` in CI
- No credentials in code or logs
- Input validation via Zod on all tool inputs
- TLS verification configurable (`ZABBIX_IGNORE_SELFSIGNED_CERT`)

---

## Adding a New Tool Category

1. Create `src/api/<domain>.js` — implement Zabbix API calls
2. Create `src/tools/<domain>.js` — register MCP tools using Zod schemas
3. Add Zod schemas to `src/tools/schemas/`
4. Import and call `register<Domain>Tools(server)` in `src/tools/index.js`
5. Export domain API from `src/api/index.js`
6. Write tests in `src/__tests__/tools/<domain>.test.js`

---

## Development Workflow

```bash
# Install dependencies
npm install

# Run in development (stdio)
npm run dev

# Run in HTTP mode with live reload
npm run dev:http

# Run tests
npm test

# Lint
npm run lint:fix

# Pack for local npx testing
npm pack
npx ./zbx-mcp-server-*.tgz
```

---

## Key Dependencies

| Package | Role |
|---|---|
| `@modelcontextprotocol/sdk` | MCP server framework, transports, types |
| `axios` | HTTP client for Zabbix API requests |
| `zabbix-utils` | Zabbix protocol helpers |
| `zod` | Runtime schema validation for all tool inputs |
| `dotenv` | Environment variable loading |
| `express` | HTTP transport server |

---

## Important Files

| File | Purpose |
|---|---|
| `src/index.js` | Server entry — do not add business logic here |
| `src/config.js` | Single source of truth for runtime configuration |
| `src/api/zabbix-client.js` | Core API client — modify carefully |
| `src/tools/index.js` | Tool registration orchestrator |
| `bin/zbx-mcp-server.js` | npx CLI entry point |
| `.env.example` | Template for required env vars |

---

## Refactoring Principles (Active)

1. **No debug `console.log`** anywhere in `src/` — use `logger`
2. **Hardcoded URLs/credentials** in config defaults must be removed
3. **Tool handlers** should be thin — delegate to `src/api/` modules
4. **Error messages** returned to MCP clients must be informative but not leak internals
5. **Schemas** should be in `src/tools/schemas/` not inline in tool files
6. **Avoid duplication** — shared utilities go in `src/utils/`
