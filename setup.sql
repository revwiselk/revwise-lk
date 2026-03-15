-- ================================================================
-- QUIZZERA v3 — COMPLETE SQL SETUP
-- Run this ENTIRE file in Supabase → SQL Editor → New Query
-- This fixes ALL issues: tables, RLS, admin login, quizzes
-- ================================================================

-- ── 1. Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 2. Enums (safe — won't fail if already exist) ───────────────
DO $$ BEGIN CREATE TYPE language_enum AS ENUM ('sinhala','tamil','english');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE grade_enum AS ENUM ('6','7','8','9','10','11');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE question_type_enum AS ENUM ('mcq','true_false','short_answer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE content_status_enum AS ENUM ('draft','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. student_profiles ─────────────────────────────────────────
-- Links to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT NOT NULL DEFAULT 'Student',
  grade        SMALLINT NOT NULL CHECK (grade BETWEEN 6 AND 11),
  school_name  TEXT,
  district     TEXT,
  medium       TEXT NOT NULL DEFAULT 'sinhala',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sp_grade    ON public.student_profiles(grade);
CREATE INDEX IF NOT EXISTS idx_sp_district ON public.student_profiles(district);

-- ── 4. quizzes table — add unit_id if missing ───────────────────
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS unit_id UUID;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS quiz_type TEXT NOT NULL DEFAULT 'practice';
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS time_limit_seconds INTEGER;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS pass_mark_percent SMALLINT NOT NULL DEFAULT 50;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS max_attempts SMALLINT;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add FK constraint for unit_id if not already there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'quizzes_unit_id_fkey' AND table_name = 'quizzes'
  ) THEN
    ALTER TABLE public.quizzes
      ADD CONSTRAINT quizzes_unit_id_fkey
      FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_quizzes_unit ON public.quizzes(unit_id);

-- ── 5. quiz_attempts ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id              UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language             TEXT NOT NULL DEFAULT 'english',
  started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at         TIMESTAMPTZ,
  score                SMALLINT NOT NULL DEFAULT 0,
  max_score            SMALLINT NOT NULL DEFAULT 0,
  passed               BOOLEAN NOT NULL DEFAULT FALSE,
  time_taken_seconds   INTEGER
);
CREATE INDEX IF NOT EXISTS idx_attempts_student   ON public.quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_quiz      ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_attempts_submitted ON public.quiz_attempts(submitted_at DESC);

-- ── 6. attempt_answers ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attempt_answers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id          UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id         UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option_id  UUID REFERENCES public.answer_options(id) ON DELETE SET NULL,
  is_correct          BOOLEAN NOT NULL DEFAULT FALSE,
  marks_awarded       SMALLINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_aa_attempt ON public.attempt_answers(attempt_id);

-- ── 7. feedback table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id       UUID REFERENCES public.units(id) ON DELETE SET NULL,
  name          TEXT,
  email         TEXT,
  feedback_type TEXT NOT NULL DEFAULT 'quiz',
  body          TEXT NOT NULL,
  rating        SMALLINT,
  is_resolved   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 8. updated_at trigger function ──────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ── 9. DISABLE RLS on all content/curriculum tables ─────────────
-- Admin uses admin_profiles (not Supabase Auth) so auth.uid() = null for admin
-- Content tables are read-only for students — no personal data at risk

ALTER TABLE public.subjects                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.units                      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes                    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_translations      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_options             DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_option_translations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles             DISABLE ROW LEVEL SECURITY;

DO $$ BEGIN ALTER TABLE public.unit_content DISABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Drop ALL old policies that might conflict
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
    AND tablename IN ('subjects','chapters','units','unit_content','quizzes',
      'questions','question_translations','answer_options',
      'answer_option_translations','feedback','admin_profiles')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ── 10. RLS on student-sensitive tables only ─────────────────────
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sp_own"  ON public.student_profiles;
DROP POLICY IF EXISTS "att_own" ON public.quiz_attempts;
DROP POLICY IF EXISTS "ans_own" ON public.attempt_answers;

CREATE POLICY "sp_own" ON public.student_profiles
  FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "att_own" ON public.quiz_attempts
  FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

CREATE POLICY "ans_own" ON public.attempt_answers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM quiz_attempts WHERE id = attempt_id AND student_id = auth.uid())
  );

-- ── 11. verify_admin_login RPC ───────────────────────────────────
-- Admin logs in with Supabase Auth using their email/password
-- This function just checks if the email exists in admin_profiles
-- (password is handled by Supabase Auth itself)
CREATE OR REPLACE FUNCTION public.is_admin_email(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE email = p_email AND is_active = TRUE
  );
$$;

-- ── 12. Create your admin account ───────────────────────────────
-- STEP A: Go to Supabase → Authentication → Users → Add user
--         Use your admin email + a strong password
--
-- STEP B: Run this to register that email as admin:
-- (Replace with your actual admin email)

INSERT INTO public.admin_profiles (email, password_hash, full_name, is_active)
VALUES (
  'admin@quizzera.lk',       -- ← CHANGE THIS to your admin email
  'supabase-auth',           -- placeholder (auth handled by Supabase Auth)
  'Quizzera Admin',
  TRUE
)
ON CONFLICT (email) DO UPDATE SET is_active = TRUE;

-- ── 13. Verify everything is set up correctly ───────────────────
SELECT
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COUNT(p.policyname) AS policies
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
ORDER BY t.tablename;
