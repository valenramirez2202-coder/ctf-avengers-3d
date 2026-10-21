@echo off
rem ============================================================
rem  Captura la Bandera - Avengers Edition 3D
rem  Arranca servidor HTTP + WebSocket usando el Node de Laragon.
rem  Uso:  start.bat  [puerto]        (por defecto 3000)
rem ============================================================
setlocal
cd /d "%~dp0"

set "NODE_EXE="
if exist "C:\laragon\bin\nodejs\node-v22\node.exe" set "NODE_EXE=C:\laragon\bin\nodejs\node-v22\node.exe"
if not defined NODE_EXE if exist "C:\laragon\bin\nodejs\node-v20\node.exe" set "NODE_EXE=C:\laragon\bin\nodejs\node-v20\node.exe"
if not defined NODE_EXE if exist "C:\laragon\bin\nodejs\node-v18\node.exe" set "NODE_EXE=C:\laragon\bin\nodejs\node-v18\node.exe"
if not defined NODE_EXE (
  where node >nul 2>nul && set "NODE_EXE=node"
)
if not defined NODE_EXE (
  echo.
  echo  [ERROR] No se encontro Node.js.
  echo  Instala Node o edita NODE_EXE en este archivo.
  echo.
  pause
  exit /b 1
)

set "PORT=3000"
if not "%~1"=="" set "PORT=%~1"

echo.
echo  Arrancando Captura la Bandera 3D en el puerto %PORT% ...
echo.
"%NODE_EXE%" server.js %PORT%
pause
