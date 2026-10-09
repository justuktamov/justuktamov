# After Effects MCP — setup

Lets Claude control Adobe After Effects: create compositions, add text, shape and solid layers, set keyframes and expressions, apply effects.
The source comes from [Dakkshin/after-effects-mcp](https://github.com/Dakkshin/after-effects-mcp) (MIT).

**It must run on the same computer as After Effects.** The server and the After Effects panel talk to each other through files in `Documents\ae-mcp-bridge`.

## Requirements

- Adobe After Effects 2021–2026
- Node.js 18 or newer ([nodejs.org](https://nodejs.org))
- Claude Desktop or Claude Code

## 1. Install

### Windows (one click)

Double-click `after-effects-mcp\setup-windows.bat`. The script does three things:

1. Runs `npm install`, which also builds `build\index.js`.
2. Copies `mcp-bridge-auto.jsx` into After Effects' `ScriptUI Panels` folder. Accept the administrator prompt when it appears.
3. Prints the Claude Desktop config, with the correct path for your machine already filled in.

### macOS / manual

```bash
cd after-effects-mcp
npm install              # installs and builds build/index.js
npm run install-bridge   # copies the panel into After Effects (may ask for sudo)
```

If `install-bridge` can't find After Effects, copy the panel yourself:
copy `build/scripts/mcp-bridge-auto.jsx` into the `Scripts/ScriptUI Panels/` folder.
- Windows: `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels\`
- macOS: `/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/`

## 2. Configure After Effects

1. Turn on **Allow Scripts to Write Files and Access Network**:
   - Windows: Edit › Preferences › Scripting & Expressions
   - macOS: After Effects › Settings › Scripting & Expressions
2. Restart After Effects.
3. Open **Window › mcp-bridge-auto.jsx**. Make sure "Auto-run commands" is checked, and keep the panel open while you use Claude.

## 3. Connect Claude

**Claude Code:** the `.mcp.json` file in the repo root already registers the server. Open the repo folder with `claude` and approve the `AfterEffectsMCP` server when Claude Code asks.

**Claude Desktop:** add the server to `claude_desktop_config.json`:
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

Use an **absolute** path:

```json
{
  "mcpServers": {
    "AfterEffectsMCP": {
      "command": "node",
      "args": ["C:\\path\\to\\justuktamov\\after-effects-mcp\\build\\index.js"]
    }
  }
}
```

Then restart Claude Desktop.

## 4. Test

With After Effects and the bridge panel open, ask Claude:

> Use AfterEffectsMCP to run the bridge test, then create a 1920x1080 composition called "Test" with a red solid layer.

## Troubleshooting

- **Commands time out:** check that the bridge panel is open and that "Auto-run commands" is checked. Also check that the scripting preference from step 2 is on.
- **`build/index.js` not found:** run `npm install` again inside `after-effects-mcp`.
- **Bridge panel missing from the Window menu:** the panel wasn't copied. Copy it manually (see step 1), then restart After Effects.
