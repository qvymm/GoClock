
-- Users profile extension
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  full_name TEXT,
  phone TEXT,
  date_of_birth DATE,
  avatar_url TEXT,
  height NUMERIC(5,2),
  weight NUMERIC(5,2),
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')) DEFAULT 'moderate',
  bmi NUMERIC(5,2),
  tdee INTEGER,
  notify_tasks BOOLEAN DEFAULT true,
  notify_meals BOOLEAN DEFAULT true,
  notify_sleep BOOLEAN DEFAULT true,
  meal_breakfast TIME DEFAULT '07:00',
  meal_lunch TIME DEFAULT '12:00',
  meal_dinner TIME DEFAULT '18:00',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('study', 'deadline', 'group', 'personal', 'other')) DEFAULT 'personal',
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')) DEFAULT 'pending',
  deadline TIMESTAMPTZ,
  repeat_type TEXT CHECK (repeat_type IN ('none', 'daily', 'weekly', 'monthly')) DEFAULT 'none',
  remind_before INTEGER DEFAULT 60,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_tasks" ON tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_tasks" ON tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_tasks" ON tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_tasks" ON tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Sub-tasks
CREATE TABLE IF NOT EXISTS subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_subtasks" ON subtasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_subtasks" ON subtasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_subtasks" ON subtasks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_subtasks" ON subtasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Meals
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')) DEFAULT 'lunch',
  food_name TEXT NOT NULL,
  calories INTEGER DEFAULT 0,
  protein NUMERIC(6,2) DEFAULT 0,
  carbs NUMERIC(6,2) DEFAULT 0,
  fat NUMERIC(6,2) DEFAULT 0,
  image_url TEXT,
  eaten_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_meals" ON meals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_meals" ON meals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_meals" ON meals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_meals" ON meals FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Sleep logs
CREATE TABLE IF NOT EXISTS sleep_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bedtime TIMESTAMPTZ,
  wake_time TIMESTAMPTZ,
  cycles INTEGER DEFAULT 5,
  duration_minutes INTEGER,
  quality TEXT CHECK (quality IN ('poor', 'fair', 'good', 'excellent')),
  target_bedtime TIME,
  target_wake_time TIME,
  log_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_sleep" ON sleep_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_sleep" ON sleep_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_sleep" ON sleep_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_sleep" ON sleep_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);
