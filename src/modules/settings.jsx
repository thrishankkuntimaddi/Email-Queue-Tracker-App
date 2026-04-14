import { useState } from 'react'
import {
  RefreshCw, LogOut, Trash2, ShieldAlert, CheckCircle,
  Upload, Copy, HardDriveDownload, X, Download, Check
} from 'lucide-react'
import { signOut, deleteAccount }  from '../lib/auth.js'
import { deleteAllUserData }        from '../lib/db.js'
import {
  isLive, formatDisplay, safeCopyToClipboard,
  parseBulkText, parseBackupJSON,
} from '../lib/helpers.js'

// ── SettingsModule ─────────────────────────────────────────────────────────────
// All action buttons live here:
//   • Import Emails
//   • Export (copy to clipboard)
//   • Download JSON Backup
//   • Clear All Queue
//   • Sync Now
//   • Sign Out
//   • Delete Account
// ──────────────────────────────────────────────────────────────────────────────
export default function SettingsModule({ user, syncNow, emails, importEmails, clearAll }) {
  // ── Sync ──────────────────────────────────────────────────────────────────
  const [syncing,  setSyncing]  = useState(false)
  const [syncDone, setSyncDone] = useState(false)

  // ── Import ─────────────────────────────────────────────────────────────────
  const [showImportPanel, setShowImportPanel] = useState(false)
  const [importMode,      setImportMode]      = useState('paste') // 'paste' | 'upload'
  const [bulkText,        setBulkText]        = useState('')

  // ── Export ─────────────────────────────────────────────────────────────────
  const [copySuccess,  setCopySuccess]  = useState(false)

  // ── Clear All ──────────────────────────────────────────────────────────────
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing,     setClearing]     = useState(false)

  // ── Auth ───────────────────────────────────────────────────────────────────
  const [loggingOut,  setLoggingOut]  = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(false)
  const [deleting,    setDeleting]    = useState(false)

  // ── Shared error ───────────────────────────────────────────────────────────
  const [error, setError] = useState('')

  // ── Action handlers ────────────────────────────────────────────────────────

  const handleSync = async () => {
    setSyncing(true); setError('')
    try {
      await syncNow()
      setSyncDone(true)
      setTimeout(() => setSyncDone(false), 3000)
    } catch { setError('Sync failed. Check your connection.') }
    finally { setSyncing(false) }
  }

  const handleImportBulk = async () => {
    const parsed = parseBulkText(bulkText)
    if (!parsed.length) return
    await importEmails(parsed)
    setBulkText(''); setShowImportPanel(false)
  }

  const handleImportJSON = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const parsed = parseBackupJSON(JSON.parse(e.target.result))
        await importEmails(parsed)
        setShowImportPanel(false); setImportMode('paste')
      } catch {
        alert('Invalid backup file. Please upload a valid email-cooldown-backup.json')
      }
    }
    reader.readAsText(file)
  }

  const handleExport = async () => {
    if (!emails.length) return
    const text = emails
      .map((r, i) => `${i + 1} - ${r.email} - ${isLive(r.timestamp) ? 'LIVE' : formatDisplay(r.timestamp)}`)
      .join('\n')
    const ok = await safeCopyToClipboard(text)
    if (ok) { setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2500) }
  }

  const handleBackup = () => {
    if (!emails.length) return
    const payload = emails.map(({ email, timestamp, order, group }) => ({
      email, timestamp, order,
      ...(group !== undefined ? { group } : {}),
    }))
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'email-cooldown-backup.json'; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const handleClearAll = async () => {
    if (!confirmClear) { setConfirmClear(true); return }
    setClearing(true); setError('')
    try {
      await clearAll()
      setConfirmClear(false)
    } catch { setError('Clear failed. Try again.') }
    finally { setClearing(false) }
  }

  const handleLogout = async () => {
    setLoggingOut(true); setError('')
    try { await signOut() }
    catch { setError('Logout failed.'); setLoggingOut(false) }
  }

  const handleDeleteAccount = async () => {
    if (!confirmDel) { setConfirmDel(true); return }
    setDeleting(true); setError('')
    try {
      await deleteAllUserData(user.uid)
      await deleteAccount(user)
    } catch (err) {
      setError(err.code === 'auth/requires-recent-login'
        ? 'Please sign out and sign in again, then try deleting.'
        : 'Delete failed. Try again.')
      setDeleting(false); setConfirmDel(false)
    }
  }

  // ── Section wrapper ────────────────────────────────────────────────────────
  const Section = ({ title, children, danger }) => (
    <div className={`bg-zinc-900 rounded-xl border ${danger ? 'border-red-900/40' : 'border-zinc-800'} p-5`}>
      <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${danger ? 'text-red-500' : 'text-zinc-500'}`}>
        {title}
      </h3>
      {children}
    </div>
  )

  // ── ActionBtn helper ───────────────────────────────────────────────────────
  const ActionBtn = ({ onClick, disabled, icon: Icon, children, variant = 'default' }) => {
    const base = 'flex items-center gap-2.5 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed'
    const styles = {
      default: `${base} border border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100`,
      indigo:  `${base} border border-indigo-700/50 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/50 hover:text-indigo-200`,
      red:     `${base} border border-red-900/50 bg-red-950/30 text-red-400 hover:bg-red-900/40 hover:text-red-300`,
    }
    return (
      <button onClick={onClick} disabled={disabled} className={styles[variant]}>
        <Icon className="w-4 h-4 shrink-0" />
        {children}
      </button>
    )
  }

  return (
    <div className="max-w-lg space-y-4 px-4 md:px-0">

      {/* ── Account info ──────────────────────────────────────────────────── */}
      <Section title="Account">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm shrink-0">
            {(user?.email?.[0] ?? '?').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-200 truncate">{user?.email}</p>
            <p className="text-xs text-zinc-600 mt-0.5">
              {user?.emailVerified
                ? <span className="text-emerald-500">✓ Verified</span>
                : <span className="text-amber-500">⚠ Not verified</span>}
            </p>
          </div>
        </div>
        <ActionBtn icon={LogOut} onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? 'Signing out…' : 'Sign Out'}
        </ActionBtn>
      </Section>

      {/* ── Data actions ──────────────────────────────────────────────────── */}
      <Section title="Email Queue">
        <div className="space-y-2.5">

          {/* Import */}
          <ActionBtn icon={Upload} onClick={() => setShowImportPanel(v => !v)} variant="indigo">
            Import Emails
          </ActionBtn>

          {/* Import panel (inline) */}
          {showImportPanel && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden mt-1">
              {/* Tab switcher */}
              <div className="flex gap-1 p-3 border-b border-zinc-800">
                {['paste', 'upload'].map(m => (
                  <button
                    key={m}
                    onClick={() => setImportMode(m)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      importMode === m
                        ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {m === 'paste' ? 'Paste Text' : 'Upload JSON'}
                  </button>
                ))}
              </div>

              <div className="p-3 space-y-3">
                {importMode === 'paste' ? (
                  <>
                    <p className="text-[10px] text-zinc-600 leading-relaxed">
                      One email per line: <code className="bg-zinc-800 px-1 rounded">01 - email@gmail.com - 3/12/2026, 1:28:16 PM</code><br />
                      Separate groups: <code className="bg-zinc-800 px-1 rounded">——————</code>
                    </p>
                    <textarea
                      rows={6}
                      value={bulkText}
                      onChange={e => setBulkText(e.target.value)}
                      placeholder={'01 - email@gmail.com - 3/12/2026, 1:28:16 PM\n02 - other@gmail.com - LIVE\n——————\n03 - backup@gmail.com - 3/14/2026, 6:25:18 PM'}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-indigo-500 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleImportBulk}
                        disabled={!bulkText.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition disabled:opacity-40"
                      >
                        <Download className="w-3.5 h-3.5" /> Load
                      </button>
                      <button
                        onClick={() => { setShowImportPanel(false); setBulkText('') }}
                        className="px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 text-xs transition hover:text-zinc-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zinc-800 hover:border-indigo-700 rounded-xl py-8 cursor-pointer transition-colors group">
                      <HardDriveDownload className="w-7 h-7 text-zinc-700 group-hover:text-indigo-500 transition-colors" />
                      <span className="text-xs font-medium text-zinc-500">Click to choose file</span>
                      <span className="text-[10px] text-zinc-700">email-cooldown-backup.json</span>
                      <input type="file" accept=".json,application/json" className="hidden" onChange={e => handleImportJSON(e.target.files?.[0])} />
                    </label>
                    <button onClick={() => { setShowImportPanel(false); setImportMode('paste') }} className="px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 text-xs transition hover:text-zinc-200">
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Export */}
          <ActionBtn icon={copySuccess ? Check : Copy} onClick={handleExport} disabled={!emails.length}>
            {copySuccess ? 'Copied to clipboard!' : 'Export (copy to clipboard)'}
          </ActionBtn>

          {/* Backup download */}
          <ActionBtn icon={HardDriveDownload} onClick={handleBackup} disabled={!emails.length}>
            Download JSON Backup
          </ActionBtn>

        </div>
      </Section>

      {/* ── Sync ──────────────────────────────────────────────────────────── */}
      <Section title="Sync">
        <p className="text-xs text-zinc-600 mb-3">Force-fetch the latest data from Firestore.</p>
        <ActionBtn icon={syncing ? RefreshCw : (syncDone ? CheckCircle : RefreshCw)} onClick={handleSync} disabled={syncing}>
          <span className={syncing ? 'animate-pulse' : ''}>
            {syncing ? 'Syncing…' : syncDone ? 'Synced!' : 'Sync Now'}
          </span>
        </ActionBtn>
      </Section>

      {/* ── Danger zone ───────────────────────────────────────────────────── */}
      <Section title="⚠ Danger Zone" danger>
        <div className="space-y-2.5">
          {error && (
            <div className="flex items-start gap-2 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2.5 text-xs text-red-400 mb-3">
              <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Clear all queue */}
          {confirmClear && (
            <div className="flex items-center gap-2 bg-amber-950/30 border border-amber-900/40 rounded-lg px-3 py-2.5 text-xs text-amber-400 mb-2">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              This will permanently delete all {emails.length} emails from your queue.
            </div>
          )}
          <ActionBtn icon={X} onClick={handleClearAll} disabled={clearing || !emails.length} variant="red">
            {clearing ? 'Clearing…' : confirmClear ? `Yes, Clear All (${emails.length} emails)` : 'Clear All Emails'}
          </ActionBtn>
          {confirmClear && !clearing && (
            <button onClick={() => setConfirmClear(false)} className="text-xs text-zinc-600 hover:text-zinc-400 px-1 transition">
              Cancel
            </button>
          )}

          {/* Delete account */}
          {confirmDel && (
            <div className="flex items-start gap-2 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2.5 text-xs text-red-400 mt-1">
              <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              This permanently deletes your account and all data. There is no going back.
            </div>
          )}
          <ActionBtn icon={Trash2} onClick={handleDeleteAccount} disabled={deleting} variant="red">
            {deleting ? 'Deleting…' : confirmDel ? 'Yes, Delete My Account' : 'Delete Account'}
          </ActionBtn>
          {confirmDel && !deleting && (
            <button onClick={() => setConfirmDel(false)} className="text-xs text-zinc-600 hover:text-zinc-400 px-1 transition">
              Cancel
            </button>
          )}
        </div>
      </Section>

    </div>
  )
}
