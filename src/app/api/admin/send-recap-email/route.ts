import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ServerClient } from 'postmark'

const postmark = new ServerClient(process.env.POSTMARK_API_TOKEN!)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { leagueSlug, week, testEmail } = body

    const supabase = await createServerSupabaseClient()

    // Get league
    const { data: league } = await supabase
      .from('leagues')
      .select('*')
      .eq('slug', leagueSlug)
      .single()

    if (!league) {
      return NextResponse.json({
        success: false,
        error: 'League not found'
      }, { status: 404 })
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
          display_name,
          email
        ),
        teams:team_id (
          team_id,
          key,
          city,
          name
        )
      `)
      .eq('league_id', league.id)
      .eq('week', week)

    interface PickData {
      id: string
      user_id: string
      team_id: number
      is_correct: boolean | null
      users: { id: string; username: string; display_name: string; email: string } | { id: string; username: string; display_name: string; email: string }[]
      teams: { team_id: number; key: string; city: string; name: string } | { team_id: number; key: string; city: string; name: string }[]
    }

    const picks = (picksData || []).map((pick: PickData) => ({
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
          display_name,
          email
        )
      `)
      .eq('league_id', league.id)

    interface MemberData {
      user_id: string
      lives_remaining: number
      is_eliminated: boolean
      eliminated_week: number | null
      users: { id: string; username: string; display_name: string; email: string } | { id: string; username: string; display_name: string; email: string }[]
    }

    const members = (membersData || []).map((member: MemberData) => ({
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
      users: { id: string; username: string; display_name: string; email: string }
      teams: { team_id: number; key: string; city: string; name: string }
    }

    interface Member {
      user_id: string
      lives_remaining: number
      is_eliminated: boolean
      eliminated_week: number | null
      users: { id: string; username: string; display_name: string; email: string }
    }

    const wins = picks.filter((p: Pick) => p.is_correct === true)
    const losses = picks.filter((p: Pick) => p.is_correct === false)
    const eliminated = members.filter((m: Member) => m.is_eliminated && m.eliminated_week === week)
    const activeMembers = members.filter((m: Member) => !m.is_eliminated)
    const twoLives = activeMembers.filter((m: Member) => m.lives_remaining === 2)
    const oneLife = activeMembers.filter((m: Member) => m.lives_remaining === 1)

    const recapUrl = `https://www.pickemparty.app/league/${leagueSlug}/recap/${week}`

    // Generate email HTML
    const emailHtml = generateRecapEmailHTML({
      week,
      leagueName: league.name,
      wins: wins.length,
      losses: losses.length,
      eliminated: eliminated.length,
      activeMembers: activeMembers.length,
      twoLives: twoLives.length,
      oneLife: oneLife.length,
      eliminatedPlayers: eliminated,
      recapUrl
    })

    // If test email, send to specified address
    if (testEmail) {
      const response = await postmark.sendEmail({
        From: 'commish@pickemparty.app',
        To: testEmail,
        Subject: `[TEST] Week ${week} Recap - ${league.name}`,
        HtmlBody: emailHtml,
        TextBody: `This is a test of the Week ${week} recap email. View the full recap at ${recapUrl}`,
        MessageStream: 'outbound',
        TrackOpens: true
      })

      return NextResponse.json({
        success: true,
        message: `Test email sent to ${testEmail}`,
        messageId: response.MessageID
      })
    }

    // Otherwise send to all members with emails
    const recipientsWithEmail = members
      .filter((m: Member) => m.users.email)
      .map((m: Member) => ({
        email: m.users.email,
        name: m.users.display_name
      }))

    if (recipientsWithEmail.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No members with email addresses found'
      }, { status: 400 })
    }

    // Send to all recipients
    const emailPromises = recipientsWithEmail.map(recipient =>
      postmark.sendEmail({
        From: 'commish@pickemparty.app',
        To: recipient.email,
        Subject: `Week ${week} Recap - ${league.name}`,
        HtmlBody: emailHtml,
        TextBody: `View the Week ${week} recap at ${recapUrl}`,
        MessageStream: 'outbound',
        TrackOpens: true
      })
    )

    const results = await Promise.allSettled(emailPromises)
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.length - successful

    return NextResponse.json({
      success: true,
      message: `Sent ${successful}/${results.length} emails successfully`,
      details: { successful, failed, total: results.length }
    })

  } catch (error) {
    console.error('Recap email sending error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to send recap email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

interface EliminatedPlayer {
  user_id: string
  lives_remaining: number
  is_eliminated: boolean
  eliminated_week: number | null
  users: { id: string; username: string; display_name: string; email: string }
}

function generateRecapEmailHTML(data: {
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
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Week ${data.week} Recap - ${data.leagueName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #0B0E0C; color: #E6E8EA;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0B0E0C;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #171A17; border-radius: 8px; overflow: hidden; border: 2px solid #2B2A28;">

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
                Week ${data.week}: Chaos, Upsets & Graveyard Vibes
              </h2>

              <p style="font-size: 16px; line-height: 1.8; margin: 0 0 20px 0; color: #E6E8EA;">
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
