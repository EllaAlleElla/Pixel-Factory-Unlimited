@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 ( node serve.mjs ) else ( echo 未检测到 Node.js，直接用浏览器打开 index.html... & start "" index.html & pause )
