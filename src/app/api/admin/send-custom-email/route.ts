import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendEmail, sendBulkEmails } from '@/lib/postmark'

interface CustomEmailData {
  to: string
  toName: string
  subject: string
  message: string
  leagueName: string
  leagueUrl: string
}

// Super admin check
function isSuperAdmin(username: string): boolean {
  const superAdminUsernames = ['admin', 'tgauss', 'pickemking']
  return superAdminUsernames.includes(username.toLowerCase())
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      leagueId,
      templateId,
      customSubject,
      customBody,
      recipients,
      scheduleFor,
      adminUsername
    } = body

    const supabase = await createServerSupabaseClient()

    // Get admin user and verify permissions
    const { data: adminUser } = await supabase
      .from('users')
      .select('id, username, display_name')
      .eq('username', adminUsername)
      .single()

    if (!adminUser) {
      return NextResponse.json({
        success: false,
        error: 'Admin user not found'
      }, { status: 403 })
    }

    // Get league and verify admin permissions
    const { data: league } = await supabase
      .from('leagues')
      .select('*')
      .eq('id', leagueId)
      .single()

    if (!league) {
      return NextResponse.json({
        success: false,
        error: 'League not found'
      }, { status: 404 })
    }

    const isCommissioner = league.commissioner_id === adminUser.id
    const isAdmin = isSuperAdmin(adminUser.username)

    if (!isCommissioner && !isAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const leagueUrl = `https://www.pickemparty.app/league/${league.slug}`

    // Get template if specified
    let template = null
    if (templateId) {
      const { data: templateData } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      template = templateData
    }

    // Get recipient information
    const { data: recipientUsers } = await supabase
      .from('users')
      .select('id, username, display_name, email')
      .in('id', recipients)
      .not('email', 'is', null)

    if (!recipientUsers || recipientUsers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid recipients found'
      }, { status: 400 })
    }

    // Prepare subject and body
    const finalSubject = customSubject || template?.subject || 'Message from your League Commissioner'
    const finalBody = customBody || template?.body_template || ''

    // If scheduling, save to scheduled_emails table
    if (scheduleFor) {
      const scheduledEmail = {
        league_id: leagueId,
        template_id: templateId,
        scheduled_for: new Date(scheduleFor).toISOString(),
        recipient_filter: { user_ids: recipients },
        custom_subject: customSubject,
        custom_body: customBody,
        status: 'pending',
        created_by: adminUser.id
      }

      const { data: scheduled } = await supabase
        .from('scheduled_emails')
        .insert(scheduledEmail)
        .select()
        .single()

      return NextResponse.json({
        success: true,
        message: 'Email scheduled successfully',
        scheduledEmailId: scheduled?.id
      })
    }

    // Send emails immediately
    const emailPromises = recipientUsers.map(async (recipient) => {
      // Replace template variables
      let processedSubject = finalSubject
        .replace(/\{\{user_name\}\}/g, recipient.display_name)
        .replace(/\{\{league_name\}\}/g, league.name)

      let processedBody = finalBody
        .replace(/\{\{user_name\}\}/g, recipient.display_name)
        .replace(/\{\{league_name\}\}/g, league.name)
        .replace(/\{\{current_week\}\}/g, getCurrentWeek().toString())

      // Create custom email data
      const emailData: CustomEmailData = {
        to: recipient.email,
        toName: recipient.display_name,
        subject: processedSubject,
        message: processedBody,
        leagueName: league.name,
        leagueUrl
      }

      // Send the email using admin announcement template
      return sendCustomEmail(emailData, adminUser.display_name)
    })

    const results = await Promise.allSettled(emailPromises)
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.length - successful

    // Log email history
    const historyEntries = recipientUsers.map((recipient, index) => ({
      league_id: leagueId,
      recipient_email: recipient.email,
      recipient_user_id: recipient.id,
      template_type: template?.template_type || 'custom',
      subject: finalSubject,
      status: results[index].status === 'fulfilled' ? 'sent' : 'failed',
      sent_at: new Date().toISOString()
    }))

    await supabase
      .from('email_history')
      .insert(historyEntries)

    return NextResponse.json({
      success: true,
      message: `Sent ${successful}/${results.length} emails successfully`,
      details: { successful, failed, total: results.length }
    })

  } catch (error) {
    console.error('Custom email sending error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to send custom emails',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function sendCustomEmail(data: CustomEmailData, senderName: string) {
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${data.subject}</title>
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

              <!-- Main Content -->
              <tr>
                <td style="padding: 24px;">
                  <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 20px; font-weight: 600;">
                    Hi ${data.toName}! 👋
                  </h2>

                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 16px 0;">
                    <div style="color: #475569; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">
                      ${data.message}
                    </div>
                  </div>

                  <!-- CTA Button -->
                  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin: 24px 0;">
                    <tr>
                      <td align="center">
                        <a href="${data.leagueUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.25);">
                          Visit League →
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
                    Message from ${senderName} via Pickem Party
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
    🏈 PICKEM PARTY - MESSAGE FROM ${senderName}

    Hi ${data.toName},

    ${data.message}

    Visit league: ${data.leagueUrl}

    ---
    Message from ${senderName} via Pickem Party
  `

  // Use Postmark directly for custom emails
  const { ServerClient } = await import('postmark')
  const postmark = new ServerClient(process.env.POSTMARK_API_TOKEN!)

  const response = await postmark.sendEmail({
    From: 'commish@pickemparty.app',
    To: data.to,
    Subject: data.subject,
    HtmlBody: htmlBody,
    TextBody: textBody,
    MessageStream: 'outbound',
    TrackOpens: true,
    TrackLinks: 'HtmlOnly'
  })

  return response
}

function getCurrentWeek(): number {
  // Simple week calculation - in real app this would be more sophisticated
  const now = new Date()
  const seasonStart = new Date('2025-09-04') // Example: First Thursday of NFL season
  const diffTime = Math.abs(now.getTime() - seasonStart.getTime())
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
  return Math.min(Math.max(diffWeeks, 1), 18)
}