-- Referral partners table
create table if not exists referral_partners (
  id uuid primary key default gen_random_uuid(),
  brokerage_id uuid references brokerages(id) on delete cascade,
  full_name text not null,
  company text,
  email text,
  phone text,
  partner_type text default 'realtor', -- realtor, builder, financial_advisor, attorney, other
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add referral_partner_id to loans
alter table loans add column if not exists referral_partner_id uuid references referral_partners(id) on delete set null;
alter table loans add column if not exists referral_notes text;

create index if not exists idx_referral_partners_brokerage on referral_partners(brokerage_id);
create index if not exists idx_loans_referral_partner on loans(referral_partner_id);
