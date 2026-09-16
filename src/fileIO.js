import { dialog } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

const FILE_FILTERS = [
  { name: 'Markdown', extensions: ['md', 'markdown'] },
  { name: 'All Files', extensions: ['*'] },
];

export async function openFile(browserWindow) {
  const result = await dialog.showOpenDialog(browserWindow, {
    properties: ['openFile'],
    filters: FILE_FILTERS,
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  const filePath = result.filePaths[0];
  const content = await fs.readFile(filePath, 'utf-8');
  return { filePath, content, fileName: path.basename(filePath) };
}

export async function openFileAtPath(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  return { filePath, content, fileName: path.basename(filePath) };
}

export async function saveFile(filePath, content) {
  await fs.writeFile(filePath, content, 'utf-8');
  return { filePath, fileName: path.basename(filePath) };
}

export async function saveFileAs(browserWindow, content, defaultPath) {
  const result = await dialog.showSaveDialog(browserWindow, {
    filters: FILE_FILTERS,
    defaultPath: defaultPath || 'Untitled.md',
  });
  if (result.canceled || !result.filePath) {
    return null;
  }
  return saveFile(result.filePath, content);
}

export async function confirmDiscardChanges(browserWindow) {
  const result = await dialog.showMessageBox(browserWindow, {
    type: 'warning',
    buttons: ['Save', "Don't Save", 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    message: 'Do you want to save the changes you made?',
    detail: 'Your changes will be lost if you don\'t save them.',
  });
  return ['save', 'discard', 'cancel'][result.response];
}
