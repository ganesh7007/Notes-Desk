import { Menu, shell } from 'electron'
import type { BaseWindow, BrowserWindow, MenuItem } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'

export function buildAppMenu(): Menu {
  const isMac = process.platform === 'darwin'
  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [{ role: 'appMenu' as const }]
      : [
          {
            label: 'File',
            submenu: [
              { label: 'New Note', accelerator: 'CmdOrCtrl+N', click: (_i: MenuItem, win: BaseWindow | undefined) => send(win as BrowserWindow | undefined, 'menu:newNote') },
              { label: 'Search', accelerator: 'CmdOrCtrl+F', click: (_i: MenuItem, win: BaseWindow | undefined) => send(win as BrowserWindow | undefined, 'menu:focusSearch') },
              { type: 'separator' as const },
              { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: (_i: MenuItem, win: BaseWindow | undefined) => send(win as BrowserWindow | undefined, 'menu:settings') },
              { type: 'separator' as const },
              isMac ? { role: 'close' as const } : { role: 'quit' as const }
            ]
          }
        ]),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' as const },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const },
              { type: 'separator' as const },
              {
                label: 'Speech',
                submenu: [{ role: 'startSpeaking' as const }, { role: 'stopSpeaking' as const }]
              }
            ]
          : [{ role: 'delete' as const }, { type: 'separator' as const }, { role: 'selectAll' as const }])
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, ...(isMac ? [{ type: 'separator' as const }, { role: 'front' as const }] : [{ role: 'close' as const }])]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'About NotesApp',
          click: () => {
            shell.openExternal('https://github.com')
          }
        }
      ]
    }
  ]
  return Menu.buildFromTemplate(template)
}

function send(win: BrowserWindow | undefined, channel: string): void {
  win?.webContents.send(channel)
}
