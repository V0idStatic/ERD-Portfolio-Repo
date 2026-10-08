@echo off
cd /d "%~dp0"

echo Building CollieAI ERD...
call npx.cmd --yes @liam-hq/cli erd build --input CollieAI_ERD\collieAI.sql --format postgres --output-dir CollieAI_ERD\dist
if errorlevel 1 exit /b %errorlevel%

call node CollieAI_ERD\scripts\apply-liam-light.mjs
if errorlevel 1 exit /b %errorlevel%

echo Starting CollieAI ERD on localhost...
call npx.cmd --yes serve CollieAI_ERD\dist
