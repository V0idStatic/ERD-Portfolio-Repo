@echo off
cd /d "%~dp0"

echo Building Abyss ERD...
call npx --yes @liam-hq/cli erd build --input Abyss_ERD\abyss.sql --format postgres --output-dir Abyss_ERD\dist
if errorlevel 1 exit /b %errorlevel%

echo Starting Abyss ERD on localhost...
call npx --yes serve Abyss_ERD\dist
