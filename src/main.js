import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

import { openFile, openFileAtPath, saveFile, saveFileAs, confirmDiscardChanges } from './fileIO.js';
import { buildMenu, setToggleChecked } from './menu.js';

if (started) {
  app.quit();
}

let mainWindow = null;
let menu;
let closeConfirmed = false;
let isQuitting = false;
// macOS fires 'open-file' when the app is launched via Finder's "Open
// With", a dock drop, or a double-click on a registered document — this
// can happen before app.whenReady() resolves and before mainWindow exists,
// so the path is queued here until there's a window to deliver it to.
let pendingOpenPath = null;

app.on('before-quit', () => {
  isQuitting = true;
});

// Must be registered before whenReady — macOS can emit this during launch.
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (!app.isReady() || !mainWindow || mainWindow.isDestroyed()) {
    pendingOpenPath = filePath;
    return;
  }
  mainWindow.webContents.send('app:open-path', filePath);
});

// Packaged builds get their icon from the .app bundle itself (this file
// isn't included in the packaged asar). In dev mode (running the raw
// Electron binary) it has to be set at runtime instead.
const iconPath = app.isPackaged
  ? null
  : path.join(__dirname, '../../build/icons/icon.png');

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  closeConfirmed = false;

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  mainWindow.on('close', (event) => {
    if (closeConfirmed) return;
    event.preventDefault();
    mainWindow.webContents.send('app:before-close');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
};

// macOS keeps the app (and its menu bar) alive with no windows open, so a
// menu click can arrive after mainWindow has been destroyed — lazily
// recreate the window instead of sending to a dead reference.
function sendMenuAction(action) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('menu:action', action);
    return;
  }
  const win = createWindow();
  win.webContents.once('did-finish-load', () => {
    win.webContents.send('menu:action', action);
  });
}

app.whenReady().then(() => {
  if (iconPath && process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(iconPath);
  }
  menu = buildMenu(sendMenuAction);
  const win = createWindow();
  if (pendingOpenPath) {
    const filePath = pendingOpenPath;
    pendingOpenPath = null;
    win.webContents.once('did-finish-load', () => {
      win.webContents.send('app:open-path', filePath);
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('file:open', async () => {
  return openFile(mainWindow);
});

ipcMain.handle('file:open-path', async (_event, filePath) => {
  return openFileAtPath(filePath);
});

ipcMain.handle('file:save', async (_event, { filePath, content, defaultPath }) => {
  if (!filePath) {
    return saveFileAs(mainWindow, content, defaultPath);
  }
  return saveFile(filePath, content);
});

ipcMain.handle('file:save-as', async (_event, { content, defaultPath }) => {
  return saveFileAs(mainWindow, content, defaultPath);
});

ipcMain.handle('file:confirm-discard', async () => {
  return confirmDiscardChanges(mainWindow);
});

ipcMain.on('app:set-toggle-checked', (_event, checked) => {
  if (menu) setToggleChecked(menu, checked);
});

// The renderer closed its last tab and already handled any unsaved changes,
// so close the window (or quit, if this was a quit) without prompting again.
ipcMain.on('app:close-window', () => {
  closeConfirmed = true;
  if (isQuitting) {
    app.quit();
  } else if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.on('app:close-response', (_event, shouldClose) => {
  if (!shouldClose) {
    // User cancelled — if this was triggered by Cmd+Q/Quit, don't leave the
    // app thinking a quit is still in progress.
    isQuitting = false;
    return;
  }
  closeConfirmed = true;
  // Closing just the window (not quitting the app) is correct for the red
  // button / Cmd+W, matching normal macOS behavior. But if this close was
  // triggered by an actual quit (Cmd+Q / Quit menu item), only closing the
  // window would leave the app running with no windows — call app.quit()
  // instead so it fully terminates once the window closes.
  if (isQuitting) {
    app.quit();
  } else if (mainWindow) {
    mainWindow.close();
  }
});
