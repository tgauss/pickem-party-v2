import { ServerClient } from 'postmark'
import {
  generateEliminationEmailContent,
  generateLeagueInviteEmailContent,
  generateAdminAnnouncementEmailContent
} from './postmark-templates'

// Initialize Postmark client
const postmark = new ServerClient(process.env.POSTMARK_API_TOKEN!)

// Email template types
export type EmailTemplate =
  | 'pick-reminder'
  | 'weekly-results'
  | 'elimination-notice'
  | 'league-invite'
  | 'admin-announcement'

// Base email data interface
interface BaseEmailData {
  to: string
  toName: string
  leagueName: string
  leagueUrl: string
}

// Pick reminder email data
interface PickReminderData extends BaseEmailData {
  week: number
  deadline: string
  timeRemaining: string
  usedTeams: string[]
}

// Weekly results email data
interface WeeklyResultsData extends BaseEmailData {
  week: number
  yourPick?: {
    team: string
    result: 'correct' | 'incorrect'
  }
  eliminatedPlayers: string[]
  standingsUrl: string
  survivorsRemaining: number
}

// Elimination notice email data
interface EliminationData extends BaseEmailData {
  week: number
  eliminatingPick: string
  finalRank?: number
}

// League invite email data
interface LeagueInviteData extends BaseEmailData {
  inviterName: string
  buyIn: number
  inviteCode: string
  membersCount: number
}

// Admin announcement email data
interface AdminAnnouncementData extends BaseEmailData {
  subject: string
  message: string
  commissionerName: string
}

// Email sending function
export async function sendEmail(
  template: EmailTemplate,
  data: PickReminderData | WeeklyResultsData | EliminationData | LeagueInviteData | AdminAnnouncementData
) {
  try {
    const emailConfig = generateEmailConfig(template, data)

    const response = await postmark.sendEmail({
      From: 'commish@pickemparty.app',
      To: data.to,
      Subject: emailConfig.subject,
      HtmlBody: emailConfig.htmlBody,
      TextBody: emailConfig.textBody,
      MessageStream: 'outbound',
      TrackOpens: true,
      TrackLinks: 'HtmlOnly'
    })

    console.log(`📧 Email sent successfully to ${data.to}: ${response.MessageID}`)
    return { success: true, messageId: response.MessageID }

  } catch (error) {
    console.error('❌ Email sending failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Generate email configuration based on template
function generateEmailConfig(template: EmailTemplate, data: PickReminderData | WeeklyResultsData | EliminationData | LeagueInviteData | AdminAnnouncementData) {
  switch (template) {
    case 'pick-reminder':
      return generatePickReminderEmail(data as PickReminderData)
    case 'weekly-results':
      return generateWeeklyResultsEmail(data as WeeklyResultsData)
    case 'elimination-notice':
      return generateEliminationEmail(data as EliminationData)
    case 'league-invite':
      return generateLeagueInviteEmail(data as LeagueInviteData)
    case 'admin-announcement':
      return generateAdminAnnouncementEmail(data as AdminAnnouncementData)
    default:
      throw new Error(`Unknown email template: ${template}`)
  }
}

// Pick reminder email template
function generatePickReminderEmail(data: PickReminderData) {
  const subject = `⏰ ${data.leagueName} - Week ${data.week} Pick Reminder`

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pick Reminder</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f9fafb;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">

              <!-- Header -->
              <tr>
                <td style="background-color: #1e293b; border-radius: 12px 12px 0 0; padding: 32px 24px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                    🏈 PICKEM PARTY
                  </h1>
                  <p style="margin: 8px 0 0; color: #94a3b8; font-size: 16px; font-weight: 500;">
                    ${data.leagueName}
                  </p>
                </td>
              </tr>

              <!-- Alert Banner -->
              <tr>
                <td style="padding: 24px 24px 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #fef3c7; border: 2px solid #fbbf24; border-radius: 8px;">
                    <tr>
                      <td style="padding: 16px 20px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                          <tr>
                            <td style="width: 40px; vertical-align: top;">
                              <span style="font-size: 24px;">⏰</span>
                            </td>
                            <td>
                              <h2 style="margin: 0 0 8px; color: #92400e; font-size: 18px; font-weight: 600;">
                                Week ${data.week} Pick Deadline Approaching!
                              </h2>
                              <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.5;">
                                <strong>Deadline:</strong> ${data.deadline}<br>
                                <strong>Time Remaining:</strong> <span style="color: #dc2626; font-weight: 600;">${data.timeRemaining}</span>
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Main Content -->
              <tr>
                <td style="padding: 24px;">
                  <h3 style="margin: 0 0 12px; color: #1e293b; font-size: 20px; font-weight: 600;">
                    Hi ${data.toName} 👋
                  </h3>
                  <p style="margin: 0 0 20px; color: #475569; font-size: 16px; line-height: 1.6;">
                    You haven't made your survivor pick for Week ${data.week} yet. Don't get eliminated by missing the deadline!
                  </p>

                  ${data.usedTeams.length > 0 ? `
                    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 16px;">
                          <h4 style="margin: 0 0 8px; color: #dc2626; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            🚫 Teams Already Used
                          </h4>
                          <p style="margin: 0; color: #991b1b; font-size: 16px; font-weight: 600;">
                            ${data.usedTeams.join(' • ')}
                          </p>
                        </td>
                      </tr>
                    </table>
                  ` : ''}

                  <!-- CTA Button -->
                  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin: 24px 0;">
                    <tr>
                      <td align="center">
                        <a href="${data.leagueUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.25);">
                          Make Your Pick Now →
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 0; color: #64748b; font-size: 14px; text-align: center;">
                    Remember: Once a game starts, you can't pick that team!
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px; padding: 24px; text-align: center;">
                  <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;">
                    Automated reminder from Pickem Party
                  </p>
                  <p style="margin: 0; color: #64748b; font-size: 13px;">
                    <a href="${data.leagueUrl}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">
                      View League Dashboard
                    </a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  const textBody = `
    🏈 PICKEM PARTY - PICK REMINDER

    Hi ${data.toName},

    You still need to make your survivor pick for Week ${data.week} in ${data.leagueName}.

    ⏰ DEADLINE: ${data.deadline}
    ⏱️  TIME REMAINING: ${data.timeRemaining}

    ${data.usedTeams.length > 0 ? `🚫 Teams you've already used: ${data.usedTeams.join(', ')}` : ''}

    Don't get eliminated by missing the deadline!

    Make your pick: ${data.leagueUrl}

    ---
    Pickem Party - Automated Reminder
  `

  return { subject, htmlBody, textBody }
}

// Weekly results email template
function generateWeeklyResultsEmail(data: WeeklyResultsData) {
  const subject = `📊 ${data.leagueName} - Week ${data.week} Results`

  const resultIcon = data.yourPick?.result === 'correct' ? '✅' : '❌'
  const resultText = data.yourPick?.result === 'correct' ? 'SURVIVED' : 'ELIMINATED'
  const resultMessage = data.yourPick?.result === 'correct' ? 'You advance to next week!' : 'Your survivor journey ends here.'

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Week ${data.week} Results</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f9fafb;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">

              <!-- Header -->
              <tr>
                <td style="background-color: #1e293b; border-radius: 12px 12px 0 0; padding: 32px 24px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                    🏈 PICKEM PARTY
                  </h1>
                  <p style="margin: 8px 0 0; color: #94a3b8; font-size: 16px; font-weight: 500;">
                    ${data.leagueName}
                  </p>
                </td>
              </tr>

              <!-- Week Title -->
              <tr>
                <td style="padding: 24px 24px 0; text-align: center;">
                  <h2 style="margin: 0; color: #1e293b; font-size: 24px; font-weight: 600;">
                    Week ${data.week} Results
                  </h2>
                </td>
              </tr>

              ${data.yourPick ? `
                <!-- Your Pick Result -->
                <tr>
                  <td style="padding: 20px 24px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background: ${data.yourPick.result === 'correct' ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)' : 'linear-gradient(135deg, #fee2e2, #fecaca)'}; border: 2px solid ${data.yourPick.result === 'correct' ? '#86efac' : '#fca5a5'}; border-radius: 8px;">
                      <tr>
                        <td style="padding: 20px; text-align: center;">
                          <div style="font-size: 32px; margin-bottom: 8px;">${resultIcon}</div>
                          <h3 style="margin: 0 0 4px; color: ${data.yourPick.result === 'correct' ? '#16a34a' : '#dc2626'}; font-size: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                            ${resultText}
                          </h3>
                          <p style="margin: 8px 0 4px; color: #1e293b; font-size: 16px; font-weight: 600;">
                            Your Pick: ${data.yourPick.team}
                          </p>
                          <p style="margin: 0; color: ${data.yourPick.result === 'correct' ? '#15803d' : '#991b1b'}; font-size: 14px;">
                            ${resultMessage}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              ` : ''}

              <!-- League Stats -->
              <tr>
                <td style="padding: 24px;">
                  <h3 style="margin: 0 0 16px; color: #1e293b; font-size: 18px; font-weight: 600;">
                    📊 League Status
                  </h3>

                  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 20px;">
                    <tr>
                      <td style="width: 50%; padding: 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px 0 0 8px; text-align: center;">
                        <div style="font-size: 32px; font-weight: 700; color: #16a34a; margin-bottom: 4px;">
                          ${data.survivorsRemaining}
                        </div>
                        <div style="color: #15803d; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
                          Still Alive
                        </div>
                      </td>
                      <td style="width: 50%; padding: 16px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 0 8px 8px 0; text-align: center; border-left: none;">
                        <div style="font-size: 32px; font-weight: 700; color: #dc2626; margin-bottom: 4px;">
                          ${data.eliminatedPlayers.length}
                        </div>
                        <div style="color: #991b1b; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
                          Eliminated
                        </div>
                      </td>
                    </tr>
                  </table>

                  ${data.eliminatedPlayers.length > 0 ? `
                    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 16px;">
                          <h4 style="margin: 0 0 8px; color: #dc2626; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            💀 Eliminated This Week
                          </h4>
                          <p style="margin: 0; color: #991b1b; font-size: 15px; line-height: 1.6;">
                            ${data.eliminatedPlayers.join(' • ')}
                          </p>
                        </td>
                      </tr>
                    </table>
                  ` : ''}

                  <!-- CTA Button -->
                  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                    <tr>
                      <td align="center">
                        <a href="${data.standingsUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.25);">
                          View Full Standings →
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px; padding: 24px; text-align: center;">
                  <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;">
                    Weekly results from Pickem Party
                  </p>
                  <p style="margin: 0; color: #64748b; font-size: 13px;">
                    <a href="${data.leagueUrl}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">
                      View League Dashboard
                    </a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  const textBody = `
    🏈 PICKEM PARTY - WEEK ${data.week} RESULTS

    ${data.leagueName}

    ${data.yourPick ? `${resultIcon} Your Pick: ${data.yourPick.team} - ${resultText}` : ''}

    📊 LEAGUE UPDATE:
    • ${data.survivorsRemaining} survivors remaining
    • ${data.eliminatedPlayers.length} eliminated this week

    ${data.eliminatedPlayers.length > 0 ? `💀 Eliminated: ${data.eliminatedPlayers.join(', ')}` : ''}

    View full standings: ${data.standingsUrl}

    ---
    Pickem Party - Weekly Results
  `

  return { subject, htmlBody, textBody }
}

// Elimination notice email template
function generateEliminationEmail(data: EliminationData) {
  const subject = `💀 ${data.leagueName} - You Have Been Eliminated`
  const htmlBody = generateEliminationEmailContent(data)

  const textBody = `
    💀 ELIMINATION NOTICE - PICKEM PARTY

    Hi ${data.toName},

    You have been eliminated from ${data.leagueName}.

    Week ${data.week} Pick: ${data.eliminatingPick}
    ${data.finalRank ? `Final Rank: #${data.finalRank}` : ''}

    Thanks for playing! You can still follow the remaining survivors.

    Watch the league: ${data.leagueUrl}

    ---
    Pickem Party - Elimination Notice
  `

  return { subject, htmlBody, textBody }
}

// League invite email template
function generateLeagueInviteEmail(data: LeagueInviteData) {
  const subject = `🏈 You're Invited to Join ${data.leagueName}!`
  const htmlBody = generateLeagueInviteEmailContent(data)

  const textBody = `
    🏈 PICKEM PARTY INVITATION

    Hi ${data.toName},

    ${data.inviterName} has invited you to join their NFL Survivor Pool: ${data.leagueName}

    LEAGUE DETAILS:
    • Buy-in: $${data.buyIn}
    • Current Members: ${data.membersCount}
    • Invite Code: ${data.inviteCode}

    HOW IT WORKS:
    • Pick one NFL team to WIN each week
    • If your team loses, you're eliminated
    • Can only use each team once per season
    • Last player standing wins the pot!

    Join now: ${data.leagueUrl}?invite=${data.inviteCode}&inviter=${encodeURIComponent(data.inviterName)}

    ---
    Invitation from ${data.inviterName} via Pickem Party
  `

  return { subject, htmlBody, textBody }
}

// Admin announcement email template
function generateAdminAnnouncementEmail(data: AdminAnnouncementData) {
  const subject = `📢 ${data.leagueName} - ${data.subject}`
  const htmlBody = generateAdminAnnouncementEmailContent(data)

  const textBody = `
    📢 COMMISSIONER MESSAGE - ${data.leagueName}

    Subject: ${data.subject}

    Message from ${data.commissionerName}:

    ${data.message}

    ---

    Visit league: ${data.leagueUrl}

    Commissioner announcement from ${data.commissionerName} via Pickem Party
  `

  return { subject, htmlBody, textBody }
}

// Bulk email sending function
export async function sendBulkEmails(
  template: EmailTemplate,
  recipients: Array<{
    email: string
    name: string
    data: Record<string, unknown>
  }>
) {
  const results = await Promise.allSettled(
    recipients.map(recipient =>
      sendEmail(template, {
        to: recipient.email,
        toName: recipient.name,
        ...recipient.data
      })
    )
  )

  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
  const failed = results.length - successful

  return {
    total: results.length,
    successful,
    failed,
    results
  }
}

// Export types for use in other files
export type {
  PickReminderData,
  WeeklyResultsData,
  EliminationData,
  LeagueInviteData,
  AdminAnnouncementData
}