$ErrorActionPreference='Stop'
$taskAppRoot = $PSScriptRoot
$taskPython = Join-Path $taskAppRoot '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $taskPython)) { throw 'Backend is not installed. Follow README.md first-time setup.' }
& $taskPython (Join-Path $taskAppRoot 'start.py') @args
exit $LASTEXITCODE
