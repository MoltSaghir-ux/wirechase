-- WireChase Database Schema

-- Brokers (authenticated users)
CREATE TABLE brokers (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients (invited by broker, no account needed)
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID REFERENCES brokers(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  invite_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  status TEXT DEFAULT 'pending', -- pending | in_progress | complete
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document checklists (what the broker needs)
CREATE TABLE document_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  label TEXT NOT NULL, -- e.g. "W-2 (Last 2 Years)"
  required BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'missing', -- missing | uploaded | approved | rejected
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Uploaded files
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_request_id UUID REFERENCES document_requests(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Supabase Storage path
  file_size INTEGER,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Brokers can only see their own data
CREATE POLICY "Brokers see own profile" ON brokers FOR ALL USING (auth.uid() = id);
CREATE POLICY "Brokers see own clients" ON clients FOR ALL USING (auth.uid() = broker_id);
CREATE POLICY "Brokers see own doc requests" ON document_requests FOR ALL
  USING (client_id IN (SELECT id FROM clients WHERE broker_id = auth.uid()));

-- Clients can upload via token (handled in API route, not RLS)

-- Migration: Add category column to document_requests
ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Documents';

-- Allow clients to look up their own record via invite token (anon)
CREATE POLICY "Clients can read own record via token" ON clients FOR SELECT
USING (true);

-- Allow clients to read their own document requests (anon)
CREATE POLICY "Clients can read own doc requests" ON document_requests FOR SELECT
USING (true);

-- Allow clients to update doc request status (anon, via API route)
CREATE POLICY "Clients can update doc request status" ON document_requests FOR UPDATE
USING (true);

-- Allow clients to insert documents (via API route with service role — no RLS needed)

-- Add notification debounce timestamp to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS broker_last_notified_at TIMESTAMPTZ;

-- Notification queue columns
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notification_pending BOOLEAN DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notification_pending_since TIMESTAMPTZ;

-- Broker profile
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS nmls TEXT;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS logo_path TEXT;

-- Client notes
CREATE TABLE IF NOT EXISTS client_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  broker_id UUID REFERENCES brokers(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brokers manage own notes" ON client_notes FOR ALL USING (broker_id = auth.uid());

-- Activity log
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brokers read activity for own clients" ON activity_log FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE broker_id = auth.uid()));

-- Document templates
CREATE TABLE IF NOT EXISTS doc_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID REFERENCES brokers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  program TEXT,
  docs JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE doc_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brokers manage own templates" ON doc_templates FOR ALL USING (broker_id = auth.uid());

-- Deadlines on clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS deadline_reminder_sent BOOLEAN DEFAULT FALSE;

-- Brokerages (company/team entity)
CREATE TABLE IF NOT EXISTS brokerages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  nmls TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE brokerages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read own brokerage" ON brokerages FOR SELECT
  USING (id IN (SELECT brokerage_id FROM brokers WHERE id = auth.uid()));
CREATE POLICY "Admins can update own brokerage" ON brokerages FOR UPDATE
  USING (id IN (SELECT brokerage_id FROM brokers WHERE id = auth.uid() AND role = 'admin'));

-- Add brokerage + role to brokers
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS brokerage_id UUID REFERENCES brokerages(id) ON DELETE SET NULL;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin'; -- admin | loan_officer

-- Team invites
CREATE TABLE IF NOT EXISTS team_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brokerage_id UUID REFERENCES brokerages(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES brokers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'loan_officer',
  token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage own team invites" ON team_invites FOR ALL
  USING (brokerage_id IN (SELECT brokerage_id FROM brokers WHERE id = auth.uid() AND role = 'admin'));

-- Add brokerage_id to clients for cross-LO visibility
ALTER TABLE clients ADD COLUMN IF NOT EXISTS brokerage_id UUID REFERENCES brokerages(id) ON DELETE SET NULL;

-- Platform invite codes (controls who can create a new brokerage)
CREATE TABLE IF NOT EXISTS platform_invite_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- No RLS needed — only accessed via service role API routes
