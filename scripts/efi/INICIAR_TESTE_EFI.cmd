@echo off
setlocal
title NextGen - Efi OAuth mTLS (sem Pix)
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js 20 ou superior nao foi encontrado.
  echo Instale pelo site oficial: https://nodejs.org/
  echo Depois abra este arquivo novamente.
  pause
  exit /b 1
)
echo.
node "%~dp0verify-readonly-oauth-interactive.mjs"
set "RESULT=%errorlevel%"
echo.
echo Codigo final: %RESULT%
echo So envie ao ChatGPT o bloco JSON sem credenciais.
pause
exit /b %RESULT%
