-- Phase 1: Loan Engine Schema
-- Run this in Supabase SQL editor

-- Loans table — the core record for each mortgage file
CREATE TABLE IF NOT EXISTS loans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  broker_id UUID REFERENCES brokers(id) ON DELETE SET NULL,
  brokerage_id UUID REFERENCES brokerages(id) ON DELETE SET NULL,

  -- Loan basics
  loan_type TEXT NOT NULL, -- conventional | fha | va
  loan_purpose TEXT NOT NULL, -- purchase | refinance | cashout
  loan_amount NUMERIC,
  purchase_price NUMERIC,

  -- Primary borrower profile
  employment_type TEXT NOT NULL DEFAULT 'w2', -- w2 | self_employed | retired | military | other
  years_employed NUMERIC, -- years at current employer (< 2 may require extra docs)

  -- Co-borrower
  co_borrower BOOLEAN DEFAULT FALSE,
  co_borrower_name TEXT,
  co_borrower_email TEXT,
  co_borrower_employment_type TEXT, -- w2 | self_employed | retired | military | other

  -- Property
  property_type TEXT DEFAULT 'sfr', -- sfr | condo | multi_unit | manufactured
  property_use TEXT DEFAULT 'primary', -- primary | secondary | investment
  property_address TEXT,

  -- Special circumstances (drive extra doc requests)
  has_gift_funds BOOLEAN DEFAULT FALSE,
  has_rental_income BOOLEAN DEFAULT FALSE,
  has_bankruptcy BOOLEAN DEFAULT FALSE,
  has_foreclosure BOOLEAN DEFAULT FALSE,
  has_child_support BOOLEAN DEFAULT FALSE, -- paying or receiving
  is_self_employed_2yr BOOLEAN DEFAULT FALSE, -- self-employed < 2 years

  -- AI Processor state
  ai_status TEXT DEFAULT 'idle', -- idle | reviewing | waiting_docs | conditions | complete
  ai_notes TEXT,
  last_ai_check TIMESTAMPTZ,
  conditions_received_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers see own loans" ON loans FOR ALL
  USING (broker_id = auth.uid());

CREATE POLICY "Admins see brokerage loans" ON loans FOR SELECT
  USING (brokerage_id IN (
    SELECT brokerage_id FROM brokers WHERE id = auth.uid() AND role = 'admin'
  ));

-- Loan conditions (underwriter conditions after initial review)
CREATE TABLE IF NOT EXISTS loan_conditions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  condition_type TEXT DEFAULT 'prior_to_docs', -- prior_to_docs | prior_to_approval | prior_to_funding
  status TEXT DEFAULT 'open', -- open | satisfied | waived
  source TEXT DEFAULT 'underwriter', -- underwriter | processor | system
  due_date DATE,
  satisfied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE loan_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brokers manage conditions on own loans" ON loan_conditions FOR ALL
  USING (loan_id IN (SELECT id FROM loans WHERE broker_id = auth.uid()));

-- Link loan to document requests (so we know which docs belong to which loan)
ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS loan_id UUID REFERENCES loans(id) ON DELETE SET NULL;

-- Loan status history (audit trail)
CREATE TABLE IF NOT EXISTS loan_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT,
  changed_by TEXT DEFAULT 'system', -- system | broker | ai
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE loan_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brokers read status history on own loans" ON loan_status_history FOR SELECT
  USING (loan_id IN (SELECT id FROM loans WHERE broker_id = auth.uid()));
