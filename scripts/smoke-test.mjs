#!/usr/bin/env node
/**
 * Smoke test for NotesApp — two modes:
 *
 *   Packaged:  node scripts/smoke-test.mjs [exe]
 *              (default: dist/win-unpacked/NotesApp.exe) — launch the built
 *              app and verify it boots.
 *
 *   Dev:       node scripts/smoke-test.mjs --dev
 *              Start `electron-vite dev`, probe the renderer URL once the dev
 *              server answers, then verify the app boots — catching startup
 *              regressions before any packaging happens.
 *
 * Both modes run the same two-phase health check:
 *   1. Renderer ping — the renderer sends an IPC health signal after React
 *      mounts; the main process writes a marker file (only when
 *      NOTESAPP_HEALTH_FILE is set). This proves the renderer bundle loaded,
 *      React mounted, and the preload IPC bridge works — independent of
 *      window visibility, so a dead renderer fails fast with a precise
 *      diagnosis.
 *   2. Window — a visible window titled "NotesApp" must appear (it shows
 *      only once the renderer has loaded and painted).
 *
 * Also verifies the process tree looks healthy and that no startup errors
 * were logged. Exits non-zero on failure so it can gate `npm run dist`.
 */
import { spawn, execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const args = process.argv.slice(2)
const DEV_MODE = args.includes('--dev')
const WINDOW_TITLE = 'NotesApp'
const PING_TIMEOUT_MS = 20_000 // renderer health ping
const WINDOW_TIMEOUT_MS = 20_000 // visible window after the ping
const SERVER_TIMEOUT_MS = 30_000 // vite dev server readiness (dev mode)
const POLL_MS = 1_000
const MIN_PROCESSES = 3 // main + helper + renderer at minimum
const HEALTH_MARKER = path.join(os.tmpdir(), 'notesapp-renderer-ready.tmp')
const LOG_PATH = path.join(
  process.env.APPDATA ?? '',
  'NotesApp',
  'logs',
  'startup-error.log'
)
// Packaged app runs as NotesApp.exe; dev mode runs under electron.exe.
const PROC_NAME = DEV_MODE ? 'electron' : 'NotesApp'
const EXE = DEV_MODE
  ? null
  : path.resolve(args.find((a) => !a.startsWith('--')) ?? path.join('dist', 'win-unpacked', 'NotesApp.exe'))

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function runPs(script) {
  try {
    return execFileSync('powershell', ['-NoProfile', '-Command', script], {
      encoding: 'utf8',
      windowsHide: true
    }).trim()
  } catch {
    return ''
  }
}

/** Snapshot of running app processes: { count, windows: [{ id, title, handle }] } */
function appState() {
  const json = runPs(
    `Get-Process -Name ${PROC_NAME} -ErrorAction SilentlyContinue | ` +
      'Select-Object Id, MainWindowTitle, MainWindowHandle | ConvertTo-Json -Compress'
  )
  if (!json) return { count: 0, windows: [] }
  let arr
  try {
    arr = JSON.parse(json)
    if (!Array.isArray(arr)) arr = [arr]
  } catch {
    return { count: 0, windows: [] }
  }
  return {
    count: arr.length,
    windows: arr.map((w) => ({
      id: w.Id,
      title: w.MainWindowTitle,
      handle: w.MainWindowHandle
    }))
  }
}

function hasNotesAppWindow() {
  return appState().windows.some((w) => w.handle !== 0 && w.title === WINDOW_TITLE)
}

function markerWrittenSince(t) {
  try {
    return fs.statSync(HEALTH_MARKER).mtimeMs >= t
  } catch {
    return false
  }
}

function logSize() {
  try {
    return fs.statSync(LOG_PATH).size
  } catch {
    return 0
  }
}

function fail(reason, state, logGrew, extra = '') {
  console.error(`[smoke] ✗ FAIL: ${reason}`)
  console.error(`[smoke]   last observed processes: ${state.count}`)
  if (state.windows.length) {
    for (const w of state.windows) {
      console.error(
        `[smoke]   pid=${w.id} title="${w.title}" handle=${w.handle}${w.handle ? '' : ' (no window)'}`
      )
    }
  }
  if (extra) console.error(`[smoke]   ${extra}`)
  if (logGrew) {
    console.error(`[smoke]   startup-error.log was written during the test:`)
    try {
      for (const line of fs.readFileSync(LOG_PATH, 'utf8').trim().split('\n').slice(-5)) {
        console.error(`[smoke]     ${line}`)
      }
    } catch {
      /* ignore */
    }
  }
  console.error(`[smoke]   log file: ${LOG_PATH}`)
  process.exit(1)
}

// --- pre-checks -----------------------------------------------------------

if (DEV_MODE) {
  if (!fs.existsSync(path.join('node_modules', 'electron-vite', 'bin', 'electron-vite.js'))) {
    console.error('[smoke] ✗ electron-vite not found — run "npm install" first.')
    process.exit(1)
  }
} else if (!fs.existsSync(EXE)) {
  console.error(`[smoke] ✗ Executable not found: ${EXE}`)
  console.error('[smoke]   Build it first with "npm run pack" or "npm run dist".')
  process.exit(1)
}

if (hasNotesAppWindow()) {
  console.warn(`[smoke] ⚠ NotesApp is already running — single-instance lock would invalidate the test. Skipping.`)
  console.warn('[smoke]   Close the app and re-run to actually smoke-test.')
  process.exit(0)
}

const logBefore = logSize()

// --- launch ---------------------------------------------------------------

let child
let mainPid
let devOut = ''
let devServerUrl = null
const launchTime = Date.now()

try {
  fs.rmSync(HEALTH_MARKER, { force: true })
} catch {
  /* ignore */
}

if (DEV_MODE) {
  console.log('[smoke] Starting electron-vite dev...')
  child = spawn(
    process.execPath,
    [path.join('node_modules', 'electron-vite', 'bin', 'electron-vite.js'), 'dev'],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NOTESAPP_HEALTH_FILE: HEALTH_MARKER }
    }
  )
  mainPid = child.pid
  child.stdout.on('data', (d) => (devOut += d.toString()))
  child.stderr.on('data', (d) => (devOut += d.toString()))
  child.on('error', (err) => {
    console.error(`[smoke] ✗ Failed to start electron-vite: ${err.message}`)
    process.exit(1)
  })
} else {
  console.log(`[smoke] Launching ${EXE}`)
  // IMPORTANT: do NOT pass windowsHide:true here. For a GUI-subsystem exe that flag
  // sets STARTF_USESHOWWINDOW|SW_HIDE on the process, and Windows honors that
  // show-state on the window's first ShowWindow call — which is exactly what
  // Electron's win.show() does — leaving the app window permanently invisible.
  child = spawn(EXE, [], {
    stdio: 'ignore',
    env: { ...process.env, NOTESAPP_HEALTH_FILE: HEALTH_MARKER }
  })
  mainPid = child.pid
  child.on('error', (err) => {
    console.error(`[smoke] ✗ Failed to spawn app: ${err.message}`)
    process.exit(1)
  })
}

// --- dev mode: wait for the renderer URL + probe it -----------------------

if (DEV_MODE) {
  const serverDeadline = Date.now() + SERVER_TIMEOUT_MS
  while (Date.now() < serverDeadline) {
    if (child.exitCode !== null) {
      fail('electron-vite dev exited before the dev server became ready', appState(), false, devOut.split('\n').slice(-6).join('\n'))
    }
    // Strip ANSI color codes first — vite interleaves them inside the URL
    // (e.g. http://localhost:\x1b[1m5173\x1b[22m/) which breaks a plain match.
    const m = devOut.replace(/\x1b\[[0-9;]*m/g, '').match(/http:\/\/(?:localhost|127\.0\.0\.1):\d+/)
    if (m) {
      const url = m[0]
      try {
        const res = await fetch(url + '/')
        if (res.ok) {
          devServerUrl = url
          break
        }
      } catch {
        /* server not answering yet */
      }
    }
    await sleep(500)
  }
  if (!devServerUrl) {
    fail(
      `vite dev server did not become ready within ${SERVER_TIMEOUT_MS / 1000}s`,
      appState(),
      false,
      devOut.split('\n').slice(-6).join('\n')
    )
  }
  console.log(`[smoke] ✓ Dev server ready at ${devServerUrl} (${((Date.now() - launchTime) / 1000).toFixed(1)}s)`)
}

// --- phase 1: renderer health ping ----------------------------------------

let state = appState()
let pinged = false
const pingDeadline = Date.now() + PING_TIMEOUT_MS
while (Date.now() < pingDeadline) {
  await sleep(POLL_MS)
  state = appState()
  pinged = markerWrittenSince(launchTime)
  if (pinged) break
}

// --- phase 2: visible window ----------------------------------------------

let windowSeen = false
const windowDeadline = Date.now() + WINDOW_TIMEOUT_MS
while (Date.now() < windowDeadline) {
  await sleep(POLL_MS)
  state = appState()
  windowSeen = state.windows.some((w) => w.handle !== 0 && w.title === WINDOW_TITLE)
  if (windowSeen && state.count >= MIN_PROCESSES) break
}

// --- cleanup ---------------------------------------------------------------

try {
  execFileSync('taskkill', ['/PID', String(mainPid), '/T', '/F'], { stdio: 'ignore' })
} catch {
  try {
    execFileSync('taskkill', ['/IM', 'NotesApp.exe', '/F'], { stdio: 'ignore' })
  } catch {
    /* already gone */
  }
}

// --- assertions ------------------------------------------------------------

const logAfter = logSize()
const logGrew = logAfter > logBefore

if (!pinged) {
  fail(
    `renderer never became ready — no health ping within ${PING_TIMEOUT_MS / 1000}s (bundle likely crashed or the preload bridge failed)`,
    state,
    logGrew
  )
}
if (!windowSeen) {
  fail(
    `renderer is alive but the "${WINDOW_TITLE}" window never appeared within ${WINDOW_TIMEOUT_MS / 1000}s (window creation or paint failed)`,
    state,
    logGrew
  )
}
if (state.count < MIN_PROCESSES) {
  fail(`expected at least ${MIN_PROCESSES} processes (main + helpers + renderer), found ${state.count}`, state, logGrew)
}
if (logGrew) {
  fail('startup-error.log was written during launch', state, logGrew)
}

const win = state.windows.find((w) => w.handle !== 0 && w.title === WINDOW_TITLE)
console.log(`[smoke] ✓ Renderer pinged (health marker written ${((Date.now() - launchTime) / 1000).toFixed(1)}s after launch)`)
console.log(`[smoke] ✓ Window appeared: title="${win.title}" handle=${win.handle} pid=${win.id}`)
console.log(`[smoke] ✓ Healthy process tree (${state.count} processes: main + gpu/network + renderer)`)
console.log(`[smoke] ✓ No startup errors logged`)
console.log(`[smoke] PASS`)
process.exit(0)
