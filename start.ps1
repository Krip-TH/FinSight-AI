$ErrorActionPreference='Stop'
$taskAppRoot = $PSScriptRoot
$taskPython = Join-Path $taskAppRoot '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $taskPython)) { throw 'ยังไม่ได้ติดตั้ง Backend กรุณาดู README' }
& $taskPython -m uvicorn backend.main:app --app-dir $taskAppRoot --host 127.0.0.1 --port 8000
