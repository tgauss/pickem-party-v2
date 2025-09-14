'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Mail, Send, Clock, Trophy, MessageSquare, UserPlus, AlertCircle } from 'lucide-react'

interface User {
  id: string
  username: string
  display_name: string
  email?: string
}

interface Member {
  user: User
  lives_remaining: number
  is_eliminated: boolean
  is_paid: boolean
}

interface AdminEmailControlsProps {
  currentUser: User
  league: {
    id: string
    name: string
    slug: string
    commissioner_id?: string
  }
  members: Member[]
  currentWeek: number
}

export function AdminEmailControls({
  currentUser,
  league,
  members,
  currentWeek
}: AdminEmailControlsProps) {
  const [emailType, setEmailType] = useState<string>('')
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek)
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [customSubject, setCustomSubject] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [inviteEmails, setInviteEmails] = useState('')
  const [sending, setSending] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)

  // Check if user is super admin
  const isSuperAdmin = ['admin', 'tgauss', 'pickemking'].includes(currentUser.username.toLowerCase())
  const isCommissioner = league.commissioner_id === currentUser.id
  const canSendEmails = isSuperAdmin || isCommissioner

  if (!canSendEmails) {
    return null
  }

  // Filter members with email addresses
  const membersWithEmails = members.filter(member => member.user.email)

  const handleSendEmails = async () => {
    if (!emailType) {
      alert('Please select an email type')
      return
    }

    if (emailType === 'admin-announcement' && (!customSubject || !customMessage)) {
      alert('Please provide both subject and message for announcements')
      return
    }

    if (emailType === 'league-invite' && !inviteEmails.trim()) {
      alert('Please provide email addresses for invites')
      return
    }

    setSending(true)
    setLastResult(null)

    try {
      const recipients = selectedRecipients
      const requestBody: Record<string, unknown> = {
        emailType,
        leagueId: league.id,
        week: selectedWeek,
        recipients,
        adminUsername: currentUser.username
      }

      // Handle league invites differently - they go to external emails
      if (emailType === 'league-invite') {
        const emails = inviteEmails.split('\n')
          .map(line => line.trim())
          .filter(line => line.includes('@'))

        const inviteRecipients = emails.map(email => ({
          email: email.trim(),
          name: email.split('@')[0] // Use part before @ as name
        }))

        requestBody.recipients = inviteRecipients
      } else if (emailType === 'admin-announcement') {
        requestBody.customSubject = customSubject
        requestBody.customMessage = customMessage
      }

      const response = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const result = await response.json()
      setLastResult(result)

      if (result.success) {
        alert(`✅ Success: ${result.message}`)
        // Reset form
        setEmailType('')
        setSelectedRecipients([])
        setCustomSubject('')
        setCustomMessage('')
        setInviteEmails('')
      } else {
        alert(`❌ Failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Email sending error:', error)
      alert('❌ Network error sending emails')
      setLastResult({ success: false, error: 'Network error' })
    }

    setSending(false)
  }

  const handleRecipientToggle = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedRecipients(prev => [...prev, userId])
    } else {
      setSelectedRecipients(prev => prev.filter(id => id !== userId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecipients(membersWithEmails.map(m => m.user.id))
    } else {
      setSelectedRecipients([])
    }
  }

  return (
    <Card className="border-blue-600 bg-blue-900/10 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-400">
          <Mail className="h-5 w-5" />
          Email Controls
          <Badge variant="secondary" className="text-xs">ADMIN ONLY</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Email Type Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Email Type</label>
            <Select value={emailType} onValueChange={setEmailType}>
              <SelectTrigger>
                <SelectValue placeholder="Choose email type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pick-reminder">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pick Reminders - Remind users who haven't picked
                  </div>
                </SelectItem>
                <SelectItem value="weekly-results">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Weekly Results - Send game outcomes and standings
                  </div>
                </SelectItem>
                <SelectItem value="admin-announcement">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Commissioner Message - Custom announcement
                  </div>
                </SelectItem>
                <SelectItem value="league-invite">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    League Invites - Invite new members
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Week Selection (for pick reminders and weekly results) */}
          {(emailType === 'pick-reminder' || emailType === 'weekly-results') && (
            <div>
              <label className="text-sm font-medium mb-2 block">Week</label>
              <Select value={selectedWeek.toString()} onValueChange={(value) => setSelectedWeek(parseInt(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 18 }, (_, i) => i + 1).map(week => (
                    <SelectItem key={week} value={week.toString()}>
                      Week {week}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Custom Subject and Message (for announcements) */}
          {emailType === 'admin-announcement' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Input
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Email subject line..."
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Message</label>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Your message to league members..."
                  rows={6}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Invite Email Addresses (for league invites) */}
          {emailType === 'league-invite' && (
            <div>
              <label className="text-sm font-medium mb-2 block">Email Addresses</label>
              <Textarea
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                placeholder="Enter email addresses, one per line:&#10;friend1@email.com&#10;friend2@email.com&#10;friend3@email.com"
                rows={6}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter one email address per line. These people will receive invites to join {league.name}.
              </p>
            </div>
          )}

          {/* Recipient Selection (for member emails) */}
          {emailType && emailType !== 'league-invite' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">Recipients</label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedRecipients.length === membersWithEmails.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">Select All</span>
                </div>
              </div>

              <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
                {membersWithEmails.map(member => (
                  <div key={member.user.id} className="flex items-center justify-between p-2 hover:bg-accent rounded">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedRecipients.includes(member.user.id)}
                        onCheckedChange={(checked) => handleRecipientToggle(member.user.id, !!checked)}
                      />
                      <div>
                        <div className="font-medium">{member.user.display_name}</div>
                        <div className="text-xs text-muted-foreground">{member.user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.is_eliminated && (
                        <Badge variant="destructive" className="text-xs">Eliminated</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {member.lives_remaining} {member.lives_remaining === 1 ? 'life' : 'lives'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {membersWithEmails.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No league members have email addresses on file. Users need to add their email in their profile settings.
                  </AlertDescription>
                </Alert>
              )}

              <p className="text-xs text-muted-foreground mt-2">
                {selectedRecipients.length} of {membersWithEmails.length} recipients selected
                {emailType === 'pick-reminder' && ' (will be filtered to only users who haven&apos;t picked)'}
              </p>
            </div>
          )}

          {/* Send Button */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {emailType && (
                <span>
                  {emailType === 'pick-reminder' && '⏰ Reminds users to make their picks'}
                  {emailType === 'weekly-results' && '📊 Sends weekly game results and standings'}
                  {emailType === 'admin-announcement' && '📢 Sends custom message from commissioner'}
                  {emailType === 'league-invite' && '🎉 Invites new people to join the league'}
                </span>
              )}
            </div>

            <Button
              onClick={handleSendEmails}
              disabled={!emailType || sending || (emailType !== 'league-invite' && selectedRecipients.length === 0)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Emails
                </>
              )}
            </Button>
          </div>

          {/* Last Result Display */}
          {lastResult && (
            <Alert className={lastResult.success ? 'border-green-600 bg-green-900/20' : 'border-red-600 bg-red-900/20'}>
              <AlertCircle className={`h-4 w-4 ${lastResult.success ? 'text-green-400' : 'text-red-400'}`} />
              <AlertDescription className={lastResult.success ? 'text-green-300' : 'text-red-300'}>
                <strong>{lastResult.success ? '✅ Success:' : '❌ Failed:'}</strong> {lastResult.message || lastResult.error}
                {lastResult.details && (
                  <div className="mt-2 text-sm">
                    Sent: {lastResult.details.successful} | Failed: {lastResult.details.failed} | Total: {lastResult.details.total}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Email Requirements Notice */}
          <Alert className="border-yellow-600 bg-yellow-900/20">
            <Mail className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-yellow-300">
              <strong>Requirements:</strong> You need to add your Postmark API token to the environment variables for emails to work.
              Add <code className="bg-yellow-800/50 px-1 rounded">POSTMARK_API_TOKEN</code> to your <code className="bg-yellow-800/50 px-1 rounded">.env.local</code> file.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  )
}