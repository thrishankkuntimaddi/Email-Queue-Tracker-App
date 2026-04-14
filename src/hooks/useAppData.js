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

    fetchUserData(uid).then(data => {
      if (!mounted) return
      if (data) {
        setEmails(data.emails        ?? [])
        setCurrentUsing(data.currentUsing ?? null)
      }
      setLoading(false)

      // Subscribe for cross-device updates AFTER initial hydration
      listenToUserData(uid, (updated) => {
        if (!mounted) return
        setEmails(updated.emails        ?? [])
        setCurrentUsing(updated.currentUsing ?? null)
      })
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
