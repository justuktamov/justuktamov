@echo off
REM One-click setup for After Effects MCP on Windows.
REM Installs dependencies, builds the server, copies the bridge panel into
REM After Effects, and prints the Claude Desktop config with the right path.
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js not found. Install Node.js 18+ from https://nodejs.org and run this again.
  pause
  exit /b 1
)

echo [1/3] Installing dependencies and building...
call npm install || goto :fail

echo [2/3] Installing the bridge panel into After Effects (accept the admin prompt)...
call npm run install-bridge || goto :fail

set "SERVER=%~dp0build\index.js"
set "SERVER_JSON=%SERVER:\=\\%"

echo.
echo [3/3] Done. Add this to Claude Desktop's config
echo       (%%APPDATA%%\Claude\claude_desktop_config.json):
echo.
echo {
echo   "mcpServers": {
echo     "AfterEffectsMCP": {
echo       "command": "node",
echo       "args": ["%SERVER_JSON%"]
echo     }
echo   }
echo }
echo.
echo Claude Code users: the .mcp.json in the repo root already points here.
echo.
echo Then in After Effects:
echo   1. Edit ^> Preferences ^> Scripting ^& Expressions ^>
echo      enable "Allow Scripts to Write Files and Access Network"
echo   2. Restart After Effects
echo   3. Window ^> mcp-bridge-auto.jsx  (keep this panel open)
pause
exit /b 0

:fail
echo Setup failed - see the error above.
pause
exit /b 1
