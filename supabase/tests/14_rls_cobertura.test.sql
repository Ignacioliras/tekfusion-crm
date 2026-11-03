-- Cobertura: ninguna tabla de public queda abierta. Falla si una tabla nueva
-- nace sin RLS o con una policy "using (true)" para authenticated, si aparece
-- una policy para anon, si una vista pierde security_invoker, o si alguien
-- agrega una policy de delete a las tablas que nunca se borran (decisión 3).
begin;
select plan(7);

select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0::bigint, 'todas las tablas de public tienen RLS activa');

select is(
  (select count(*) from pg_policies
    where schemaname = 'public' and 'authenticated' = any(roles)
      and (qual = 'true' or with_check = 'true')),
  0::bigint, 'ninguna policy "using (true)" para authenticated');

select is(
  (select count(*) from pg_policies where schemaname = 'public' and roles && array['anon', 'public']::name[]),
  0::bigint, 'anon no tiene policies');

select is(
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'deals' and cmd = 'DELETE'),
  0::bigint, 'deals no tiene policy de delete: los leads nunca se borran');

select is(
  (select count(*) from pg_policies where schemaname = 'public' and tablename in ('wa_messages', 'wa_conversations', 'quotes') and cmd = 'DELETE'),
  0::bigint, 'mensajes, conversaciones y cotizaciones no tendrán policy de delete');

select is(
  (select string_agg(c.relname, ',' order by c.relname)
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v' and c.relname <> 'init_state'
      and coalesce((select option_value from pg_options_to_table(c.reloptions) where option_name = 'security_invoker'), 'off') <> 'on'),
  null, 'todas las vistas (salvo init_state) son security_invoker');

select ok(
  exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'current_user_role' and p.prosecdef),
  'current_user_role() es security definer (lee sales sin pasar por su propia RLS)');

select * from finish();
rollback;
