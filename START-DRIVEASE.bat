@echo off
setlocal
cd /d "%~dp0"
title DrivEase Launcher

echo ==========================================
echo              DRIVEASE LAUNCHER
echo ==========================================

if not exist "server\.env" (
  echo [SETUP NEEDED] server\.env is missing.
  echo Create server\.env by copying server\.env.example and entering your MySQL settings.
  echo See QUICK-START.txt for the exact required values.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing frontend packages...
  call npm.cmd install --no-audit --no-fund
  if errorlevel 1 goto error
)
if not exist "server\node_modules" (
  echo Installing backend packages...
  pushd server
  call npm.cmd install --no-audit --no-fund
  if errorlevel 1 (popd & goto error)
  popd
)

echo Starting backend in a new window...
start "DrivEase Backend" cmd /k "cd /d "%~dp0server" && npm.cmd start"
timeout /t 3 /nobreak >nul
echo Starting frontend in a new window...
start "DrivEase Frontend" cmd /k "cd /d "%~dp0" && npm.cmd run dev -- --host 127.0.0.1"
timeout /t 3 /nobreak >nul
echo.
echo DrivEase should open at http://localhost:8444/
start "" "http://localhost:8444/"
echo Keep both terminal windows open while testing.
pause
exit /b 0

:error
echo.
echo Installation failed. Check the error above and make sure Node.js is installed.
pause
exit /b 1
