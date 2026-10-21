@echo off
rem ============================================================
rem  Publica el juego en Internet con un tunel temporal de
rem  Cloudflare (trycloudflare.com) y abre el navegador.
rem  Requiere tener cloudflared instalado.
rem    winget install --id Cloudflare.cloudflared
rem ============================================================
setlocal
cd /d "%~dp0"

set "PORT=3000"
if not "%~1"=="" set "PORT=%~1"

where cloudflared >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [ERROR] No encontre cloudflared.
  echo  Instalalo con:  winget install --id Cloudflare.cloudflared
  echo  o descargalo de https://github.com/cloudflare/cloudflared/releases
  echo.
  pause
  exit /b 1
)

echo.
echo  Iniciando tunel hacia http://localhost:%PORT% ...
echo  Busca la linea "trycloudflare.com" en la salida de abajo.
echo.
cloudflared tunnel --url http://localhost:%PORT%
pause
