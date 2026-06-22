# Routara MCP 上传发布（逐步操作）

> 包目录：`packages/routara-mcp` · npm 名：`routara-mcp` · 版本：`1.0.0`

## 第 0 步：准备 GitHub 仓库（MCP Registry 必需）

1. 在 GitHub 新建**公开**仓库，例如：`https://github.com/你的用户名/routara-mcp`
2. 把本目录推上去：

```powershell
cd "d:\unified-llm-api-&-token-aggregator\packages\routara-mcp"
git init
git add .
git commit -m "feat: routara-mcp v1.0.0"
git branch -M main
git remote add origin https://github.com/你的用户名/routara-mcp.git
git push -u origin main
```

3. 若你的 GitHub 用户名**不是** `routara-ai`，请改两处（`你的用户名` 替换为真实 ID）：

**`package.json`**
```json
"mcpName": "io.github.你的用户名/routara-mcp",
"repository": { "url": "https://github.com/你的用户名/routara-mcp.git" }
```

**`server.json`**
```json
"name": "io.github.你的用户名/routara-mcp",
"repository": { "url": "https://github.com/你的用户名/routara-mcp", "source": "github" }
```

> `mcpName` 必须与 `server.json` 的 `name` **完全一致**。

---

## 第 1 步：登录 npm（本机只需做一次）

在 **PowerShell** 里执行（会打开浏览器或提示输入用户名/密码/OTP）：

```powershell
npm login --registry=https://registry.npmjs.org
npm whoami --registry=https://registry.npmjs.org
```

看到你的 npm 用户名即表示成功。

**或用 Access Token（推荐 CI）：**

1. 打开 https://www.npmjs.com/settings/~/tokens → **Generate New Token** → **Granular** → 权限选 **Publish** for `routara-mcp`
2. 执行：
```powershell
$env:NPM_TOKEN="npm_你的token"
npm config set //registry.npmjs.org/:_authToken $env:NPM_TOKEN
```

---

## 第 2 步：发布到 npm

```powershell
cd "d:\unified-llm-api-&-token-aggregator\packages\routara-mcp"
node ./node_modules/typescript/bin/tsc
node --test dist/test/smoke.test.js
npm publish --access public
```

成功后可验证：

```powershell
npm view routara-mcp version --registry=https://registry.npmjs.org
```

---

## 第 3 步：发布到官方 MCP Registry

1. 下载 CLI：https://github.com/modelcontextprotocol/registry/releases  
   Windows 选 `mcp-publisher_windows_amd64.zip`，解压得到 `mcp-publisher.exe`

2. 在 `packages/routara-mcp` 目录执行：

```powershell
cd "d:\unified-llm-api-&-token-aggregator\packages\routara-mcp"
.\mcp-publisher.exe login github
.\mcp-publisher.exe publish --dry-run
.\mcp-publisher.exe publish
```

3. 验证：

```powershell
curl "https://registry.modelcontextprotocol.io/v0/servers?search=routara"
```

**顺序不能反：必须先 npm publish，再 MCP Registry publish**（Registry 会校验 npm 上的包和 `mcpName`）。

---

## 第 4 步：其他平台（手动表单，约 10 分钟）

| 平台 | 操作 |
|------|------|
| **mcp.so** | https://mcp.so/publish — 填 npm 包名 `routara-mcp` + GitHub 仓库 URL |
| **Smithery** | https://smithery.ai — 用 GitHub 登录 → Submit Server → npm: `routara-mcp`，环境变量 `ROUTARA_API_KEY` |
| **awesome-mcp-servers** | https://github.com/punkpeye/awesome-mcp-servers — 提 PR 加一行（见 `PLATFORM_SUBMISSIONS.md`） |
| **Glama / PulseMCP** | 无需提交，Registry 发布后 1–2 天自动收录 |

---

## 第 5 步：Cursor 里使用

npm 发布后，用户（或你自己）在 Cursor → Settings → MCP：

```json
{
  "mcpServers": {
    "routara": {
      "command": "npx",
      "args": ["-y", "routara-mcp"],
      "env": {
        "ROUTARA_API_KEY": "sk-or-v1-你的密钥"
      }
    }
  }
}
```

---

## 常见问题

| 问题 | 处理 |
|------|------|
| `ENEEDAUTH` | 先执行第 1 步 `npm login` |
| 发布到了 npmmirror | 本目录已有 `.npmrc` 指向 `registry.npmjs.org`，用 `npm publish` 即可 |
| MCP Registry 校验失败 | 确认 npm 已发布、`mcpName` 与 `server.json` 一致、GitHub 仓库公开 |
| 包名被占用 | 改为 `@你的npm用户名/routara-mcp`，并同步改 `server.json` 的 `identifier` |
