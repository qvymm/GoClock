-- User streaks and achievements
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_tasks_completed INTEGER DEFAULT 0,
  total_meals_logged INTEGER DEFAULT 0,
  total_sleep_logs INTEGER DEFAULT 0,
  productivity_score INTEGER DEFAULT 0,
  wellness_score INTEGER DEFAULT 0,
  last_activity_date DATE,
  badges JSONB DEFAULT '[]'::jsonb,
  milestones JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily tracking records
CREATE TABLE IF NOT EXISTS daily_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  track_date DATE NOT NULL,
  tasks_total INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  calories_consumed INTEGER DEFAULT 0,
  protein_g FLOAT DEFAULT 0,
  carbs_g FLOAT DEFAULT 0,
  fat_g FLOAT DEFAULT 0,
  sleep_minutes INTEGER DEFAULT 0,
  sleep_quality TEXT DEFAULT 'good',
  water_glasses INTEGER DEFAULT 0,
  steps_count INTEGER DEFAULT 0,
  mood TEXT DEFAULT 'neutral',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, track_date)
);

-- Weekly tracking summary
CREATE TABLE IF NOT EXISTS weekly_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  tasks_total INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  avg_sleep_hours FLOAT DEFAULT 0,
  avg_calories INTEGER DEFAULT 0,
  avg_protein FLOAT DEFAULT 0,
  avg_carbs FLOAT DEFAULT 0,
  avg_fat FLOAT DEFAULT 0,
  habit_consistency_score INTEGER DEFAULT 0,
  productivity_score INTEGER DEFAULT 0,
  insights JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start_date)
);

-- Monthly tracking summary
CREATE TABLE IF NOT EXISTS monthly_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  tasks_total INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  goal_completion_rate FLOAT DEFAULT 0,
  avg_sleep_hours FLOAT DEFAULT 0,
  avg_calories INTEGER DEFAULT 0,
  weight_start FLOAT,
  weight_end FLOAT,
  best_habit TEXT,
  achievements JSONB DEFAULT '[]'::jsonb,
  insights JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month_year)
);

-- Badges and achievements
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  badge_icon TEXT,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_stats
CREATE POLICY "select_own_stats" ON user_stats FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_stats" ON user_stats FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_stats" ON user_stats FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for daily_tracking
CREATE POLICY "select_own_daily" ON daily_tracking FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_daily" ON daily_tracking FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_daily" ON daily_tracking FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for weekly_tracking
CREATE POLICY "select_own_weekly" ON weekly_tracking FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_weekly" ON weekly_tracking FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_weekly" ON weekly_tracking FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for monthly_tracking
CREATE POLICY "select_own_monthly" ON monthly_tracking FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_monthly" ON monthly_tracking FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_monthly" ON monthly_tracking FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for badges
CREATE POLICY "select_own_badges" ON badges FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_badges" ON badges FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_daily_tracking_user_date ON daily_tracking(user_id, track_date DESC);
CREATE INDEX idx_weekly_tracking_user_date ON weekly_tracking(user_id, week_start_date DESC);
CREATE INDEX idx_monthly_tracking_user_date ON monthly_tracking(user_id, month_year DESC);
CREATE INDEX idx_badges_user ON badges(user_id);
