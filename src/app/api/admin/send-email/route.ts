import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendEmail, sendBulkEmails, type EmailTemplate } from '@/lib/postmark'

// Super admin check (matches existing pattern)
function isSuperAdmin(username: string): boolean {
  const superAdminUsernames = ['admin', 'tgauss', 'pickemking']
  return superAdminUsernames.includes(username.toLowerCase())
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      emailType,
      leagueId,
      week,
      recipients,
      customSubject,
      customMessage,
      adminUsername
    } = body

    // Verify admin permissions
    if (!adminUsername || !isSuperAdmin(adminUsername)) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized: Super admin access required'
      }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()

    // Get league information
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('*')
      .eq('id', leagueId)
      .single()

    if (leagueError || !league) {
      return NextResponse.json({
        success: false,
        error: 'League not found'
      }, { status: 404 })
    }

    const leagueUrl = `https://www.pickemparty.app/league/${league.slug}`

    let emailResults

    switch (emailType) {
      case 'pick-reminder':
        emailResults = await sendPickReminders(supabase, league, leagueUrl, week, recipients)
        break

      case 'weekly-results':
        emailResults = await sendWeeklyResults(supabase, league, leagueUrl, week, recipients)
        break

      case 'admin-announcement':
        emailResults = await sendAdminAnnouncement(supabase, league, leagueUrl, customSubject, customMessage, recipients, adminUsername)
        break

      case 'league-invite':
        emailResults = await sendLeagueInvites(supabase, league, leagueUrl, recipients, adminUsername)
        break

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid email type'
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${emailResults.successful}/${emailResults.total} emails successfully`,
      details: emailResults
    })

  } catch (error) {
    console.error('Email sending error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to send emails',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Send pick reminder emails
async function sendPickReminders(supabase: any, league: any, leagueUrl: string, week: number, recipients: string[]) {
  // Get users who haven't made picks and have email addresses
  const { data: usersWithoutPicks } = await supabase
    .from('league_members')
    .select(`
      user:users!inner(id, username, display_name, email),
      is_eliminated
    `)
    .eq('league_id', league.id)
    .eq('is_eliminated', false)
    .not('user.email', 'is', null)

  // Get picks for this week to exclude users who already picked
  const { data: existingPicks } = await supabase
    .from('picks')
    .select('user_id')
    .eq('league_id', league.id)
    .eq('week', week)

  const pickedUserIds = new Set(existingPicks?.map((p: any) => p.user_id) || [])

  // Filter to users without picks
  const usersNeedingReminder = usersWithoutPicks?.filter((member: any) =>
    !pickedUserIds.has(member.user.id) &&
    member.user.email &&
    (recipients.length === 0 || recipients.includes(member.user.id))
  ) || []

  // Get used teams for each user
  const emailData = await Promise.all(
    usersNeedingReminder.map(async (member: any) => {
      const { data: userPicks } = await supabase
        .from('picks')
        .select('teams(key)')
        .eq('user_id', member.user.id)
        .eq('league_id', league.id)
        .order('week')

      const usedTeams = userPicks?.map((pick: any) => pick.teams.key) || []

      // Calculate deadline (assuming games start Thursday evening)
      const deadline = new Date()
      deadline.setDate(deadline.getDate() + (4 - deadline.getDay() + 7) % 7) // Next Thursday
      deadline.setHours(20, 20, 0, 0) // 8:20 PM ET (first game usually)

      const timeRemaining = getTimeRemaining(deadline)

      return {
        email: member.user.email,
        name: member.user.display_name,
        data: {
          leagueName: league.name,
          leagueUrl,
          week,
          deadline: deadline.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short'
          }),
          timeRemaining,
          usedTeams
        }
      }
    })
  )

  return await sendBulkEmails('pick-reminder', emailData)
}

// Send weekly results emails
async function sendWeeklyResults(supabase: any, league: any, leagueUrl: string, week: number, recipients: string[]) {
  // Get all league members with emails
  const { data: members } = await supabase
    .from('league_members')
    .select(`
      user:users!inner(id, username, display_name, email),
      lives_remaining,
      is_eliminated,
      eliminated_week
    `)
    .eq('league_id', league.id)
    .not('user.email', 'is', null)

  const filteredMembers = members?.filter((member: any) =>
    member.user.email &&
    (recipients.length === 0 || recipients.includes(member.user.id))
  ) || []

  // Get picks and results for this week
  const { data: weekPicks } = await supabase
    .from('picks')
    .select(`
      user_id,
      is_correct,
      teams(key, name)
    `)
    .eq('league_id', league.id)
    .eq('week', week)

  const picksByUser = new Map()
  weekPicks?.forEach((pick: any) => {
    picksByUser.set(pick.user_id, pick)
  })

  // Get eliminated players this week
  const eliminatedThisWeek = filteredMembers.filter((member: any) =>
    member.eliminated_week === week
  ).map((member: any) => member.user.display_name)

  const survivorsRemaining = filteredMembers.filter((member: any) => !member.is_eliminated).length
  const standingsUrl = `${leagueUrl}?week=${week}`

  const emailData = filteredMembers.map((member: any) => {
    const userPick = picksByUser.get(member.user.id)

    return {
      email: member.user.email,
      name: member.user.display_name,
      data: {
        leagueName: league.name,
        leagueUrl,
        week,
        yourPick: userPick ? {
          team: `${userPick.teams.name} (${userPick.teams.key})`,
          result: userPick.is_correct ? 'correct' : 'incorrect'
        } : undefined,
        eliminatedPlayers: eliminatedThisWeek,
        standingsUrl,
        survivorsRemaining
      }
    }
  })

  return await sendBulkEmails('weekly-results', emailData)
}

// Send admin announcement emails
async function sendAdminAnnouncement(supabase: any, league: any, leagueUrl: string, subject: string, message: string, recipients: string[], adminUsername: string) {
  // Get admin user details for commissioner name
  const { data: adminUser } = await supabase
    .from('users')
    .select('display_name')
    .eq('username', adminUsername)
    .single()

  const commissionerName = adminUser?.display_name || adminUsername

  // Get league members with emails
  const { data: members } = await supabase
    .from('league_members')
    .select(`
      user:users!inner(id, username, display_name, email)
    `)
    .eq('league_id', league.id)
    .not('user.email', 'is', null)

  const filteredMembers = members?.filter((member: any) =>
    member.user.email &&
    (recipients.length === 0 || recipients.includes(member.user.id))
  ) || []

  const emailData = filteredMembers.map((member: any) => ({
    email: member.user.email,
    name: member.user.display_name,
    data: {
      leagueName: league.name,
      leagueUrl,
      subject,
      message,
      commissionerName
    }
  }))

  return await sendBulkEmails('admin-announcement', emailData)
}

// Send league invite emails
async function sendLeagueInvites(supabase: any, league: any, leagueUrl: string, recipients: { email: string, name: string }[], adminUsername: string) {
  // Get admin user details
  const { data: adminUser } = await supabase
    .from('users')
    .select('display_name')
    .eq('username', adminUsername)
    .single()

  const inviterName = adminUser?.display_name || adminUsername

  // Get member count
  const { count: memberCount } = await supabase
    .from('league_members')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', league.id)

  const emailData = recipients.map((recipient: any) => ({
    email: recipient.email,
    name: recipient.name,
    data: {
      leagueName: league.name,
      leagueUrl,
      inviterName,
      buyIn: league.buy_in_amount || 0,
      inviteCode: league.invite_code,
      membersCount: memberCount || 0
    }
  }))

  return await sendBulkEmails('league-invite', emailData)
}

// Helper function to calculate time remaining
function getTimeRemaining(deadline: Date): string {
  const now = new Date()
  const diff = deadline.getTime() - now.getTime()

  if (diff <= 0) return 'Deadline passed'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}