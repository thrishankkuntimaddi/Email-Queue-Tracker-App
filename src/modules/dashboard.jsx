import { useState, useMemo } from 'react'
import { Zap, Clock, Mail } from 'lucide-react'
import { getEnrichedSorted, getRemaining, isLive } from '../lib/helpers.js'

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, iconBg, iconColor, value, label }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <div className="text-2xl font-bold text-zinc-100 leading-none">{value}</div>
        <div className="text-xs text-zinc-500 mt-1">{label}</div>
      </div>
    </div>
  )
}

// ── DashboardModule ────────────────────────────────────────────────────────────
export default function DashboardModule({
  emails,
  currentUsing,
  tick,
  useEmail,
  confirmUse,
  clearCurrentUsing,
}) {
  const [inputTime, setInputTime] = useState('')

  const sorted       = useMemo(() => getEnrichedSorted(emails), [emails, tick])
  const liveCount    = sorted.filter(r => r.live).length
  const cooldownCount= sorted.length - liveCount
  const nextUpcoming = sorted.find(r => !r.live)
  const usingEmailObj= emails.find(e => e.id === currentUsing) ?? null

  const handleConfirm = async () => {
    if (!usingEmailObj || !inputTime.trim()) return
    await confirmUse(usingEmailObj.id, inputTime.trim())
    setInputTime('')
  }

  const handleClear = async () => {
    await clearCurrentUsing()
    setInputTime('')
  }

  return (
    <div className="space-y-4">
      {/* ── Stats cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Zap}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-400"
          value={liveCount}
          label="LIVE Emails"
        />
        <StatCard
          icon={Clock}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-400"
          value={cooldownCount}
          label="On Cooldown"
        />
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-zinc-500 mb-1">Next Unlocking</div>
            {nextUpcoming ? (
              <>
                <div className="text-sm font-semibold text-zinc-100 truncate">{nextUpcoming.email}</div>
                <div className="text-xs text-amber-400 font-medium font-mono">
                  {getRemaining(nextUpcoming.timestamp)}
                </div>
              </>
            ) : (
              <div className="text-sm text-zinc-600">All emails live!</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Currently Using bar ──────────────────────────────────────────── */}
      <div className={`rounded-xl border px-4 py-3 flex flex-wrap items-center gap-3 ${
        usingEmailObj
          ? 'bg-indigo-950/30 border-indigo-800/50'
          : 'bg-zinc-900 border-zinc-800'
      }`}>
        {/* Label */}
        <span className="flex items-center gap-1.5 text-sm font-semibold shrink-0 text-indigo-400">
          <Zap className="w-4 h-4" /> Currently Using
        </span>

        {/* Email display */}
        <div className={`flex-1 min-w-[160px] text-sm px-3 py-1.5 rounded-lg border truncate font-medium ${
          usingEmailObj
            ? 'bg-zinc-900 border-zinc-700 text-zinc-100'
            : 'bg-zinc-900/50 border-zinc-800 text-zinc-600'
        }`}>
          {usingEmailObj ? usingEmailObj.email : 'Click Use on a ready email…'}
        </div>

        {/* Timestamp input */}
        <input
          type="text"
          placeholder="Cooldown time — e.g. 3/17/2026, 10:35:57 PM"
          value={inputTime}
          onChange={e => setInputTime(e.target.value)}
          disabled={!usingEmailObj}
          onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
          className="flex-1 min-w-[220px] bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition"
        />

        {/* Done */}
        <button
          onClick={handleConfirm}
          disabled={!usingEmailObj || !inputTime.trim()}
          className="shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Done
        </button>

        {/* Clear */}
        <button
          onClick={handleClear}
          disabled={!usingEmailObj}
          className="shrink-0 px-2.5 py-1.5 rounded-lg border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
