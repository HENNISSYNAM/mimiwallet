# Đóng gói MIMI Điền hộ cho Windows x64 -> helper/ban-phat-hanh/mimi-dien-ho-<phiên bản>-win-x64.zip
# Gói gồm: node.exe (bản đang cài trên máy đóng gói), app/mimi-dien-ho.mjs (esbuild), app/node_modules/playwright-core,
# MIMI Dien Ho.cmd, cai-dat.ps1, go-cai-dat.ps1. Không tải trình duyệt: bộ chạy dùng Chrome/Edge đã có trên máy.
$ErrorActionPreference = 'Stop'
$goc = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$helper = Join-Path $goc 'helper'
$phienBan = (Get-Content (Join-Path $helper 'package.json') -Raw | ConvertFrom-Json).version
$ra = Join-Path $helper 'ban-phat-hanh'
$tam = Join-Path $ra "mimi-dien-ho-$phienBan"
if (Test-Path $tam) { Remove-Item -Recurse -Force $tam }
New-Item -ItemType Directory -Force (Join-Path $tam 'app\node_modules') | Out-Null

Push-Location $goc
try {
  npx --yes esbuild helper/src/main.ts --bundle --platform=node --format=esm --target=node20 --outfile=helper/dist/mimi-dien-ho.mjs --external:playwright-core
  if ($LASTEXITCODE -ne 0) { throw 'esbuild lỗi' }
} finally { Pop-Location }

Copy-Item (Join-Path $helper 'dist\mimi-dien-ho.mjs') (Join-Path $tam 'app\')
Copy-Item -Recurse (Join-Path $helper 'node_modules\playwright-core') (Join-Path $tam 'app\node_modules\')
Copy-Item (Get-Command node).Source (Join-Path $tam 'node.exe')
Set-Content -Encoding ascii (Join-Path $tam 'app\package.json') '{"type":"module"}'
Set-Content -Encoding ascii (Join-Path $tam 'PHIEN_BAN.txt') $phienBan
Copy-Item (Join-Path $PSScriptRoot 'cai-dat.ps1'), (Join-Path $PSScriptRoot 'go-cai-dat.ps1'), (Join-Path $PSScriptRoot 'MIMI Dien Ho.cmd'), (Join-Path $PSScriptRoot 'DOC_TRUOC.txt') $tam

$zip = Join-Path $ra "mimi-dien-ho-$phienBan-win-x64.zip"
if (Test-Path $zip) { Remove-Item -Force $zip }
Compress-Archive -Path (Join-Path $tam '*') -DestinationPath $zip
$h = (Get-FileHash -Algorithm SHA256 $zip).Hash.ToLower()
Set-Content -Encoding ascii "$zip.sha256" "$h  $(Split-Path $zip -Leaf)"
"Đã đóng gói: $zip"
"SHA-256: $h"
"Kích thước: {0:N1} MB" -f ((Get-Item $zip).Length / 1MB)
