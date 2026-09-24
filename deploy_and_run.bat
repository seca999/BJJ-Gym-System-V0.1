@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$Host.UI.RawUI.WindowTitle = '🥋 BJJ Academy - Version Deployer & Runner (Port 5555)';" ^
  "$BaseDir = 'C:\BJJ Academy';" ^
  "$VersionsDir = Join-Path $BaseDir 'Implement\Versions';" ^
  "$CodeDir = Join-Path $BaseDir 'Code';" ^
  "$DbDir = Join-Path $BaseDir 'Database';" ^
  "$DbFile = Join-Path $DbDir 'bjj_academy.db';" ^
  "$Port = 5555;" ^
  "Write-Host '====================================================================' -ForegroundColor Cyan;" ^
  "Write-Host '              🥋 BJJ ACADEMY SYSTEM - VERSION DEPLOYER' -ForegroundColor Yellow;" ^
  "Write-Host '====================================================================' -ForegroundColor Cyan;" ^
  "Write-Host '';" ^
  "Write-Host ' [Configured Paths]';" ^
  "Write-Host \"  • Versions Folder : $VersionsDir\" -ForegroundColor Gray;" ^
  "Write-Host \"  • Target Code     : $CodeDir\" -ForegroundColor Gray;" ^
  "Write-Host \"  • Active Database : $DbFile\" -ForegroundColor Gray;" ^
  "Write-Host \"  • Local Web Port  : $Port\" -ForegroundColor Gray;" ^
  "Write-Host '';" ^
  "if (-not (Test-Path $VersionsDir)) { New-Item -ItemType Directory -Path $VersionsDir -Force | Out-Null };" ^
  "if (-not (Test-Path $DbDir)) { New-Item -ItemType Directory -Path $DbDir -Force | Out-Null };" ^
  "if (-not (Test-Path $CodeDir)) { New-Item -ItemType Directory -Path $CodeDir -Force | Out-Null };" ^
  "$zipFiles = @(Get-ChildItem -Path $VersionsDir -Filter '*.zip' | Sort-Object LastWriteTime -Descending);" ^
  "if ($zipFiles.Count -eq 0) {" ^
  "    Write-Host \"[!] No ZIP files found in: $VersionsDir\" -ForegroundColor Red;" ^
  "    Write-Host 'Please place your exported zip files inside the Versions folder.' -ForegroundColor Yellow;" ^
  "    Write-Host '';" ^
  "    Read-Host 'Press Enter to open the Versions folder';" ^
  "    Start-Process 'explorer.exe' $VersionsDir;" ^
  "    exit;" ^
  "};" ^
  "Write-Host '--------------------------------------------------------------------' -ForegroundColor DarkGray;" ^
  "Write-Host ' Available Versions in Versions Folder:' -ForegroundColor Green;" ^
  "Write-Host '--------------------------------------------------------------------' -ForegroundColor DarkGray;" ^
  "for ($i = 0; $i -lt $zipFiles.Count; $i++) {" ^
  "    $num = $i + 1;" ^
  "    $fname = $zipFiles[$i].Name;" ^
  "    $fdate = $zipFiles[$i].LastWriteTime.ToString('yyyy-MM-dd HH:mm');" ^
  "    Write-Host \"  [$num] $fname  ($fdate)\" -ForegroundColor White;" ^
  "};" ^
  "Write-Host '';" ^
  "$choice = Read-Host \"Enter the number of the version you want to deploy (1-$($zipFiles.Count)) [Default=1]\";" ^
  "if ([string]::IsNullOrWhiteSpace($choice)) { $choice = '1' };" ^
  "$choiceIndex = 0;" ^
  "if (-not [int]::TryParse($choice, [ref]$choiceIndex) -or $choiceIndex -lt 1 -or $choiceIndex -gt $zipFiles.Count) {" ^
  "    Write-Host \"[!] Invalid selection '$choice'. Aborting.\" -ForegroundColor Red;" ^
  "    Read-Host 'Press Enter to exit';" ^
  "    exit;" ^
  "};" ^
  "$selectedZip = $zipFiles[$choiceIndex - 1];" ^
  "Write-Host '';" ^
  "Write-Host '====================================================================' -ForegroundColor Cyan;" ^
  "Write-Host \" Deploying: $($selectedZip.Name)\" -ForegroundColor Green;" ^
  "Write-Host '====================================================================' -ForegroundColor Cyan;" ^
  "Write-Host '';" ^
  "Write-Host '[1/4] Preparing Code folder (preserving node_modules cache)...' -ForegroundColor Cyan;" ^
  "if (Test-Path $CodeDir) { Get-ChildItem -Path $CodeDir -Exclude 'node_modules' | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue };" ^
  "Write-Host \"[2/4] Extracting '$($selectedZip.Name)'...\" -ForegroundColor Cyan;" ^
  "try {" ^
  "  Add-Type -AssemblyName System.IO.Compression.FileSystem;" ^
  "  $zip = [System.IO.Compression.ZipFile]::OpenRead($selectedZip.FullName);" ^
  "  foreach ($entry in $zip.Entries) {" ^
  "    if ([string]::IsNullOrWhiteSpace($entry.Name)) { continue };" ^
  "    $sanitized = $entry.FullName -replace '^[a-zA-Z]:\\\\', '' -replace '^[a-zA-Z]:/', '';" ^
  "    $sanitized = $sanitized -replace '[:\*\?\"\"<>\|]', '_';" ^
  "    $targetFile = [System.IO.Path]::Combine($CodeDir, $sanitized);" ^
  "    $targetDir = [System.IO.Path]::GetDirectoryName($targetFile);" ^
  "    if (-not (Test-Path $targetDir)) { [System.IO.Directory]::CreateDirectory($targetDir) | Out-Null };" ^
  "    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $targetFile, $true);" ^
  "  };" ^
  "  $zip.Dispose();" ^
  "} catch {" ^
  "  Write-Host \"      Falling back to standard Expand-Archive...\" -ForegroundColor Gray;" ^
  "  try { Expand-Archive -LiteralPath $selectedZip.FullName -DestinationPath $CodeDir -Force } catch { Write-Host \"[!] Extraction notice: $_\" -ForegroundColor Yellow };" ^
  "};" ^
  "$extractedDirs = @(Get-ChildItem -Path $CodeDir -Directory | Where-Object { $_.Name -ne 'node_modules' });" ^
  "$extractedFiles = @(Get-ChildItem -Path $CodeDir -File);" ^
  "if ($extractedFiles.Count -eq 0 -and $extractedDirs.Count -eq 1) {" ^
  "    $nestedFolder = $extractedDirs[0].FullName;" ^
  "    Write-Host '      Adjusting nested directory hierarchy...' -ForegroundColor DarkGray;" ^
  "    Get-ChildItem -Path $nestedFolder | Move-Item -Destination $CodeDir -Force;" ^
  "    Remove-Item -Path $nestedFolder -Recurse -Force -ErrorAction SilentlyContinue;" ^
  "};" ^
  "Write-Host '[3/4] Checking dependencies and build files...' -ForegroundColor Cyan;" ^
  "if (-not (Test-Path (Join-Path $CodeDir 'package.json'))) {" ^
  "    Write-Host \"[!] ERROR: package.json not found in $CodeDir!\" -ForegroundColor Red;" ^
  "    Read-Host 'Press Enter to exit';" ^
  "    exit;" ^
  "};" ^
  "Set-Location -Path $CodeDir;" ^
  "$hasVite = Test-Path (Join-Path $CodeDir 'node_modules\vite');" ^
  "if (-not $hasVite) {" ^
  "    Write-Host '      Installing node_modules dependencies (fast mode)...' -ForegroundColor Yellow;" ^
  "    cmd.exe /c npm install --no-audit --no-fund --progress=false;" ^
  "} else {" ^
  "    Write-Host '      [OK] node_modules detected and ready.' -ForegroundColor Green;" ^
  "};" ^
  "Write-Host \"[4/4] Freeing Port $Port and launching system...\" -ForegroundColor Cyan;" ^
  "try {" ^
  "  $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue;" ^
  "  if ($connections) {" ^
  "    foreach ($conn in $connections) {" ^
  "      $pId = $conn.OwningProcess;" ^
  "      if ($pId -gt 0) { Stop-Process -Id $pId -Force -ErrorAction SilentlyContinue }" ^
  "    }" ^
  "  }" ^
  "} catch {};" ^
  "Write-Host '====================================================================' -ForegroundColor Green;" ^
  "Write-Host \"  🥋 System Live at   : http://localhost:$Port\" -ForegroundColor Yellow;" ^
  "Write-Host \"  📁 Active Database  : $DbFile\" -ForegroundColor Yellow;" ^
  "Write-Host '====================================================================' -ForegroundColor Green;" ^
  "Write-Host '';" ^
  "Start-Process \"http://localhost:$Port\";" ^
  "cmd.exe /c \"npx vite --port $Port --host 0.0.0.0\";"
