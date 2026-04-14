import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
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
    app  = initializeApp(firebaseConfig)
    auth = getAuth(app)

    // IndexedDB offline persistence — ensures data is available instantly on
    // reload (even before the network round-trip completes) and prevents the
    // "new user" false-positive that wipes Firestore data on second-device login.
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
