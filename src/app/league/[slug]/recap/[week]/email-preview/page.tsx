'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'

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

      const wins = picks.filter((p: any) => p.is_correct === true)
      const losses = picks.filter((p: any) => p.is_correct === false)
      const eliminated = members.filter((m: any) => m.is_eliminated && m.eliminated_week === week)
      const activeMembers = members.filter((m: any) => !m.is_eliminated)
      const twoLives = activeMembers.filter((m: any) => m.lives_remaining === 2)
      const oneLife = activeMembers.filter((m: any) => m.lives_remaining === 1)

      const recapUrl = `${window.location.origin}/league/${resolvedParams.slug}/recap/${week}`

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
        recapUrl
      })

      setEmailHtml(html)
      setLoading(false)
    }

    fetchRecapData()
  }, [resolvedParams.slug, week])

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
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
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
      </div>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div dangerouslySetInnerHTML={{ __html: emailHtml }} />
      </div>
    </div>
  )
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
  eliminatedPlayers: any[]
  recapUrl: string
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Week ${data.week} Recap - ${data.leagueName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #1a1a1a; color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1a1a1a;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #262626; border-radius: 8px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding: 30px 20px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);">
              <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: #ffffff;">
                🏈 WEEK ${data.week} RECAP
              </h1>
              <p style="margin: 10px 0 0 0; font-size: 18px; color: #f3e8ff;">
                ${data.leagueName}
              </p>
            </td>
          </tr>

          <!-- Audio Player CTA -->
          <tr>
            <td style="padding: 20px; background-color: #7c3aed20; border-bottom: 2px solid #7c3aed;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: #a855f7;">
                      🎵 Listen to This Week's Recap Song!
                    </p>
                    <a href="${data.recapUrl}" style="display: inline-block; padding: 12px 30px; background-color: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
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
                  <td width="50%" style="padding: 15px; background-color: #166534; border-radius: 8px; text-align: center;">
                    <div style="font-size: 32px; font-weight: bold; color: #22c55e;">${data.wins}</div>
                    <div style="font-size: 14px; color: #86efac; margin-top: 5px;">Correct Picks</div>
                  </td>
                  <td width="50%" style="padding: 15px; background-color: #991b1b; border-radius: 8px; text-align: center;">
                    <div style="font-size: 32px; font-weight: bold; color: #ef4444;">${data.losses}</div>
                    <div style="font-size: 14px; color: #fca5a5; margin-top: 5px;">Wrong Picks</div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding: 15px; background-color: #581c87; border-radius: 8px; text-align: center;">
                    <div style="font-size: 32px; font-weight: bold; color: #a855f7;">${data.activeMembers}</div>
                    <div style="font-size: 14px; color: #d8b4fe; margin-top: 5px;">Still Alive</div>
                  </td>
                  <td width="50%" style="padding: 15px; background-color: #9a3412; border-radius: 8px; text-align: center;">
                    <div style="font-size: 32px; font-weight: bold; color: #fb923c;">${data.eliminated}</div>
                    <div style="font-size: 14px; color: #fed7aa; margin-top: 5px;">Eliminated</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 20px; line-height: 1.6;">
              <h2 style="color: #a855f7; font-size: 24px; margin: 0 0 15px 0;">
                Week ${data.week}: Chaos, Upsets & Graveyard Vibes
              </h2>

              <p style="font-size: 16px; line-height: 1.8; margin: 0 0 20px 0; color: #e5e5e5;">
                Week 5 of the NFL season brought more chaos than a Monday night tailgate, and our survivor pool took a brutal hit.
                With a 47% win rate, ${data.losses} losses, and two no-shows, the graveyard's getting crowded.
                Let's break down the carnage with a little sass and a lot of stats—because this pool's a battlefield, and some of y'all just got smoked!
              </p>

              <!-- The Fallen Four -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0; border-left: 4px solid #dc2626; background-color: #991b1b20;">
                <tr>
                  <td style="padding: 15px;">
                    <h3 style="color: #ef4444; font-size: 20px; margin: 0 0 10px 0;">💀 The Fallen Four: RIP to These Picks</h3>
                    <p style="margin: 0 0 10px 0; font-size: 14px;">Week 5 was a grim reaper's delight, claiming four players in one fell swoop. Pour one out for:</p>
                    <ul style="margin: 10px 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                      <li style="margin-bottom: 8px;"><strong>Cowboyup (Dan Evans):</strong> Thought the Seahawks would soar. Nope! They crashed hard, leaving Dan's survivor dreams in the Pacific Northwest fog. Adios, cowboy.</li>
                      <li style="margin-bottom: 8px;"><strong>Timodore (Osprey):</strong> Also hitched his wagon to Seattle's sinking ship. When the Hawks tanked, so did Osprey's chances. Fly away, birdie, straight to the cemetery.</li>
                      <li style="margin-bottom: 8px;"><strong>Hayden (Hayden Gaussoin):</strong> Bet on the Bills to buffalo their way past the Patriots. Plot twist: New England pulled a 23-20 upset, sending Hayden to the gravestone gang. Ouch, rookie.</li>
                      <li><strong>Kyler Stroud:</strong> Yo, Kyler, where you at? No pick = auto-elimination. With one life left, you ghosted us and joined the fallen. Gotta show up to survive, man!</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- Life Losses -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0; border-left: 4px solid #ea580c; background-color: #9a341220;">
                <tr>
                  <td style="padding: 15px;">
                    <h3 style="color: #fb923c; font-size: 20px; margin: 0 0 10px 0;">⚠️ Life Losses: The Bubble Gets Shakier</h3>
                    <p style="margin: 0 0 10px 0; font-size: 14px;">Eight players felt the Week 5 heat, dropping to one life. Y'all are one bad pick from the graveyard, so step up your game:</p>
                    <ul style="margin: 10px 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                      <li style="margin-bottom: 5px;"><strong>RazG, Jonathan (JSizzle), Josh:</strong> All three banked on the Cardinals, but Arizona got grounded.</li>
                      <li style="margin-bottom: 5px;"><strong>Jordan Petrusich:</strong> Rams let you down, leaving you clinging to a single life.</li>
                      <li style="margin-bottom: 5px;"><strong>Jaren Petrusich:</strong> Giants fumbled your hopes. One life to go!</li>
                      <li style="margin-bottom: 5px;"><strong>Dustin Dimicelli, Rolyat Toor:</strong> Bills' upset loss to the Pats stung you both.</li>
                      <li><strong>Keegan McAdam:</strong> No pick? That's a free strike! Down to one life.</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- Still Standing -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0; border-left: 4px solid #16a34a; background-color: #16653420;">
                <tr>
                  <td style="padding: 15px;">
                    <h3 style="color: #22c55e; font-size: 20px; margin: 0 0 10px 0;">✅ Still Standing: The Survivors</h3>
                    <p style="margin: 0 0 10px 0; font-size: 14px;">Nine players dodged the Week 5 chaos with correct picks, and the Colts and Lions were the MVPs:</p>
                    <ul style="margin: 10px 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                      <li style="margin-bottom: 5px;"><strong>Colts Crew (5 safe):</strong> Brandon O'Dore, Decks, Steven McCoy, Joe G, and Bobbie Boucher rode Indianapolis to victory.</li>
                      <li><strong>Lions Pride (4 safe):</strong> Taylor Gaussoin, Tyler Roberts, Matador, and Amanda G roared with Detroit.</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- Current Standings -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0; background-color: #7c3aed20; border-radius: 8px;">
                <tr>
                  <td style="padding: 15px;">
                    <h3 style="color: #a855f7; font-size: 20px; margin: 0 0 15px 0;">📊 Current Standings</h3>
                    <p style="margin: 0; font-size: 14px; line-height: 1.8;">
                      <strong style="color: #22c55e;">💪 Safe (2 Lives):</strong> ${data.twoLives} players<br>
                      <strong style="color: #fb923c;">⚠️ On the Bubble (1 Life):</strong> ${data.oneLife} players
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Week 6 Preview -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0; background-color: #991b1b; border-radius: 8px; border: 2px solid #dc2626;">
                <tr>
                  <td style="padding: 15px;">
                    <h3 style="color: #fca5a5; font-size: 20px; margin: 0 0 10px 0;">⚡ Week ${data.week + 1} Preview: Pressure's On!</h3>
                    <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 1.8;">
                      With 71% of survivors on one life, Week ${data.week + 1} is make-or-break. Only five players are sitting pretty with two lives. The rest? Better bring your A-game.
                    </p>
                    <p style="margin: 0; font-size: 14px; font-weight: bold;">
                      <strong>Pro Tip:</strong> No picks = no chance. Log in, pick a team, and keep your survivor soul alive!
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
            <td align="center" style="padding: 30px 20px; background-color: #1a1a1a;">
              <a href="${data.recapUrl}" style="display: inline-block; padding: 15px 40px; background-color: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">
                View Full Recap & Listen to Song
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #0a0a0a; border-top: 1px solid #404040;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #888888;">
                — The Pick'em Party Crew
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666;">
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
