// Email template helper functions for consistent styling

export const emailStyles = {
  body: `margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;`,
  wrapper: `width: 100%; background-color: #f9fafb;`,
  container: `width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);`,
  header: `background-color: #1e293b; border-radius: 12px 12px 0 0; padding: 32px 24px; text-align: center;`,
  headerTitle: `margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;`,
  headerSubtitle: `margin: 8px 0 0; color: #94a3b8; font-size: 16px; font-weight: 500;`,
  footer: `background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px; padding: 24px; text-align: center;`,
  footerText: `margin: 0 0 8px; color: #64748b; font-size: 13px;`,
  footerLink: `color: #3b82f6; text-decoration: none; font-weight: 500;`,
  button: `display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.25);`,
  successBox: `background: linear-gradient(135deg, #dcfce7, #bbf7d0); border: 2px solid #86efac; border-radius: 8px;`,
  errorBox: `background: linear-gradient(135deg, #fee2e2, #fecaca); border: 2px solid #fca5a5; border-radius: 8px;`,
  warningBox: `background-color: #fef3c7; border: 2px solid #fbbf24; border-radius: 8px;`,
  infoBox: `background-color: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px;`,
}

export function generateEmailHeader(title: string, subtitle: string) {
  return `
    <tr>
      <td style="${emailStyles.header}">
        <h1 style="${emailStyles.headerTitle}">
          🏈 PICKEM PARTY
        </h1>
        <p style="${emailStyles.headerSubtitle}">
          ${subtitle}
        </p>
      </td>
    </tr>
  `
}

export function generateEmailFooter(leagueUrl: string, leagueName: string, footerText: string = 'Automated message from Pickem Party') {
  return `
    <tr>
      <td style="${emailStyles.footer}">
        <p style="${emailStyles.footerText}">
          ${footerText}
        </p>
        <p style="margin: 0; color: #64748b; font-size: 13px;">
          <a href="${leagueUrl}" style="${emailStyles.footerLink}">
            View ${leagueName} Dashboard
          </a>
        </p>
      </td>
    </tr>
  `
}

export function generateEmailWrapper(content: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pickem Party</title>
    </head>
    <body style="${emailStyles.body}">
      <table role="presentation" cellpadding="0" cellspacing="0" style="${emailStyles.wrapper}">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="${emailStyles.container}">
              ${content}
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

// Elimination notice email template
export function generateEliminationEmailContent(data: {
  toName: string
  leagueName: string
  leagueUrl: string
  week: number
  eliminatingPick: string
  finalRank?: number
}) {
  return generateEmailWrapper(`
    ${generateEmailHeader('💀 ELIMINATED', data.leagueName)}

    <!-- Main Content -->
    <tr>
      <td style="padding: 24px;">
        <!-- Elimination Alert -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; ${emailStyles.errorBox}">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 12px;">💀</div>
              <h2 style="margin: 0 0 8px; color: #dc2626; font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                ELIMINATED
              </h2>
              <p style="margin: 8px 0; color: #1e293b; font-size: 16px; font-weight: 600;">
                Week ${data.week} Pick: ${data.eliminatingPick}
              </p>
              ${data.finalRank ? `
                <p style="margin: 0; color: #991b1b; font-size: 14px;">
                  Final Rank: #${data.finalRank}
                </p>
              ` : ''}
            </td>
          </tr>
        </table>

        <!-- Message -->
        <div style="margin: 24px 0;">
          <h3 style="margin: 0 0 12px; color: #1e293b; font-size: 20px; font-weight: 600;">
            Tough luck, ${data.toName}! 😔
          </h3>
          <p style="margin: 0 0 16px; color: #475569; font-size: 16px; line-height: 1.6;">
            Your survivor journey in ${data.leagueName} has come to an end. Your Week ${data.week} pick of ${data.eliminatingPick} didn't work out, but it was a great run!
          </p>
          <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
            You can still follow along with the remaining survivors and see who takes home the prize. Thanks for playing!
          </p>
        </div>

        <!-- CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
          <tr>
            <td align="center">
              <a href="${data.leagueUrl}" style="${emailStyles.button}; background-color: #6b7280;">
                Watch Remaining Survivors →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${generateEmailFooter(data.leagueUrl, data.leagueName, 'Elimination notice from Pickem Party')}
  `)
}

// League invite email template
export function generateLeagueInviteEmailContent(data: {
  toName: string
  leagueName: string
  leagueUrl: string
  inviterName: string
  buyIn: number
  inviteCode: string
  membersCount: number
}) {
  const inviteUrl = `${data.leagueUrl}?invite=${data.inviteCode}&inviter=${encodeURIComponent(data.inviterName)}`

  return generateEmailWrapper(`
    ${generateEmailHeader('🎉 YOU\'RE INVITED!', data.leagueName)}

    <!-- Main Content -->
    <tr>
      <td style="padding: 24px;">
        <!-- Invite Alert -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; ${emailStyles.successBox}">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
              <h2 style="margin: 0 0 8px; color: #16a34a; font-size: 20px; font-weight: 600;">
                ${data.inviterName} invited you to join
              </h2>
              <p style="margin: 0; color: #15803d; font-size: 18px; font-weight: 700;">
                ${data.leagueName}
              </p>
            </td>
          </tr>
        </table>

        <!-- League Details -->
        <div style="margin: 24px 0;">
          <h3 style="margin: 0 0 16px; color: #1e293b; font-size: 18px; font-weight: 600;">
            League Details
          </h3>

          <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <tr>
              <td style="padding: 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                  <tr>
                    <td style="padding: 4px 0; color: #64748b; font-size: 14px;">Buy-in:</td>
                    <td style="padding: 4px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">$${data.buyIn}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b; font-size: 14px;">Current Members:</td>
                    <td style="padding: 4px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${data.membersCount} players</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b; font-size: 14px;">Prize Pool:</td>
                    <td style="padding: 4px 0; color: #16a34a; font-size: 14px; font-weight: 600; text-align: right;">$${data.buyIn * data.membersCount}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b; font-size: 14px;">Invite Code:</td>
                    <td style="padding: 4px 0; text-align: right;">
                      <span style="background-color: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-family: monospace; font-size: 14px; font-weight: 600; color: #1e293b;">
                        ${data.inviteCode}
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>

        <!-- How It Works -->
        <div style="margin: 24px 0;">
          <h3 style="margin: 0 0 12px; color: #1e293b; font-size: 18px; font-weight: 600;">
            🎯 How NFL Survivor Works
          </h3>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px;">
            <tr>
              <td style="padding: 16px;">
                <ul style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 14px; line-height: 1.8;">
                  <li>Pick one NFL team to WIN each week</li>
                  <li>If your team loses, you're eliminated</li>
                  <li>Can only use each team once per season</li>
                  <li>Last player standing wins the pot!</li>
                </ul>
              </td>
            </tr>
          </table>
        </div>

        <!-- CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-top: 24px;">
          <tr>
            <td align="center">
              <a href="${inviteUrl}" style="${emailStyles.button}">
                Join ${data.leagueName} Now →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${generateEmailFooter(data.leagueUrl, data.leagueName, `Invitation from ${data.inviterName} via Pickem Party`)}
  `)
}

// Admin announcement email template
export function generateAdminAnnouncementEmailContent(data: {
  toName: string
  leagueName: string
  leagueUrl: string
  subject: string
  message: string
  commissionerName: string
}) {
  return generateEmailWrapper(`
    ${generateEmailHeader('📢 ANNOUNCEMENT', data.leagueName)}

    <!-- Main Content -->
    <tr>
      <td style="padding: 24px;">
        <!-- Announcement Alert -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; ${emailStyles.warningBox}">
          <tr>
            <td style="padding: 16px 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                <tr>
                  <td style="width: 40px; vertical-align: top;">
                    <span style="font-size: 24px;">📢</span>
                  </td>
                  <td>
                    <h2 style="margin: 0 0 4px; color: #92400e; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Commissioner Message
                    </h2>
                    <p style="margin: 0; color: #78350f; font-size: 16px; font-weight: 600;">
                      ${data.subject}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Message Content -->
        <div style="margin: 24px 0;">
          <h3 style="margin: 0 0 12px; color: #1e293b; font-size: 18px; font-weight: 600;">
            Message from ${data.commissionerName}
          </h3>
          <div style="padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <p style="margin: 0; color: #475569; font-size: 15px; line-height: 1.7; white-space: pre-wrap;">
              ${data.message}
            </p>
          </div>
        </div>

        <!-- CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
          <tr>
            <td align="center">
              <a href="${data.leagueUrl}" style="${emailStyles.button}">
                Visit League →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${generateEmailFooter(data.leagueUrl, data.leagueName, `Commissioner announcement from ${data.commissionerName}`)}
  `)
}