import { app, BrowserWindow, dialog, Menu, protocol, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { dirs, getDb, appDataDir, warmUpDatabase } from './db'
import { registerIpcHandlers } from './ipc'
import { autoBackupIfDue } from './backup'
import { scheduleAllReminders } from './reminders'
import { buildAppMenu } from './menu'

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'appmedia',
    privileges: { standard: false, secure: true, supportFetchAPI: true, stream: true }
  }
])

let mainWindow: BrowserWindow | null = null

/* ------------------------------------------------------------------ */
/*  Startup-failure reporting: log to %APPDATA% and show a friendly   */
/*  dialog instead of silently running without a window.              */
/* ------------------------------------------------------------------ */

const STARTUP_LOG_FILE = path.join(dirs.logs, 'startup-error.log')

function logStartupError(tag: string, err: unknown): void {
  const text = err instanceof Error ? (err.stack ?? err.message) : String(err)
  try {
    fs.mkdirSync(dirs.logs, { recursive: true })
    fs.appendFileSync(STARTUP_LOG_FILE, `[${new Date().toISOString()}] ${tag}: ${text}\n`)
  } catch {
    /* never let logging itself crash the app */
  }
}

function appIsAlive(): boolean {
  return !!mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()
}

function handleFatalError(tag: string, err: unknown): void {
  logStartupError(tag, err)
  const details = err instanceof Error ? (err.stack ?? err.message) : String(err)
  try {
    dialog.showErrorBox(
      'NotesApp failed to start',
      `NotesApp ran into an unexpected problem while starting, so the window could not be opened.\n\n` +
        `Your notes and data are safe — nothing has been changed or deleted.\n\n` +
        `Error details:\n${details}\n\n` +
        `Details were written to:\n${STARTUP_LOG_FILE}`
    )
  } catch {
    /* ignore */
  }
  app.exit(1)
}

process.on('uncaughtException', (err) => {
  if (!appIsAlive()) {
    handleFatalError('Uncaught exception', err)
  } else {
    logStartupError('Uncaught exception', err)
  }
})

process.on('unhandledRejection', (reason) => {
  if (!appIsAlive()) {
    handleFatalError('Unhandled rejection', reason)
  } else {
    logStartupError('Unhandled rejection', reason)
  }
})

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 940,
    minHeight: 640,
    show: false,
    backgroundColor: '#0b0f17',
    title: 'NotesApp',
    icon: path.join(__dirname, '../../resources/icon.png'),
    autoHideMenuBar: false,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true
    }
  })

  win.on('ready-to-show', () => {
    win.show()
  })

  win.on('maximize', () => win.webContents.send('window:maximized', true))
  win.on('unmaximize', () => win.webContents.send('window:maximized', false))
  win.on('closed', () => {
    mainWindow = null
  })

  win.webContents.setWindowOpenHandler((details) => {
    if (details.url.startsWith('http://') || details.url.startsWith('https://')) {
      shell.openExternal(details.url)
    }
    return { action: 'deny' }
  })

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    // -3 = ERR_ABORTED, a normal navigation cancellation — ignore it.
    if (isMainFrame && errorCode !== -3) {
      handleFatalError('Renderer load failed', new Error(`${errorDescription} (${errorCode}) — ${validatedURL}`))
    }
  })

  return win
}

function registerMediaProtocol(): void {
  protocol.handle('appmedia', (request) => {
    const url = new URL(request.url)
    const rel = decodeURIComponent(url.host + url.pathname)
    const safePath = path.resolve(appDataDir, rel)
    if (!safePath.startsWith(appDataDir)) {
      return new Response('Forbidden', { status: 403 })
    }
    try {
      const data = fs.readFileSync(safePath)
      const ext = path.extname(safePath).toLowerCase()
      const mime =
        ext === '.png'
          ? 'image/png'
          : ext === '.jpg' || ext === '.jpeg'
            ? 'image/jpeg'
            : ext === '.gif'
              ? 'image/gif'
              : ext === '.webp'
                ? 'image/webp'
                : ext === '.svg'
                  ? 'image/svg+xml'
                  : ext === '.webm'
                    ? 'video/webm'
                    : ext === '.wav'
                      ? 'audio/wav'
                      : 'application/octet-stream'
      return new Response(data, { headers: { 'content-type': mime, 'cache-control': 'no-cache' } })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    try {
      app.setAppUserModelId('com.notesapp.desktop')
      await warmUpDatabase()
      getDb()
      registerMediaProtocol()
      registerIpcHandlers(() => mainWindow)
      mainWindow = createWindow()
      Menu.setApplicationMenu(buildAppMenu())

      const loadUrl =
        process.env['ELECTRON_RENDERER_URL'] ??
        `file://${path.join(__dirname, '../renderer/index.html')}`
      mainWindow.loadURL(loadUrl)

      scheduleAllReminders()
      autoBackupIfDue()
      setInterval(() => autoBackupIfDue(), 30 * 60 * 1000)

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          mainWindow = createWindow()
          mainWindow.loadURL(loadUrl)
        }
      })
    } catch (err) {
      handleFatalError('Startup failed', err)
    }
  })
}

app.on('window-all-closed', () => {
  app.quit()
})
