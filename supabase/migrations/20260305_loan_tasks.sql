create table if not exists loan_tasks (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid references loans(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  brokerage_id uuid references brokerages(id) on delete cascade,
  title text not null,
  description text,
  assigned_to_user_id uuid, -- broker user_id
  assigned_to_name text,    -- denormalized for display
  due_date date,
  priority text default 'normal', -- low, normal, high, urgent
  status text default 'open',     -- open, in_progress, done, cancelled
  created_by_user_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_loan_tasks_loan on loan_tasks(loan_id);
create index if not exists idx_loan_tasks_brokerage on loan_tasks(brokerage_id);
create index if not exists idx_loan_tasks_assigned on loan_tasks(assigned_to_user_id);
create index if not exists idx_loan_tasks_status on loan_tasks(status);
