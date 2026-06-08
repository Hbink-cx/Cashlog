@echo off
title 个人理财助手
cd /d "%~dp0release\win-unpacked"

echo 正在启动个人理财助手...
start "" "electron.exe"

:: 等待窗口出现
timeout /t 3 /nobreak >nul

:: 检查是否成功启动
tasklist /FI "IMAGENAME eq electron.exe" 2>nul | find /i "electron.exe" >nul
if %errorlevel% equ 0 (
    echo ✅ 个人理财助手已启动
) else (
    echo ❌ 启动失败，请检查 release\win-unpacked\ 目录是否完整
    pause
)
