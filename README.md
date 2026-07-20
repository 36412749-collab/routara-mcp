# Routara MCP Server

[![npm version](https://img.shields.io/npm/v/routara-mcp.svg)](https://www.npmjs.com/package/routara-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP%20Registry-listed-blue)](https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.36412749-collab%2Froutara-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)

Official [Model Context Protocol](https://modelcontextprotocol.io) server for [Routara](https://routara.ai). Use Routara chat, image, and video models from Cursor, Claude Desktop, Codex, Windsurf, VS Code, and other MCP clients.

- Website and setup guide: https://routara.ai/mcp
- OpenAI-compatible API: https://api.routara.ai/v1
- Create an API key: https://routara.ai/#auth

## Install

```bash
npx -y routara-mcp
```

Or install the one-click `routara-mcp.mcpb` bundle from the latest GitHub release.

## Tools

| Tool | Description |
|---|---|
| `routara_list_models` | Search and paginate the live model catalog |
| `routara_chat` | Single-turn or multi-turn chat, including tool calls |
| `routara_generate_image` | Text-to-image and reference-image generation |
| `routara_generate_video` | Text-to-video and image-to-video submission |
| `routara_get_video_status` | Poll an asynchronous video task |

## MCP client configuration

```json
{
  "mcpServers": {
    "routara": {
      "command": "npx",
      "args": ["-y", "routara-mcp"],
      "env": {
        "ROUTARA_API_KEY": "sk-or-v1-YOUR_KEY_HERE"
      }
    }
  }
}
```

### OpenAI Codex

```toml
[mcp_servers.routara]
command = "npx"
args = ["-y", "routara-mcp"]
enabled = true

[mcp_servers.routara.env]
ROUTARA_API_KEY = "sk-or-v1-YOUR_KEY_HERE"
```

## Environment

| Variable | Required | Default |
|---|---:|---|
| `ROUTARA_API_KEY` | Yes for tool calls | None |
| `ROUTARA_API_BASE` | No | `https://api.routara.ai/v1` |
| `ROUTARA_API_TIMEOUT_MS` | No | `30000` |

The process can start and complete the MCP handshake without an API key. A key is resolved only when a Routara tool is invoked, which lets directories validate the server safely.

## Reliability and compatibility

- Requests time out instead of hanging indefinitely.
- Transient network errors, HTTP 429, and HTTP 5xx responses are retried with bounded backoff.
- API errors include the upstream request ID and retry delay when available.
- `routara_chat` returns the complete OpenAI-compatible response, preserving reasoning content and tool calls.
- Media parameters are forwarded only when explicitly supplied; model-specific support varies.

## Development

```bash
npm ci
npm run build
npm test
npm run validate:registry
npm run build:mcpb
```

For a live API smoke test:

```bash
ROUTARA_API_KEY=sk-or-v1-... npm run test:live
```

## Directory listings

- [npm](https://www.npmjs.com/package/routara-mcp)
- [Official MCP Registry](https://registry.modelcontextprotocol.io/v0/servers/io.github.36412749-collab%2Froutara-mcp/versions)
- [Glama](https://glama.ai/mcp/servers/36412749-collab/routara-mcp)
- [mcp.so](https://mcp.so/server/routara-llm-gateway/36412749-collab)
- [Smithery](https://smithery.ai/servers/nbjack9897/routara-mcp)
- [PulseMCP](https://www.pulsemcp.com/servers/routara)

## Security

Do not commit API keys. If a key is exposed, revoke it in the Routara dashboard immediately. Please report security issues privately to support@routara.ai.

## License

MIT
