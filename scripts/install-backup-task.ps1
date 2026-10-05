$ErrorActionPreference = 'Stop'
$taskScript = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'backup.ps1'))
if (-not (Test-Path -LiteralPath $taskScript)) { throw 'Backup script missing.' }
$taskName = 'FamilyTreeDailyBackup'
$taskCommand = 'powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $taskScript + '"'
& schtasks.exe /Create /TN $taskName /TR $taskCommand /SC DAILY /ST 03:00 /F
if ($LASTEXITCODE -ne 0) { throw 'Could not install scheduled task. Run this script from your Windows account.' }
Write-Output 'Daily backup task installed for 03:00 local time. It runs while this Windows account is logged in.'
