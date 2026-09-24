@echo off
setlocal
:: Launches the PowerShell health check script
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$Host.UI.RawUI.WindowTitle = '🥋 BJJ Academy - Health Check';" ^
  "$BaseDir = 'C:\BJJ Academy';" ^
  "$DbDir = Join-Path $BaseDir 'Database';" ^
  "$DbFile = Join-Path $DbDir 'bjj_academy.db';" ^
  "$VersionsDir = Join-Path $BaseDir 'Implement\Versions';" ^
  "$CodeDir = Join-Path $BaseDir 'Code';" ^
  "$Port = 5555;" ^
  "Write-Host '====================================================================' -ForegroundColor Cyan;" ^
  "Write-Host '          🥋 BJJ ACADEMY SYSTEM - ENVIRONMENT HEALTH CHECK' -ForegroundColor Yellow;" ^
  "Write-Host '====================================================================' -ForegroundColor Cyan;" ^
  "Write-Host '';" ^
  "$errors = 0;" ^
  "$warnings = 0;" ^
  "Write-Host '[1/6] Checking Node.js runtime...' -ForegroundColor Cyan;" ^
  "try {" ^
  "  $nodeVer = (node -v 2>$null).Trim();" ^
  "  if ($nodeVer) { Write-Host \"      [OK] Node.js is installed: $nodeVer\" -ForegroundColor Green }" ^
  "  else { throw 'Node not found' }" ^
  "} catch {" ^
  "  Write-Host '      [FAILED] Node.js is NOT found in PATH!' -ForegroundColor Red;" ^
  "  Write-Host '      Download & install Node.js LTS from: https://nodejs.org' -ForegroundColor Yellow;" ^
  "  $errors++;" ^
  "};" ^
  "Write-Host '[2/6] Checking NPM package manager...' -ForegroundColor Cyan;" ^
  "try {" ^
  "  $npmVer = (npm -v 2>$null).Trim();" ^
  "  if ($npmVer) { Write-Host \"      [OK] NPM is installed: v$npmVer\" -ForegroundColor Green }" ^
  "  else { throw 'NPM not found' }" ^
  "} catch {" ^
  "  Write-Host '      [FAILED] NPM is NOT found in PATH!' -ForegroundColor Red;" ^
  "  $errors++;" ^
  "};" ^
  "Write-Host '[3/6] Checking Python...' -ForegroundColor Cyan;" ^
  "try {" ^
  "  $pyVer = (python --version 2>$null).Trim();" ^
  "  if ($pyVer) { Write-Host \"      [OK] Python is installed: $pyVer\" -ForegroundColor Green }" ^
  "  else { Write-Host '      [INFO] Python is not installed (Optional - not required for Vite/React frontend).' -ForegroundColor Gray }" ^
  "} catch {" ^
  "  Write-Host '      [INFO] Python is not installed (Optional).' -ForegroundColor Gray;" ^
  "};" ^
  "Write-Host \"[4/6] Checking Port $Port availability...\" -ForegroundColor Cyan;" ^
  "$busy = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue;" ^
  "if ($busy) {" ^
  "  Write-Host \"      [WARNING] Port $Port is currently IN USE by Process ID (PID): $($busy.OwningProcess[0])\" -ForegroundColor Yellow;" ^
  "  Write-Host '      Run stop_and_cleanup.bat to free up port $Port' -ForegroundColor Gray;" ^
  "  $warnings++;" ^
  "} else {" ^
  "  Write-Host \"      [OK] Port $Port is free and available.\" -ForegroundColor Green;" ^
  "};" ^
  "Write-Host '[5/6] Verifying directory structure...' -ForegroundColor Cyan;" ^
  "if (-not (Test-Path $BaseDir)) { New-Item -ItemType Directory -Path $BaseDir -Force | Out-Null };" ^
  "if (-not (Test-Path $DbDir)) { New-Item -ItemType Directory -Path $DbDir -Force | Out-Null };" ^
  "if (-not (Test-Path $VersionsDir)) { New-Item -ItemType Directory -Path $VersionsDir -Force | Out-Null };" ^
  "if (-not (Test-Path $CodeDir)) { New-Item -ItemType Directory -Path $CodeDir -Force | Out-Null };" ^
  "Write-Host \"      [OK] Base folder: $BaseDir\" -ForegroundColor Green;" ^
  "Write-Host \"      [OK] Database folder: $DbDir\" -ForegroundColor Green;" ^
  "if (Test-Path $DbFile) { Write-Host \"           Database file exists: $DbFile\" -ForegroundColor White }" ^
  "else { Write-Host '           (Database file will be created automatically on first run)' -ForegroundColor Gray };" ^
  "Write-Host \"      [OK] Versions folder: $VersionsDir\" -ForegroundColor Green;" ^
  "$zips = Get-ChildItem -Path $VersionsDir -Filter '*.zip' -ErrorAction SilentlyContinue;" ^
  "Write-Host \"           Found $($zips.Count) ZIP file(s) available.\" -ForegroundColor White;" ^
  "Write-Host '[6/6] Checking NPM registry connectivity...' -ForegroundColor Cyan;" ^
  "try {" ^
  "  $ping = Test-Connection -ComputerName registry.npmjs.org -Count 1 -Quiet -ErrorAction SilentlyContinue;" ^
  "  if ($ping) { Write-Host '      [OK] NPM Registry (registry.npmjs.org) is reachable.' -ForegroundColor Green }" ^
  "  else { Write-Host '      [INFO] Ping to NPM registry timed out (installation may use cached packages).' -ForegroundColor Gray }" ^
  "} catch {" ^
  "  Write-Host '      [INFO] Registry check skipped.' -ForegroundColor Gray;" ^
  "};" ^
  "Write-Host '';" ^
  "Write-Host '====================================================================' -ForegroundColor Cyan;" ^
  "if ($errors -eq 0) {" ^
  "  Write-Host ' STATUS: HEALTHY - ALL PREREQUISITES MET!' -ForegroundColor Green;" ^
  "  Write-Host ' You are ready to run deploy_and_run.bat' -ForegroundColor Green;" ^
  "} else {" ^
  "  Write-Host \" STATUS: $errors CRITICAL ERROR(S) DETECTED!\" -ForegroundColor Red;" ^
  "  Write-Host ' Please install the missing components listed above.' -ForegroundColor Yellow;" ^
  "};" ^
  "Write-Host '====================================================================' -ForegroundColor Cyan;" ^
  "Write-Host '';" ^
  "Read-Host 'Press Enter to exit';"
