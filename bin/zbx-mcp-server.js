#!/usr/bin/env node

/**
 * zbx-mcp-server — CLI entry point for npx distribution
 *
 * Parses CLI flags and injects them as environment variables before
 * bootstrapping the MCP server. All flags are optional; the server
 * also honours environment variables set by the calling process (e.g.
 * from the MCP client config "env" block).
 *
 * Usage:
 *   npx zbx-mcp-server [options]
 *
 * Options:
 *   --url <url>       Zabbix API URL  (ZABBIX_API_URL)
 *   --token <token>   API token        (ZABBIX_API_TOKEN)
 *   --user <user>     Username         (ZABBIX_USERNAME)
 *   --pass <pass>     Password         (ZABBIX_PASSWORD)
 *   --http            Use HTTP transport instead of stdio
 *   --port <port>     HTTP port        (MCP_HTTP_PORT, default: 3000)
 *   --host <host>     HTTP host        (MCP_HTTP_HOST, default: localhost)
 *   --help            Show this help message
 *   --version         Show package version
 */

'use strict';

const path = require('path');
const fs = require('fs');

// ── helpers ──────────────────────────────────────────────────────────────────

function printHelp() {
  process.stderr.write(`
zbx-mcp-server — Zabbix MCP Server

USAGE
  npx zbx-mcp-server [options]

OPTIONS
  --url <url>       Zabbix API URL           (env: ZABBIX_API_URL)
  --token <token>   API token (Zabbix 5.4+)  (env: ZABBIX_API_TOKEN)
  --user <user>     Username                  (env: ZABBIX_USERNAME)
  --pass <pass>     Password                  (env: ZABBIX_PASSWORD)
  --http            Use HTTP/Streamable transport instead of stdio
  --port <port>     HTTP port                 (env: MCP_HTTP_PORT, default: 3000)
  --host <host>     HTTP bind host            (env: MCP_HTTP_HOST, default: localhost)
  --help            Show this message and exit
  --version         Show package version and exit

AUTHENTICATION
  Provide either --token (recommended, Zabbix 5.4+) or --user/--pass.
  Flags override environment variables set in the calling process.

EXAMPLES
  # stdio mode (default) — used by MCP clients like Claude Desktop
  npx zbx-mcp-server --url https://zabbix.example.com/api_jsonrpc.php --token mytoken

  # HTTP mode — useful for development / debugging
  npx zbx-mcp-server --url https://zabbix.example.com/api_jsonrpc.php --token mytoken --http --port 3000

MCP CLIENT CONFIG (Claude Desktop / Cursor / etc.)
  {
    "mcpServers": {
      "zabbix": {
        "command": "npx",
        "args": ["-y", "zbx-mcp-server"],
        "env": {
          "ZABBIX_API_URL": "https://zabbix.example.com/api_jsonrpc.php",
          "ZABBIX_API_TOKEN": "your_token_here"
        }
      }
    }
  }
`);
}

function printVersion() {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    process.stderr.write(`zbx-mcp-server v${pkg.version}\n`);
  } catch {
    process.stderr.write('zbx-mcp-server (version unknown)\n');
  }
}

// ── arg parsing ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  switch (arg) {
    case '--help':
    case '-h':
      printHelp();
      process.exit(0);
      break;

    case '--version':
    case '-v':
      printVersion();
      process.exit(0);
      break;

    case '--url':
      if (!args[i + 1]) { process.stderr.write('Error: --url requires a value\n'); process.exit(1); }
      process.env.ZABBIX_API_URL = args[++i];
      break;

    case '--token':
      if (!args[i + 1]) { process.stderr.write('Error: --token requires a value\n'); process.exit(1); }
      process.env.ZABBIX_API_TOKEN = args[++i];
      break;

    case '--user':
      if (!args[i + 1]) { process.stderr.write('Error: --user requires a value\n'); process.exit(1); }
      process.env.ZABBIX_USERNAME = args[++i];
      break;

    case '--pass':
      if (!args[i + 1]) { process.stderr.write('Error: --pass requires a value\n'); process.exit(1); }
      process.env.ZABBIX_PASSWORD = args[++i];
      break;

    case '--http':
      process.env.MCP_TRANSPORT_MODE = 'http';
      break;

    case '--port':
      if (!args[i + 1]) { process.stderr.write('Error: --port requires a value\n'); process.exit(1); }
      process.env.MCP_HTTP_PORT = args[++i];
      break;

    case '--host':
      if (!args[i + 1]) { process.stderr.write('Error: --host requires a value\n'); process.exit(1); }
      process.env.MCP_HTTP_HOST = args[++i];
      break;

    default:
      process.stderr.write(`Unknown option: ${arg}\nRun with --help for usage.\n`);
      process.exit(1);
  }
}

// ── bootstrap ─────────────────────────────────────────────────────────────────

// Require the main server module. This triggers startServer() automatically.
require('../src/index.js');
