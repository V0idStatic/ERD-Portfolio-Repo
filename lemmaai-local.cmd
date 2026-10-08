@echo off
cd /d "%~dp0"

echo Building LemmaAI ERD...
call npx.cmd --yes @liam-hq/cli erd build --input LemmaAI_ERD\collieAI.sql --format postgres --output-dir LemmaAI_ERD\dist
if errorlevel 1 exit /b %errorlevel%

call node LemmaAI_ERD\scripts\apply-liam-light.mjs
if errorlevel 1 exit /b %errorlevel%

echo Starting LemmaAI ERD on localhost...
call npx.cmd --yes serve LemmaAI_ERD\dist
