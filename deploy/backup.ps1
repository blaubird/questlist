# Копирует свежие бэкапы PocketBase (pb_data\backups, делаются сами каждые 6 ч) в облачную папку.
# Хранит 14 последних копий. Запускается Планировщиком ежедневно и при входе в систему.
param(
  [string]$Server = (Join-Path $env:USERPROFILE 'questlist-server'),
  [string]$Dest = (Join-Path ($env:OneDrive ?? (Join-Path $env:USERPROFILE 'OneDrive')) 'questlist-backups'),
  [int]$Keep = 14
)
$ErrorActionPreference = 'Stop'
$src = Join-Path $Server 'pb_data\backups'
$log = Join-Path $Server 'backup.log'
function Write-Log($msg) { "$(Get-Date -Format s) $msg" | Add-Content -Path $log -Encoding utf8 }

try {
  New-Item -ItemType Directory -Force $Dest | Out-Null
  if (-not (Test-Path $src)) { Write-Log "нет папки $src — бэкапов ещё не было"; exit 0 }
  $copied = 0
  foreach ($f in Get-ChildItem $src -Filter '*.zip') {
    $target = Join-Path $Dest $f.Name
    if (-not (Test-Path $target)) { Copy-Item $f.FullName $target; $copied++ }
  }
  $old = Get-ChildItem $Dest -Filter '*.zip' | Sort-Object LastWriteTime -Descending | Select-Object -Skip $Keep
  $old | Remove-Item
  Write-Log "скопировано: $copied, удалено старых: $(@($old).Count)"
} catch {
  Write-Log "ОШИБКА: $_"
  exit 1
}
