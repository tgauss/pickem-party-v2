import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Super admin check
function isSuperAdmin(username: string): boolean {
  const superAdminUsernames = ['admin', 'tgauss', 'pickemking']
  return superAdminUsernames.includes(username.toLowerCase())
}

export async function GET() {
  try {
    const supabase = createClient()

    // Get all email templates
    const { data: templates, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('template_type', { ascending: true })

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch email templates'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      templates
    })

  } catch (error) {
    console.error('Email templates fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch email templates'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      templateType,
      subject,
      bodyTemplate,
      variables,
      adminUsername
    } = body

    const supabase = createClient()

    // Get admin user and verify permissions
    const { data: adminUser } = await supabase
      .from('users')
      .select('id, username, display_name')
      .eq('username', adminUsername)
      .single()

    if (!adminUser || !isSuperAdmin(adminUser.username)) {
      return NextResponse.json({
        success: false,
        error: 'Super admin access required'
      }, { status: 403 })
    }

    // Create new template
    const { data: template, error } = await supabase
      .from('email_templates')
      .insert({
        name,
        template_type: templateType,
        subject,
        body_template: bodyTemplate,
        variables: variables || {},
        is_system: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating template:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to create email template'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      template
    })

  } catch (error) {
    console.error('Email template creation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create email template'
    }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const {
      templateId,
      name,
      subject,
      bodyTemplate,
      variables,
      adminUsername
    } = body

    const supabase = createClient()

    // Get admin user and verify permissions
    const { data: adminUser } = await supabase
      .from('users')
      .select('id, username, display_name')
      .eq('username', adminUsername)
      .single()

    if (!adminUser || !isSuperAdmin(adminUser.username)) {
      return NextResponse.json({
        success: false,
        error: 'Super admin access required'
      }, { status: 403 })
    }

    // Check if template is system template
    const { data: existingTemplate } = await supabase
      .from('email_templates')
      .select('is_system')
      .eq('id', templateId)
      .single()

    if (existingTemplate?.is_system) {
      return NextResponse.json({
        success: false,
        error: 'System templates cannot be modified'
      }, { status: 400 })
    }

    // Update template
    const { data: template, error } = await supabase
      .from('email_templates')
      .update({
        name,
        subject,
        body_template: bodyTemplate,
        variables: variables || {},
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .select()
      .single()

    if (error) {
      console.error('Error updating template:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to update email template'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      template
    })

  } catch (error) {
    console.error('Email template update error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update email template'
    }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { templateId, adminUsername } = body

    const supabase = createClient()

    // Get admin user and verify permissions
    const { data: adminUser } = await supabase
      .from('users')
      .select('id, username, display_name')
      .eq('username', adminUsername)
      .single()

    if (!adminUser || !isSuperAdmin(adminUser.username)) {
      return NextResponse.json({
        success: false,
        error: 'Super admin access required'
      }, { status: 403 })
    }

    // Check if template is system template
    const { data: existingTemplate } = await supabase
      .from('email_templates')
      .select('is_system')
      .eq('id', templateId)
      .single()

    if (existingTemplate?.is_system) {
      return NextResponse.json({
        success: false,
        error: 'System templates cannot be deleted'
      }, { status: 400 })
    }

    // Delete template
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', templateId)

    if (error) {
      console.error('Error deleting template:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to delete email template'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Email template deleted successfully'
    })

  } catch (error) {
    console.error('Email template deletion error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete email template'
    }, { status: 500 })
  }
}