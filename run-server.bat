@echo off
title Khubaib Streetwear - Server & Website Launcher
echo ======================================================
echo    KHUBAIB STREETWEAR - STARTING BACKEND SERVER
echo ======================================================

set "VSCODE_NODE=C:\Users\%USERNAME%\AppData\Local\Programs\Microsoft VS Code\Code.exe"
set "NODE_CMD=node"

where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "%VSCODE_NODE%" (
        echo [INFO] Using embedded Node engine via VS Code...
        set "ELECTRON_RUN_AS_NODE=1"
        start "" http://localhost:3000
        "%VSCODE_NODE%" server.js
        exit /b
    ) else (
        echo [INFO] Node not detected in PATH. Opening index.html directly...
        start "" index.html
        pause
        exit /b
    )
)

start "" http://localhost:3000
node server.js
pause
