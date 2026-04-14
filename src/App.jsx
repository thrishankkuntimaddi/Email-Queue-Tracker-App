import { useState, useEffect } from 'react'
import { LayoutDashboard, ListFilter, Zap, Settings } from 'lucide-react'

import { onAuthChange }        from './lib/auth.js'
import { useAppData }          from './hooks/useAppData.js'

import { LoginScreen, VerificationWall } from './modules/login.jsx'
import DashboardModule                   from './modules/dashboard.jsx'
import QueueModule                       from './modules/queue.jsx'
import ReadyModule                       from './modules/ready.jsx'
import SettingsModule                    from './modules/settings.jsx'

// ── LoadingSpinner ─────────────────────────────────────────────────────────────
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-600 text-sm">Loading…</p>
      </div>
    </div>
  )
}

// ── Bottom navigation (mobile only) ───────────────────────────────────────────
const NAV_TABS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'queue',     icon: ListFilter,      label: 'Queue'     },
  { id: 'ready',     icon: Zap,             label: 'Ready'     },
  { id: 'settings',  icon: Settings,        label: 'Settings'  },
]

function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800 md:hidden z-50 nav-safe">
      <div className="flex">
        {NAV_TABS.map(({ id, icon: Icon, label }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              id={`nav-${id}`}
              onClick={() => onTabChange(id)}
              className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
                active
                  ? 'text-indigo-400'
                  : 'text-zinc-600 hover:text-zinc-400 active:text-zinc-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className={`text-[10px] font-semibold ${active ? 'text-indigo-400' : ''}`}>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// ── Header — minimal: just branding ───────────────────────────────────────────
// All action buttons (Import, Export, Backup, Clear All, Sign Out) live in Settings.
function Header() {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800">
      {/* Accent gradient bar */}
      <div className="h-px w-full bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-600" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <h1 className="text-base font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent leading-tight">
          Email Cooldown
        </h1>
        <p className="text-[10px] text-zinc-700 mt-0.5">Real-time · all devices</p>
      </div>
    </header>
  )
}

// ── MainApp (authenticated + verified) ────────────────────────────────────────
function MainApp({ user }) {
  const appData     = useAppData(user.uid)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showImport,setShowImport] = useState(false)
  const [tick,      setTick]      = useState(0)

  // 1-second countdown ticker
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (appData.loading) return <LoadingSpinner />

  // ── Shared props for all modules ───────────────────────────────────────────
  const shared = {
    emails:            appData.emails,
    currentUsing:      appData.currentUsing,
    tick,
    useEmail:          appData.useEmail,
    confirmUse:        appData.confirmUse,
    editEmail:         appData.editEmail,
    deleteEmail:       appData.deleteEmail,
    clearCurrentUsing: appData.clearCurrentUsing,
    importEmails:      appData.importEmails,
    clearAll:          appData.clearAll,
    syncNow:           appData.syncNow,
    showImport,
    setShowImport,
    user,
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">

      <Header />

      {/* ── DESKTOP LAYOUT (md+) ────────────────────────────────────────── */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <DashboardModule {...shared} />
        <ReadyModule {...shared} />
        <QueueModule {...shared} />
        {/* Settings at bottom of desktop layout */}
        <div className="border-t border-zinc-800 pt-5">
          <SettingsModule {...shared} />
        </div>
      </div>

      {/* ── MOBILE LAYOUT (< md) ────────────────────────────────────────── */}
      <div className="md:hidden pb-24">
        {activeTab === 'dashboard' && (
          <div className="px-4 pt-4 space-y-4">
            <DashboardModule {...shared} />
          </div>
        )}
        {activeTab === 'queue' && (
          <div className="px-4 pt-4">
            <QueueModule {...shared} />
          </div>
        )}
        {activeTab === 'ready' && (
          <div className="px-4 pt-4">
            <ReadyModule {...shared} />
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="pt-4">
            <SettingsModule {...shared} />
          </div>
        )}
      </div>

      {/* ── Mobile bottom navigation ─────────────────────────────────────── */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

// ── App — auth gate ────────────────────────────────────────────────────────────
export default function App() {
  const [authState, setAuthState] = useState({ status: 'loading', user: null })

  useEffect(() => {
    return onAuthChange(user => {
      setAuthState({ status: 'ready', user })
    })
  }, [])

  if (authState.status === 'loading')        return <LoadingSpinner />
  if (!authState.user)                       return <LoginScreen />
  if (!authState.user.emailVerified)         return <VerificationWall user={authState.user} />
  return <MainApp user={authState.user} />
}
