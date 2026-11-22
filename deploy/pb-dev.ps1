# Локальный PocketBase для разработки: отдельные данные в deploy/.pb_dev, порт 8091
# (8090 занят боевым сервером на этом же компе).
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$pb = Join-Path $env:USERPROFILE 'questlist-server\pocketbase.exe'
if (-not (Test-Path $pb)) { throw "Не найден $pb — см. docs/SELF_HOST.md" }
& $pb serve `
  --http=127.0.0.1:8091 `
  --dir="$root\deploy\.pb_dev" `
  --migrationsDir="$root\deploy\pb_migrations" `
  --hooksDir="$root\deploy\pb_hooks" `
  --origins=http://localhost:5173
