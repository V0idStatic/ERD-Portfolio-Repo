@echo off
setlocal

rem Always run from this repository, even when launched by double-clicking.
cd /d "%~dp0"

set "SCHEMA_FILE=sql\gabai_liamerd.sql"
set "OUTPUT_DIR=liam-erd-dist"

if not defined LIAM_PORT set "LIAM_PORT=3000"

where npx.cmd >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js and npx are required.
    echo Install the current Node.js LTS release, then run local.cmd again.
    exit /b 1
)

if not exist "%SCHEMA_FILE%" (
    echo [ERROR] Cannot find %SCHEMA_FILE%
    exit /b 1
)

echo [1/2] Building the GabAI ERD from %SCHEMA_FILE%...
call npx.cmd --yes @liam-hq/cli erd build ^
    --input "%SCHEMA_FILE%" ^
    --format postgres ^
    --output-dir "%OUTPUT_DIR%"

if errorlevel 1 (
    echo [ERROR] Liam ERD could not build the diagram.
    exit /b 1
)

echo [OK] Liam ERD was generated in %OUTPUT_DIR%\

call node scripts\apply-liam-light.mjs
if errorlevel 1 (
    echo [ERROR] Could not apply Liam ERD light theme.
    exit /b 1
)

if /i "%~1"=="build" (
    echo Build-only check completed successfully.
    exit /b 0
)

echo [2/2] Opening http://localhost:%LIAM_PORT%
echo Keep this window open while viewing the ERD. Press Ctrl+C to stop.
start "" "http://localhost:%LIAM_PORT%"
call npx.cmd --yes serve "%OUTPUT_DIR%" --listen %LIAM_PORT%

endlocal

