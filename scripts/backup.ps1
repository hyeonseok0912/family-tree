$ErrorActionPreference = 'Stop'
$taskRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $taskRoot
& node (Join-Path $PSScriptRoot 'database.cjs') backup
if ($LASTEXITCODE -ne 0) { throw 'Database backup failed.' }
# Keep every snapshot; remove old copies manually only after checking recovery needs.
