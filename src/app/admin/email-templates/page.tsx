'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, Plus, Edit, Trash2, AlertCircle, Mail, Clock, Users, DollarSign } from 'lucide-react'

interface EmailTemplate {
  id: string
  name: string
  template_type: string
  subject: string
  body_template: string
  variables: string[] | Record<string, unknown>
  is_system: boolean
  created_at: string
  updated_at: string
}

export default function SuperAdminEmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState<{id: string, username: string, display_name: string} | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<Record<string, string>>({})

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    templateType: '',
    subject: '',
    bodyTemplate: '',
    variables: ''
  })

  const templateTypes = [
    { value: 'pick_reminder', label: 'Pick Reminder', icon: Clock, description: 'Reminds users to make their weekly picks' },
    { value: 'weekly_recap', label: 'Weekly Recap', icon: Mail, description: 'Weekly results and standings update' },
    { value: 'payment_reminder', label: 'Payment Reminder', icon: DollarSign, description: 'Reminds users about outstanding payments' },
    { value: 'elimination_notice', label: 'Elimination Notice', icon: AlertCircle, description: 'Notifies users of elimination' },
    { value: 'league_invite', label: 'League Invite', icon: Users, description: 'Invites users to join leagues' },
    { value: 'custom', label: 'Custom', icon: Mail, description: 'Custom commissioner messages' }
  ]

  useEffect(() => {
    // Get current user from localStorage
    const user = localStorage.getItem('currentUser')
    if (user) {
      const userData = JSON.parse(user)
      setCurrentUser(userData)

      // Check if user is super admin
      const superAdminUsernames = ['admin', 'tgauss', 'pickemking']
      if (!superAdminUsernames.includes(userData.username.toLowerCase())) {
        setError('Super admin access required')
        setLoading(false)
        return
      }

      fetchTemplates()
    } else {
      setError('Please log in to access this page')
      setLoading(false)
    }
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/email-templates')
      const data = await response.json()

      if (data.success) {
        setTemplates(data.templates)
      } else {
        setError(data.error || 'Failed to fetch templates')
      }
    } catch (err) {
      setError('Network error fetching templates')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = async () => {
    try {
      const response = await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          variables: formData.variables ? JSON.parse(formData.variables) : {},
          adminUsername: currentUser.username
        })
      })

      const data = await response.json()

      if (data.success) {
        setTemplates([...templates, data.template])
        setShowCreateDialog(false)
        setFormData({ name: '', templateType: '', subject: '', bodyTemplate: '', variables: '' })
      } else {
        setError(data.error || 'Failed to create template')
      }
    } catch (err) {
      setError('Network error creating template')
    }
  }

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return

    try {
      const response = await fetch('/api/admin/email-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          name: formData.name,
          subject: formData.subject,
          bodyTemplate: formData.bodyTemplate,
          variables: formData.variables ? JSON.parse(formData.variables) : {},
          adminUsername: currentUser.username
        })
      })

      const data = await response.json()

      if (data.success) {
        setTemplates(templates.map(t => t.id === selectedTemplate.id ? data.template : t))
        setSelectedTemplate(null)
        setFormData({ name: '', templateType: '', subject: '', bodyTemplate: '', variables: '' })
      } else {
        setError(data.error || 'Failed to update template')
      }
    } catch (err) {
      setError('Network error updating template')
    }
  }

  const handleDeleteTemplate = async (templateId: string, isSystem: boolean) => {
    if (isSystem) {
      setError('System templates cannot be deleted')
      return
    }

    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch('/api/admin/email-templates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          adminUsername: currentUser.username
        })
      })

      const data = await response.json()

      if (data.success) {
        setTemplates(templates.filter(t => t.id !== templateId))
      } else {
        setError(data.error || 'Failed to delete template')
      }
    } catch (err) {
      setError('Network error deleting template')
    }
  }

  const openEditDialog = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setFormData({
      name: template.name,
      templateType: template.template_type,
      subject: template.subject,
      bodyTemplate: template.body_template,
      variables: JSON.stringify(template.variables, null, 2)
    })
  }

  const openPreview = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setPreviewData({
      user_name: 'John Doe',
      league_name: 'The Gridiron Gamble 2025',
      week: '3',
      deadline: 'Sunday, Sept 15 at 1:00 PM ET',
      time_remaining: '2 days, 3 hours',
      used_teams: 'Chiefs, Bills, Cowboys',
      buy_in: '15',
      survivors_count: '12',
      eliminated_count: '3',
      your_pick: 'Ravens',
      pick_result: 'WIN'
    })
    setShowPreview(true)
  }

  const processTemplate = (template: string, data: Record<string, string>) => {
    let processed = template
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      processed = processed.replace(regex, String(value))
    })
    return processed
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading email templates...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const systemTemplates = templates.filter(t => t.is_system)
  const customTemplates = templates.filter(t => !t.is_system)

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Templates</h1>
          <p className="text-muted-foreground mt-2">
            Manage platform-wide email templates and scenarios
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Email Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Weekly Pick Reminder"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Template Type</Label>
                  <Select value={formData.templateType} onValueChange={(value) => setFormData({...formData, templateType: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {templateTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  placeholder="Week {{week}} Pick Reminder - {{league_name}}"
                />
              </div>

              <div>
                <Label htmlFor="body">Template Body</Label>
                <Textarea
                  id="body"
                  value={formData.bodyTemplate}
                  onChange={(e) => setFormData({...formData, bodyTemplate: e.target.value})}
                  rows={8}
                  placeholder="Hi {{user_name}}, don't forget to make your pick for Week {{week}}!"
                />
              </div>

              <div>
                <Label htmlFor="variables">Available Variables (JSON)</Label>
                <Textarea
                  id="variables"
                  value={formData.variables}
                  onChange={(e) => setFormData({...formData, variables: e.target.value})}
                  rows={3}
                  placeholder='["user_name", "league_name", "week", "deadline"]'
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTemplate}>
                  Create Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="system" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="system">System Templates ({systemTemplates.length})</TabsTrigger>
          <TabsTrigger value="custom">Custom Templates ({customTemplates.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {systemTemplates.map((template) => {
              const typeInfo = templateTypes.find(t => t.value === template.template_type)
              const IconComponent = typeInfo?.icon || Mail

              return (
                <Card key={template.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <IconComponent className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                      </div>
                      <Badge variant="secondary">System</Badge>
                    </div>
                    <CardDescription className="text-sm">
                      {typeInfo?.description || 'System email template'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <strong>Subject:</strong> {template.subject}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <strong>Variables:</strong> {Array.isArray(template.variables) ? template.variables.join(', ') : 'None'}
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button variant="outline" size="sm" onClick={() => openPreview(template)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {customTemplates.map((template) => {
              const typeInfo = templateTypes.find(t => t.value === template.template_type)
              const IconComponent = typeInfo?.icon || Mail

              return (
                <Card key={template.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <IconComponent className="h-5 w-5 text-green-600" />
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                      </div>
                      <Badge variant="outline">Custom</Badge>
                    </div>
                    <CardDescription className="text-sm">
                      {typeInfo?.description || 'Custom email template'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <strong>Subject:</strong> {template.subject}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <strong>Variables:</strong> {Array.isArray(template.variables) ? template.variables.join(', ') : 'None'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Created: {new Date(template.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button variant="outline" size="sm" onClick={() => openPreview(template)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(template)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id, template.is_system)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {customTemplates.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Custom Templates</h3>
                <p className="text-muted-foreground text-center mb-4">
                  You haven&apos;t created any custom email templates yet.
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Template
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Template Dialog */}
      <Dialog open={!!selectedTemplate && !showPreview} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Email Template</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Template Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    disabled={selectedTemplate.is_system}
                  />
                </div>
                <div>
                  <Label>Template Type</Label>
                  <div className="flex items-center h-10 px-3 py-2 border rounded-md bg-muted">
                    {templateTypes.find(t => t.value === selectedTemplate.template_type)?.label || selectedTemplate.template_type}
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-subject">Subject Line</Label>
                <Input
                  id="edit-subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  disabled={selectedTemplate.is_system}
                />
              </div>

              <div>
                <Label htmlFor="edit-body">Template Body</Label>
                <Textarea
                  id="edit-body"
                  value={formData.bodyTemplate}
                  onChange={(e) => setFormData({...formData, bodyTemplate: e.target.value})}
                  rows={8}
                  disabled={selectedTemplate.is_system}
                />
              </div>

              <div>
                <Label htmlFor="edit-variables">Available Variables (JSON)</Label>
                <Textarea
                  id="edit-variables"
                  value={formData.variables}
                  onChange={(e) => setFormData({...formData, variables: e.target.value})}
                  rows={3}
                  disabled={selectedTemplate.is_system}
                />
              </div>

              {selectedTemplate.is_system && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    System templates cannot be modified. They are maintained by the platform.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                  Cancel
                </Button>
                {!selectedTemplate.is_system && (
                  <Button onClick={handleUpdateTemplate}>
                    Update Template
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={() => setShowPreview(false)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview: {selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-muted">
                <div className="text-sm font-medium mb-2">Subject:</div>
                <div className="font-mono text-sm">
                  {processTemplate(selectedTemplate.subject, previewData)}
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <div className="text-sm font-medium mb-2">Body:</div>
                <div className="whitespace-pre-wrap font-mono text-sm">
                  {processTemplate(selectedTemplate.body_template, previewData)}
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                This preview uses sample data. Actual emails will use real user and league data.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}