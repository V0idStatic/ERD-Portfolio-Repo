@echo off
cd /d "%~dp0"

echo Building GabAI ERD...
call npx.cmd --yes @liam-hq/cli erd build --input GabAI_ERD\sql\gabai_liamerd.sql --format postgres --output-dir GabAI_ERD\dist
if errorlevel 1 exit /b %errorlevel%

call node GabAI_ERD\scripts\apply-liam-light.mjs
if errorlevel 1 exit /b %errorlevel%

echo Starting GabAI ERD on localhost...
call npx.cmd --yes serve GabAI_ERD\dist
