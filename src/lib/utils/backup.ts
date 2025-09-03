// Simple webhook backup for Make.com
export interface PickBackupData {
  user_id: string
  username: string
  display_name: string
  league_id: string
  league_name: string
  week: number
  team_id: number
  team_name: string
  team_key: string
  is_update: boolean
}

export async function backupPickToSheets(data: PickBackupData): Promise<void> {
  try {
    // Send to Make.com webhook (fire and forget - don't await)
    fetch('/api/webhook/picks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    }).catch(error => {
      console.error('[Backup Error]', error)
      // Silently fail - never block a pick submission
    })
  } catch (error) {
    // Never throw - backups should never block picks
    console.error('[Backup Error]', error)
  }
}

// Team interface for backup helper
interface Team {
  team_id: number
  city: string
  name: string
  key: string
}

// Helper to get team details for backup
export function getTeamDetailsForBackup(teamId: number, teams: Team[]): { name: string; key: string } {
  const team = teams.find(t => t.team_id === teamId)
  if (team) {
    return {
      name: `${team.city} ${team.name}`,
      key: team.key
    }
  }
  return {
    name: `Team #${teamId}`,
    key: 'UNK'
  }
}