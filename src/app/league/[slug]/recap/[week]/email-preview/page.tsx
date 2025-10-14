'use client'

// Week 6 Email Preview with Dynamic Content
import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getWeeklyRecapContent } from '@/components/WeeklyRecapContent'

interface EmailPreviewProps {
  params: Promise<{
    slug: string
    week: string
  }>
}

export default function EmailPreviewPage({ params }: EmailPreviewProps) {
  const resolvedParams = use(params)
  const week = parseInt(resolvedParams.week.replace('week', ''))
  const [emailHtml, setEmailHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendStatus, setSendStatus] = useState<string | null>(null)

  useEffect(() => {
    const fetchRecapData = async () => {
      const supabase = createClient()

      // Get league
      const { data: leagueData } = await supabase
        .from('leagues')
        .select('*')
        .eq('slug', resolvedParams.slug)
        .single()

      if (!leagueData) {
        setLoading(false)
        return
      }

      // Get picks for this week
      const { data: picksData } = await supabase
        .from('picks')
        .select(`
          id,
          user_id,
          team_id,
          is_correct,
          users:user_id (
            id,
            username,
            display_name
          ),
          teams:team_id (
            team_id,
            key,
            city,
            name
          )
        `)
        .eq('league_id', leagueData.id)
        .eq('week', week)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const picks = (picksData || []).map((pick: any) => ({
        id: pick.id,
        user_id: pick.user_id,
        team_id: pick.team_id,
        is_correct: pick.is_correct,
        users: Array.isArray(pick.users) ? pick.users[0] : pick.users,
        teams: Array.isArray(pick.teams) ? pick.teams[0] : pick.teams
      }))

      // Get member status
      const { data: membersData } = await supabase
        .from('league_members')
        .select(`
          user_id,
          lives_remaining,
          is_eliminated,
          eliminated_week,
          users:user_id (
            id,
            username,
            display_name
          )
        `)
        .eq('league_id', leagueData.id)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const members = (membersData || []).map((member: any) => ({
        user_id: member.user_id,
        lives_remaining: member.lives_remaining,
        is_eliminated: member.is_eliminated,
        eliminated_week: member.eliminated_week,
        users: Array.isArray(member.users) ? member.users[0] : member.users
      }))

      interface Pick {
        id: string
        user_id: string
        team_id: number
        is_correct: boolean | null
        users: { id: string; username: string; display_name: string }
        teams: { team_id: number; key: string; city: string; name: string }
      }

      interface Member {
        user_id: string
        lives_remaining: number
        is_eliminated: boolean
        eliminated_week: number | null
        users: { id: string; username: string; display_name: string }
      }

      const wins = picks.filter((p: Pick) => p.is_correct === true)
      const losses = picks.filter((p: Pick) => p.is_correct === false)
      const eliminated = members.filter((m: Member) => m.is_eliminated && m.eliminated_week === week)
      const activeMembers = members.filter((m: Member) => !m.is_eliminated)
      const twoLives = activeMembers.filter((m: Member) => m.lives_remaining === 2)
      const oneLife = activeMembers.filter((m: Member) => m.lives_remaining === 1)

      const recapUrl = `${window.location.origin}/league/${resolvedParams.slug}/recap/${week}`

      // Get dynamic weekly content
      const weeklyContent = getWeeklyRecapContent(week)

      // Generate email HTML
      const html = generateEmailHTML({
        week,
        leagueName: leagueData.name,
        wins: wins.length,
        losses: losses.length,
        eliminated: eliminated.length,
        activeMembers: activeMembers.length,
        twoLives: twoLives.length,
        oneLife: oneLife.length,
        eliminatedPlayers: eliminated,
        recapUrl,
        weeklyContent
      })

      setEmailHtml(html)
      setLoading(false)
    }

    fetchRecapData()
  }, [resolvedParams.slug, week])

  const sendTestEmail = async () => {
    setSending(true)
    setSendStatus(null)

    try {
      const response = await fetch('/api/admin/send-recap-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leagueSlug: resolvedParams.slug,
          week: week,
          testEmail: 'tgaussoin@gmail.com'
        })
      })

      const result = await response.json()

      if (result.success) {
        setSendStatus('✅ Test email sent successfully to tgaussoin@gmail.com!')
      } else {
        setSendStatus(`❌ Error: ${result.error}`)
      }
    } catch (error) {
      setSendStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSending(false)
    }
  }

  const sendToAllMembers = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to send the Week ${week} recap email to ALL league members? This cannot be undone.`
    )

    if (!confirmed) return

    setSending(true)
    setSendStatus(null)

    try {
      const response = await fetch('/api/admin/send-recap-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leagueSlug: resolvedParams.slug,
          week: week
          // No testEmail = send to all members
        })
      })

      const result = await response.json()

      if (result.success) {
        setSendStatus(`✅ ${result.message}`)
      } else {
        setSendStatus(`❌ Error: ${result.error}`)
      }
    } catch (error) {
      setSendStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        <p>Loading email preview...</p>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#f5f5f5', padding: '20px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>Email Preview</h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          This is how the Week {week} recap email will look when sent to members.
        </p>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button
            onClick={sendToAllMembers}
            disabled={sending}
            style={{
              padding: '12px 24px',
              backgroundColor: sending ? '#6b7280' : '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: sending ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '700'
            }}
          >
            {sending ? 'Sending...' : '📨 Send to All Members'}
          </button>
          <button
            onClick={sendTestEmail}
            disabled={sending}
            style={{
              padding: '10px 20px',
              backgroundColor: sending ? '#6b7280' : '#B0CA47',
              color: sending ? '#d1d5db' : '#0B0E0C',
              border: 'none',
              borderRadius: '6px',
              cursor: sending ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            {sending ? 'Sending...' : '📧 Send Test to tgaussoin@gmail.com'}
          </button>
          <button
            onClick={() => {
              const blob = new Blob([emailHtml], { type: 'text/html' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `week-${week}-recap-email.html`
              a.click()
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Download HTML
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(emailHtml)
              alert('Email HTML copied to clipboard!')
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Copy HTML
          </button>
        </div>
        {sendStatus && (
          <div style={{
            padding: '12px',
            marginBottom: '20px',
            borderRadius: '6px',
            backgroundColor: sendStatus.includes('✅') ? '#d1fae5' : '#fee2e2',
            color: sendStatus.includes('✅') ? '#065f46' : '#991b1b',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {sendStatus}
          </div>
        )}
      </div>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div dangerouslySetInnerHTML={{ __html: emailHtml }} />
      </div>
    </div>
  )
}

interface EliminatedPlayer {
  user_id: string
  lives_remaining: number
  is_eliminated: boolean
  eliminated_week: number | null
  users: { id: string; username: string; display_name: string }
}

function generateEmailHTML(data: {
  week: number
  leagueName: string
  wins: number
  losses: number
  eliminated: number
  activeMembers: number
  twoLives: number
  oneLife: number
  eliminatedPlayers: EliminatedPlayer[]
  recapUrl: string
  weeklyContent: ReturnType<typeof getWeeklyRecapContent>
}) {
  // Get song title based on week
  const songTitle = data.week === 5
    ? 'Gone Too Soon (In the Pool)'
    : data.week === 6
    ? 'Fell By One (Keegan\'s Song)'
    : 'Week ' + data.week + ' Wrap'
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Week ${data.week} Recap - ${data.leagueName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

    /* Force dark mode */
    :root {
      color-scheme: dark;
      supported-color-schemes: dark;
    }

    body {
      background-color: #0B0E0C !important;
      color: #E6E8EA !important;
    }

    /* Prevent Gmail from changing background */
    .body-wrap {
      background-color: #0B0E0C !important;
    }

    /* Press Start 2P for headings */
    .pixel-font {
      font-family: 'Press Start 2P', monospace, Arial, Helvetica, sans-serif !important;
      line-height: 1.4 !important;
    }

    /* Gmail dark mode fixes */
    @media (prefers-color-scheme: dark) {
      .email-container {
        background-color: #171A17 !important;
      }
      .dark-bg {
        background-color: #0B0E0C !important;
      }
      .card-bg {
        background-color: #171A17 !important;
      }
    }
  </style>
</head>
<body style="margin: 0 !important; padding: 0 !important; font-family: Arial, Helvetica, sans-serif !important; background-color: #0B0E0C !important; color: #E6E8EA !important;">
  <!-- 100% background wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" class="body-wrap" style="background-color: #0B0E0C !important; margin: 0 !important; padding: 0 !important;">
    <tr>
      <td align="center" style="padding: 20px 10px !important; background-color: #0B0E0C !important;">
        <!-- Main container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" class="email-container" style="max-width: 600px !important; background-color: #171A17 !important; border-radius: 8px !important; border: 2px solid #2B2A28 !important;"
          role="presentation">

          <!-- Header -->
          <tr>
            <td align="center" style="padding: 30px 20px; background-color: #171A17; border-bottom: 3px solid #B0CA47;">
              <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: #B0CA47;">
                🏈 WEEK ${data.week} RECAP
              </h1>
              <p style="margin: 10px 0 0 0; font-size: 18px; color: #E6E8EA;">
                ${data.leagueName}
              </p>
            </td>
          </tr>

          <!-- Audio Player CTA -->
          <tr>
            <td style="padding: 20px; background-color: #171A17; border-bottom: 2px solid #2B2A28;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: #B0CA47;">
                      🎵 Listen to This Week's Recap Song!
                    </p>
                    <p style="margin: 0 0 15px 0; font-size: 14px; color: #E6E8EA;">
                      "${songTitle}"
                    </p>
                    <a href="${data.recapUrl}" style="display: inline-block; padding: 12px 30px; background-color: #B0CA47; color: #0B0E0C; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                      ▶ Play Week ${data.week} Recap
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Stats Grid -->
          <tr>
            <td style="padding: 20px;">
              <table width="100%" cellpadding="10" cellspacing="0" border="0">
                <tr>
                  <td width="50%" style="padding: 15px; background-color: #1a2e1a; border-radius: 8px; text-align: center; border: 2px solid #166534;">
                    <div style="font-size: 24px; margin-bottom: 8px;">✅</div>
                    <div style="font-size: 32px; font-weight: bold; color: #22c55e;">${data.wins}</div>
                    <div style="font-size: 14px; color: #86efac; margin-top: 5px;">Correct Picks</div>
                  </td>
                  <td width="50%" style="padding: 15px; background-color: #2e1a1a; border-radius: 8px; text-align: center; border: 2px solid #991b1b;">
                    <div style="font-size: 24px; margin-bottom: 8px;">❌</div>
                    <div style="font-size: 32px; font-weight: bold; color: #ef4444;">${data.losses}</div>
                    <div style="font-size: 14px; color: #fca5a5; margin-top: 5px;">Wrong Picks</div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding: 15px; background-color: #1a2e1a; border-radius: 8px; text-align: center; border: 2px solid #B0CA47;">
                    <div style="font-size: 24px; margin-bottom: 8px;">💚</div>
                    <div style="font-size: 32px; font-weight: bold; color: #B0CA47;">${data.activeMembers}</div>
                    <div style="font-size: 14px; color: #C3D775; margin-top: 5px;">Still Alive</div>
                  </td>
                  <td width="50%" style="padding: 15px; background-color: #2e1e1a; border-radius: 8px; text-align: center; border: 2px solid #C38B5A;">
                    <div style="font-size: 24px; margin-bottom: 8px;">💀</div>
                    <div style="font-size: 32px; font-weight: bold; color: #C38B5A;">${data.eliminated}</div>
                    <div style="font-size: 14px; color: #D2A883; margin-top: 5px;">Eliminated</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 20px; line-height: 1.6;">
              <h2 style="color: #B0CA47; font-size: 24px; margin: 0 0 15px 0;">
                ${data.weeklyContent.title}
              </h2>

              <p style="font-size: 16px; line-height: 1.8; margin: 0 0 20px 0; color: #E6E8EA;">
                ${data.weeklyContent.paragraphs[0]?.content || ''}
              </p>

              <!-- Casualties -->
              ${data.eliminated > 0 ? `
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0; border-left: 4px solid #dc2626; background-color: #991b1b20;">
                <tr>
                  <td style="padding: 15px;">
                    <h3 style="color: #ef4444; font-size: 20px; margin: 0 0 10px 0;">💀 ${data.week === 6 ? 'The Sole Survivor Slaughter: RIP Keegan McAdam' : 'Casualties This Week'}</h3>
                    ${data.week === 6 ? `
                      <p style="margin: 0 0 10px 0; font-size: 14px;">In a week of near-perfection, Keegan McAdam became the tragic hero nobody asked for. Y'all, this man picked the Washington Commanders—and they almost pulled it off!</p>
                      <p style="margin: 0 0 10px 0; font-size: 14px;">A nail-biting <strong>Bears 25 @ Commanders 24</strong> loss by ONE SINGLE POINT on Monday Night Football? That's not a defeat; that's the football gods trolling him harder than a Marvel plot twist where the hero gets Thanos-snapped at 99% health.</p>
                      <p style="margin: 0; font-size: 14px;">Keegan went from one life to zero faster than you can say "Hail Mary regret." Pool's now at 9 eliminated total. No hard feelings; just hard lessons.</p>
                    ` : `
                      <p style="margin: 0 0 10px 0; font-size: 14px;">This week claimed ${data.eliminated} player${data.eliminated > 1 ? 's' : ''}. The graveyard grows...</p>
                      ${data.eliminatedPlayers.map(p => `<p style="margin: 5px 0; font-size: 14px;"><strong>${p.users.display_name}</strong> - Eliminated</p>`).join('')}
                    `}
                  </td>
                </tr>
              </table>
              ` : ''}

              ${data.week === 6 && data.wins > 0 ? `
              <!-- Packers Parade -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0; border-left: 4px solid #16a34a; background-color: #16653420;">
                <tr>
                  <td style="padding: 15px;">
                    <h3 style="color: #22c55e; font-size: 20px; margin: 0 0 10px 0;">🧀 The Packers Parade: 9 Heroes Ride the Cheese Wave</h3>
                    <p style="margin: 0 0 10px 0; font-size: 14px;">Talk about a mob mentality that paid off! <strong>Nine players</strong> jumped on the Green Bay Packers bandwagon, and boy, did it roll right over the doubters. All correct—boom, 100% survival for the cheesehead contingent!</p>
                    <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>Packers Posse:</strong> Taylor Root, Tyler Roberts, Dustin Dimicelli, RazG, Josh, Bobbie Boucher, Jordan Petrusich, Taylor Gaussoin, Amanda G</p>
                    <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>Other Winners:</strong></p>
                    <ul style="margin: 10px 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                      <li style="margin-bottom: 5px;"><strong>Patriots (2):</strong> Decks, Jaren Petrusich</li>
                      <li style="margin-bottom: 5px;"><strong>Rams (2):</strong> Steven McCoy, Joe G</li>
                      <li style="margin-bottom: 5px;"><strong>Broncos (1):</strong> JSizzle</li>
                      <li style="margin-bottom: 5px;"><strong>Colts (1):</strong> Matador</li>
                      <li><strong>Steelers (1):</strong> Brandon O'Dore</li>
                    </ul>
                    <p style="margin: 0; font-size: 14px; font-style: italic;">Only one loss in 17 picks? That's not luck; that's Matrix-level skill!</p>
                  </td>
                </tr>
              </table>
              ` : ''}


              <!-- Current Standings -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0; background-color: rgba(176, 202, 71, 0.12); border-radius: 8px; border: 2px solid #B0CA47;">
                <tr>
                  <td style="padding: 15px;">
                    <h3 style="color: #B0CA47; font-size: 20px; margin: 0 0 15px 0;">📊 Current Standings</h3>
                    <p style="margin: 0; font-size: 14px; line-height: 1.8;">
                      <strong style="color: #22c55e;">💚 Safe (2 Lives):</strong> ${data.twoLives} players<br>
                      <strong style="color: #C38B5A;">⚠️ On the Bubble (1 Life):</strong> ${data.oneLife} players
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Next Week Preview -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0; background-color: #991b1b; border-radius: 8px; border: 2px solid #dc2626;">
                <tr>
                  <td style="padding: 15px;">
                    <h3 style="color: #fca5a5; font-size: 20px; margin: 0 0 10px 0;">⚡ Week ${data.week + 1} ${data.week === 6 ? 'Wake-Up Call: Lock In or Log Out!' : 'Preview: Pressure\'s On!'}</h3>
                    <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 1.8;">
                      ${data.week === 6
                        ? `Week 6's closed, but Week 7's gates are creakin' open—get those picks in via the app before the deadline! With ${data.oneLife} on one life, it's do-or-die: Use those strategy tools, scout the odds, and rally your private league for moral support.`
                        : `With ${Math.round((data.oneLife / data.activeMembers) * 100)}% of survivors on one life, Week ${data.week + 1} is make-or-break. Only ${data.twoLives} players are sitting pretty with two lives. The rest? Better bring your A-game.`}
                    </p>
                    <p style="margin: 0; font-size: 14px; font-weight: bold;">
                      <strong>Pro Tip:</strong> ${data.week === 6 ? 'Check the app for real-time odds, strategy tools, and private league banter. Don\'t be the next gravestone.' : 'No picks = no chance. Log in, pick a team, and keep your survivor soul alive!'}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="text-align: center; margin: 30px 0; font-size: 16px; font-weight: bold;">
                Get those Week ${data.week + 1} picks in, and let's see who's still standing when the dust settles. Stay sharp, survivors! 🏆
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 30px 20px; background-color: #0B0E0C; border-top: 2px solid #2B2A28;">
              <a href="${data.recapUrl}" style="display: inline-block; padding: 15px 40px; background-color: #B0CA47; color: #0B0E0C; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">
                View Full Recap & Listen to Song
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #0B0E0C; border-top: 1px solid #2B2A28;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #8B949E;">
                — The Pick'em Party Crew
              </p>
              <p style="margin: 0; font-size: 12px; color: #8B949E;">
                You're receiving this because you're a member of ${data.leagueName}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
