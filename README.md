# Routara MCP Server

Official [Model Context Protocol](https://modelcontextprotocol.io) server for **[Routara](https://routara.ai)** — call 48+ LLMs, image and video models through `api.routara.ai` from **Cursor**, Claude Desktop, Windsurf, and other MCP clients.

## Tools

| Tool | Description |
|------|-------------|
| `routara_list_models` | List models in the Routara catalog |
| `routara_chat` | Chat completion (OpenAI-compatible) |
| `routara_generate_image` | Image generation (cash balance required) |
| `routara_generate_video` | Submit async video job (cash balance required) |
| `routara_get_video_status` | Poll video task status |

## Quick start

1. Create an API key at [routara.ai → Auth](https://routara.ai/#auth) (`sk-or-v1-...`).
2. Add to your MCP client:

### Cursor

**Settings → MCP → Add server** or edit `~/.cursor/mcp.json`:

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

## Development

```bash
cd packages/routara-mcp
npm install
node ./node_modules/typescript/bin/tsc
ROUTARA_API_KEY=sk-or-v1-... node scripts/live-smoke.mjs
npm test
```

## Billing notes

- One API key works for **text, image, and video** — switch `model` and tool, not the key.
- Image/video require **cash wallet balance** (promo credits cannot be used for media).
- Chat uses standard per-token billing.

## License

MIT © Routara
