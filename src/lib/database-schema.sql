-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  template_type VARCHAR(50) NOT NULL, -- 'pick_reminder', 'weekly_recap', 'payment_reminder', etc.
  subject VARCHAR(255) NOT NULL,
  body_template TEXT NOT NULL,
  variables JSONB, -- List of available variables for this template
  is_system BOOLEAN DEFAULT false, -- System templates can't be deleted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled Emails Table
CREATE TABLE IF NOT EXISTS scheduled_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  template_id UUID REFERENCES email_templates(id),
  scheduled_for TIMESTAMPTZ NOT NULL,
  recipient_filter JSONB, -- Filters like {eliminated: false, has_picked: false}
  custom_subject VARCHAR(255),
  custom_body TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  error_message TEXT
);

-- Email History Table
CREATE TABLE IF NOT EXISTS email_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  scheduled_email_id UUID REFERENCES scheduled_emails(id),
  recipient_email VARCHAR(255) NOT NULL,
  recipient_user_id UUID REFERENCES users(id),
  template_type VARCHAR(50),
  subject VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending', -- 'sent', 'failed', 'bounced', 'opened'
  postmark_message_id VARCHAR(255),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  error_message TEXT
);

-- League Email Settings Table
CREATE TABLE IF NOT EXISTS league_email_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE UNIQUE,
  pick_reminder_enabled BOOLEAN DEFAULT true,
  pick_reminder_hours_before INT DEFAULT 24, -- Hours before deadline
  weekly_recap_enabled BOOLEAN DEFAULT true,
  weekly_recap_day INT DEFAULT 2, -- Day of week (0=Sunday, 2=Tuesday)
  weekly_recap_time TIME DEFAULT '10:00:00',
  payment_reminder_enabled BOOLEAN DEFAULT true,
  elimination_notice_enabled BOOLEAN DEFAULT true,
  custom_footer_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default System Email Templates
INSERT INTO email_templates (name, template_type, subject, body_template, variables, is_system) VALUES
('Pick Reminder', 'pick_reminder', 'Week {{week}} Pick Reminder - {{league_name}}',
'Hi {{user_name}},\n\nDon''t forget to make your pick for Week {{week}}! The deadline is {{deadline}}.\n\nYou have {{time_remaining}} left to make your selection.\n\n{{#if used_teams}}Teams you''ve already used: {{used_teams}}{{/if}}',
'{"week", "league_name", "user_name", "deadline", "time_remaining", "used_teams"}', true),

('Weekly Recap', 'weekly_recap', 'Week {{week}} Recap - {{league_name}}',
'Week {{week}} is complete!\n\n{{#if your_pick}}Your pick: {{your_pick}} - {{pick_result}}{{/if}}\n\nSurvivors remaining: {{survivors_count}}\nEliminated this week: {{eliminated_count}}\n\n{{#if eliminated_players}}Players eliminated: {{eliminated_players}}{{/if}}',
'{"week", "league_name", "your_pick", "pick_result", "survivors_count", "eliminated_count", "eliminated_players"}', true),

('Payment Reminder', 'payment_reminder', 'Payment Due - {{league_name}}',
'Hi {{user_name}},\n\nThis is a reminder that your buy-in of ${{buy_in}} for {{league_name}} is due.\n\nPlease submit your payment to secure your spot in the league.',
'{"user_name", "league_name", "buy_in"}', true);

-- Indexes for performance
CREATE INDEX idx_scheduled_emails_league_id ON scheduled_emails(league_id);
CREATE INDEX idx_scheduled_emails_status ON scheduled_emails(status);
CREATE INDEX idx_scheduled_emails_scheduled_for ON scheduled_emails(scheduled_for);
CREATE INDEX idx_email_history_league_id ON email_history(league_id);
CREATE INDEX idx_email_history_recipient_user_id ON email_history(recipient_user_id);