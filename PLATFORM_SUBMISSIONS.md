# Platform submission copy-paste (routara-mcp v1.0.0)

## npm

```bash
npm login --registry=https://registry.npmjs.org
cd packages/routara-mcp
npm publish --access public --registry=https://registry.npmjs.org
```

## Official MCP Registry

Download CLI: https://github.com/modelcontextprotocol/registry/releases

```bash
cd packages/routara-mcp
mcp-publisher login github
mcp-publisher publish --dry-run
mcp-publisher publish
```

Verify: `curl "https://registry.modelcontextprotocol.io/v0/servers?search=routara"`

## mcp.so

URL: https://mcp.so/publish

- Server name: **Routara LLM Gateway**
- Package: **routara-mcp**
- Repository: **https://github.com/routara-ai/routara-mcp**
- Description: **OpenAI-compatible MCP tools for 48+ LLMs plus image and video generation at api.routara.ai**

## Smithery

URL: https://smithery.ai/docs/build

Submit npm package `routara-mcp` with env `ROUTARA_API_KEY`.

## awesome-mcp-servers (GitHub PR)

Add under **Aggregators** or **AI Services**:

```markdown
- [Routara](https://github.com/routara-ai/routara-mcp) - OpenAI-compatible LLM, image and video gateway ([api.routara.ai](https://api.routara.ai)).
```

## Glama / PulseMCP

Auto-index after MCP Registry publish (check in 48h).

## Cursor (user install)

```json
{
  "mcpServers": {
    "routara": {
      "command": "npx",
      "args": ["-y", "routara-mcp"],
      "env": {
        "ROUTARA_API_KEY": "sk-or-v1-YOUR_KEY"
      }
    }
  }
}
```
