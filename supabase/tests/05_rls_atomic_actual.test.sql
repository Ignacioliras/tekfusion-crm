-- Punto de partida de seguridad: políticas RLS tal como vienen de Atomic CRM
-- (supabase/schemas/05_policies.sql). Hoy cualquier `authenticated` lee y escribe todo
-- (using (true)); eso se reemplaza en la Fase 2 y este archivo se actualizará entonces.
-- anon no tiene políticas, pero sí `grant all` en las tablas (06_grants.sql): lo que lo
-- frena es solo RLS sin política. Por eso se verifica que anon no tenga política de select.
begin;
select plan(21);

-- 1. RLS activada
select ok((select relrowsecurity from pg_class where oid = 'public.deals'::regclass), 'deals tiene RLS activada');
select ok((select relrowsecurity from pg_class where oid = 'public.contacts'::regclass), 'contacts tiene RLS activada');
select ok((select relrowsecurity from pg_class where oid = 'public.companies'::regclass), 'companies tiene RLS activada');
select ok((select relrowsecurity from pg_class where oid = 'public.sales'::regclass), 'sales tiene RLS activada');
select ok((select relrowsecurity from pg_class where oid = 'public.tasks'::regclass), 'tasks tiene RLS activada');
select ok((select relrowsecurity from pg_class where oid = 'public.contact_notes'::regclass), 'contact_notes tiene RLS activada');
select ok((select relrowsecurity from pg_class where oid = 'public.deal_notes'::regclass), 'deal_notes tiene RLS activada');

-- 2. Al menos una política para authenticated
select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'deals' and 'authenticated' = any(roles)), 'deals tiene política para authenticated');
select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'contacts' and 'authenticated' = any(roles)), 'contacts tiene política para authenticated');
select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'companies' and 'authenticated' = any(roles)), 'companies tiene política para authenticated');
select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'sales' and 'authenticated' = any(roles)), 'sales tiene política para authenticated');
select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'tasks' and 'authenticated' = any(roles)), 'tasks tiene política para authenticated');
select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'contact_notes' and 'authenticated' = any(roles)), 'contact_notes tiene política para authenticated');
select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'deal_notes' and 'authenticated' = any(roles)), 'deal_notes tiene política para authenticated');

-- 3. anon sin política de select (ni directa ni vía rol public; cmd ALL también cuenta)
select ok(not exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'deals' and cmd in ('SELECT', 'ALL') and roles && array['anon', 'public']::name[]), 'deals: anon sin política de select');
select ok(not exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'contacts' and cmd in ('SELECT', 'ALL') and roles && array['anon', 'public']::name[]), 'contacts: anon sin política de select');
select ok(not exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'companies' and cmd in ('SELECT', 'ALL') and roles && array['anon', 'public']::name[]), 'companies: anon sin política de select');
select ok(not exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'sales' and cmd in ('SELECT', 'ALL') and roles && array['anon', 'public']::name[]), 'sales: anon sin política de select');
select ok(not exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'tasks' and cmd in ('SELECT', 'ALL') and roles && array['anon', 'public']::name[]), 'tasks: anon sin política de select');
select ok(not exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'contact_notes' and cmd in ('SELECT', 'ALL') and roles && array['anon', 'public']::name[]), 'contact_notes: anon sin política de select');
select ok(not exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'deal_notes' and cmd in ('SELECT', 'ALL') and roles && array['anon', 'public']::name[]), 'deal_notes: anon sin política de select');

select * from finish();
rollback;
