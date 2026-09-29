@echo off
setlocal
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$Host.UI.RawUI.WindowTitle = '🥋 Stop BJJ Academy Server';" ^
  "$Port = 5555;" ^
  "Write-Host '====================================================================' -ForegroundColor Cyan;" ^
  "Write-Host '            🥋 STOPPING BJJ ACADEMY SERVER (PORT 5555)' -ForegroundColor Yellow;" ^
  "Write-Host '====================================================================' -ForegroundColor Cyan;" ^
  "Write-Host '';" ^
  "$killed = 0;" ^
  "try {" ^
  "  $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue;" ^
  "  if ($connections) {" ^
  "    foreach ($conn in $connections) {" ^
  "      $pId = $conn.OwningProcess;" ^
  "      if ($pId -gt 0) {" ^
  "        Write-Host \"  Stopping process on port $Port (PID: $pId)...\" -ForegroundColor Yellow;" ^
  "        Stop-Process -Id $pId -Force -ErrorAction SilentlyContinue;" ^
  "        $killed++;" ^
  "      }" ^
  "    }" ^
  "  }" ^
  "} catch {};" ^
  "Get-Process -Name 'node' -ErrorAction SilentlyContinue | ForEach-Object {" ^
  "  try {" ^
  "    $procId = $_.Id;" ^
  "    $cmd = (Get-CimInstance Win32_Process -Filter \"ProcessId = $procId\" -ErrorAction SilentlyContinue).CommandLine;" ^
  "    if ($cmd -match 'vite|5555|bjj-academy|BJJ Academy|react-example') {" ^
  "      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue;" ^
  "      $killed++;" ^
  "    }" ^
  "  } catch {}" ^
  "};" ^
  "Write-Host '';" ^
  "if ($killed -gt 0) {" ^
  "  Write-Host '  [OK] BJJ Academy background server stopped successfully.' -ForegroundColor Green;" ^
  "} else {" ^
  "  Write-Host '  [OK] No running server found. Port 5555 is already free.' -ForegroundColor Green;" ^
  "};" ^
  "Write-Host '  [OK] Local database records are safe.' -ForegroundColor Green;" ^
  "Write-Host '';" ^
  "Start-Sleep -Seconds 2;"

exit /b 0
