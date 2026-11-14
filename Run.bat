@echo off
setlocal
title Aiqon Maritime AI Platform
cd /d "%~dp0"

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Python was not found on your system PATH.
    echo Please install Python 3.10+ and ensure it is added to PATH.
    echo.
    pause
    exit /b 1
)

python run.py %*
