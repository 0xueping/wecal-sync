@echo off
REM WeCal Sync - Chrome Extension Pack Script
REM Calls pack.py to create the distributable .zip

cd /d "%~dp0"
python pack.py

if %ERRORLEVEL% equ 0 (
    echo.
    echo To upload to Chrome Web Store, use dist\wecal-sync-*.zip
) else (
    echo ERROR: Packing failed.
    exit /b 1
)
