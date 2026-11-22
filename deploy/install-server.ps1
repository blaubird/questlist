# Ставит/обновляет боевой PocketBase на этом компе. Запускать в PowerShell ОТ ИМЕНИ АДМИНИСТРАТОРА:
#   pwsh -File deploy\install-server.ps1 -PagesOrigin https://<ник>.github.io
# Скрипт идемпотентный: повторный запуск копирует свежие миграции/хуки и перезапускает сервер.
param(
  [Parameter(Mandatory)][string]$PagesOrigin,
  [string]$Server = (Join-Path $env:USERPROFILE 'questlist-server')
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$pb = Join-Path $Server 'pocketbase.exe'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw 'Запусти PowerShell от имени администратора.' }
if (-not (Test-Path $pb)) { throw "Не найден $pb" }
if ($PagesOrigin -notmatch '^https://[a-z0-9-]+\.github\.io$') { throw "Странный origin: $PagesOrigin" }

# 1. Миграции и хуки — копия из репозитория (боевой сервер не зависит от рабочей копии).
foreach ($d in 'pb_migrations', 'pb_hooks') {
  $to = Join-Path $Server $d
  New-Item -ItemType Directory -Force $to | Out-Null
  Get-ChildItem $to -File | Remove-Item
  Copy-Item (Join-Path $repo "deploy\$d\*.js") $to
}
Copy-Item (Join-Path $repo 'deploy\backup.ps1') $Server -Force

# 2. Сервер: при запуске системы, от SYSTEM, без окна, перезапуск при падении. Только 127.0.0.1.
$name = 'Questlist PocketBase'
$pbArgs = @(
  'serve', '--http=127.0.0.1:8090',
  "--dir=`"$Server\pb_data`"",
  "--migrationsDir=`"$Server\pb_migrations`"",
  "--hooksDir=`"$Server\pb_hooks`"",
  "--origins=$PagesOrigin"
) -join ' '
$action = New-ScheduledTaskAction -Execute $pb -Argument $pbArgs -WorkingDirectory $Server
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Stop-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
Get-Process pocketbase -ErrorAction SilentlyContinue | Where-Object Path -eq $pb | Stop-Process -Force
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName $name

# 3. Бэкап в облако: от текущего пользователя (нужен доступ к его OneDrive), раз в день и при входе.
$bname = 'Questlist Backup'
$me = "$env:USERDOMAIN\$env:USERNAME"
$baction = New-ScheduledTaskAction -Execute 'pwsh.exe' `
  -Argument "-NoProfile -WindowStyle Hidden -File `"$Server\backup.ps1`""
$btriggers = @((New-ScheduledTaskTrigger -Daily -At '04:00'), (New-ScheduledTaskTrigger -AtLogOn -User $me))
$bprincipal = New-ScheduledTaskPrincipal -UserId $me -LogonType Interactive
$bsettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $bname -Action $baction -Trigger $btriggers -Principal $bprincipal -Settings $bsettings -Force | Out-Null

# 4. Проверка.
$ok = $false
for ($i = 0; $i -lt 30 -and -not $ok; $i++) {
  Start-Sleep -Milliseconds 500
  try { $ok = (Invoke-WebRequest 'http://127.0.0.1:8090/api/health' -TimeoutSec 2).StatusCode -eq 200 } catch {}
}
if ($ok) { 'PocketBase запущен: http://127.0.0.1:8090/_/' } else { throw 'PocketBase не ответил — смотри Планировщик заданий.' }
