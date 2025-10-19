'use client'

import { useEffect, useCallback, useState } from 'react'

interface SyncResult {
  success: boolean
  updatedGames?: number
  liveGames?: number
  completedGames?: number
  error?: string
}

export function useAutoScoreSync(enabled: boolean = true) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)

  const syncScores = useCallback(async (force: boolean = false) => {
    if (isSyncing) return

    setIsSyncing(true)

    try {
      const url = force
        ? '/api/admin/sync-live-scores?force=true'
        : '/api/admin/sync-live-scores'

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()
      setSyncResult(result)
      setLastSync(new Date())

      // If scores were updated, trigger a page refresh to show new data
      if (result.success && result.updatedGames > 0) {
        // Wait a moment for database to settle, then refresh
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }

      return result
    } catch (error) {
      console.error('Score sync error:', error)
      setSyncResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return { success: false, error: 'Failed to sync scores' }
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing])

  // Auto-sync on mount if enabled
  useEffect(() => {
    if (enabled && !lastSync) {
      syncScores()
    }
  }, [enabled, lastSync, syncScores])

  // Auto-sync every 2 minutes if there are live games
  useEffect(() => {
    if (!enabled || !syncResult?.liveGames || syncResult.liveGames === 0) {
      return
    }

    const interval = setInterval(() => {
      syncScores()
    }, 120000) // 2 minutes

    return () => clearInterval(interval)
  }, [enabled, syncResult, syncScores])

  return {
    syncScores,
    isSyncing,
    lastSync,
    syncResult
  }
}
