import './styles.css';
import { createEditorView, toggleSyntaxVisibility } from './editor/setup.js';

const state = {
  filePath: null,
  fileName: 'Untitled.md',
  isDirty: false,
};

const filenameEl = document.getElementById('filename');
const toggleButton = document.getElementById('toggle-syntax');

function updateTitleBar() {
  const dirtyMark = state.isDirty ? '• ' : '';
  filenameEl.textContent = `${dirtyMark}${state.fileName}`;
  document.title = `${dirtyMark}${state.fileName} — Vellum`;
}

function setDirty(isDirty) {
  state.isDirty = isDirty;
  updateTitleBar();
}

const view = createEditorView({
  doc: '',
  parent: document.getElementById('editor'),
  onDocChanged: () => setDirty(true),
});

updateTitleBar();

function updateToggleButton(hidden) {
  toggleButton.textContent = hidden ? 'Show Syntax' : 'Hide Syntax';
  toggleButton.classList.toggle('active', hidden);
}

function doToggleSyntax() {
  const hidden = toggleSyntaxVisibility(view);
  updateToggleButton(hidden);
  window.api.setSyntaxToggleChecked(hidden);
}

async function maybeDiscardChanges() {
  if (!state.isDirty) return true;
  const choice = await window.api.confirmDiscardChanges();
  if (choice === 'save') return doSave();
  if (choice === 'discard') return true;
  return false;
}

async function doSave() {
  const content = view.state.doc.toString();
  const result = await window.api.saveFile({
    filePath: state.filePath,
    content,
    defaultPath: state.fileName,
  });
  if (!result) return false;
  state.filePath = result.filePath;
  state.fileName = result.fileName;
  setDirty(false);
  return true;
}

async function doSaveAs() {
  const content = view.state.doc.toString();
  const result = await window.api.saveFileAs({
    content,
    defaultPath: state.fileName,
  });
  if (!result) return false;
  state.filePath = result.filePath;
  state.fileName = result.fileName;
  setDirty(false);
  return true;
}

function replaceDoc(content) {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: content },
  });
}

async function doNew() {
  if (!(await maybeDiscardChanges())) return;
  replaceDoc('');
  state.filePath = null;
  state.fileName = 'Untitled.md';
  setDirty(false);
}

async function doOpen() {
  if (!(await maybeDiscardChanges())) return;
  const result = await window.api.openFile();
  if (!result) return;
  replaceDoc(result.content);
  state.filePath = result.filePath;
  state.fileName = result.fileName;
  setDirty(false);
}

async function doOpenPath(filePath) {
  if (!(await maybeDiscardChanges())) return;
  const result = await window.api.openFileAtPath(filePath);
  if (!result) return;
  replaceDoc(result.content);
  state.filePath = result.filePath;
  state.fileName = result.fileName;
  setDirty(false);
}

toggleButton.addEventListener('click', doToggleSyntax);

window.api.onMenuAction((action) => {
  switch (action) {
    case 'new':
      doNew();
      break;
    case 'open':
      doOpen();
      break;
    case 'save':
      doSave();
      break;
    case 'save-as':
      doSaveAs();
      break;
    case 'toggle-syntax':
      doToggleSyntax();
      break;
  }
});

window.api.onBeforeClose(async () => {
  const shouldClose = await maybeDiscardChanges();
  window.api.respondBeforeClose(shouldClose);
});

window.api.onOpenPath((filePath) => {
  doOpenPath(filePath);
});
