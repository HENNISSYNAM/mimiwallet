@echo off
rem MIMI Dien Ho - bo chay tai may. Chi nghe 127.0.0.1, khong tu khoi dong cung Windows. Go q de thoat.
title MIMI Dien Ho
chcp 65001 >nul
"%~dp0node.exe" "%~dp0app\mimi-dien-ho.mjs"
pause
