import { useState, useEffect } from 'react'
import { fetchUserData, patchUserData, listenToUserData, stopListening } from '../lib/db.js'

// ── useAppData — React façade over the Firestore data layer ───────────────────
//
// Responsibilities:
//   1. Fetch initial data on mount (fetchUserData)
//   2. Subscribe for real-time cross-device updates (listenToUserData)
//   3. Expose action functions that write to Firestore AND optimistically update state
//   4. Tear down listeners on unmount
//
// State:
//   emails       — the full email queue array
//   currentUsing — ID of the email currently being used (null if none)
//   loading      — true while initial fetch is pending
//
export function useAppData(uid) {
  const [emails, setEmails]             = useState([])
  const [currentUsing, setCurrentUsing] = useState(null)
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    if (!uid) return
    let mounted = true
    // Tracks whether the listener's first snapshot already hydrated state.
    // Prevents the slower network fetch from clobbering data the listener
    // already delivered — important on mobile where the cache snapshot fires
    // before the network round-trip completes.
    let hydratedByListener = false

    // ── Start the real-time listener IMMEDIATELY (parallel with the fetch) ───
    // On mobile the IndexedDB cache snapshot fires in <50ms, long before the
    // network fetch completes. Starting it here (not inside .then()) ensures
    // data is always surfaced as fast as possible.
    listenToUserData(uid, (updated) => {
      if (!mounted) return
      hydratedByListener = true
      setEmails(updated.emails        ?? [])
      setCurrentUsing(updated.currentUsing ?? null)
      setLoading(false)
    })

    // ── One-time network fetch as a belt-and-suspenders safety net ───────────
    // Covers the edge case where the listener's first snapshot is blank
    // (fresh install, no local IndexedDB doc yet) but the server has data.
    fetchUserData(uid).then(data => {
      if (!mounted) return
      if (data && !hydratedByListener) {
        setEmails(data.emails        ?? [])
        setCurrentUsing(data.currentUsing ?? null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      stopListening()
    }
  }, [uid])

  // ── Actions ──────────────────────────────────────────────────────────────────

  /** Replace entire email queue (bulk import / JSON restore) */
  const importEmails = async (newEmails) => {
    setEmails(newEmails)
    await patchUserData(uid, { emails: newEmails })
  }

  /** Mark an email as "currently using" */
  const useEmail = async (emailId) => {
    setCurrentUsing(emailId)
    await patchUserData(uid, { currentUsing: emailId })
  }

  /** Clear "currently using" without updating the email's timestamp */
  const clearCurrentUsing = async () => {
    setCurrentUsing(null)
    await patchUserData(uid, { currentUsing: null })
  }

  /**
   * Confirm usage: update the email's timestamp AND clear currentUsing atomically.
   * This is the "Done" button action.
   */
  const confirmUse = async (emailId, timestamp) => {
    const updatedEmails = emails.map(e =>
      e.id === emailId
        ? { ...e, timestamp, updatedAt: new Date().toISOString() }
        : e
    )
    setEmails(updatedEmails)
    setCurrentUsing(null)
    await patchUserData(uid, { emails: updatedEmails, currentUsing: null })
  }

  /** Edit a single email's timestamp (inline edit) */
  const editEmail = async (emailId, timestamp) => {
    const updatedEmails = emails.map(e =>
      e.id === emailId
        ? { ...e, timestamp, updatedAt: new Date().toISOString() }
        : e
    )
    setEmails(updatedEmails)
    await patchUserData(uid, { emails: updatedEmails })
  }

  /** Delete a single email from the queue */
  const deleteEmail = async (emailId) => {
    const updatedEmails  = emails.filter(e => e.id !== emailId)
    const newCurrentUsing = currentUsing === emailId ? null : currentUsing
    setEmails(updatedEmails)
    setCurrentUsing(newCurrentUsing)
    await patchUserData(uid, { emails: updatedEmails, currentUsing: newCurrentUsing })
  }

  /** Clear entire queue */
  const clearAll = async () => {
    setEmails([])
    setCurrentUsing(null)
    await patchUserData(uid, { emails: [], currentUsing: null })
  }

  /** Force-fetch latest data from Firestore (Sync Now button) */
  const syncNow = async () => {
    const data = await fetchUserData(uid)
    if (data) {
      setEmails(data.emails        ?? [])
      setCurrentUsing(data.currentUsing ?? null)
    }
  }

  return {
    emails,
    currentUsing,
    loading,
    // actions
    importEmails,
    useEmail,
    clearCurrentUsing,
    confirmUse,
    editEmail,
    deleteEmail,
    clearAll,
    syncNow,
  }
}
