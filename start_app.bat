@echo off
setlocal
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command ^
  "$Port = 5555;" ^
  "$CurrentDir = '%~dp0'.TrimEnd('\');" ^
  "$CodeDir = if (Test-Path 'C:\BJJ Academy\Code\package.json') { 'C:\BJJ Academy\Code' }" ^
  "            elseif (Test-Path (Join-Path $CurrentDir 'Code\package.json')) { Join-Path $CurrentDir 'Code' }" ^
  "            elseif (Test-Path (Join-Path $CurrentDir 'package.json')) { $CurrentDir }" ^
  "            else { 'C:\BJJ Academy\Code' };" ^
  "if (-not (Test-Path $CodeDir)) { New-Item -ItemType Directory -Path $CodeDir -Force | Out-Null };" ^
  "$versionCandidates = @(" ^
  "  'C:\BJJ Academy\Implement\Versions'," ^
  "  'C:\BJJ Academy\Versions'," ^
  "  (Join-Path $CurrentDir 'Implement\Versions')," ^
  "  (Join-Path $CurrentDir 'Versions')," ^
  "  (Join-Path (Split-Path $CurrentDir -Parent) 'Implement\Versions')," ^
  "  (Join-Path (Split-Path $CurrentDir -Parent) 'Versions')" ^
  ") | Where-Object { $_ -and (Test-Path $_) };" ^
  "$latestZip = $null;" ^
  "foreach ($vDir in $versionCandidates) {" ^
  "  $foundZips = @(Get-ChildItem -Path $vDir -Filter '*.zip' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending);" ^
  "  if ($foundZips.Count -gt 0) {" ^
  "    $latestZip = $foundZips[0];" ^
  "    break;" ^
  "  }" ^
  "};" ^
  "$markerFile = Join-Path $CodeDir '.deployed_version_marker';" ^
  "$markerVal = if (Test-Path $markerFile) { (Get-Content $markerFile -Raw).Trim() } else { '' };" ^
  "$shouldDeployZip = $false;" ^
  "if ($latestZip) {" ^
  "  $zipStamp = $latestZip.Name + '|' + $latestZip.LastWriteTimeUtc.Ticks.ToString();" ^
  "  if ($markerVal -ne $zipStamp -or (-not (Test-Path (Join-Path $CodeDir 'package.json')))) {" ^
  "    $shouldDeployZip = $true;" ^
  "  }" ^
  "};" ^
  "$shouldSyncFromCurrent = $false;" ^
  "if (($CurrentDir -ne $CodeDir) -and (Test-Path (Join-Path $CurrentDir 'package.json')) -and (Test-Path (Join-Path $CurrentDir 'src'))) {" ^
  "  $shouldSyncFromCurrent = $true;" ^
  "};" ^
  "$cleanOldSource = {" ^
  "  param($targetDir);" ^
  "  $dbBackup = Join-Path $env:TEMP ('bjj_db_safe_' + [guid]::NewGuid().ToString().Substring(0,8));" ^
  "  New-Item -ItemType Directory -Path $dbBackup -Force | Out-Null;" ^
  "  $liveDbDir = Join-Path $targetDir 'database';" ^
  "  if (Test-Path $liveDbDir) {" ^
  "    Copy-Item -Path $liveDbDir -Destination $dbBackup -Recurse -Force -ErrorAction SilentlyContinue;" ^
  "  };" ^
  "  $liveEnv = Join-Path $targetDir '.env';" ^
  "  if (Test-Path $liveEnv) {" ^
  "    Copy-Item -Path $liveEnv -Destination $dbBackup -Force -ErrorAction SilentlyContinue;" ^
  "  };" ^
  "  $itemsToKeep = @('node_modules', 'database', '.env', '.git', 'start_app.bat', 'stop_app.bat');" ^
  "  Get-ChildItem -Path $targetDir -Force -ErrorAction SilentlyContinue | ForEach-Object {" ^
  "    if ($itemsToKeep -notcontains $_.Name) {" ^
  "      Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue;" ^
  "    }" ^
  "  };" ^
  "  $viteCache = Join-Path $targetDir 'node_modules\.vite';" ^
  "  if (Test-Path $viteCache) {" ^
  "    Remove-Item -LiteralPath $viteCache -Recurse -Force -ErrorAction SilentlyContinue;" ^
  "  };" ^
  "  return $dbBackup;" ^
  "};" ^
  "if ($shouldDeployZip -and $latestZip) {" ^
  "  try {" ^
  "    $backupPath = & $cleanOldSource $CodeDir;" ^
  "    $tempExtract = Join-Path $env:TEMP ('bjj_extract_' + [guid]::NewGuid().ToString().Substring(0,8));" ^
  "    New-Item -ItemType Directory -Path $tempExtract -Force | Out-Null;" ^
  "    $extracted = $false;" ^
  "    try {" ^
  "      tar.exe -xf $latestZip.FullName -C $tempExtract 2>$null;" ^
  "      if (Test-Path (Join-Path $tempExtract 'package.json')) { $extracted = $true; }" ^
  "    } catch {};" ^
  "    if (-not $extracted) {" ^
  "      Expand-Archive -LiteralPath $latestZip.FullName -DestinationPath $tempExtract -Force;" ^
  "    };" ^
  "    $sourceRoot = $tempExtract;" ^
  "    $innerDirs = @(Get-ChildItem -Path $tempExtract -Directory);" ^
  "    if ($innerDirs.Count -eq 1 -and (-not (Test-Path (Join-Path $tempExtract 'package.json')))) {" ^
  "      $sourceRoot = $innerDirs[0].FullName;" ^
  "    };" ^
  "    Get-ChildItem -Path $sourceRoot -Force | ForEach-Object {" ^
  "      $dest = Join-Path $CodeDir $_.Name;" ^
  "      if ($_.Name -eq 'database') {" ^
  "        if (-not (Test-Path (Join-Path $CodeDir 'database\bjj_master.db'))) {" ^
  "          Copy-Item -LiteralPath $_.FullName -Destination $dest -Recurse -Force -ErrorAction SilentlyContinue;" ^
  "        }" ^
  "      } elseif ($_.Name -ne 'node_modules' -and $_.Name -ne '.git') {" ^
  "        Copy-Item -LiteralPath $_.FullName -Destination $dest -Recurse -Force -ErrorAction SilentlyContinue;" ^
  "      }" ^
  "    };" ^
  "    $savedDb = Join-Path $backupPath 'database';" ^
  "    if (Test-Path $savedDb) {" ^
  "      $codeDb = Join-Path $CodeDir 'database';" ^
  "      if (-not (Test-Path $codeDb)) { New-Item -ItemType Directory -Path $codeDb -Force | Out-Null };" ^
  "      Get-ChildItem -Path $savedDb -Force | ForEach-Object {" ^
  "        $destFile = Join-Path $codeDb $_.Name;" ^
  "        if (-not (Test-Path $destFile) -or $_.Length -gt 0) {" ^
  "          Copy-Item -LiteralPath $_.FullName -Destination $destFile -Force -ErrorAction SilentlyContinue;" ^
  "        }" ^
  "      };" ^
  "    };" ^
  "    Set-Content -Path $markerFile -Value ($latestZip.Name + '|' + $latestZip.LastWriteTimeUtc.Ticks.ToString()) -Force;" ^
  "    Remove-Item -LiteralPath $tempExtract -Recurse -Force -ErrorAction SilentlyContinue;" ^
  "    Remove-Item -LiteralPath $backupPath -Recurse -Force -ErrorAction SilentlyContinue;" ^
  "  } catch {}" ^
  "}" ^
  "elseif ($shouldSyncFromCurrent) {" ^
  "  try {" ^
  "    $backupPath = & $cleanOldSource $CodeDir;" ^
  "    Get-ChildItem -Path $CurrentDir -Force | ForEach-Object {" ^
  "      if ($_.Name -ne 'node_modules' -and $_.Name -ne 'database' -and $_.Name -ne '.git') {" ^
  "        Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $CodeDir $_.Name) -Recurse -Force -ErrorAction SilentlyContinue;" ^
  "      }" ^
  "    };" ^
  "    $savedDb = Join-Path $backupPath 'database';" ^
  "    if (Test-Path $savedDb) {" ^
  "      $codeDb = Join-Path $CodeDir 'database';" ^
  "      if (-not (Test-Path $codeDb)) { New-Item -ItemType Directory -Path $codeDb -Force | Out-Null };" ^
  "      Get-ChildItem -Path $savedDb -Force | ForEach-Object {" ^
  "        Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $codeDb $_.Name) -Force -ErrorAction SilentlyContinue;" ^
  "      };" ^
  "    };" ^
  "    Remove-Item -LiteralPath $backupPath -Recurse -Force -ErrorAction SilentlyContinue;" ^
  "  } catch {}" ^
  "}" ^
  "elseif (Test-Path (Join-Path $CodeDir '.git')) {" ^
  "  try {" ^
  "    if (Get-Command 'git' -ErrorAction SilentlyContinue) {" ^
  "      git -C $CodeDir fetch origin main --quiet 2>$null;" ^
  "      $diff = git -C $CodeDir rev-list HEAD..origin/main --count 2>$null;" ^
  "      if ($diff -and [int]$diff -gt 0) {" ^
  "        git -C $CodeDir reset --hard origin/main --quiet 2>$null;" ^
  "        git -C $CodeDir clean -fd -e database -e .env -e node_modules --quiet 2>$null;" ^
  "        $viteCache = Join-Path $CodeDir 'node_modules\.vite';" ^
  "        if (Test-Path $viteCache) { Remove-Item -LiteralPath $viteCache -Recurse -Force -ErrorAction SilentlyContinue; };" ^
  "      }" ^
  "    }" ^
  "  } catch {}" ^
  "};" ^
  "try {" ^
  "  $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue;" ^
  "  if ($conn) {" ^
  "    foreach ($c in $conn) {" ^
  "      if ($c.OwningProcess -gt 0) {" ^
  "        Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue;" ^
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
  "for ($i = 0; $i -lt 20; $i++) {" ^
  "  Start-Sleep -Milliseconds 600;" ^
  "  try {" ^
  "    $testConn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue;" ^
  "    if ($testConn) { $ready = $true; break };" ^
  "  } catch {}" ^
  "};" ^
  "Start-Process \"http://localhost:$Port\";"

exit /b 0
