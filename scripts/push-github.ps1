# Push routara-mcp to GitHub (run after creating empty repo on github.com)
param(
    [Parameter(Mandatory = $true)]
    [string]$GitHubUsername,
    [string]$RepoName = "routara-mcp"
)

$ErrorActionPreference = "Stop"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$pkg = Join-Path $root "packages\routara-mcp"
if (-not (Test-Path $pkg)) { $pkg = Split-Path $PSScriptRoot -Parent }

Push-Location $pkg

$mcpName = "io.github.$GitHubUsername/$RepoName"
Write-Host "Updating mcpName -> $mcpName" -ForegroundColor Cyan

$pkgJson = Get-Content package.json -Raw | ConvertFrom-Json
$pkgJson.mcpName = $mcpName
$pkgJson.repository.url = "https://github.com/$GitHubUsername/$RepoName.git"
$pkgJson | ConvertTo-Json -Depth 10 | Set-Content package.json -Encoding utf8

$server = Get-Content server.json -Raw | ConvertFrom-Json
$server.name = $mcpName
$server.repository.url = "https://github.com/$GitHubUsername/$RepoName"
$server | ConvertTo-Json -Depth 10 | Set-Content server.json -Encoding utf8

if (-not (Test-Path .git)) { git init }
git add .
git commit -m "feat: routara-mcp v1.1.0" 2>$null
git branch -M main

$remote = "https://github.com/$GitHubUsername/$RepoName.git"
git remote remove origin 2>$null
git remote add origin $remote

Write-Host "`nPushing to $remote ..." -ForegroundColor Cyan
git push -u origin main

Write-Host "`nDone. Next: mcp-publisher login github && mcp-publisher publish" -ForegroundColor Green
Pop-Location
