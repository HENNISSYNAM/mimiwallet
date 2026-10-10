# Gỡ MIMI Điền hộ của người dùng hiện tại.
#   powershell -ExecutionPolicy Bypass -File go-cai-dat.ps1            -> gỡ chương trình VÀ hồ sơ trình duyệt riêng của MIMI
#   powershell -ExecutionPolicy Bypass -File go-cai-dat.ps1 -GiuHoSo   -> gỡ chương trình, giữ hồ sơ trình duyệt (phiên đăng nhập cổng)
# Hồ sơ trình duyệt chứa cookie phiên đăng nhập cổng của bạn; nó chỉ nằm trên máy này, MIMI không sao lưu nó.
param([switch]$GiuHoSo)
$ErrorActionPreference = 'Stop'
$nha = Join-Path $env:LOCALAPPDATA 'MIMI\dien-ho'
# MIMI_DIEN_HO_MENU chỉ dùng khi kiểm thử gói (để không đụng menu Start thật).
$menu = if ($env:MIMI_DIEN_HO_MENU) { $env:MIMI_DIEN_HO_MENU } else { [Environment]::GetFolderPath('Programs') }
$loiTat = Join-Path $menu 'MIMI Dien Ho.lnk'

$dangChay = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like "*MIMI\dien-ho*mimi-dien-ho.mjs*" }
if ($dangChay) { throw 'MIMI Điền hộ đang chạy. Đóng cửa sổ bộ chạy (gõ q) rồi gỡ lại.' }

if (Test-Path $loiTat) { Remove-Item -Force $loiTat }
if (Test-Path $nha) {
  foreach ($muc in Get-ChildItem $nha) {
    if ($GiuHoSo -and $muc.Name -like 'trinh-duyet-*') { continue }
    Remove-Item -Recurse -Force $muc.FullName
  }
  if (-not $GiuHoSo) { Remove-Item -Recurse -Force $nha }
}
if ($GiuHoSo) { "Đã gỡ MIMI Điền hộ. Giữ hồ sơ trình duyệt ở $nha" } else { "Đã gỡ MIMI Điền hộ và hồ sơ trình duyệt riêng của nó." }
