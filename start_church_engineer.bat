@echo off
chcp 65001 >nul
title X32 AI Sound Engineer — ChurchMix

echo ====================================================================
echo           X32 AI SOUND ENGINEER — CHURCHMIX CONSOLE
echo ====================================================================
echo  [+] Khoi dong Mock X32 Compact Simulator (UDP 10023)...
echo  [+] Ket noi X32 Client o che do AN TOAN (READ-ONLY)...
echo  [+] Kiem tra Bat bien: DL16 In 11 -^> P16 ONLY (Khoa cung FOH)...
echo  [+] Khoi dong Web Dashboard tai: http://127.0.0.1:8080
echo ====================================================================
echo.

set "PY_CMD="

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set "PY_CMD=python"
) else if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
) else if exist "C:\Python312\python.exe" (
    set "PY_CMD=C:\Python312\python.exe"
) else if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
) else if exist "C:\Python311\python.exe" (
    set "PY_CMD=C:\Python311\python.exe"
)

if "%PY_CMD%"=="" (
    echo [LOI] Khong tim thay Python! Vui long cai dat Python 3.11 hoac 3.12 tu python.org.
    pause
    exit /b 1
)

start "" http://127.0.0.1:8080
"%PY_CMD%" -m uvicorn apps.api.main:app --host 127.0.0.1 --port 8080 --log-level info

pause
