import { useState } from 'react'
import {
  Bell,
  Database,
  FileText,
  FolderCog,
  Keyboard,
  Languages,
  Monitor,
  Palette,
  Shield,
  Trash2
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { cx } from '@/lib/utils'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

const ACCENTS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f97316', '#ef4444', '#ec4899', '#06b6d4', '#eab308', '#14b8a6', '#f43f5e']
const FONTS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Segoe UI', label: 'Segoe UI' },
  { value: 'Courier New', label: 'Courier New' }
]
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Português' },
  { value: 'ru', label: 'Русский' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' }
]

const CATEGORIES = [
  { key: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
  { key: 'editor', label: 'Editor', icon: <FileText size={16} /> },
  { key: 'security', label: 'Security', icon: <Shield size={16} /> },
  { key: 'reminders', label: 'Reminders', icon: <Bell size={16} /> },
  { key: 'storage', label: 'Storage', icon: <Database size={16} /> },
  { key: 'language', label: 'Language', icon: <Languages size={16} /> },
  { key: 'shortcuts', label: 'Shortcuts', icon: <Keyboard size={16} /> },
  { key: 'about', label: 'About', icon: <Monitor size={16} /> }
]

export function SettingsPage(): JSX.Element {
  const settings = useAppStore((s) => s.settings)
  const update = useAppStore((s) => s.updateSettings)
  const toast = useAppStore((s) => s.toast)
  const refresh = useAppStore((s) => s.refreshCollections)
  const [cat, setCat] = useState('appearance')
  const [pin, setPin] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  if (!settings) return <></>

  const Row = ({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }): JSX.Element => (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-app-border px-4 py-3.5">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className="text-xs text-app-text-muted">{desc}</div>}
      </div>
      {children}
    </div>
  )

  return (
    <div className="flex gap-6">
      <div className="w-52 shrink-0 space-y-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCat(c.key)}
            className={cx(
              'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition',
              cat === c.key ? 'bg-app-accent/12 text-app-accent' : 'text-app-text-muted hover:bg-app-surface-2 hover:text-app-text'
            )}
          >
            {c.icon}
            {c.label}
          </button>
        ))}
      </div>

      <div className="min-w-0 flex-1 space-y-4">
        {cat === 'appearance' && (
          <>
            <h2 className="text-xl font-bold">Appearance</h2>
            <Row label="Theme" desc="Choose how NotesApp looks">
              <SegmentedControl
                value={settings.theme}
                onChange={(v) => void update({ theme: v })}
                options={[
                  { value: 'dark', label: 'Dark' },
                  { value: 'light', label: 'Light' },
                  { value: 'amoled', label: 'AMOLED' }
                ]}
              />
            </Row>
            <Row label="Accent color" desc="Used for buttons, highlights and active states">
              <div className="flex gap-2">
                {ACCENTS.map((c) => (
                  <button
                    key={c}
                    onClick={() => void update({ accent: c })}
                    className={cx('h-7 w-7 rounded-full transition-transform hover:scale-110', settings.accent === c && 'ring-2 ring-app-text ring-offset-2 ring-offset-app-surface')}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </Row>
            <Row label="Density" desc="Adjust spacing in note lists">
              <SegmentedControl
                value={settings.density}
                onChange={(v) => void update({ density: v })}
                options={[
                  { value: 'comfortable', label: 'Comfortable' },
                  { value: 'compact', label: 'Compact' }
                ]}
              />
            </Row>
          </>
        )}

        {cat === 'editor' && (
          <>
            <h2 className="text-xl font-bold">Editor</h2>
            <Row label="Font family">
              <select className="input-base !w-52" value={settings.editorFont} onChange={(e) => void update({ editorFont: e.target.value })}>
                {FONTS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </Row>
            <Row label="Font size" desc={`${settings.editorFontSize}px`}>
              <input
                type="range" min={12} max={26}
                value={settings.editorFontSize}
                onChange={(e) => void update({ editorFontSize: Number(e.target.value) })}
                className="w-48 accent-[var(--app-accent)]"
              />
            </Row>
            <Row label="Autosave" desc="How often notes are saved automatically">
              <SegmentedControl
                value={String(settings.autosave)}
                onChange={(v) => void update({ autosave: Number(v) })}
                options={[
                  { value: '5', label: '5s' },
                  { value: '10', label: '10s' },
                  { value: '30', label: '30s' },
                  { value: '0', label: 'Manual' }
                ]}
              />
            </Row>
            <Row label="Show checklist progress" desc="Display completion bars on note cards">
              <Toggle checked={settings.showChecklistProgress} onChange={(v) => void update({ showChecklistProgress: v })} />
            </Row>
          </>
        )}

        {cat === 'security' && (
          <>
            <h2 className="text-xl font-bold">Security</h2>
            <Row label="Lock the app" desc="Require a PIN to open NotesApp" >
              <Toggle checked={settings.lockApp} onChange={(v) => void update({ lockApp: v })} />
            </Row>
            {settings.lockApp && (
              <Row label="Change app PIN" desc="4-6 digit PIN used to unlock the app">
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    className="input-base !w-44"
                    maxLength={6}
                    placeholder="New PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  />
                  <button
                    className="btn-primary text-sm"
                    disabled={pin.length < 4}
                    onClick={() => {
                      void update({ appLockPin: pin })
                      toast('App PIN updated')
                      setPin('')
                    }}
                  >
                    Save PIN
                  </button>
                </div>
              </Row>
            )}
            <p className="px-1 text-xs text-app-text-muted">
              Notes locked individually are encrypted with AES-256-GCM. Their content is unreadable without the correct password or PIN.
            </p>
          </>
        )}

        {cat === 'reminders' && (
          <>
            <h2 className="text-xl font-bold">Reminders</h2>
            <Row label="Reminder notifications" desc="NotesApp will show desktop notifications for note reminders">
              <span className="flex items-center gap-1.5 rounded-lg bg-app-success/15 px-2.5 py-1 text-xs font-medium text-app-success">
                <Bell size={13} /> Enabled
              </span>
            </Row>
            <p className="px-1 text-xs text-app-text-muted">
              Set a reminder from any note via the note menu or the editor toolbar. Repeating reminders are supported.
            </p>
          </>
        )}

        {cat === 'storage' && (
          <>
            <h2 className="text-xl font-bold">Storage</h2>
            <Row label="Trash retention" desc="Notes are auto-deleted from trash after this many days">
              <select
                className="input-base !w-44"
                value={settings.trashDays}
                onChange={(e) => void update({ trashDays: Number(e.target.value) })}
              >
                {[7, 14, 30, 60, 90].map((d) => (
                  <option key={d} value={d}>{d} days</option>
                ))}
              </select>
            </Row>
            <Row label="Confirm before deleting" desc="Ask for confirmation when moving notes to trash">
              <Toggle checked={settings.confirmDelete} onChange={(v) => void update({ confirmDelete: v })} />
            </Row>
            <Row label="Open data folder" desc="Where NotesApp stores the database and files">
              <button className="btn-ghost text-sm" onClick={() => void window.api.backup.openDataFolder()}>
                <FolderCog size={15} /> Open folder
              </button>
            </Row>
            <Row label="Clear all data" desc="Permanently delete every note, collection and setting">
              <button className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20" onClick={() => setConfirmClear(true)}>
                <Trash2 size={15} /> Clear all data
              </button>
            </Row>
          </>
        )}

        {cat === 'language' && (
          <>
            <h2 className="text-xl font-bold">Language</h2>
            <Row label="Interface language" desc="Affects the UI and default OCR language">
              <select className="input-base !w-56" value={settings.language} onChange={(e) => void update({ language: e.target.value })}>
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </Row>
          </>
        )}

        {cat === 'shortcuts' && (
          <>
            <h2 className="text-xl font-bold">Keyboard shortcuts</h2>
            <div className="space-y-1.5">
              {SHORTCUTS.map((s) => (
                <div key={s.keys} className="flex items-center justify-between rounded-xl border border-app-border px-4 py-2.5 text-sm">
                  <span className="text-app-text-muted">{s.action}</span>
                  <kbd className="rounded-lg bg-app-surface-2 px-2.5 py-1 font-mono text-xs">{s.keys}</kbd>
                </div>
              ))}
            </div>
          </>
        )}

        {cat === 'about' && (
          <>
            <h2 className="text-xl font-bold">About</h2>
            <div className="rounded-2xl border border-app-border bg-app-surface p-6 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl text-2xl text-white" style={{ background: 'linear-gradient(135deg, var(--app-accent), #22d3ee)' }}>
                N
              </div>
              <h3 className="text-lg font-bold">NotesApp</h3>
              <p className="mt-1 text-sm text-app-text-muted">Version {APP_VERSION}</p>
              <p className="mt-3 max-w-md text-xs leading-relaxed text-app-text-muted">
                A premium, offline-first knowledge management desktop application.
                All data stays on your device — no cloud, no accounts, full privacy.
              </p>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear all data?"
        message="This permanently deletes ALL notes, collections, attachments and settings. Create a backup first if you want to keep anything."
        confirmLabel="Delete everything"
        onCancel={() => setConfirmClear(false)}
        onConfirm={async () => {
          const all = await window.api.notes.list()
          await window.api.notes.purge(all.map((n) => n.id))
          await window.api.notes.list({ trashed: true }).then((t) => window.api.notes.purge(t.map((n) => n.id)))
          setConfirmClear(false)
          toast('All data cleared')
          void refresh()
        }}
      />
    </div>
  )
}

const SHORTCUTS = [
  { action: 'New note', keys: 'Ctrl + N' },
  { action: 'Save note', keys: 'Ctrl + S' },
  { action: 'Search', keys: 'Ctrl + F' },
  { action: 'Undo', keys: 'Ctrl + Z' },
  { action: 'Redo', keys: 'Ctrl + Shift + Z' },
  { action: 'Bold', keys: 'Ctrl + B' },
  { action: 'Italic', keys: 'Ctrl + I' },
  { action: 'Underline', keys: 'Ctrl + U' },
  { action: 'Strikethrough', keys: 'Ctrl + Shift + S' },
  { action: 'Add link', keys: 'Ctrl + K' },
  { action: 'Find & replace', keys: 'Ctrl + F' },
  { action: 'Settings', keys: 'Ctrl + ,' }
]

const APP_VERSION = '1.0.0'

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }): JSX.Element {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cx(
        'relative h-6 w-11 rounded-full transition-colors',
        checked ? 'bg-app-accent' : 'bg-app-surface-2'
      )}
    >
      <span
        className={cx(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
          checked ? 'left-[22px]' : 'left-0.5'
        )}
      />
    </button>
  )
}
