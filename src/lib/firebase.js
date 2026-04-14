import { initializeApp } from 'firebase/app'
import {
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
} from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Guard: skip init if credentials are missing (e.g. local dev without .env)
export const isConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId)

let app  = null
let auth = null
let db   = null

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig)

    // ── Auth: explicit persistence chain ─────────────────────────────────────
    // indexedDBLocalPersistence  → primary: PWA-safe, survives SW updates,
    //                              browser ITP (Safari), and app reinstalls.
    // browserLocalPersistence    → fallback: localStorage for older browsers.
    // Using initializeAuth (not getAuth) locks in the persistence BEFORE any
    // observer is attached — this is what prevents the random sign-out bug.
    auth = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    })

    // ── Firestore: IndexedDB offline cache ────────────────────────────────────
    // Ensures data is available instantly on reload (before the network
    // round-trip) and prevents the stale-cache overwrite on multi-device login.
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })
  } catch (e) {
    console.error('[EmailCooldown] Firebase init failed:', e)
  }
}

export { auth, db }
export default app
