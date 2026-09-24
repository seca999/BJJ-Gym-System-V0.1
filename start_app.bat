@echo off
:: ====================================================================
:: BJJ ACADEMY MANAGEMENT SYSTEM - FAST RUNNER
:: Starts current code in C:\BJJ Academy\Code on port 5555
:: ====================================================================

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$Host.UI.RawUI.WindowTitle = '🥋 BJJ Academy - Local Runner (Port 5555)';" ^
  "$CodeDir = 'C:\BJJ Academy\Code';" ^
  "$DbFile = 'C:\BJJ Academy\Database\bjj_academy.db';" ^
  "$Port = 5555;" ^
  "Write-Host '====================================================================' -ForegroundColor Cyan;" ^
  "Write-Host '       🥋 ARTE SUAVE BJJ ACADEMY - QUICK START (PORT 5555)' -ForegroundColor Yellow;" ^
  "Write-Host '====================================================================' -ForegroundColor Cyan;" ^
  "Write-Host '';" ^
  "Write-Host \"  • Code Directory    : $CodeDir\" -ForegroundColor Gray;" ^
  "Write-Host \"  • Database Location : $DbFile\" -ForegroundColor Gray;" ^
  "Write-Host '';" ^
  "if (-not (Test-Path (Join-Path $CodeDir 'package.json'))) {" ^
  "    Write-Host \"[!] No deployed code found in $CodeDir\" -ForegroundColor Red;" ^
  "    Write-Host 'Please run deploy_and_run.bat first to extract a version.' -ForegroundColor Yellow;" ^
  "    Write-Host '';" ^
  "    Read-Host 'Press Enter to exit';" ^
  "    exit;" ^
  "};" ^
  "Set-Location -Path $CodeDir;" ^
  "if (-not (Test-Path (Join-Path $CodeDir 'node_modules'))) {" ^
  "    Write-Host 'Installing dependencies...' -ForegroundColor Yellow;" ^
  "    cmd.exe /c npm install;" ^
  "};" ^
  "Write-Host \"Starting system on http://localhost:$Port ...\" -ForegroundColor Green;" ^
  "Start-Process \"http://localhost:$Port\";" ^
  "cmd.exe /c \"npx vite --port $Port --host 0.0.0.0\";"
