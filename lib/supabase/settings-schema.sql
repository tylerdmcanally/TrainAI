-- Settings System Database Schema
-- This extends the existing schema with user preferences and company settings

-- ============================================
-- USER PREFERENCES TABLE
-- ============================================

-- User preferences for personal settings
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications JSONB DEFAULT '{
    "training_assigned": true,
    "training_completed": true,
    "progress_updates": false,
    "weekly_summary": true,
    "monthly_report": false,
    "system_announcements": true
  }',
  in_app_notifications JSONB DEFAULT '{
    "new_training": true,
    "deadline_reminders": true,
    "progress_milestones": true,
    "achievements": true,
    "system_updates": true
  }',
  push_notifications JSONB DEFAULT '{
    "enabled": true,
    "training_reminders": true,
    "deadline_alerts": true,
    "achievements": true
  }',
  training_preferences JSONB DEFAULT '{
    "video_quality": "auto",
    "auto_play": false,
    "show_chapters": true,
    "ai_chat_enabled": true,
    "progress_tracking": true,
    "completion_certificates": true
  }',
  privacy_settings JSONB DEFAULT '{
    "profile_visibility": "company",
    "progress_visibility": "private",
    "analytics_opt_in": true,
    "data_export_enabled": true
  }',
  display_preferences JSONB DEFAULT '{
    "theme": "system",
    "font_size": "medium",
    "language": "en",
    "timezone": "UTC",
    "date_format": "MM/DD/YYYY",
    "time_format": "12h"
  }',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- COMPANY SETTINGS TABLE
-- ============================================

-- Company-wide settings for owners
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  company_info JSONB DEFAULT '{
    "logo_url": null,
    "website": null,
    "industry": null,
    "size": null,
    "description": null,
    "contact_email": null,
    "phone": null,
    "address": null
  }',
  training_policies JSONB DEFAULT '{
    "default_deadline_days": 30,
    "allow_retries": true,
    "max_retries": 3,
    "require_completion": true,
    "auto_assign_new": false,
    "certification_required": false,
    "progress_reporting": true
  }',
  notification_settings JSONB DEFAULT '{
    "email_notifications": true,
    "assignment_emails": true,
    "reminder_emails": true,
    "completion_emails": true,
    "weekly_reports": true,
    "monthly_reports": false
  }',
  branding_settings JSONB DEFAULT '{
    "primary_color": "#2563eb",
    "secondary_color": "#64748b",
    "logo_position": "top-left",
    "custom_css": null,
    "welcome_message": null,
    "footer_text": null
  }',
  security_settings JSONB DEFAULT '{
    "require_2fa": false,
    "session_timeout_minutes": 480,
    "password_policy": "standard",
    "ip_whitelist": null,
    "login_attempts_limit": 5
  }',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id)
);

-- ============================================
-- USER SESSIONS TABLE (for security settings)
-- ============================================

-- Track user sessions for security management
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- ============================================
-- USER PROFILE EXTENSIONS
-- ============================================

-- Add additional fields to users table if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS job_title VARCHAR(100),
ADD COLUMN IF NOT EXISTS department VARCHAR(100),
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- User preferences indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_updated_at ON user_preferences(updated_at);

-- Company settings indexes
CREATE INDEX IF NOT EXISTS idx_company_settings_company_id ON company_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_company_settings_updated_at ON company_settings(updated_at);

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_job_title ON users(job_title);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- User preferences policies
CREATE POLICY "Users can view their own preferences" ON user_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences" ON user_preferences
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own preferences" ON user_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Company settings policies (owners only)
CREATE POLICY "Owners can view company settings" ON company_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'owner' 
      AND company_id = company_settings.company_id
    )
  );

CREATE POLICY "Owners can update company settings" ON company_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'owner' 
      AND company_id = company_settings.company_id
    )
  );

CREATE POLICY "Owners can insert company settings" ON company_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'owner' 
      AND company_id = company_settings.company_id
    )
  );

-- User sessions policies
CREATE POLICY "Users can view their own sessions" ON user_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own sessions" ON user_sessions
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get or create user preferences
CREATE OR REPLACE FUNCTION get_user_preferences(user_uuid UUID)
RETURNS user_preferences
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prefs user_preferences;
BEGIN
  -- Try to get existing preferences
  SELECT * INTO prefs FROM user_preferences WHERE user_id = user_uuid;
  
  -- If no preferences exist, create default ones
  IF prefs IS NULL THEN
    INSERT INTO user_preferences (user_id) VALUES (user_uuid) RETURNING * INTO prefs;
  END IF;
  
  RETURN prefs;
END;
$$;

-- Function to get or create company settings
CREATE OR REPLACE FUNCTION get_company_settings(company_uuid UUID)
RETURNS company_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings company_settings;
BEGIN
  -- Try to get existing settings
  SELECT * INTO settings FROM company_settings WHERE company_id = company_uuid;
  
  -- If no settings exist, create default ones
  IF settings IS NULL THEN
    INSERT INTO company_settings (company_id) VALUES (company_uuid) RETURNING * INTO settings;
  END IF;
  
  RETURN settings;
END;
$$;

-- Function to update user preferences
CREATE OR REPLACE FUNCTION update_user_preferences(
  user_uuid UUID,
  email_notifs JSONB DEFAULT NULL,
  in_app_notifs JSONB DEFAULT NULL,
  push_notifs JSONB DEFAULT NULL,
  training_prefs JSONB DEFAULT NULL,
  privacy_prefs JSONB DEFAULT NULL,
  display_prefs JSONB DEFAULT NULL
)
RETURNS user_preferences
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prefs user_preferences;
BEGIN
  -- Get or create preferences
  SELECT * INTO prefs FROM get_user_preferences(user_uuid);
  
  -- Update only provided fields
  UPDATE user_preferences SET
    email_notifications = COALESCE(email_notifs, email_notifications),
    in_app_notifications = COALESCE(in_app_notifs, in_app_notifications),
    push_notifications = COALESCE(push_notifs, push_notifications),
    training_preferences = COALESCE(training_prefs, training_preferences),
    privacy_settings = COALESCE(privacy_prefs, privacy_settings),
    display_preferences = COALESCE(display_prefs, display_preferences),
    updated_at = NOW()
  WHERE user_id = user_uuid
  RETURNING * INTO prefs;
  
  RETURN prefs;
END;
$$;

-- Function to update company settings
CREATE OR REPLACE FUNCTION update_company_settings(
  company_uuid UUID,
  company_info JSONB DEFAULT NULL,
  training_policies JSONB DEFAULT NULL,
  notification_settings JSONB DEFAULT NULL,
  branding_settings JSONB DEFAULT NULL,
  security_settings JSONB DEFAULT NULL
)
RETURNS company_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings company_settings;
BEGIN
  -- Get or create settings
  SELECT * INTO settings FROM get_company_settings(company_uuid);
  
  -- Update only provided fields
  UPDATE company_settings SET
    company_info = COALESCE(company_info, company_info),
    training_policies = COALESCE(training_policies, training_policies),
    notification_settings = COALESCE(notification_settings, notification_settings),
    branding_settings = COALESCE(branding_settings, branding_settings),
    security_settings = COALESCE(security_settings, security_settings),
    updated_at = NOW()
  WHERE company_id = company_uuid
  RETURNING * INTO settings;
  
  RETURN settings;
END;
$$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON user_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE ON company_settings TO authenticated;
GRANT SELECT, DELETE ON user_sessions TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_company_settings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_preferences(UUID, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_company_settings(UUID, JSONB, JSONB, JSONB, JSONB, JSONB) TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE user_preferences IS 'User-specific preferences and settings';
COMMENT ON TABLE company_settings IS 'Company-wide settings and policies';
COMMENT ON TABLE user_sessions IS 'User session tracking for security management';

COMMENT ON FUNCTION get_user_preferences(UUID) IS 'Get or create user preferences with defaults';
COMMENT ON FUNCTION get_company_settings(UUID) IS 'Get or create company settings with defaults';
COMMENT ON FUNCTION update_user_preferences IS 'Update user preferences with partial updates';
COMMENT ON FUNCTION update_company_settings IS 'Update company settings with partial updates';
