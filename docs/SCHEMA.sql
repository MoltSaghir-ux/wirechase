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
