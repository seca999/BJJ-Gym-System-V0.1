@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo  Ravens BJJ Academy - GitHub Auto-Version & Push Tool
echo ========================================================
echo.

set "COMMIT_MSG=%~1"

echo [1/3] Generating new unique Version Code and Build Number...
node scripts/bump_version.js "%COMMIT_MSG%"
if errorlevel 1 (
  echo Error: Failed to bump version code!
  pause
  exit /b 1
)

echo.
echo [2/3] Staging changes and committing...
git add -A

if "%COMMIT_MSG%"=="" (
  set /p COMMIT_MSG="Enter commit description / improvements summary (press Enter for default): "
)

if "%COMMIT_MSG%"=="" (
  set COMMIT_MSG=Continuous deployment update with improvements
)

git commit -m "%COMMIT_MSG%"

echo.
echo [3/3] Pushing to GitHub (origin main)...
git push origin main
if errorlevel 1 (
  echo.
  echo Git push failed. Please verify your internet connection or git credentials.
  pause
  exit /b 1
)

echo.
echo ========================================================
echo  SUCCESS: New Version Code published to GitHub!
echo  Your users can now click "Check for Updates" to see:
echo   - The Current vs New Version comparison
echo   - The list of improvements between each version
echo ========================================================
pause
