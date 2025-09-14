'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Mail,
  Send,
  CalendarDays,
  Users,
  Settings,
  ArrowLeft,
  Clock,
  History,
  Plus,
  Edit,
  Calendar,
  MessageSquare,
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
  Timer
} from 'lucide-react'

interface User {
  id: string
  username: string
  display_name: string
  email?: string
}

interface League {
  id: string
  name: string
  slug: string
  commissioner_id?: string
  buy_in_amount?: number
}

interface Member {
  user: User
  lives_remaining: number
  is_eliminated: boolean
  is_paid: boolean
}

interface EmailTemplate {
  id: string
  name: string
  template_type: string
  subject: string
  body_template: string
  variables: string[]
  is_system: boolean
}

interface ScheduledEmail {
  id: string
  template_id: string
  scheduled_for: string
  custom_subject?: string
  custom_body?: string
  status: string
  created_at: string
  template?: EmailTemplate
}

interface EmailHistory {
  id: string
  recipient_email: string
  recipient_user_id?: string
  template_type: string
  subject: string
  status: string
  sent_at: string
  opened_at?: string
  recipient?: User
}

interface EmailSettings {
  pick_reminder_enabled: boolean
  pick_reminder_hours_before: number
  weekly_recap_enabled: boolean
  weekly_recap_day: number
  weekly_recap_time: string
  payment_reminder_enabled: boolean
  elimination_notice_enabled: boolean
  custom_footer_text?: string
}

export default function EmailControlCenter({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [league, setLeague] = useState<League | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([])
  const [emailHistory, setEmailHistory] = useState<EmailHistory[]>([])
  const [emailSettings, setEmailSettings] = useState<EmailSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('compose')

  // Compose form state
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [customSubject, setCustomSubject] = useState('')
  const [customBody, setCustomBody] = useState('')
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [scheduleFor, setScheduleFor] = useState('')
  const [sending, setSending] = useState(false)

  const supabase = createClient()

  // Check if user is admin
  const isAdmin = useCallback(() => {
    if (!currentUser || !league) return false
    const superAdminUsernames = ['admin', 'tgauss', 'pickemking']
    return superAdminUsernames.includes(currentUser.username.toLowerCase()) ||
           league.commissioner_id === currentUser.id
  }, [currentUser, league])

  const loadData = useCallback(async () => {
    if (!currentUser) return

    setLoading(true)
    try {
      // Load league
      const { data: leagueData } = await supabase
        .from('leagues')
        .select('*')
        .eq('slug', slug)
        .single()

      if (!leagueData) {
        alert('League not found')
        return
      }
      setLeague(leagueData)

      // Load members
      const { data: membersData } = await supabase
        .from('league_members')
        .select(`
          *,
          user:users!inner(id, username, display_name, email)
        `)
        .eq('league_id', leagueData.id)

      setMembers(membersData || [])

      // Load email templates
      const { data: templatesData } = await supabase
        .from('email_templates')
        .select('*')
        .order('name')

      setTemplates(templatesData || [])

      // Load scheduled emails
      const { data: scheduledData } = await supabase
        .from('scheduled_emails')
        .select(`
          *,
          template:email_templates(*)
        `)
        .eq('league_id', leagueData.id)
        .order('scheduled_for', { ascending: false })

      setScheduledEmails(scheduledData || [])

      // Load email history
      const { data: historyData } = await supabase
        .from('email_history')
        .select(`
          *,
          recipient:users(id, display_name, username)
        `)
        .eq('league_id', leagueData.id)
        .order('sent_at', { ascending: false })
        .limit(100)

      setEmailHistory(historyData || [])

      // Load email settings
      const { data: settingsData } = await supabase
        .from('league_email_settings')
        .select('*')
        .eq('league_id', leagueData.id)
        .single()

      if (settingsData) {
        setEmailSettings(settingsData)
      } else {
        // Create default settings
        const defaultSettings = {
          league_id: leagueData.id,
          pick_reminder_enabled: true,
          pick_reminder_hours_before: 24,
          weekly_recap_enabled: true,
          weekly_recap_day: 2,
          weekly_recap_time: '10:00:00',
          payment_reminder_enabled: true,
          elimination_notice_enabled: true
        }

        const { data: newSettings } = await supabase
          .from('league_email_settings')
          .insert(defaultSettings)
          .select()
          .single()

        setEmailSettings(newSettings)
      }

    } catch (error) {
      console.error('Error loading data:', error)
    }
    setLoading(false)
  }, [currentUser, slug, supabase])

  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser')
    if (currentUser) {
      setCurrentUser(JSON.parse(currentUser))
    } else {
      window.location.href = '/'
    }
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadData()
    }
  }, [currentUser, loadData])

  const handleSendEmail = async () => {
    if (!selectedTemplate && (!customSubject || !customBody)) {
      alert('Please select a template or provide custom subject and body')
      return
    }

    if (selectedRecipients.length === 0) {
      alert('Please select at least one recipient')
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/admin/send-custom-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId: league?.id,
          templateId: selectedTemplate || null,
          customSubject: customSubject || null,
          customBody: customBody || null,
          recipients: selectedRecipients,
          scheduleFor: scheduleFor || null,
          adminUsername: currentUser?.username
        })
      })

      const result = await response.json()

      if (result.success) {
        alert(`✅ ${scheduleFor ? 'Email scheduled' : 'Email sent'} successfully`)
        // Reset form
        setSelectedTemplate('')
        setCustomSubject('')
        setCustomBody('')
        setSelectedRecipients([])
        setScheduleFor('')
        // Reload data
        await loadData()
      } else {
        alert(`❌ Failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Email sending error:', error)
      alert('❌ Network error')
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
      setSelectedRecipients(members.filter(m => m.user.email).map(m => m.user.id))
    } else {
      setSelectedRecipients([])
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />
      default: return <Timer className="h-4 w-4 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              Only commissioners and super admins can access email controls.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const membersWithEmails = members.filter(m => m.user.email)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => window.location.href = `/league/${slug}`}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to League
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <Mail className="h-8 w-8" />
              Email Control Center
            </h1>
            <p className="text-muted-foreground">{league?.name}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Compose Tab */}
          <TabsContent value="compose">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Email Composer */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Compose Email
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Template Selection */}
                  <div>
                    <Label>Email Template (Optional)</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template or compose custom..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Custom Message</SelectItem>
                        {templates.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name} ({template.template_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom Subject */}
                  <div>
                    <Label>Subject Line</Label>
                    <Input
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder={selectedTemplate ? 'Leave blank to use template default' : 'Enter email subject...'}
                    />
                  </div>

                  {/* Custom Body */}
                  <div>
                    <Label>Message Body</Label>
                    <Textarea
                      value={customBody}
                      onChange={(e) => setCustomBody(e.target.value)}
                      placeholder={selectedTemplate ? 'Leave blank to use template default' : 'Enter your message...'}
                      rows={8}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Available variables: {{user_name}}, {{league_name}}, {{current_week}}
                    </p>
                  </div>

                  {/* Schedule Option */}
                  <div>
                    <Label>Send Time (Optional)</Label>
                    <Input
                      type="datetime-local"
                      value={scheduleFor}
                      onChange={(e) => setScheduleFor(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave blank to send immediately
                    </p>
                  </div>

                  {/* Send Button */}
                  <Button
                    onClick={handleSendEmail}
                    disabled={sending || selectedRecipients.length === 0}
                    className="w-full"
                  >
                    {sending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        {scheduleFor ? 'Scheduling...' : 'Sending...'}
                      </>
                    ) : (
                      <>
                        {scheduleFor ? <CalendarDays className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                        {scheduleFor ? 'Schedule Email' : 'Send Now'}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Recipients */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Recipients
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedRecipients.length === membersWithEmails.length}
                        onCheckedChange={handleSelectAll}
                      />
                      <span className="text-sm text-muted-foreground">Select All</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
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
                        <div className="flex items-center gap-1">
                          {member.is_eliminated && <Badge variant="destructive" className="text-xs">Eliminated</Badge>}
                          {!member.is_paid && <Badge variant="outline" className="text-xs">Unpaid</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {membersWithEmails.length === 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No league members have email addresses on file.
                      </AlertDescription>
                    </Alert>
                  )}

                  <p className="text-xs text-muted-foreground mt-4">
                    {selectedRecipients.length} of {membersWithEmails.length} recipients selected
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => (
                <Card key={template.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      {template.is_system && <Badge variant="secondary" className="text-xs">System</Badge>}
                    </div>
                    <Badge variant="outline" className="w-fit text-xs">
                      {template.template_type.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Subject:</Label>
                        <p className="text-sm font-medium">{template.subject}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Body Preview:</Label>
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {template.body_template}
                        </p>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                        {!template.is_system && (
                          <Button size="sm" variant="outline">
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Scheduled Tab */}
          <TabsContent value="scheduled">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Scheduled Emails
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scheduledEmails.map(email => (
                    <div key={email.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">
                          {email.custom_subject || email.template?.subject}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Scheduled for: {new Date(email.scheduled_for).toLocaleString()}
                        </div>
                        {email.template && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {email.template.name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(email.status)}
                        <Badge variant={email.status === 'sent' ? 'default' : 'secondary'}>
                          {email.status}
                        </Badge>
                      </div>
                    </div>
                  ))}

                  {scheduledEmails.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground">
                      No scheduled emails found
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Email History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {emailHistory.map(email => (
                    <div key={email.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{email.subject}</div>
                        <div className="text-sm text-muted-foreground">
                          To: {email.recipient?.display_name || email.recipient_email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Sent: {new Date(email.sent_at).toLocaleString()}
                          {email.opened_at && ` • Opened: ${new Date(email.opened_at).toLocaleString()}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(email.status)}
                        <Badge variant={email.status === 'sent' ? 'default' : 'secondary'}>
                          {email.status}
                        </Badge>
                      </div>
                    </div>
                  ))}

                  {emailHistory.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground">
                      No email history found
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Email Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {emailSettings ? (
                  <div className="space-y-6">
                    {/* Pick Reminders */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium">Pick Reminders</h3>
                        <Checkbox
                          checked={emailSettings.pick_reminder_enabled}
                          onCheckedChange={(checked) =>
                            setEmailSettings({...emailSettings, pick_reminder_enabled: !!checked})
                          }
                        />
                      </div>
                      {emailSettings.pick_reminder_enabled && (
                        <div>
                          <Label>Hours Before Deadline</Label>
                          <Input
                            type="number"
                            value={emailSettings.pick_reminder_hours_before}
                            onChange={(e) =>
                              setEmailSettings({...emailSettings, pick_reminder_hours_before: parseInt(e.target.value)})
                            }
                            min="1"
                            max="168"
                            className="w-24 mt-1"
                          />
                        </div>
                      )}
                    </div>

                    {/* Weekly Recap */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium">Weekly Recap</h3>
                        <Checkbox
                          checked={emailSettings.weekly_recap_enabled}
                          onCheckedChange={(checked) =>
                            setEmailSettings({...emailSettings, weekly_recap_enabled: !!checked})
                          }
                        />
                      </div>
                      {emailSettings.weekly_recap_enabled && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Day of Week</Label>
                            <Select
                              value={emailSettings.weekly_recap_day.toString()}
                              onValueChange={(value) =>
                                setEmailSettings({...emailSettings, weekly_recap_day: parseInt(value)})
                              }
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">Sunday</SelectItem>
                                <SelectItem value="1">Monday</SelectItem>
                                <SelectItem value="2">Tuesday</SelectItem>
                                <SelectItem value="3">Wednesday</SelectItem>
                                <SelectItem value="4">Thursday</SelectItem>
                                <SelectItem value="5">Friday</SelectItem>
                                <SelectItem value="6">Saturday</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Time</Label>
                            <Input
                              type="time"
                              value={emailSettings.weekly_recap_time}
                              onChange={(e) =>
                                setEmailSettings({...emailSettings, weekly_recap_time: e.target.value})
                              }
                              className="mt-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Other Settings */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Payment Reminders</Label>
                        <Checkbox
                          checked={emailSettings.payment_reminder_enabled}
                          onCheckedChange={(checked) =>
                            setEmailSettings({...emailSettings, payment_reminder_enabled: !!checked})
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Elimination Notices</Label>
                        <Checkbox
                          checked={emailSettings.elimination_notice_enabled}
                          onCheckedChange={(checked) =>
                            setEmailSettings({...emailSettings, elimination_notice_enabled: !!checked})
                          }
                        />
                      </div>
                    </div>

                    {/* Custom Footer */}
                    <div>
                      <Label>Custom Footer Text (Optional)</Label>
                      <Textarea
                        value={emailSettings.custom_footer_text || ''}
                        onChange={(e) =>
                          setEmailSettings({...emailSettings, custom_footer_text: e.target.value})
                        }
                        placeholder="Add custom text to appear in email footers..."
                        rows={3}
                        className="mt-1"
                      />
                    </div>

                    <Button className="w-full">
                      Save Settings
                    </Button>
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    Loading settings...
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}