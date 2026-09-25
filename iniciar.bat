@echo off
title Servidor Hotel (Nube)
echo =======================================================
echo     Iniciando Servidor del Hotel (Conectado a Supabase)
echo =======================================================
echo.
start http://localhost:3000
node server.js
pause
