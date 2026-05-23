# One-time: create Render web service from this repo + sync env from local .env
# Prerequisites:
#   1. API key: https://dashboard.render.com/u/settings#api-keys
#   2. $env:RENDER_API_KEY = "rnd_..."
#   3. Run from repo root: .\scripts\setup-render-service.ps1

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $RepoRoot

if (-not $env:RENDER_API_KEY) {
    Write-Error "Set RENDER_API_KEY first (Render Dashboard → Account Settings → API Keys)."
}

$renderExe = Join-Path $env:LOCALAPPDATA "render-cli\render.exe"
if (-not (Test-Path $renderExe)) {
    Write-Host "Installing Render CLI..."
    $zipUrl = "https://github.com/render-oss/cli/releases/download/v1.1.0/cli_1.1.0_windows_amd64.zip"
    $zipPath = Join-Path $env:TEMP "render-cli.zip"
    $extractDir = Join-Path $env:LOCALAPPDATA "render-cli"
    New-Item -ItemType Directory -Force -Path $extractDir | Out-Null
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
    Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force
    $inner = Get-ChildItem $extractDir -Recurse -Filter "render.exe" | Select-Object -First 1
    if ($inner) { Copy-Item $inner.FullName $renderExe -Force }
}

if (-not (Test-Path $renderExe)) {
    Write-Error "Render CLI install failed. Install manually: https://render.com/docs/cli"
}

$env:CI = "true"
$skipKeys = @("HOST", "PORT", "VERCEL_AUTOMATION_BYPASS_SECRET")
$envVars = @{
    NODE_ENV = "production"
}

$envFile = Join-Path $RepoRoot ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        $idx = $line.IndexOf("=")
        if ($idx -lt 1) { return }
        $key = $line.Substring(0, $idx).Trim()
        $val = $line.Substring($idx + 1).Trim()
        if ($key -in $skipKeys) { return }
        if ($key -eq "NODE_ENV") { return }
        $envVars[$key] = $val
    }
} else {
    Write-Warning ".env not found — service will be created with NODE_ENV=production only. Add secrets in Render Dashboard."
}

$cliArgs = @(
    "services", "create",
    "--name", "vernita-backend",
    "--type", "web_service",
    "--repo", "https://github.com/nizam-app/vernita-backend",
    "--branch", "main",
    "--runtime", "node",
    "--plan", "free",
    "--build-command", "npm install",
    "--start-command", "npm start",
    "--health-check-path", "/api/v1/health",
    "--auto-deploy",
    "--confirm",
    "--output", "json"
)

foreach ($entry in $envVars.GetEnumerator()) {
    $cliArgs += "--env-var"
    $cliArgs += ("{0}={1}" -f $entry.Key, $entry.Value)
}

Write-Host "Creating Render web service (vernita-backend)..."
& $renderExe @cliArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Done. Open https://dashboard.render.com for build logs."
Write-Host "API base: https://vernita-backend.onrender.com/api/v1 (URL may differ if name was taken)."
Write-Host "Health:   https://vernita-backend.onrender.com/api/v1/health"
