@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale o Node.js 20 ou superior.
  pause
  exit /b 1
)
call node --test test/calculos.test.js test/banco.test.js test/official.test.js test/pwa.test.js
if errorlevel 1 pause & exit /b 1
call npm run build
echo.
echo Arquivo criado em dist\diario-escolar-offline.html
pause
