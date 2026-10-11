@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo FinSight Backend is not installed. Follow the first-time setup in README.md.
  pause
  exit /b 1
)
".venv\Scripts\python.exe" "start.py" %*
if errorlevel 1 pause
