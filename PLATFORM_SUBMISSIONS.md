# Platform submission copy-paste (routara-mcp v1.1.2)

## npm

For automated releases, configure the existing `routara-mcp` package's npm
Trusted Publisher to allow direct `npm publish` from GitHub Actions:

- GitHub owner: `36412749-collab`
- Repository: `routara-mcp`
- Workflow filename: `publish.yml`
- Allowed action: `npm publish`

After CI passes, push a new tag matching `package.json` (for example,
`v1.1.2`). The publish workflow builds and verifies the npm package and MCPB,
publishes npm, registers the same version in the official MCP Registry, then
creates the GitHub Release. Do not push the tag until Trusted Publisher is
configured: the existing npm token path failed for v1.1.1.

Verify the published npm version, official Registry version, GitHub Release,
and a clean `npx routara-mcp@<version>` handshake before updating directories.

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
- Repository: **https://github.com/36412749-collab/routara-mcp**
- Description: **OpenAI-compatible MCP tools for a live catalog of chat, image, and video models at api.routara.ai**

## Smithery

URL: https://smithery.ai/docs/build

Submit npm package `routara-mcp` with env `ROUTARA_API_KEY`.

## awesome-mcp-servers (GitHub PR)

Add under **Aggregators** or **AI Services**:

```markdown
- [Routara](https://github.com/36412749-collab/routara-mcp) - OpenAI-compatible LLM, image and video gateway ([api.routara.ai](https://api.routara.ai)).
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
