// ── Date / time helpers ────────────────────────────────────────────────────────

export function safeParseDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDisplay(value) {
  const d = safeParseDate(value)
  if (!d) return value
  return d.toLocaleString('en-US', {
    month: 'numeric', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit',
  })
}

export function getRemaining(timestamp) {
  if (!timestamp || timestamp === 'LIVE') return ''
  const d = safeParseDate(timestamp)
  if (!d) return ''
  const diff = d.getTime() - Date.now()
  if (diff <= 0) return 'READY'
  const total = Math.floor(diff / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${h}h ${m}m ${s}s`
}

export function isLive(timestamp) {
  if (!timestamp || timestamp === 'LIVE') return true
  const d = safeParseDate(timestamp)
  if (!d) return true
  return Date.now() >= d.getTime()
}

export async function safeCopyToClipboard(text) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch (_) {}
  window.prompt('Copy the text below:', text)
  return false
}

// ── Priority group map ─────────────────────────────────────────────────────────
// Groups are assigned during bulk import via separator lines (——————).
// group 1-2 = High Priority, 3-4 = Secondary, 5-6 = System, 7 = Testing, 8+ = Backup

const BACKUP = { label: 'Backup', tw: 'bg-zinc-800 text-zinc-400 border border-zinc-700' }

const GROUP_MAP = {
  1: { label: 'High Priority', tw: 'bg-red-950/70 text-red-400 border border-red-900/60' },
  2: { label: 'High Priority', tw: 'bg-red-950/70 text-red-400 border border-red-900/60' },
  3: { label: 'Secondary',     tw: 'bg-amber-950/70 text-amber-400 border border-amber-900/60' },
  4: { label: 'Secondary',     tw: 'bg-amber-950/70 text-amber-400 border border-amber-900/60' },
  5: { label: 'System',        tw: 'bg-violet-950/70 text-violet-400 border border-violet-900/60' },
  6: { label: 'System',        tw: 'bg-violet-950/70 text-violet-400 border border-violet-900/60' },
  7: { label: 'Testing',       tw: 'bg-blue-950/70 text-blue-400 border border-blue-900/60' },
  8: BACKUP,
}

export function getPriorityGroup(position, group) {
  if (group !== undefined) return GROUP_MAP[group] ?? BACKUP
  if (position <= 4)  return GROUP_MAP[1]
  if (position <= 8)  return GROUP_MAP[3]
  if (position <= 11) return GROUP_MAP[5]
  if (position <= 21) return GROUP_MAP[7]
  return BACKUP
}

// ── Sorting & enrichment ───────────────────────────────────────────────────────

export function getEnrichedSorted(emails) {
  const enriched = emails.map(r => ({ ...r, live: isLive(r.timestamp) }))
  return [...enriched].sort((a, b) => {
    if (a.live && !b.live) return -1
    if (!a.live && b.live) return 1
    if (a.live && b.live) return (a.order ?? 0) - (b.order ?? 0)
    const ta = safeParseDate(a.timestamp)?.getTime() ?? Infinity
    const tb = safeParseDate(b.timestamp)?.getTime() ?? Infinity
    return ta - tb
  })
}

// ── Import parsers ─────────────────────────────────────────────────────────────

export function parseBulkText(text) {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .filter(l => !/^emails?/i.test(l))

  const parsed = []
  let currentGroup = 1
  let order = 0

  lines.forEach(line => {
    // Separator line: 4+ em-dashes / regular dashes → next group
    if (/^[\u2013\u2014\-]{4,}/.test(line)) {
      currentGroup++
      return
    }

    let parts
    if (line.includes(' - ')) {
      parts = line.split(' - ').map(p => p.trim()).filter(Boolean)
    } else {
      parts = line.split('-').map(p => p.trim()).filter(Boolean)
    }
    if (parts.length < 2) return

    const email = parts[1]
    const tsRaw = parts.slice(2).join(' - ').trim() || 'LIVE'
    const ts    = tsRaw.toUpperCase() === 'LIVE' ? 'LIVE' : tsRaw

    parsed.push({
      id:        crypto.randomUUID(),
      email,
      timestamp: ts,
      order:     order++,
      group:     currentGroup,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  })

  return parsed
}

export function parseBackupJSON(data) {
  if (!Array.isArray(data)) throw new Error('Not an array')
  return data
    .map((row, idx) => ({
      id:        crypto.randomUUID(),
      email:     String(row.email || ''),
      timestamp: String(row.timestamp || 'LIVE'),
      order:     row.order ?? idx,
      group:     row.group,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))
    .filter(r => r.email)
}
