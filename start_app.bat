@echo off
setlocal
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command ^
  "$Port = 5555;" ^
  "$CurrentDir = '%~dp0'.TrimEnd('\');" ^
  "$CodeDir = if (Test-Path (Join-Path $CurrentDir 'package.json')) { $CurrentDir }" ^
  "            elseif (Test-Path 'C:\BJJ Academy\Code\package.json') { 'C:\BJJ Academy\Code' }" ^
  "            elseif (Test-Path (Join-Path $CurrentDir 'Code\package.json')) { Join-Path $CurrentDir 'Code' }" ^
  "            else { $CurrentDir };" ^
  "$VersionsDir = if (Test-Path 'C:\BJJ Academy\Implement\Versions') { 'C:\BJJ Academy\Implement\Versions' }" ^
  "                elseif (Test-Path (Join-Path $CurrentDir 'Implement\Versions')) { Join-Path $CurrentDir 'Implement\Versions' }" ^
  "                else { $null };" ^
  "if (-not (Test-Path (Join-Path $CodeDir 'package.json')) -and $VersionsDir -and (Test-Path $VersionsDir)) {" ^
  "  $zips = @(Get-ChildItem -Path $VersionsDir -Filter '*.zip' | Sort-Object LastWriteTime -Descending);" ^
  "  if ($zips.Count -gt 0) {" ^
  "    try {" ^
  "      if (-not (Test-Path $CodeDir)) { New-Item -ItemType Directory -Path $CodeDir -Force | Out-Null };" ^
  "      Expand-Archive -LiteralPath $zips[0].FullName -DestinationPath $CodeDir -Force;" ^
  "    } catch {}" ^
  "  }" ^
  "};" ^
  "try {" ^
  "  $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue;" ^
  "  if ($conn) {" ^
  "    foreach ($c in $conn) {" ^
  "      if ($c.OwningProcess -gt 0) {" ^
  "        Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue" ^
  "      }" ^
  "    }" ^
  "  }" ^
  "} catch {};" ^
  "Set-Location -Path $CodeDir;" ^
  "$needsInstall = (-not (Test-Path (Join-Path $CodeDir 'node_modules\vite'))) -or (-not (Test-Path (Join-Path $CodeDir 'node_modules\html-to-image')));" ^
  "if ($needsInstall) {" ^
  "  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm.cmd install --no-audit --no-fund' -WorkingDirectory $CodeDir -Wait -WindowStyle Hidden;" ^
  "};" ^
  "Start-Process -FilePath 'cmd.exe' -ArgumentList \"/c npm.cmd run dev -- --port $Port\" -WorkingDirectory $CodeDir -WindowStyle Hidden;" ^
  "$ready = $false;" ^
  "for ($i = 0; $i -lt 15; $i++) {" ^
  "  Start-Sleep -Milliseconds 600;" ^
  "  try {" ^
  "    $testConn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue;" ^
  "    if ($testConn) { $ready = $true; break };" ^
  "  } catch {}" ^
  "};" ^
  "Start-Process \"http://localhost:$Port\";"

exit /b 0
