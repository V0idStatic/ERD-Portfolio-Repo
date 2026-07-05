@echo off
cd /d "%~dp0"

echo Building CollieAI ERD...
call npx --yes @liam-hq/cli erd build --input collieAI.sql --format postgres --output-dir dist
if errorlevel 1 exit /b %errorlevel%

echo Starting CollieAI ERD on localhost...
call npx --yes serve dist
