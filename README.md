# Vellum

A distraction-free, local-first Markdown editor for macOS, Windows, and Linux. Built with [Electron](https://www.electronjs.org/) and [CodeMirror 6](https://codemirror.net/).

Vellum keeps your writing in plain `.md` files on your own disk — no accounts, no cloud, no telemetry.

## Download

Get the newest installers from the
**[latest release](https://github.com/audiac/vellum/releases/latest)**:

- **macOS** (Apple Silicon) — `Vellum-darwin-arm64-*.zip`
- **Windows** — `Vellum-*.Setup.exe`
- **Linux** — `vellum_*_amd64.deb` (Debian/Ubuntu) or `vellum-*.x86_64.rpm` (Fedora/RHEL)

Or see [all releases](https://github.com/audiac/vellum/releases), or build from
source (see [Development](#development)).

> macOS builds are ad-hoc signed. If Gatekeeper warns on first launch,
> right-click the app → **Open**.

## Features

- **Tabs** — open multiple documents at once and switch between them. Opening a file (via Open, the `+` button, or "Open With" in Finder) adds a new tab instead of replacing the current document; each tab keeps its own file, unsaved-changes state, and Hide Syntax setting.
- **Live syntax styling** — headings, bold, italic, inline code, code blocks, blockquotes, links, and lists are styled as you type.
- **Hide Syntax mode** (`Cmd/Ctrl+Shift+M`) — hide the Markdown markers for a clean, rendered-looking view while still editing the raw text.
- **Plain-file workflow** — New, Open, Save, and Save As work directly with `.md` and `.markdown` files.
- **Unsaved-changes protection** — prompts to save before closing or discarding.
- **Native document handling** — registered as a Markdown editor, so "Open With" and double-clicking files in Finder work.
- **Soft line wrapping** and full undo/redo history.

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| New tab | `Cmd/Ctrl+N` |
| Open | `Cmd/Ctrl+O` |
| Save | `Cmd/Ctrl+S` |
| Save As | `Cmd/Ctrl+Shift+S` |
| Close tab | `Cmd/Ctrl+W` |
| Close window | `Cmd/Ctrl+Shift+W` |
| Next / Previous tab | `Ctrl+Tab` / `Ctrl+Shift+Tab` |
| Toggle Hide Syntax | `Cmd/Ctrl+Shift+M` |

## Development

Requires [Node.js](https://nodejs.org/) (18+).

```bash
npm install
npm start
```

## Building

Vellum uses [Electron Forge](https://www.electronforge.io/).

```bash
npm run package   # build an unpackaged app
npm run make      # produce distributable installers
```

On macOS the app is ad-hoc code-signed automatically after packaging.

## Project structure

```
src/
  main.js           Electron main process, window and IPC wiring
  preload.js        Context-isolated bridge to the renderer
  renderer.js       UI state, file actions, title bar
  fileIO.js         Open/save dialogs and disk reads/writes
  menu.js           Application menu
  editor/
    setup.js        CodeMirror editor configuration
    hideSyntax.js   Hide-Syntax decoration logic
  styles.css        App and editor styling
```

## License

[MIT](LICENSE) © Ryan George
