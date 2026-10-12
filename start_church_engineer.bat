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

start "" http://127.0.0.1:8080
"%LOCALAPPDATA%\Programs\Python\Python312\python.exe" -m uvicorn apps.api.main:app --host 127.0.0.1 --port 8080 --log-level info

pause
