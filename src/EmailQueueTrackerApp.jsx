import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Check, Mail, Clock, Zap, Moon, Sun, Copy, Upload, Download, X, Search, HardDriveDownload } from 'lucide-react';

// ─── Storage keys ────────────────────────────────────────────────────────────
const STORAGE_KEY = 'email-simple-tracker';
const USING_KEY   = 'email-currently-using';
const DARK_KEY    = 'email-dark-mode';

// ─── FEATURE 1: SSR-safe localStorage helpers ────────────────────────────────
// Wraps all localStorage access so the app is safe in SSR environments (Vercel).
function lsGet(key) {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key, value) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, value); } catch {}
}
function lsRemove(key) {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(key); } catch {}
}

// ─── Priority group label map ────────────────────────────────────────────────
// The separator lines (——————) in the pasted import text define groups.
// Each group number maps to a human label + color scheme.
// User's groups from their data:
//   Group 1-2  → High Priority  (rows 01-04: personal primary accounts)
//   Group 3-4  → Secondary      (rows 05-08: thrishank/kthrishank variants)
//   Group 5-6  → System         (rows 09-11: ramadevipurna + chttrixchat)
//   Group 7    → Testing        (rows 12-21: Chttrixtest0–9)
//   Group 8+   → Backup         (rows 22-31: Chttrixtest10–19)
const GROUP_LABELS = {
  1: { label: 'High Priority', colors: 'bg-red-100 text-red-700' },
  2: { label: 'High Priority', colors: 'bg-red-100 text-red-700' },
  3: { label: 'Secondary',    colors: 'bg-amber-100 text-amber-700' },
  4: { label: 'Secondary',    colors: 'bg-amber-100 text-amber-700' },
  5: { label: 'System',       colors: 'bg-violet-100 text-violet-700' },
  6: { label: 'System',       colors: 'bg-violet-100 text-violet-700' },
  7: { label: 'Testing',      colors: 'bg-blue-100 text-blue-700' },
  8: { label: 'Backup',       colors: 'bg-slate-200 text-slate-600' },
};

// Returns a priority label for a row.
// Prefers the stored `group` field (set during import from separators).
// Falls back to position-based mapping for rows imported without group info.
function getPriorityGroup(position, group) {
  if (group !== undefined && GROUP_LABELS[group]) return GROUP_LABELS[group];
  // Fallback: derive from sorted position
  if (position <= 4)  return GROUP_LABELS[1];
  if (position <= 8)  return GROUP_LABELS[3];
  if (position <= 11) return GROUP_LABELS[5];
  if (position <= 21) return GROUP_LABELS[7];
  if (position <= 31) return GROUP_LABELS[8];
  return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function safeParseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDisplay(value) {
  const d = safeParseDate(value);
  if (!d) return value;
  return d.toLocaleString('en-US', {
    month: 'numeric', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit',
  });
}

function getRemaining(timestamp) {
  if (!timestamp || timestamp === 'LIVE') return '';
  const d = safeParseDate(timestamp);
  if (!d) return '';
  const diff = d.getTime() - Date.now();
  if (diff <= 0) return 'LIVE';
  const total = Math.floor(diff / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${m}m ${s}s`;
}

function isLive(timestamp) {
  if (!timestamp || timestamp === 'LIVE') return true;
  const d = safeParseDate(timestamp);
  if (!d) return true;
  return Date.now() >= d.getTime();
}

async function safeCopyToClipboard(text) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}
  window.prompt('Copy the text below:', text);
  return false;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function EmailQueueTrackerApp() {
  // ── State ──────────────────────────────────────────────────────────────────
  // FEATURE 1: Use SSR-safe lsGet() instead of direct localStorage access
  const [darkMode, setDarkMode] = useState(() => lsGet(DARK_KEY) === 'true');
  // FEATURE 3: Search query for filtering the email table
  const [searchQuery, setSearchQuery] = useState('');
  const [rows, setRows]         = useState([]);
  const [bulkText, setBulkText] = useState('');
  const [usingEmail, setUsingEmail] = useState(null);
  const [inputTime, setInputTime]   = useState('');
  const [showImport, setShowImport] = useState(false);
  // 'paste' shows the textarea; 'upload' shows the JSON file picker
  const [importMode, setImportMode] = useState('paste');
  const [flashRow, setFlashRow]     = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [tick, setTick] = useState(0);

  const rowRefs    = useRef({});
  const prevLiveRef = useRef({});

  // ── Persist dark-mode preference (FEATURE 1: SSR-safe) ──────────────────
  useEffect(() => { lsSet(DARK_KEY, darkMode); }, [darkMode]);

  // ── Guard: clear stale usingEmail if its row was deleted / rows cleared ──
  useEffect(() => {
    if (usingEmail && !rows.find((r) => r.id === usingEmail.id)) {
      setUsingEmail(null);
      setInputTime('');
    }
  }, [rows, usingEmail]);


  // ── 1-second ticker for countdowns ────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Load from localStorage on mount (FEATURE 1: SSR-safe) ───────────────
  useEffect(() => {
    const raw = lsGet(STORAGE_KEY);
    if (raw) { try { setRows(JSON.parse(raw)); } catch {} }
    const usingRaw = lsGet(USING_KEY);
    if (usingRaw) { try { setUsingEmail(JSON.parse(usingRaw)); } catch {} }
  }, []);

  // ── Persist rows & usingEmail on every change (FEATURE 1: SSR-safe) ──────
  useEffect(() => { lsSet(STORAGE_KEY, JSON.stringify(rows)); }, [rows]);

  useEffect(() => {
    if (usingEmail) lsSet(USING_KEY, JSON.stringify(usingEmail));
    else            lsRemove(USING_KEY);
  }, [usingEmail]);

  // ── Parse & load bulk import (separator-aware) ────────────────────────────
  // Separator lines (4+ em-dashes or regular dashes) increment the group counter.
  // Each parsed row stores its group number so priority labels survive
  // export → import cycles.
  const importBulk = () => {
    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((l) => !/^emails?/i.test(l));

    const parsed = [];
    let currentGroup = 1;
    let order = 0;

    lines.forEach((line) => {
      // Detect separator line: 4+ em-dashes (—) or regular dashes or mixed
      if (/^[\u2013\u2014\-]{4,}/.test(line)) {
        currentGroup++; // next group starts after this separator
        return;
      }

      // Split on ` - ` first (spaced hyphen) to handle timestamps like "1:05:38 PM"
      // that contain no hyphens. Fallback: plain hyphen split.
      let parts;
      if (line.includes(' - ')) {
        parts = line.split(' - ').map((p) => p.trim()).filter(Boolean);
      } else {
        parts = line.split('-').map((p) => p.trim()).filter(Boolean);
      }
      if (parts.length < 2) return;

      const email = parts[1];
      // Rejoin remaining parts in case timestamp contained " - "
      const tsRaw = parts.slice(2).join(' - ').trim() || 'LIVE';
      const ts    = tsRaw.toUpperCase() === 'LIVE' ? 'LIVE' : tsRaw;

      parsed.push({
        id: crypto.randomUUID(),
        email,
        timestamp: ts,
        order: order++,
        group: currentGroup,   // ← stored for priority label lookup
      });
    });

    setRows(parsed);
    setBulkText('');
    setShowImport(false);
  };

  // ── Load from uploaded JSON backup ────────────────────────────────────────
  const loadFromJSON = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) throw new Error('Not an array');
        const parsed = data.map((row, idx) => ({
          id: crypto.randomUUID(),
          email: String(row.email || ''),
          timestamp: String(row.timestamp || 'LIVE'),
          order: row.order ?? idx,
          // Preserve group if it was included in the backup
          ...(row.group !== undefined ? { group: row.group } : {}),
        })).filter((r) => r.email);
        setRows(parsed);
        setShowImport(false);
        setImportMode('paste'); // reset tab for next time
      } catch {
        alert('Invalid backup file. Please upload a valid email-cooldown-backup.json');
      }
    };
    reader.readAsText(file);
  };

  // ── Export to clipboard ────────────────────────────────────────────────────
  const exportData = async () => {
    const text = rows
      .map((row, i) => `${i + 1} - ${row.email} - ${isLive(row.timestamp) ? 'LIVE' : formatDisplay(row.timestamp)}`)
      .join('\n');
    const ok = await safeCopyToClipboard(text);
    if (ok) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // ── Download Backup as JSON file ──────────────────────────────────────────
  // Includes `group` field so priority labels are restored on import.
  const downloadBackup = () => {
    if (typeof window === 'undefined') return;
    const payload = rows.map(({ email, timestamp, order, group }) => ({
      email, timestamp, order,
      ...(group !== undefined ? { group } : {}),
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'email-cooldown-backup.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // ── Derive enriched + sorted rows ─────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const enrichedRows = useMemo(() => rows.map((r) => ({ ...r, live: isLive(r.timestamp) })), [rows, tick]);

  const sorted = useMemo(() => {
    return [...enrichedRows].sort((a, b) => {
      if (a.live && !b.live) return -1;
      if (!a.live && b.live) return 1;
      if (a.live && b.live) return (a.order ?? 0) - (b.order ?? 0);
      const ta = safeParseDate(a.timestamp)?.getTime() ?? Infinity;
      const tb = safeParseDate(b.timestamp)?.getTime() ?? Infinity;
      return ta - tb;
    });
  }, [enrichedRows]);

  // ── Flash row when it transitions to LIVE ─────────────────────────────────
  useEffect(() => {
    sorted.forEach((row) => {
      const wasLive = prevLiveRef.current[row.id];
      if (!wasLive && row.live) {
        setFlashRow(row.id);
        setTimeout(() => setFlashRow(null), 2000);
      }
      prevLiveRef.current[row.id] = row.live;
    });
  }, [sorted]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const liveCount     = sorted.filter((r) => r.live).length;
  const cooldownCount = sorted.length - liveCount;
  const nextEmail     = sorted.find((r) => r.live);
  const nextUpcoming  = sorted.find((r) => !r.live);
  const nextFiveLive  = sorted.filter((r) => r.live).slice(0, 5);   // up to 5 LIVE
  const nextFive      = sorted.filter((r) => !r.live).slice(0, 5);  // up to 5 on cooldown

  // ── FEATURE 3: Filtered rows for the table (does NOT affect stored data) ──
  // Case-insensitive search against email addresses only.
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((r) => r.email.toLowerCase().includes(q));
  }, [sorted, searchQuery]);

  // ── Confirm currently-using + timestamp ──────────────────────────────────
  const updateTimestamp = () => {
    if (!usingEmail || !inputTime) return;
    setRows((prev) =>
      prev.map((r) => r.id === usingEmail.id ? { ...r, timestamp: inputTime } : r)
    );
    setUsingEmail(null);
    setInputTime('');
  };

  // ── Delete a row ──────────────────────────────────────────────────────────
  const deleteRow = (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (usingEmail?.id === id) setUsingEmail(null);
  };

  // ── Clear all ────────────────────────────────────────────────────────────
  const clearAll = () => {
    if (window.confirm('Clear all emails from the queue?')) {
      setRows([]);
      setUsingEmail(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const dark = darkMode;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${dark ? 'bg-slate-950 text-slate-100' : 'bg-gradient-to-br from-slate-100 to-blue-50 text-slate-900'}`}>
      {/* Top banner gradient strip */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-violet-500 to-indigo-500" />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              Email Cooldown Dashboard
            </h1>
            <p className={`text-sm mt-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              Track email rate limits in real time · data survives refresh &amp; close
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setShowImport((s) => !s)}>
              <Upload className="w-4 h-4" /> Import
            </Button>
            <Button variant="outline" size="sm" onClick={exportData}>
              {copySuccess ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copySuccess ? 'Copied!' : 'Export'}
            </Button>
            {/* FEATURE 2: Download Backup button */}
            {rows.length > 0 && (
              <Button variant="outline" size="sm" onClick={downloadBackup} title="Download full backup as JSON">
                <HardDriveDownload className="w-4 h-4" /> Backup
              </Button>
            )}
            {rows.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearAll} className="text-red-500 border-red-300 hover:bg-red-50 dark:hover:bg-red-950">
                <X className="w-4 h-4" /> Clear All
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setDarkMode((d) => !d)}>
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {dark ? 'Light' : 'Dark'}
            </Button>
          </div>
        </div>

        {/* ── Stats Cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* LIVE count */}
          <Card className={dark ? 'bg-slate-900 border-slate-800' : 'bg-white'}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-green-100 dark:bg-green-900/30">
                <Zap className="text-green-500 w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{liveCount}</div>
                <div className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>LIVE Emails</div>
              </div>
            </CardContent>
          </Card>

          {/* Cooldown count */}
          <Card className={dark ? 'bg-slate-900 border-slate-800' : 'bg-white'}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                <Clock className="text-orange-500 w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{cooldownCount}</div>
                <div className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>On Cooldown</div>
              </div>
            </CardContent>
          </Card>

          {/* Next upcoming */}
          <Card className={dark ? 'bg-slate-900 border-slate-800' : 'bg-white'}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <Mail className="text-blue-500 w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className={`text-xs mb-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Next Unlocking</div>
                <div className="text-sm font-semibold truncate">{nextUpcoming ? nextUpcoming.email : '—'}</div>
                {nextUpcoming && (
                  <div className="text-xs text-orange-500 font-medium">{getRemaining(nextUpcoming.timestamp)}</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Currently Using — always-visible horizontal bar ──────────── */}
        <Card className={`border-blue-400 ${dark ? 'bg-blue-950/20' : 'bg-blue-50'}`}>
          <CardContent className="p-3 flex flex-wrap items-center gap-3">
            {/* Label */}
            <span className={`flex items-center gap-1.5 text-sm font-semibold shrink-0 ${dark ? 'text-blue-400' : 'text-blue-600'}`}>
              <Zap className="w-4 h-4" /> Currently Using
            </span>
            {/* Email display or placeholder */}
            <div className={`flex-1 min-w-[160px] font-medium text-sm px-3 py-1.5 rounded-lg border border-blue-300 truncate ${dark ? 'bg-slate-800 text-slate-100' : 'bg-white text-slate-900'}`}>
              {usingEmail ? usingEmail.email : <span className={dark ? 'text-slate-600' : 'text-slate-400'}>Click Use on a ready email…</span>}
            </div>
            {/* Time input */}
            <Input
              placeholder="Cooldown time e.g. 3/17/2026, 10:35:57 PM"
              value={inputTime}
              onChange={(e) => setInputTime(e.target.value)}
              disabled={!usingEmail}
              className={`flex-1 min-w-[220px] text-sm ${dark ? 'bg-slate-800 border-slate-700' : ''}`}
            />
            {/* Done */}
            <Button
              onClick={updateTimestamp}
              disabled={!usingEmail || !inputTime.trim()}
              className="shrink-0 bg-blue-600 hover:bg-blue-700"
            >
              <Check className="w-4 h-4" /> Done
            </Button>
            {/* Clear */}
            <Button
              variant="outline"
              onClick={() => { setUsingEmail(null); setInputTime(''); }}
              disabled={!usingEmail}
              className="shrink-0 px-3"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>

        {/* ── Ready to Use (left) + Next Unlocking (right) ──────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">

          {/* Left — up to 5 LIVE/ready emails with Use button */}
          <div>
            {nextFiveLive.length > 0 ? (
              <Card className={`border-green-400 ${dark ? 'bg-green-950/20' : 'bg-green-50'}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
                    ✓ Ready to Use
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-1">
                  {nextFiveLive.map((r, i) => (
                    <div key={r.id} className={`flex items-center justify-between text-sm py-1.5 border-b last:border-0 ${dark ? 'border-green-900/40' : 'border-green-100'}`}>
                      <span className={`flex items-center gap-2 min-w-0 flex-1 truncate ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span className={`shrink-0 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${dark ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-600'}`}>
                          {i + 1}
                        </span>
                        <span className="truncate">{r.email}</span>
                      </span>
                      <Button
                        size="sm"
                        className="shrink-0 ml-2 h-6 px-2 text-[11px] bg-blue-600 hover:bg-blue-700"
                        onClick={() => { setUsingEmail(r); setInputTime(''); }}
                      >
                        Use
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card className={`border-dashed ${dark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <CardContent className={`p-4 flex items-center gap-2 ${dark ? 'text-slate-600' : 'text-slate-400'}`}>
                  <Zap className="w-4 h-4 opacity-40" />
                  <span className="text-sm">No emails ready yet</span>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right — Next Unlocking countdown list */}
          <div>
            {nextFive.length > 0 ? (
              <Card className={dark ? 'bg-slate-900 border-slate-800' : 'bg-white'}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                    Next Unlocking
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {nextFive.map((r, i) => (
                    <div key={r.id} className={`flex justify-between text-sm py-1.5 border-b last:border-0 ${dark ? 'border-slate-800' : 'border-slate-100'}`}>
                      <span className={`flex items-center gap-2 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${dark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                          {i + 1}
                        </span>
                        {r.email}
                      </span>
                      <span className="font-mono text-orange-500 font-medium">{getRemaining(r.timestamp)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card className={`border-dashed ${dark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <CardContent className={`p-4 flex items-center gap-2 ${dark ? 'text-slate-600' : 'text-slate-400'}`}>
                  <Clock className="w-4 h-4 opacity-40" />
                  <span className="text-sm">All emails are live!</span>
                </CardContent>
              </Card>
            )}
          </div>

        </div>



        {/* ── Import Panel ─────────────────────────────────────────────── */}
        {showImport && (
          <Card className={dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-blue-200'}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2"><Upload className="w-4 h-4" /> Import Emails</span>
                <button
                  onClick={() => { setShowImport(false); setBulkText(''); setImportMode('paste'); }}
                  className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${dark ? 'text-slate-400' : 'text-slate-400'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </CardTitle>

              {/* ── Tab switcher ────────────────────────────────────────── */}
              <div className={`flex gap-1 mt-2 p-1 rounded-lg ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <button
                  onClick={() => setImportMode('paste')}
                  className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
                    importMode === 'paste'
                      ? dark ? 'bg-slate-700 text-slate-100 shadow' : 'bg-white text-slate-900 shadow'
                      : dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Paste Text
                </button>
                <button
                  onClick={() => setImportMode('upload')}
                  className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
                    importMode === 'upload'
                      ? dark ? 'bg-slate-700 text-slate-100 shadow' : 'bg-white text-slate-900 shadow'
                      : dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Upload JSON
                </button>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {importMode === 'paste' ? (
                /* ── Paste Text mode ──────────────────────────────────── */
                <>
                  <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                    One email per line: <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">01 - email@gmail.com - 3/12/2026, 1:28:16 PM</code><br />
                    Separate priority groups with a line of dashes: <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">——————</code>
                  </p>
                  <Textarea
                    rows={10}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={'01 - email@gmail.com - 3/12/2026, 1:28:16 PM\n02 - other@gmail.com - LIVE\n——————————\n03 - backup@gmail.com - 3/14/2026, 6:25:18 PM'}
                    className={dark ? 'bg-slate-800 border-slate-700 font-mono text-xs' : 'font-mono text-xs'}
                  />
                  <div className="flex gap-2">
                    <Button onClick={importBulk} disabled={!bulkText.trim()}>
                      <Download className="w-4 h-4" /> Load
                    </Button>
                    <Button variant="outline" onClick={() => { setShowImport(false); setBulkText(''); }}>
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                /* ── Upload JSON mode ─────────────────────────────────── */
                <>
                  <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Upload a <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">email-cooldown-backup.json</code> file
                    previously downloaded via the <strong>Backup</strong> button. Priority groups and timestamps will be fully restored.
                  </p>
                  <label
                    className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl py-10 cursor-pointer transition-colors ${
                      dark
                        ? 'border-slate-700 hover:border-blue-500 bg-slate-800/50 text-slate-400'
                        : 'border-slate-200 hover:border-blue-400 bg-slate-50 text-slate-400'
                    }`}
                  >
                    <HardDriveDownload className="w-8 h-8 opacity-50" />
                    <span className="text-sm font-medium">Click to choose backup file</span>
                    <span className="text-xs opacity-60">email-cooldown-backup.json</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={(e) => loadFromJSON(e.target.files?.[0])}
                    />
                  </label>
                  <Button variant="outline" onClick={() => { setShowImport(false); setImportMode('paste'); }}>
                    Cancel
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}


        {/* ── Email Queue Table ─────────────────────────────────────────── */}
        <Card className={dark ? 'bg-slate-900 border-slate-800' : 'bg-white'}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Email Queue</span>
              <span className={`text-sm font-normal ${dark ? 'text-slate-400' : 'text-slate-400'}`}>
                {filteredRows.length === sorted.length
                  ? `${sorted.length} total`
                  : `${filteredRows.length} of ${sorted.length}`}
              </span>
            </CardTitle>
            {/* FEATURE 3: Search input — filters table without mutating stored data */}
            {sorted.length > 0 && (
              <div className="relative mt-1">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search emails…"
                  className={`w-full pl-8 pr-3 py-1.5 text-sm rounded-md border outline-none transition focus:ring-2 focus:ring-blue-400 ${
                    dark
                      ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                  }`}
                />
              </div>
            )}
          </CardHeader>

          <CardContent className="px-0 pb-0">
            {sorted.length === 0 ? (
              <div className={`flex flex-col items-center justify-center py-16 gap-3 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                <Mail className="w-10 h-10 opacity-30" />
                <p className="text-sm">No emails yet. Use Import to add some.</p>
                <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
                  <Upload className="w-4 h-4" /> Import Emails
                </Button>
              </div>
            ) : filteredRows.length === 0 ? (
              // FEATURE 3: No search results state
              <div className={`flex flex-col items-center justify-center py-12 gap-2 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                <Search className="w-8 h-8 opacity-30" />
                <p className="text-sm">No emails match &ldquo;{searchQuery}&rdquo;</p>
                <button onClick={() => setSearchQuery('')} className="text-xs text-blue-500 hover:underline">Clear search</button>
              </div>
            ) : (
              <>
                {/* Header row — col-span-4 for Email to make room for Priority badge */}
                <div className={`grid grid-cols-12 text-xs font-semibold uppercase tracking-wider px-6 pb-2 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                  <div className="col-span-1">#</div>
                  <div className="col-span-4">Email</div>
                  <div className="col-span-2">Priority</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Countdown</div>
                  <div className="col-span-1"></div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {/* FEATURE 3: Render filteredRows (not sorted) — order is preserved from sorted */}
                  {filteredRows.map((row, index) => {
                    const highlight  = nextEmail && row.id === nextEmail.id;
                    const flash      = flashRow === row.id;
                    const isUsing    = usingEmail?.id === row.id;
                    // Priority: use stored group if available, else fall back to position
                    const fullIndex  = sorted.indexOf(row);
                    const priority   = getPriorityGroup(fullIndex + 1, row.group);

                    return (
                      <div
                        key={row.id}
                        ref={(el) => (rowRefs.current[row.id] = el)}
                        className={[
                          'grid grid-cols-12 gap-2 px-6 py-3 items-center transition-all duration-300',
                          highlight && !dark ? 'bg-green-50' : '',
                          highlight && dark  ? 'bg-green-950/30' : '',
                          isUsing && !dark   ? 'bg-blue-50' : '',
                          isUsing && dark    ? 'bg-blue-950/20' : '',
                          flash              ? 'flash-row' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        {/* # — shows the position in the FILTERED view */}
                        <div className={`col-span-1 text-sm font-bold ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                          {fullIndex + 1}
                        </div>

                        {/* Email */}
                        <div className={`col-span-4 truncate text-sm font-medium ${dark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {row.email}
                        </div>

                        {/* FEATURE 4: Priority group badge */}
                        <div className="col-span-2">
                          {priority ? (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${priority.colors}`}>
                              {priority.label}
                            </span>
                          ) : null}
                        </div>

                        {/* Status */}
                        <div className="col-span-2 text-sm">
                          {row.live ? (
                            <Badge className="bg-green-600 text-white">LIVE</Badge>
                          ) : (
                            <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {formatDisplay(row.timestamp)}
                            </span>
                          )}
                        </div>

                        {/* Countdown */}
                        <div className={`col-span-2 text-sm font-mono font-semibold ${row.live ? 'text-green-500' : 'text-orange-500'}`}>
                          {row.live ? '✓ READY' : getRemaining(row.timestamp)}
                        </div>

                        {/* Action */}
                        <div className="col-span-1 flex items-center gap-1 justify-end">
                          {row.live && (
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700"
                              onClick={() => { setUsingEmail(row); setInputTime(''); }}
                            >
                              Use
                            </Button>
                          )}
                          <button
                            onClick={() => deleteRow(row.id)}
                            className={`p-1 rounded hover:bg-red-100 dark:hover:bg-red-950 text-slate-400 hover:text-red-500 transition-colors`}
                            title="Remove"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <p className={`text-center text-xs pb-4 ${dark ? 'text-slate-600' : 'text-slate-400'}`}>
          Data is stored locally in your browser · survives page refresh &amp; close
        </p>
      </div>
    </div>
  );
}
