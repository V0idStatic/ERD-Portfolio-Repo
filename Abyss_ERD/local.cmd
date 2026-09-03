@echo off
cd /d "%~dp0"

echo Building Abyss ERD...
call npx --yes @liam-hq/cli erd build --input abyss.sql --format postgres --output-dir dist
if errorlevel 1 exit /b %errorlevel%

echo Starting Abyss ERD on localhost...
call npx --yes serve dist
