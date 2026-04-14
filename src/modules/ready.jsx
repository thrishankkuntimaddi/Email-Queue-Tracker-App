import { useMemo } from 'react'
import { Zap, Clock } from 'lucide-react'
import { getEnrichedSorted, getRemaining } from '../lib/helpers.js'

// ── ReadyModule ────────────────────────────────────────────────────────────────
export default function ReadyModule({ emails, tick, useEmail }) {
  const sorted = useMemo(() => getEnrichedSorted(emails), [emails, tick])

  const nextFiveLive = sorted.filter(r => r.live).slice(0, 5)
  const nextFiveCool = sorted.filter(r => !r.live).slice(0, 5)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">

      {/* ── Ready to Use ──────────────────────────────────────────────────── */}
      <div>
        {nextFiveLive.length > 0 ? (
          <div className="bg-zinc-900 border border-indigo-900/40 rounded-xl overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-zinc-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" /> Ready to Use
              </h3>
            </div>
            <div className="divide-y divide-zinc-800">
              {nextFiveLive.map((r, i) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3 gap-3 hover:bg-zinc-800/40 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-700/50 text-indigo-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm text-zinc-200 truncate font-medium">{r.email}</span>
                  </div>
                  <button
                    onClick={() => useEmail(r.id)}
                    className="shrink-0 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
                  >
                    Use
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-xl px-5 py-8 flex flex-col items-center gap-2 text-zinc-700">
            <Zap className="w-6 h-6 opacity-40" />
            <span className="text-sm">No emails ready yet</span>
          </div>
        )}
      </div>

      {/* ── Next Unlocking ────────────────────────────────────────────────── */}
      <div>
        {nextFiveCool.length > 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-zinc-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-400 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Next Unlocking
              </h3>
            </div>
            <div className="divide-y divide-zinc-800">
              {nextFiveCool.map((r, i) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3 gap-3 hover:bg-zinc-800/40 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm text-zinc-400 truncate">{r.email}</span>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-violet-400 font-semibold">
                    {getRemaining(r.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-xl px-5 py-8 flex flex-col items-center gap-2 text-zinc-700">
            <Clock className="w-6 h-6 opacity-40" />
            <span className="text-sm">All emails are live!</span>
          </div>
        )}
      </div>

    </div>
  )
}
