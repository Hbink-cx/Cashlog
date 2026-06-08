@echo off
chcp 65001 >nul
cd /d "%~dp0"

if exist "release\win-unpacked\个人理财助手.exe" (
    start "" "release\win-unpacked\个人理财助手.exe"
) else if exist "release\win-unpacked\electron.exe" (
    start "" "release\win-unpacked\electron.exe"
) else if exist "node_modules\.bin\electron.cmd" (
    echo 开发模式启动中...
    start "" npx electron . --dev
) else (
    echo.
    echo  ⚠ 首次运行请先安装依赖并构建：
    echo    npm install
    echo    npm run build:electron
    echo.
    pause
)
