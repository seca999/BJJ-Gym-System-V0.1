@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$Host.UI.RawUI.WindowTitle = '🥋 BJJ Academy - Stop Server & Cleanup Tool';" ^
  "$BaseDir = 'C:\BJJ Academy';" ^
  "$CodeDir = Join-Path $BaseDir 'Code';" ^
  "$DbDir = Join-Path $BaseDir 'Database';" ^
  "$DbFile = Join-Path $DbDir 'bjj_academy.db';" ^
  "$Port = 5555;" ^
  "Write-Host '====================================================================' -ForegroundColor Cyan;" ^
  "Write-Host '         🥋 BJJ ACADEMY SYSTEM - STOP SERVER & CLEANUP TOOL' -ForegroundColor Yellow;" ^
  "Write-Host '====================================================================' -ForegroundColor Cyan;" ^
  "Write-Host '';" ^
  "Write-Host \"  • Target Port     : $Port\" -ForegroundColor Gray;" ^
  "Write-Host \"  • Code Directory  : $CodeDir\" -ForegroundColor Gray;" ^
  "Write-Host \"  • Safe Database   : $DbFile (Will NEVER be touched)\" -ForegroundColor Green;" ^
  "Write-Host '';" ^
  "Write-Host '[1/3] Checking PM2 process manager...' -ForegroundColor Cyan;" ^
  "if (Get-Command 'pm2' -ErrorAction SilentlyContinue) {" ^
  "  try { pm2 stop all 2>$null; pm2 delete all 2>$null; Write-Host '      [OK] PM2 instances cleared.' -ForegroundColor Green } catch {}" ^
  "} else { Write-Host '      [INFO] PM2 not installed (skipped).' -ForegroundColor Gray };" ^
  "Write-Host '';" ^
  "Write-Host \"[2/3] Checking and freeing Port $Port ...\" -ForegroundColor Cyan;" ^
  "$killed = 0;" ^
  "try {" ^
  "  $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue;" ^
  "  if ($connections) {" ^
  "    foreach ($conn in $connections) {" ^
  "      $pId = $conn.OwningProcess;" ^
  "      if ($pId -gt 0) {" ^
  "        Write-Host \"      Terminating process on port $Port (PID: $pId)...\" -ForegroundColor Yellow;" ^
  "        Stop-Process -Id $pId -Force -ErrorAction SilentlyContinue;" ^
  "        $killed++;" ^
  "      }" ^
  "    }" ^
  "  }" ^
  "} catch {};" ^
  "Get-Process -Name 'node' -ErrorAction SilentlyContinue | ForEach-Object {" ^
  "  try { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue; $killed++ } catch {}" ^
  "};" ^
  "if ($killed -gt 0) { Write-Host \"      [OK] Stopped $killed running process(es).\" -ForegroundColor Green }" ^
  "else { Write-Host \"      [OK] Port $Port is free.\" -ForegroundColor Green };" ^
  "Write-Host '';" ^
  "Write-Host '[3/3] Code Directory Maintenance' -ForegroundColor Cyan;" ^
  "Write-Host '--------------------------------------------------------------------' -ForegroundColor DarkGray;" ^
  "Write-Host ' Choose an option:' -ForegroundColor White;" ^
  "Write-Host '   [1] Stop Server only (Keep Code & node_modules as-is)' -ForegroundColor Yellow;" ^
  "Write-Host '   [2] Clean Code files (Keep node_modules cache for fast re-deploy)' -ForegroundColor Yellow;" ^
  "Write-Host '   [3] Full Reset (Delete entire Code folder to fix stuck installs)' -ForegroundColor Yellow;" ^
  "Write-Host '   [4] Cancel / Exit' -ForegroundColor Gray;" ^
  "Write-Host '--------------------------------------------------------------------' -ForegroundColor DarkGray;" ^
  "Write-Host '';" ^
  "$opt = Read-Host 'Enter choice (1-4) [Default=1]';" ^
  "if ([string]::IsNullOrWhiteSpace($opt)) { $opt = '1' };" ^
  "switch ($opt) {" ^
  "  '2' {" ^
  "    Write-Host \"Cleaning code files in $CodeDir (preserving node_modules)...\" -ForegroundColor Yellow;" ^
  "    if (Test-Path $CodeDir) { Get-ChildItem -Path $CodeDir -Exclude 'node_modules' | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue };" ^
  "    Write-Host '      [OK] Code files cleaned.' -ForegroundColor Green;" ^
  "  }" ^
  "  '3' {" ^
  "    Write-Host \"Performing FULL RESET of $CodeDir ...\" -ForegroundColor Yellow;" ^
  "    if (Test-Path $CodeDir) { Remove-Item -Path $CodeDir -Recurse -Force -ErrorAction SilentlyContinue };" ^
  "    New-Item -ItemType Directory -Path $CodeDir -Force | Out-Null;" ^
  "    Write-Host '      [OK] Code folder completely reset.' -ForegroundColor Green;" ^
  "  }" ^
  "  Default {" ^
  "    Write-Host 'Server stopped. Code folder left untouched.' -ForegroundColor Green;" ^
  "  }" ^
  "};" ^
  "Write-Host '';" ^
  "Write-Host '====================================================================' -ForegroundColor Cyan;" ^
  "Write-Host ' CLEANUP COMPLETE!' -ForegroundColor Green;" ^
  "Write-Host \" Your database at '$DbFile' was preserved.\" -ForegroundColor White;" ^
  "Write-Host '====================================================================' -ForegroundColor Cyan;" ^
  "Write-Host '';" ^
  "Read-Host 'Press Enter to exit';"
