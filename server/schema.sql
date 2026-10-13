-- ====================================================================
-- AutoDox AI: Supabase PostgreSQL Schema with Native Supabase Auth & RLS
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- ====================================================================

-- 1. Profiles Table (Mirrors auth.users with public profile metadata)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Vault Profiles (Allows users to maintain multiple profiles, e.g. My Info, Father's Info, Academic, Professional, Custom)
CREATE TABLE IF NOT EXISTS public.vault_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'custom',
  description TEXT DEFAULT '',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table was previously created
ALTER TABLE public.vault_profiles ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'custom';
ALTER TABLE public.vault_profiles ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- 3. Vault Attributes (Stored personal attributes linked to a user profile)
CREATE TABLE IF NOT EXISTS public.vault_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.vault_profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  category TEXT DEFAULT 'Personal',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_attributes ENABLE ROW LEVEL SECURITY;

-- 5. Row Level Security Policies for Profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Service role full access on profiles" ON public.profiles;
CREATE POLICY "Service role full access on profiles"
  ON public.profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Row Level Security Policies for Vault Profiles
DROP POLICY IF EXISTS "Users can view their own vault profiles" ON public.vault_profiles;
CREATE POLICY "Users can view their own vault profiles"
  ON public.vault_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own vault profiles" ON public.vault_profiles;
CREATE POLICY "Users can manage their own vault profiles"
  ON public.vault_profiles FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access on vault profiles" ON public.vault_profiles;
CREATE POLICY "Service role full access on vault profiles"
  ON public.vault_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 7. Row Level Security Policies for Vault Attributes
DROP POLICY IF EXISTS "Users can view their own vault attributes" ON public.vault_attributes;
CREATE POLICY "Users can view their own vault attributes"
  ON public.vault_attributes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own vault attributes" ON public.vault_attributes;
CREATE POLICY "Users can manage their own vault attributes"
  ON public.vault_attributes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access on vault attributes" ON public.vault_attributes;
CREATE POLICY "Service role full access on vault attributes"
  ON public.vault_attributes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 8. Auto-create Profile Trigger on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    updated_at = NOW();

  -- Also create default "My Information" vault profile
  INSERT INTO public.vault_profiles (user_id, name, type, description, is_default)
  VALUES (NEW.id, 'My Information', 'my_info', 'Primary personal identity, credentials, and contact details', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
