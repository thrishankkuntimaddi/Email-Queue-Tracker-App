import { useState, useMemo, useEffect, useRef } from 'react'
import { Zap, X, Search, Upload, Download, HardDriveDownload, Pencil, Check, Mail } from 'lucide-react'
import {
  getEnrichedSorted,
  formatDisplay,
  getRemaining,
  getPriorityGroup,
  parseBulkText,
  parseBackupJSON,
} from '../lib/helpers.js'

// ── QueueModule ────────────────────────────────────────────────────────────────
// Desktop → table layout   Mobile → card layout
// Includes a "Currently Using" bar at the TOP so clicking Use on any row
// shows the input inline on the same page (no tab switch needed).
// ──────────────────────────────────────────────────────────────────────────────
export default function QueueModule({
  emails,
  currentUsing,
  tick,
  importEmails,
  useEmail,
  editEmail,
  deleteEmail,
  confirmUse,
  clearCurrentUsing,
  showImport,
  setShowImport,
}) {
  // ── Local state ──────────────────────────────────────────────────────────────
  const [inputTime,    setInputTime]    = useState('')
  const [searchQuery,  setSearchQuery]  = useState('')
  const [importMode,   setImportMode]   = useState('paste') // 'paste' | 'upload'
  const [bulkText,     setBulkText]     = useState('')
  const [editingRowId, setEditingRowId] = useState(null)
  const [editingTime,  setEditingTime]  = useState('')
  const [flashRow,     setFlashRow]     = useState(null)
  const prevLiveRef = useRef({})

  // Clear inputTime when currentUsing changes (e.g. from another device)
  useEffect(() => {
    if (!currentUsing) setInputTime('')
  }, [currentUsing])

  // ── Derived data ──────────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sorted = useMemo(() => getEnrichedSorted(emails), [emails, tick])

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter(r => r.email.toLowerCase().includes(q))
  }, [sorted, searchQuery])

  const usingEmailObj = emails.find(e => e.id === currentUsing) ?? null

  // ── Flash row when it turns LIVE ─────────────────────────────────────────────
  useEffect(() => {
    sorted.forEach(row => {
      const wasLive = prevLiveRef.current[row.id]
      if (!wasLive && row.live) {
        setFlashRow(row.id)
        setTimeout(() => setFlashRow(null), 2000)
      }
      prevLiveRef.current[row.id] = row.live
    })
  }, [sorted])

  // ── Currently Using actions ───────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!usingEmailObj || !inputTime.trim()) return
    await confirmUse(usingEmailObj.id, inputTime.trim())
    setInputTime('')
  }

  const handleClearUsing = async () => {
    await clearCurrentUsing()
    setInputTime('')
  }

  // ── Import actions ─────────────────────────────────────────────────────────
  const handleImportBulk = async () => {
    const parsed = parseBulkText(bulkText)
    if (!parsed.length) return
    await importEmails(parsed)
    setBulkText('')
    setShowImport(false)
  }

  const handleImportJSON = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const parsed = parseBackupJSON(JSON.parse(e.target.result))
        await importEmails(parsed)
        setShowImport(false)
        setImportMode('paste')
      } catch {
        alert('Invalid backup file. Please upload a valid email-cooldown-backup.json')
      }
    }
    reader.readAsText(file)
  }

  // ── Inline edit ───────────────────────────────────────────────────────────────
  const startEdit = (row) => {
    setEditingRowId(row.id)
    setEditingTime(row.timestamp === 'LIVE' ? '' : row.timestamp)
  }
  const saveEdit = async (id) => {
    const val = editingTime.trim()
    if (!val) return
    await editEmail(id, val)
    setEditingRowId(null)
    setEditingTime('')
  }
  const cancelEdit = () => { setEditingRowId(null); setEditingTime('') }

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Currently Using bar — visible whenever an email is active ──────── */}
      {(usingEmailObj || currentUsing) && (
        <div className="bg-indigo-950/30 border border-indigo-700/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-semibold text-indigo-400">Currently Using</span>
          </div>
          {/* Email being used */}
          <div className="text-sm font-medium text-zinc-100 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 truncate">
            {usingEmailObj?.email ?? '—'}
          </div>
          {/* Timestamp input + actions */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Cooldown time — e.g. 3/17/2026, 10:35:57 PM"
              value={inputTime}
              onChange={e => setInputTime(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition min-w-0"
            />
            <button
              onClick={handleConfirm}
              disabled={!inputTime.trim()}
              className="shrink-0 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Done
            </button>
            <button
              onClick={handleClearUsing}
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Import panel ──────────────────────────────────────────────────── */}
      {showImport && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <span className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <Upload className="w-4 h-4 text-indigo-400" /> Import Emails
            </span>
            <button
              onClick={() => { setShowImport(false); setBulkText(''); setImportMode('paste') }}
              className="p-1 rounded text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 px-5 pt-4">
            {['paste', 'upload'].map(m => (
              <button
                key={m}
                onClick={() => setImportMode(m)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                  importMode === m
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {m === 'paste' ? 'Paste Text' : 'Upload JSON'}
              </button>
            ))}
          </div>

          <div className="px-5 py-4 space-y-3">
            {importMode === 'paste' ? (
              <>
                <p className="text-xs text-zinc-600">
                  One email per line:{' '}
                  <code className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-400">
                    01 - email@gmail.com - 3/12/2026, 1:28:16 PM
                  </code>
                  <br />
                  Separate priority groups with:{' '}
                  <code className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-400">——————</code>
                </p>
                <textarea
                  rows={8}
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  placeholder={'01 - email@gmail.com - 3/12/2026, 1:28:16 PM\n02 - other@gmail.com - LIVE\n——————————\n03 - backup@gmail.com - 3/14/2026, 6:25:18 PM'}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-xs font-mono text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 resize-none transition"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleImportBulk}
                    disabled={!bulkText.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition disabled:opacity-40"
                  >
                    <Download className="w-4 h-4" /> Load
                  </button>
                  <button
                    onClick={() => { setShowImport(false); setBulkText('') }}
                    className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-sm transition"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-zinc-600">
                  Upload a{' '}
                  <code className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-400">email-cooldown-backup.json</code>{' '}
                  file downloaded via the Backup button.
                </p>
                <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-zinc-800 hover:border-indigo-700 rounded-xl py-10 cursor-pointer transition-colors group">
                  <HardDriveDownload className="w-8 h-8 text-zinc-700 group-hover:text-indigo-500 transition-colors" />
                  <span className="text-sm font-medium text-zinc-500">Click to choose backup file</span>
                  <span className="text-xs text-zinc-700">email-cooldown-backup.json</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={e => handleImportJSON(e.target.files?.[0])}
                  />
                </label>
                <button
                  onClick={() => { setShowImport(false); setImportMode('paste') }}
                  className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-sm transition"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Queue card ─────────────────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-zinc-200">Email Queue</h2>
            <span className="text-xs text-zinc-600">
              {filteredRows.length === sorted.length
                ? `${sorted.length} total`
                : `${filteredRows.length} / ${sorted.length}`}
            </span>
          </div>
        </div>

        {/* Search */}
        {sorted.length > 0 && (
          <div className="relative px-5 py-3 border-b border-zinc-800">
            <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search emails…"
              className="w-full pl-8 pr-8 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Empty states */}
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-700">
            <Mail className="w-10 h-10 opacity-30" />
            <p className="text-sm">No emails yet. Use Import in Settings to add some.</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-zinc-700">
            <Search className="w-8 h-8 opacity-30" />
            <p className="text-sm">No emails match "{searchQuery}"</p>
            <button onClick={() => setSearchQuery('')} className="text-xs text-indigo-400 hover:underline">
              Clear search
            </button>
          </div>
        ) : (
          <>
            {/* ── DESKTOP TABLE ───────────────────────────────────────────── */}
            <div className="hidden md:block">
              <div className="grid grid-cols-12 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 px-5 py-2.5 border-b border-zinc-800 bg-zinc-950/50">
                <div className="col-span-1">#</div>
                <div className="col-span-4">Email</div>
                <div className="col-span-2">Priority</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Countdown</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              <div className="divide-y divide-zinc-800/60">
                {filteredRows.map(row => {
                  const isEditing = editingRowId === row.id
                  const isUsing   = currentUsing === row.id
                  const flash     = flashRow === row.id
                  const fullIndex = sorted.indexOf(row)
                  const priority  = getPriorityGroup(fullIndex + 1, row.group)

                  return (
                    <div
                      key={row.id}
                      className={[
                        'grid grid-cols-12 gap-2 px-5 py-3 items-center transition-all duration-200',
                        isUsing   ? 'bg-indigo-950/20' : '',
                        isEditing ? 'bg-violet-950/20' : '',
                        !isUsing && !isEditing ? 'hover:bg-zinc-800/30' : '',
                        flash     ? 'flash-row' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <div className="col-span-1 text-xs font-bold text-zinc-600">{fullIndex + 1}</div>
                      <div className="col-span-4 truncate text-sm font-medium text-zinc-200">{row.email}</div>
                      <div className="col-span-2">
                        {priority && (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${priority.tw}`}>
                            {priority.label}
                          </span>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="col-span-4 flex items-center gap-1.5">
                          <input
                            autoFocus
                            type="text"
                            value={editingTime}
                            onChange={e => setEditingTime(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveEdit(row.id)
                              if (e.key === 'Escape') cancelEdit()
                            }}
                            placeholder="3/17/2026, 10:35:57 PM or LIVE"
                            className="flex-1 min-w-0 text-xs px-2 py-1 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-600 outline-none ring-2 ring-violet-500/40 font-mono"
                          />
                          <button onClick={() => saveEdit(row.id)} disabled={!editingTime.trim()} className="p-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40 transition">
                            <Check className="w-3 h-3" />
                          </button>
                          <button onClick={cancelEdit} className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="col-span-2 text-sm">
                            {row.live
                              ? <span className="inline-flex items-center gap-1 bg-indigo-500/10 border border-indigo-700/50 rounded-full px-2 py-0.5 text-[10px] font-bold text-indigo-400">LIVE</span>
                              : <span className="text-xs text-zinc-500 leading-tight">{formatDisplay(row.timestamp)}</span>
                            }
                          </div>
                          <div className={`col-span-2 text-xs font-mono font-semibold ${row.live ? 'text-indigo-400' : 'text-violet-400'}`}>
                            {row.live ? '✓ READY' : getRemaining(row.timestamp)}
                          </div>
                        </>
                      )}

                      {!isEditing && (
                        <div className="col-span-1 flex items-center gap-1 justify-end">
                          {row.live && (
                            <button onClick={() => useEmail(row.id)} className="h-6 px-2 text-[10px] rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition">
                              Use
                            </button>
                          )}
                          <button onClick={() => startEdit(row)} className="p-1 rounded text-zinc-600 hover:text-violet-400 hover:bg-violet-900/30 transition" title="Edit timestamp">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteEmail(row.id)} className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-950/30 transition" title="Delete">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── MOBILE CARDS ────────────────────────────────────────────── */}
            <div className="md:hidden divide-y divide-zinc-800/60">
              {filteredRows.map(row => {
                const isEditing = editingRowId === row.id
                const isUsing   = currentUsing === row.id
                const fullIndex = sorted.indexOf(row)
                const priority  = getPriorityGroup(fullIndex + 1, row.group)

                return (
                  <div
                    key={row.id}
                    className={[
                      'px-4 py-3.5 transition-colors',
                      isUsing   ? 'bg-indigo-950/20' : '',
                      isEditing ? 'bg-violet-950/20' : '',
                      !isUsing && !isEditing ? 'hover:bg-zinc-800/30' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-100 truncate">{row.email}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {priority && (
                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${priority.tw}`}>
                              {priority.label}
                            </span>
                          )}
                          {row.live
                            ? <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold bg-indigo-500/10 border border-indigo-700/50 text-indigo-400">LIVE</span>
                            : <span className="text-[10px] font-mono text-violet-400 font-semibold">{getRemaining(row.timestamp)}</span>
                          }
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {row.live && !isEditing && (
                          <button
                            onClick={() => useEmail(row.id)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
                          >
                            Use
                          </button>
                        )}
                        {!isEditing && (
                          <button onClick={() => startEdit(row)} className="p-1.5 rounded-lg text-zinc-600 hover:text-violet-400 hover:bg-violet-900/30 transition">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!isEditing && (
                          <button onClick={() => deleteEmail(row.id)} className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-950/30 transition">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mobile inline edit */}
                    {isEditing && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={editingTime}
                          onChange={e => setEditingTime(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEdit(row.id)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                          placeholder="3/17/2026, 10:35:57 PM or LIVE"
                          className="flex-1 text-xs px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-600 outline-none ring-2 ring-violet-500/40 font-mono"
                        />
                        <button onClick={() => saveEdit(row.id)} disabled={!editingTime.trim()} className="p-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={cancelEdit} className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
