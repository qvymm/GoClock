ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_priority_check'
      AND conrelid = 'public.tasks'::regclass
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_priority_check
      CHECK (priority IN ('high', 'med', 'low', 'none'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_user_scheduled_date
  ON tasks(user_id, scheduled_date);

UPDATE tasks
SET scheduled_date = COALESCE(
  scheduled_date,
  (deadline AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
  created_at::date
)
WHERE scheduled_date IS NULL;
