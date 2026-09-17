import './styles.css';
import { createEditorView, applySyntaxHidden } from './editor/setup.js';

// Each open document is a tab. A tab owns its own editor view, file path,
// dirty flag, and syntax-visibility state, so switching tabs restores exactly
// what that document looked like.
const tabs = [];
let activeTabId = null;
let tabIdCounter = 0;

const tabbarEl = document.getElementById('tabbar');
const editorEl = document.getElementById('editor');
const toggleButton = document.getElementById('toggle-syntax');
const newTabButton = document.getElementById('new-tab');

function getActiveTab() {
  return tabs.find((tab) => tab.id === activeTabId) || null;
}

function updateToggleButton(hidden) {
  toggleButton.textContent = hidden ? 'Show Syntax' : 'Hide Syntax';
  toggleButton.classList.toggle('active', hidden);
}

// Reflect the active tab in the window title, toggle button, and menu checkbox.
function updateActiveChrome() {
  const tab = getActiveTab();
  if (!tab) {
    document.title = 'Vellum';
    return;
  }
  const dirtyMark = tab.isDirty ? '• ' : '';
  document.title = `${dirtyMark}${tab.fileName} — Vellum`;
  updateToggleButton(tab.syntaxHidden);
  window.api.setSyntaxToggleChecked(tab.syntaxHidden);
}

function renderTabChip(tab) {
  const dirtyMark = tab.isDirty ? '• ' : '';
  tab.labelEl.textContent = `${dirtyMark}${tab.fileName}`;
  tab.tabEl.title = tab.filePath || tab.fileName;
  tab.tabEl.classList.toggle('active', tab.id === activeTabId);
  tab.tabEl.classList.toggle('dirty', tab.isDirty);
}

function setDirty(tab, isDirty) {
  tab.isDirty = isDirty;
  renderTabChip(tab);
  if (tab.id === activeTabId) updateActiveChrome();
}

function buildTabChip(tab) {
  const tabEl = document.createElement('div');
  tabEl.className = 'tab';

  const labelEl = document.createElement('span');
  labelEl.className = 'tab-label';
  tabEl.appendChild(labelEl);

  const closeEl = document.createElement('button');
  closeEl.type = 'button';
  closeEl.className = 'tab-close';
  closeEl.textContent = '×';
  closeEl.title = 'Close tab';
  tabEl.appendChild(closeEl);

  tabEl.addEventListener('mousedown', (event) => {
    if (event.button === 0) activateTab(tab.id);
  });
  // Middle-click closes, matching common tabbed apps.
  tabEl.addEventListener('auxclick', (event) => {
    if (event.button === 1) {
      event.preventDefault();
      requestCloseTab(tab.id);
    }
  });
  closeEl.addEventListener('mousedown', (event) => event.stopPropagation());
  closeEl.addEventListener('click', (event) => {
    event.stopPropagation();
    requestCloseTab(tab.id);
  });

  tab.tabEl = tabEl;
  tab.labelEl = labelEl;
  tabbarEl.appendChild(tabEl);
  renderTabChip(tab);
}

function createTab({ content = '', filePath = null, fileName = 'Untitled.md' } = {}) {
  const id = ++tabIdCounter;
  const paneEl = document.createElement('div');
  paneEl.className = 'editor-pane';
  editorEl.appendChild(paneEl);

  const tab = {
    id,
    filePath,
    fileName,
    isDirty: false,
    syntaxHidden: false,
    paneEl,
    view: null,
    tabEl: null,
    labelEl: null,
  };

  tab.view = createEditorView({
    doc: content,
    parent: paneEl,
    onDocChanged: () => setDirty(tab, true),
  });

  buildTabChip(tab);
  tabs.push(tab);
  return tab;
}

function activateTab(id) {
  const tab = tabs.find((t) => t.id === id);
  if (!tab) return;
  activeTabId = id;
  for (const t of tabs) {
    t.paneEl.classList.toggle('active', t.id === id);
    renderTabChip(t);
  }
  updateActiveChrome();
  tab.view.focus();
}

function replaceDoc(tab, content) {
  tab.view.dispatch({
    changes: { from: 0, to: tab.view.state.doc.length, insert: content },
  });
}

// A freshly-created, untitled, empty, clean tab can host an opened file
// instead of leaving a blank tab behind (the common "open into the empty
// window" behavior).
function isReusableTab(tab) {
  return (
    tab &&
    !tab.filePath &&
    !tab.isDirty &&
    tab.view.state.doc.length === 0
  );
}

function findTabByPath(filePath) {
  return tabs.find((tab) => tab.filePath && tab.filePath === filePath) || null;
}

function openInTab({ content, filePath, fileName }) {
  // Already open: just switch to it rather than opening a duplicate.
  const existing = findTabByPath(filePath);
  if (existing) {
    activateTab(existing.id);
    return;
  }

  const active = getActiveTab();
  if (isReusableTab(active)) {
    replaceDoc(active, content);
    active.filePath = filePath;
    active.fileName = fileName;
    active.isDirty = false;
    renderTabChip(active);
    activateTab(active.id);
    return;
  }

  const tab = createTab({ content, filePath, fileName });
  activateTab(tab.id);
}

async function maybeDiscardChanges(tab) {
  if (!tab || !tab.isDirty) return true;
  // Make sure the user can see which document they're being asked about.
  if (tab.id !== activeTabId) activateTab(tab.id);
  const choice = await window.api.confirmDiscardChanges();
  if (choice === 'save') return doSave(tab);
  if (choice === 'discard') return true;
  return false;
}

async function doSave(tab = getActiveTab()) {
  if (!tab) return false;
  const content = tab.view.state.doc.toString();
  const result = await window.api.saveFile({
    filePath: tab.filePath,
    content,
    defaultPath: tab.fileName,
  });
  if (!result) return false;
  tab.filePath = result.filePath;
  tab.fileName = result.fileName;
  setDirty(tab, false);
  return true;
}

async function doSaveAs(tab = getActiveTab()) {
  if (!tab) return false;
  const content = tab.view.state.doc.toString();
  const result = await window.api.saveFileAs({
    content,
    defaultPath: tab.fileName,
  });
  if (!result) return false;
  tab.filePath = result.filePath;
  tab.fileName = result.fileName;
  setDirty(tab, false);
  return true;
}

function doNew() {
  const tab = createTab();
  activateTab(tab.id);
}

async function doOpen() {
  const result = await window.api.openFile();
  if (!result) return;
  openInTab(result);
}

async function doOpenPath(filePath) {
  const result = await window.api.openFileAtPath(filePath);
  if (!result) return;
  openInTab(result);
}

function doToggleSyntax() {
  const tab = getActiveTab();
  if (!tab) return;
  tab.syntaxHidden = !tab.syntaxHidden;
  applySyntaxHidden(tab.view, tab.syntaxHidden);
  updateToggleButton(tab.syntaxHidden);
  window.api.setSyntaxToggleChecked(tab.syntaxHidden);
}

async function requestCloseTab(id) {
  const tab = tabs.find((t) => t.id === id);
  if (!tab) return;
  if (!(await maybeDiscardChanges(tab))) return;

  const index = tabs.indexOf(tab);
  // Closing the last tab closes the window (matching the previous Cmd+W
  // behavior). Changes were already handled above, so tell main to skip the
  // close confirmation.
  if (tabs.length === 1) {
    window.api.closeWindow();
    return;
  }

  tab.view.destroy();
  tab.paneEl.remove();
  tab.tabEl.remove();
  tabs.splice(index, 1);

  if (activeTabId === tab.id) {
    const next = tabs[index] || tabs[index - 1];
    activateTab(next.id);
  }
}

// Cycle through tabs (Cmd+Shift+[ / ]).
function selectAdjacentTab(delta) {
  if (tabs.length < 2) return;
  const index = tabs.findIndex((t) => t.id === activeTabId);
  if (index === -1) return;
  const nextIndex = (index + delta + tabs.length) % tabs.length;
  activateTab(tabs[nextIndex].id);
}

toggleButton.addEventListener('click', doToggleSyntax);
newTabButton.addEventListener('click', doNew);

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
    case 'close-tab':
      if (activeTabId !== null) requestCloseTab(activeTabId);
      break;
    case 'next-tab':
      selectAdjacentTab(1);
      break;
    case 'prev-tab':
      selectAdjacentTab(-1);
      break;
  }
});

window.api.onBeforeClose(async () => {
  // Check every dirty tab before the window closes.
  for (const tab of [...tabs]) {
    if (tab.isDirty && !(await maybeDiscardChanges(tab))) {
      window.api.respondBeforeClose(false);
      return;
    }
  }
  window.api.respondBeforeClose(true);
});

window.api.onOpenPath((filePath) => {
  doOpenPath(filePath);
});

// Start with a single empty document.
doNew();
