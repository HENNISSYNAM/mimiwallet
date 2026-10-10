# Cài MIMI Điền hộ cho NGƯỜI DÙNG HIỆN TẠI. Không cần quyền admin, không tự khởi động cùng Windows, không mở cổng ra mạng.
#   Cài / nâng cấp:       powershell -ExecutionPolicy Bypass -File cai-dat.ps1
#   Quay về bản trước:    powershell -ExecutionPolicy Bypass -File cai-dat.ps1 -QuayLai
# Mỗi phiên bản nằm ở thư mục riêng; "hien-tai.txt" chỉ bản đang dùng, "truoc.txt" chỉ bản trước đó.
param([switch]$QuayLai)
$ErrorActionPreference = 'Stop'
$nha = Join-Path $env:LOCALAPPDATA 'MIMI\dien-ho'
$banDir = Join-Path $nha 'ban'
$hienTaiTxt = Join-Path $nha 'hien-tai.txt'
$truocTxt = Join-Path $nha 'truoc.txt'
# MIMI_DIEN_HO_MENU chỉ dùng khi kiểm thử gói (để không đụng menu Start thật).
$menu = if ($env:MIMI_DIEN_HO_MENU) { $env:MIMI_DIEN_HO_MENU } else { [Environment]::GetFolderPath('Programs') }
$loiTat = Join-Path $menu 'MIMI Dien Ho.lnk'

function Tao-LoiTat([string]$thuMuc) {
  New-Item -ItemType Directory -Force $menu | Out-Null
  $ws = New-Object -ComObject WScript.Shell
  $l = $ws.CreateShortcut($loiTat)
  $l.TargetPath = Join-Path $thuMuc 'MIMI Dien Ho.cmd'
  $l.WorkingDirectory = $thuMuc
  $l.Description = 'MIMI Điền hộ — điền bản nháp tờ khai, đọc lại, bàn giao. Không ký, không nộp.'
  $l.Save()
}

if ($QuayLai) {
  if (-not (Test-Path $truocTxt)) { throw 'Không có bản trước để quay về.' }
  $truoc = (Get-Content $truocTxt -Raw).Trim()
  $dang = (Get-Content $hienTaiTxt -Raw).Trim()
  if (-not (Test-Path (Join-Path $banDir $truoc))) { throw "Bản trước ($truoc) không còn trên máy." }
  Set-Content -Encoding ascii $hienTaiTxt $truoc
  Set-Content -Encoding ascii $truocTxt $dang
  Tao-LoiTat (Join-Path $banDir $truoc)
  "Đã quay về bản $truoc (bản $dang vẫn giữ, chạy lại -QuayLai để đổi lại)."
  return
}

$nguon = $PSScriptRoot
$phienBan = (Get-Content (Join-Path $nguon 'PHIEN_BAN.txt') -Raw).Trim()
$dich = Join-Path $banDir $phienBan
New-Item -ItemType Directory -Force $banDir | Out-Null
if (Test-Path $dich) { Remove-Item -Recurse -Force $dich }
New-Item -ItemType Directory -Force $dich | Out-Null
Copy-Item -Recurse (Join-Path $nguon '*') $dich -Exclude 'cai-dat.ps1'
Copy-Item (Join-Path $nguon 'cai-dat.ps1') $dich

if (Test-Path $hienTaiTxt) {
  $cu = (Get-Content $hienTaiTxt -Raw).Trim()
  if ($cu -and $cu -ne $phienBan) { Set-Content -Encoding ascii $truocTxt $cu }
}
Set-Content -Encoding ascii $hienTaiTxt $phienBan
Tao-LoiTat $dich
"Đã cài MIMI Điền hộ $phienBan vào $dich"
"Mở từ menu Start: 'MIMI Dien Ho'. Không có gì tự chạy cùng Windows."
