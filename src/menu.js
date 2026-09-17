import { Menu, app } from 'electron';

export function buildMenu(send) {
  const template = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New File', accelerator: 'CmdOrCtrl+N', click: () => send('new') },
        { label: 'Open...', accelerator: 'CmdOrCtrl+O', click: () => send('open') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => send('save') },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => send('save-as'),
        },
        { type: 'separator' },
        { label: 'Close Tab', accelerator: 'CmdOrCtrl+W', click: () => send('close-tab') },
        process.platform === 'darwin'
          ? { role: 'close', accelerator: 'CmdOrCtrl+Shift+W' }
          : { role: 'quit' },
      ],
    },
    { label: 'Edit', role: 'editMenu' },
    {
      label: 'Window',
      submenu: [
        {
          label: 'Next Tab',
          accelerator: 'Ctrl+Tab',
          click: () => send('next-tab'),
        },
        {
          label: 'Previous Tab',
          accelerator: 'Ctrl+Shift+Tab',
          click: () => send('prev-tab'),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          id: 'toggle-syntax',
          label: 'Hide Syntax',
          type: 'checkbox',
          checked: false,
          accelerator: 'CmdOrCtrl+Shift+M',
          click: () => send('toggle-syntax'),
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  return menu;
}

export function setToggleChecked(menu, checked) {
  const item = menu.getMenuItemById('toggle-syntax');
  if (item) {
    item.checked = checked;
    item.label = checked ? 'Show Syntax' : 'Hide Syntax';
  }
}
