-- Phase 1B: Foundation fixes
-- Run in Supabase SQL editor

-- 1. Phone number on clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Loan stage / milestone tracking
ALTER TABLE loans ADD COLUMN IF NOT EXISTS loan_stage TEXT DEFAULT 'processing';
-- stages: application | processing | submitted_uw | conditional_approval | clear_to_close | closing | funded | denied

-- 3. Loan file number (auto-generated reference)
ALTER TABLE loans ADD COLUMN IF NOT EXISTS file_number TEXT;

-- Auto-generate file number on insert (WC-YYYY-NNNN)
CREATE OR REPLACE FUNCTION generate_file_number()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  seq_num  INTEGER;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO seq_num
    FROM loans
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  NEW.file_number := 'WC-' || year_str || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_file_number ON loans;
CREATE TRIGGER set_file_number
  BEFORE INSERT ON loans
  FOR EACH ROW
  WHEN (NEW.file_number IS NULL)
  EXECUTE FUNCTION generate_file_number();

-- 4. Co-borrower invite token on loans
ALTER TABLE loans ADD COLUMN IF NOT EXISTS co_borrower_invite_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;
