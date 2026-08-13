// Regression tests for the database layer.
//
// The two bugs fixed earlier lived here:
//   1. seedSettings() reused one prepared statement for all 18 default
//      settings, but the wrapper freed the statement after every call, so
//      the 2nd INSERT threw sql.js "Statement closed" and the app never
//      opened a window.
//   2. The same reuse pattern existed in softDeleteNotes / restoreNotes /
//      duplicateCollection / reorderCollections.
//
// These tests run under plain `node --test` (no Electron): src/main/db.ts is
// compiled to a standalone CJS module with esbuild, and the data directory is
// pointed at a fresh temp dir via NOTESAPP_DATA_DIR so Electron's app.getPath
// is never touched.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import * as esbuild from 'esbuild'

const require = createRequire(import.meta.url)
// Compiled output lives OUTSIDE test/ — `node --test` treats every .js/.cjs/.mjs
// under a test/ directory as a test file, which would re-run the compiled module.
// Absolute so esbuild's outfile (cwd-relative) and require.resolve
// (test-module-relative) agree on the location.
const CACHE_DIR = path.join(process.cwd(), '.test-cache')
const OUT_FILE = path.join(CACHE_DIR, 'db.cjs')

fs.rmSync(CACHE_DIR, { recursive: true, force: true })
await esbuild.build({
  entryPoints: ['src/main/db.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  external: ['electron', 'sql.js'],
  outfile: OUT_FILE,
  logLevel: 'silent'
})

/** Load a fresh copy of the db module against a fresh, isolated data dir. */
function loadFreshDb() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'notesapp-db-test-'))
  process.env['NOTESAPP_DATA_DIR'] = dataDir
  delete require.cache[require.resolve(OUT_FILE)]
  return { mod: require(OUT_FILE), dataDir }
}

after(() => {
  delete process.env['NOTESAPP_DATA_DIR']
  fs.rmSync(CACHE_DIR, { recursive: true, force: true })
})

test('getDb() seeds every default setting without crashing (startup regression)', async () => {
  const { mod } = loadFreshDb()
  await mod.warmUpDatabase()

  // THE regression: seedSettings() used to throw "Statement closed" on the
  // second INSERT because the prepared statement was freed after each run.
  assert.doesNotThrow(() => mod.getDb())

  const rows = mod.getDb().prepare('SELECT key, value FROM settings').all()
  const expectedKeys = Object.keys(mod.DEFAULT_SETTINGS)
  assert.equal(rows.length, expectedKeys.length, 'every default setting row exists')
  for (const key of expectedKeys) {
    const row = rows.find((r) => r.key === key)
    assert.ok(row, `settings row for "${key}" should exist`)
    assert.equal(row.value, mod.DEFAULT_SETTINGS[key], `value for "${key}"`)
  }
  mod.closeDb()
})

test('a prepared statement can be reused in a loop (wrapper regression)', async () => {
  const { mod } = loadFreshDb()
  await mod.warmUpDatabase()
  const db = mod.getDb()

  // Same shape as the original crash sites: one prepared statement driven in
  // a loop. Both insert and update reuse the same wrapper object.
  const insert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
  for (const key of ['loop.a', 'loop.b', 'loop.c']) insert.run(key, '0')

  const update = db.prepare('UPDATE settings SET value = ? WHERE key = ?')
  for (const key of ['loop.a', 'loop.b', 'loop.c']) update.run('1', key)

  const rows = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'loop.%' ORDER BY key").all()
  assert.deepEqual(
    rows.map((r) => [r.key, r.value]),
    [
      ['loop.a', '1'],
      ['loop.b', '1'],
      ['loop.c', '1']
    ]
  )
  mod.closeDb()
})

test('getDb() is idempotent and data survives close/reopen', async () => {
  const { mod } = loadFreshDb()
  await mod.warmUpDatabase()

  assert.equal(mod.getDb(), mod.getDb(), 'second getDb() returns the same instance')

  const before = mod.getDb().prepare('SELECT COUNT(*) AS c FROM settings').get().c
  mod.closeDb()

  // Reopening must re-read from disk and keep the seeded settings.
  const after = mod.getDb().prepare('SELECT COUNT(*) AS c FROM settings').get().c
  assert.equal(after, before)
  assert.ok(after >= Object.keys(mod.DEFAULT_SETTINGS).length)
  mod.closeDb()
})
