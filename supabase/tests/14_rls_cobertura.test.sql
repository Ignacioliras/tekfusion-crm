-- Cobertura: ninguna tabla de public queda abierta. Falla si una tabla nueva
-- nace sin RLS o con una policy "using (true)" para authenticated, si aparece
-- una policy para anon, si una vista pierde security_invoker, o si alguien
-- agrega una policy de delete a las tablas que nunca se borran (decisión 3).
begin;
select plan(13);

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

select is(
  (select count(*) from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public' and table_name <> 'init_state'),
  0::bigint, 'anon no tiene privilegios sobre ninguna tabla ni vista salvo init_state');
select is(
  (select count(*) from information_schema.role_table_grants where grantee = 'authenticated' and table_schema = 'public' and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')),
  0::bigint, 'authenticated no tiene TRUNCATE, REFERENCES ni TRIGGER (TRUNCATE ignora la RLS)');
select is(
  (select string_agg(column_name, ',' order by column_name) from information_schema.role_column_grants where grantee = 'authenticated' and table_schema = 'public' and table_name = 'sales' and privilege_type = 'UPDATE'),
  'administrator,avatar,first_name,last_name,role,signature,whatsapp_phone', 'authenticated solo actualiza las columnas de perfil, role y administrator de sales (disabled solo por la Edge Function)');
select ok(not has_function_privilege('anon', 'public.take_deal(bigint)', 'execute') and not has_function_privilege('anon', 'public.current_sales_id()', 'execute'), 'anon no ejecuta take_deal ni los helpers de RLS');
select ok(
  not exists (select 1 from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace where n.nspname = 'public' and d.defaclrole = 'postgres'::regrole and array_to_string(d.defaclacl, ',') like '%anon=%'),
  'los privilegios por defecto de public ya no incluyen a anon');
select is(
  (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and (coalesce(qual, '') || coalesce(with_check, '')) not similar to '%(is_internal_user|current_user_role)%'),
  0::bigint, 'toda policy de storage.objects exige un usuario interno (no basta el bucket)');

select * from finish();
rollback;
