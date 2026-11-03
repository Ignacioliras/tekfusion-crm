--
-- Row Level Security
-- Enables RLS on Atomic's tables. The policies live in 11_tekfusion_policies.sql:
-- Atomic's "using (true)" policies were replaced in Fase 2 (docs/08, docs/10).
--

-- Enable RLS on all tables
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.contact_notes enable row level security;
alter table public.deals enable row level security;
alter table public.deal_notes enable row level security;
alter table public.sales enable row level security;
alter table public.tags enable row level security;
alter table public.tasks enable row level security;
alter table public.configuration enable row level security;
alter table public.favicons_excluded_domains enable row level security;
alter table public.user_invitations enable row level security;
