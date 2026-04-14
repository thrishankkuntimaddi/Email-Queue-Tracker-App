import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, Zap, CheckCircle, RefreshCw, LogOut, AlertCircle } from 'lucide-react'
import { signInWithEmail, signUpWithEmail, sendVerification, signOut, reloadUser } from '../lib/auth.js'

// ── Error message formatter ────────────────────────────────────────────────────
function fmtError(code) {
  const map = {
    'auth/user-not-found':      'No account found with this email.',
    'auth/wrong-password':      'Incorrect password.',
    'auth/invalid-credential':  'Email or password is incorrect.',
    'auth/email-already-in-use':'An account already exists with this email.',
    'auth/weak-password':       'Password must be at least 6 characters.',
    'auth/invalid-email':       'Please enter a valid email address.',
    'auth/too-many-requests':   'Too many attempts. Please wait and try again.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  }
  return map[code] ?? 'Something went wrong. Please try again.'
}

// ── LoginScreen ────────────────────────────────────────────────────────────────
export function LoginScreen() {
  const [mode, setMode]         = useState('login') // 'login' | 'signup'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)  // post-signup verification prompt

  const clearError = () => setError('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signInWithEmail(email.trim(), password)
        // onAuthChange in App.jsx will detect emailVerified and route accordingly
      } else {
        const cred = await signUpWithEmail(email.trim(), password)
        await sendVerification(cred.user)
        setDone(true)
      }
    } catch (err) {
      setError(fmtError(err.code))
    } finally {
      setLoading(false)
    }
  }

  // Show post-signup "check your email" screen
  if (done) {
    return (
      <div className="min-h-screen bg-zinc-950 dot-grid flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-8 card-glow text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">Check your inbox</h2>
            <p className="text-sm text-zinc-500 mt-2">
              We sent a verification link to <span className="text-zinc-300">{email}</span>.
              Click the link then come back and sign in.
            </p>
          </div>
          <button
            onClick={() => { setDone(false); setMode('login') }}
            className="btn-primary"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 dot-grid flex items-center justify-center p-4">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <Zap className="w-7 h-7 text-indigo-400" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Email Cooldown
            </h1>
            <p className="text-xs text-zinc-600 mt-1">Track email rate limits across all devices</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 rounded-2xl p-7 card-glow">
          {/* Tab switcher */}
          <div className="flex mb-6 bg-zinc-950 rounded-xl p-1 gap-1">
            {['login', 'signup'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); clearError() }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  mode === m
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); clearError() }}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="inp pl-9"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); clearError() }}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="inp pl-9 pr-10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-950/40 border border-red-900/60 rounded-lg px-3 py-2.5 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} className="btn-primary mt-1">
              {loading
                ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
                : (mode === 'login' ? 'Sign In' : 'Create Account')
              }
            </button>
          </form>

          {mode === 'signup' && (
            <p className="text-xs text-zinc-600 text-center mt-4">
              You'll receive a verification email after signing up.
            </p>
          )}
        </div>

        <p className="text-center text-xs text-zinc-700 mt-6">
          PASSI · Email Cooldown Dashboard
        </p>
      </div>
    </div>
  )
}

// ── VerificationWall ──────────────────────────────────────────────────────────
export function VerificationWall({ user }) {
  const [resending, setResending] = useState(false)
  const [checking, setChecking]   = useState(false)
  const [resent, setResent]       = useState(false)
  const [error, setError]         = useState('')

  const resend = async () => {
    setResending(true)
    setError('')
    try {
      await sendVerification(user)
      setResent(true)
      setTimeout(() => setResent(false), 4000)
    } catch (err) {
      setError(err.code === 'auth/too-many-requests'
        ? 'Too many requests — wait a moment.'
        : 'Could not resend. Try again.')
    } finally {
      setResending(false)
    }
  }

  const checkVerified = async () => {
    setChecking(true)
    setError('')
    try {
      await reloadUser(user)
      // onAuthStateChanged in App.jsx will detect emailVerified=true and route forward
      if (!user.emailVerified) {
        setError('Not verified yet — check your inbox and click the link.')
      }
    } catch {
      setError('Could not check status. Try again.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 dot-grid flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-8 card-glow text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
          <Mail className="w-7 h-7 text-indigo-400" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-zinc-100">Verify your email</h2>
          <p className="text-sm text-zinc-500 mt-2">
            A verification link was sent to{' '}
            <span className="text-zinc-300 font-medium">{user.email}</span>.
            <br />Click the link to unlock the dashboard.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-950/40 border border-red-900/60 rounded-lg px-3 py-2.5 text-xs text-red-400 text-left">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        {resent && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle className="w-3.5 h-3.5" />
            Verification email sent!
          </div>
        )}

        <button
          onClick={checkVerified}
          disabled={checking}
          className="btn-primary"
        >
          {checking ? (
            <span className="flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Checking…
            </span>
          ) : (
            'I\'ve verified — Continue'
          )}
        </button>

        <div className="flex gap-2 pt-1">
          <button
            onClick={resend}
            disabled={resending}
            className="flex-1 py-2 rounded-lg border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 text-xs transition-colors disabled:opacity-40"
          >
            {resending ? 'Sending…' : 'Resend Email'}
          </button>
          <button
            onClick={() => signOut()}
            className="flex-1 py-2 rounded-lg border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3 h-3" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
