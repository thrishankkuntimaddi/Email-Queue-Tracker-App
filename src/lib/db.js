/**
 * db.js — Email Cooldown Firestore Data Layer
 * =============================================
 * The ONLY file that imports firebase/firestore.
 * All reads, writes, and real-time listeners live here.
 *
 * DATA PATH:  users/{uid}/cooldown/data
 *
 * DOCUMENT SHAPE:
 *   {
 *     emails:       EmailRow[],   // full queue
 *     currentUsing: string|null,  // email ID being used
 *     updatedAt:    Timestamp
 *   }
 *
 * PUBLIC API:
 *   fetchUserData(uid)              → one-time read (boot + Sync Now)
 *   patchUserData(uid, partial)     → merge-write to Firestore
 *   listenToUserData(uid, cb, onErr)→ real-time cross-device listener
 *   deleteAllUserData(uid)          → delete the doc (account deletion)
 *   stopListening()                 → unsubscribe + clear cache
 *   getCached()                     → synchronous in-memory cache read
 */

import {
  doc,
  setDoc,
  getDoc,
  getDocFromCache,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore'
import { db } from './firebase.js'

// ── Helpers ────────────────────────────────────────────────────────────────────
function docRef(uid) {
  return doc(db, `users/${uid}/cooldown/data`)
}

// ── In-memory cache ────────────────────────────────────────────────────────────
let _cache = null
let _unsub  = null

// ── fetchUserData ──────────────────────────────────────────────────────────────
/**
 * One-time read from Firestore (network first, IndexedDB fallback).
 * Used on boot and for the "Sync Now" hard-refresh button.
 */
export async function fetchUserData(uid) {
  if (!uid || !db) return null
  try {
    const snap = await getDoc(docRef(uid))
    const data = snap.exists() ? snap.data() : null
    _cache = data
    return data
  } catch (netErr) {
    console.warn('[EmailCooldown] fetchUserData: network failed — trying cache', netErr.code)
    try {
      const cached = await getDocFromCache(docRef(uid))
      const data = cached.exists() ? cached.data() : null
      _cache = data
      return data
    } catch {
      console.error('[EmailCooldown] fetchUserData: both network and cache failed')
      return null
    }
  }
}

// ── patchUserData ──────────────────────────────────────────────────────────────
/**
 * Merge-write a partial update to the user's data document.
 * Optimistically updates the in-memory cache before the network call.
 */
export async function patchUserData(uid, partial) {
  if (!uid || !db) return false
  // Update cache synchronously for instant local reads
  _cache = { ...(_cache ?? {}), ...partial }
  try {
    await setDoc(docRef(uid), { ...partial, updatedAt: serverTimestamp() }, { merge: true })
    return true
  } catch (e) {
    console.error('[EmailCooldown] patchUserData failed:', e.code, e.message)
    return false
  }
}

// ── listenToUserData ───────────────────────────────────────────────────────────
/**
 * Opens an onSnapshot listener for cross-device real-time sync.
 *
 * Guards applied (copied from proven ClearMyMind pattern):
 *   hasPendingWrites=true → our own optimistic write echoing back → SKIP
 *   fromCache=true        → stale IndexedDB snapshot mid-session   → SKIP
 *   Both false            → confirmed server change from another device → CALL cb
 *
 * Returns an unsubscribe function.
 */
export function listenToUserData(uid, onUpdate, onError) {
  if (!uid || !db) return () => {}

  // Allow the FIRST snapshot through even if it comes from cache.
  // Firestore always fires an initial snapshot from IndexedDB before going to
  // the network — on mobile this is the only way to surface data quickly.
  // After the first delivery, suppress subsequent fromCache snapshots so stale
  // IndexedDB state can't overwrite a live multi-device edit.
  let isFirstSnapshot = true

  _unsub = onSnapshot(
    docRef(uid),
    { includeMetadataChanges: true },
    (snap) => {
      if (snap.metadata.hasPendingWrites) return  // echo of our own write

      // Only skip cache snapshots after the first one has already been delivered
      if (!isFirstSnapshot && snap.metadata.fromCache) return

      if (!snap.exists()) {
        isFirstSnapshot = false
        return  // doc not yet created
      }

      isFirstSnapshot = false
      const data = snap.data()
      _cache = data
      onUpdate(data)
    },
    (err) => {
      console.error('[EmailCooldown] onSnapshot error:', err.code, err.message)
      onError?.(err)
    }
  )

  return _unsub
}

// ── stopListening ──────────────────────────────────────────────────────────────
/**
 * Tears down the active listener and clears the cache.
 * Call on logout to prevent cross-user data leaks.
 */
export function stopListening() {
  if (_unsub) { _unsub(); _unsub = null }
  _cache = null
}

// ── deleteAllUserData ──────────────────────────────────────────────────────────
/**
 * Permanently deletes the user's Firestore document.
 * Called during account deletion.
 */
export async function deleteAllUserData(uid) {
  if (!uid || !db) return
  await deleteDoc(docRef(uid))
  _cache = null
}

// ── getCached ──────────────────────────────────────────────────────────────────
/** Synchronous in-memory cache read — useful in non-async event handlers. */
export function getCached() {
  return _cache
}
