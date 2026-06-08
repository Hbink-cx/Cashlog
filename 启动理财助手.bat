@echo off
chcp 65001 >nul
cd /d "%~dp0"

if exist "release\win-unpacked\个人理财助手.exe" (
    start "" "release\win-unpacked\个人理财助手.exe"
) else if exist "release2\win-unpacked\个人理财助手.exe" (
    start "" "release2\win-unpacked\个人理财助手.exe"
) else if exist "node_modules\.bin\electron.cmd" (
    echo 开发模式启动中...
    start "" npx electron . --dev
) else (
    echo.
    echo  [ERROR] 请先构建：npm install ^&^& npm run build:electron
    echo.
    pause
)
