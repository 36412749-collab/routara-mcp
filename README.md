# Routara MCP Server

[![npm version](https://img.shields.io/npm/v/routara-mcp.svg)](https://www.npmjs.com/package/routara-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP%20Registry-io.github.36412749--collab%2Froutara--mcp-blue)](https://registry.modelcontextprotocol.io/v0/servers/io.github.36412749-collab/routara-mcp)
[![Glama MCP](https://img.shields.io/badge/Glama-MCP%20Server-blue)](https://glama.ai/mcp/servers/36412749-collab/routara-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)

Official [Model Context Protocol](https://modelcontextprotocol.io) server for **Routara** — call **787+ LLMs**, image, and video models through `api.routara.ai` from **Cursor**, **Claude Desktop**, **Windsurf**, **VS Code**, and other MCP clients.

- **Website:** https://routara.ai
- **API:** https://api.routara.ai/v1
- **Get API key:** https://routara.ai/#auth ($1 promo credit on signup)

## Install

```bash
npx -y routara-mcp
```

Or add globally: `npm install -g routara-mcp`

## Tools

| Tool | Description |
|------|-------------|
| `routara_list_models` | List models in the Routara catalog |
| `routara_chat` | Chat completion (OpenAI-compatible) |
| `routara_generate_image` | Image generation (cash wallet balance required) |
| `routara_generate_video` | Submit async video job (cash balance required) |
| `routara_get_video_status` | Poll video task status |

## Quick start

1. Create an API key at [routara.ai → Auth](https://routara.ai/#auth) (`sk-or-v1-...`).
2. Add to your MCP client:

### Cursor

Settings → MCP → Add server, or edit `~/.cursor/mcp.json`:

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

### Claude Desktop

`%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

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

## Environment

| Variable | Required | Default |
|----------|----------|---------|
| `ROUTARA_API_KEY` | Yes | — |
| `ROUTARA_API_BASE` | No | `https://api.routara.ai/v1` |

## Listed on

- [npm](https://www.npmjs.com/package/routara-mcp) · `routara-mcp@1.0.2`
- [Official MCP Registry](https://registry.modelcontextprotocol.io/v0/servers/io.github.36412749-collab/routara-mcp) · `io.github.36412749-collab/routara-mcp`
- [Glama](https://glama.ai/mcp/servers/36412749-collab/routara-mcp) · claimed listing
- [mcp.so](https://mcp.so/server/routara-llm-gateway/36412749-collab)
- [Smithery](https://smithery.ai/server/nbjack9897/routara-mcp)
- [PulseMCP](https://www.pulsemcp.com/servers?q=routara)

## Health check (Glama / CI)

The server starts **without** `ROUTARA_API_KEY` so registries can run MCP handshake (`initialize` + `tools/list`). API key is required only when invoking tools.

```bash
npm ci && npm run build && npm test
# Optional live probe (needs real key):
ROUTARA_API_KEY=sk-or-v1-... npm run test:live
```

After pushing to GitHub, re-run **Claim ownership** on Glama once to refresh the listing index.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ROUTARA_API_KEY is required` on tool call | Set env in MCP client config; get key at [routara.ai/#auth](https://routara.ai/#auth) |
| `401 invalid_api_key` | Regenerate key in dashboard; ensure `sk-or-v1-` prefix |
| `402` / insufficient balance | Top up cash wallet at routara.ai |
| Image/video fails, chat works | Media requires **cash** balance; promo credits are chat-only on economy models |
| Server won't start in inspector | Use `npx -y routara-mcp` with Node ≥18; run `npm run build` if developing from source |

## Development

```bash
npm install
npm run build
ROUTARA_API_KEY=sk-or-v1-... npm run test:live
npm test
```

## Billing notes

- One API key works for text, image, and video — switch `model` and tool, not the key.
- Image/video require **cash wallet** balance (promo credits cannot be used for media).
- Chat uses standard per-token billing with Smart Route™ failover across upstream pools.

## Related

- **JSON Translate GitHub Action:** https://github.com/36412749-collab/json-translate-action
- **Docs:** https://routara.ai/docs

## License

MIT © [Routara](https://routara.ai)
