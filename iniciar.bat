@echo off
cd /d "%~dp0"
title Servidor Hotel (Local + BD Nube)
echo =======================================================
echo   Servidor del Hotel - Local conectado a Supabase
echo =======================================================
echo.

if not exist node_modules (
  echo Instalando dependencias...
  call npm install
  echo.
)

if not exist .env (
  echo ERROR: Falta el archivo .env con DATABASE_URL.
  pause
  exit /b 1
)

start "" cmd /c "timeout /t 3 >nul & start http://localhost:3000"
node server.js
pause
